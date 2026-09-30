"""
Multi-step document intake pipeline, built as a LangGraph StateGraph.

Replaces the single-shot "send image, get JSON back" extraction with an
actual workflow that has state and branches:

    classify_document -> extract_fields -> cross_validate --[conditional]--> retry (loop back to extract_fields)
                                                            --[conditional]--> accept -> END
                                                            --[conditional]--> flag   -> END

This is only worth doing as a graph because of two things a single call
can't do: (1) cross_validate compares the new document's fields against
fields already on the return (state carried across the whole run), and
(2) a low-confidence field triggers a real retry loop — a second,
narrower extraction pass on just that field — instead of giving up after
one shot.

The actual model call is injected (`llm_call`) so the graph's routing and
retry logic can be tested without hitting the network. The default
implementation calls Google's Gemini vision API.
"""
import json
import os
from typing import Callable, List, Optional, TypedDict

from langgraph.graph import StateGraph, START, END

from .schemas import ExtractedField, ExtractionResult

MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
CONFIDENCE_THRESHOLD = 0.75
MAX_RETRIES = 1

DOC_TYPES = ["W-2", "1099-NEC", "1099-MISC", "1098", "UNKNOWN"]

CLASSIFY_PROMPT = (
    "Look at this tax document image and identify its form type. "
    f"Respond with ONLY one word, one of: {', '.join(DOC_TYPES)}. No other text."
)

EXTRACTION_SYSTEM_PROMPT = """You are a tax document field extractor for a CPA firm's platform.
Given an image of a {doc_type} tax document, extract the key monetary and
identifying fields a preparer would need.

Respond with ONLY valid JSON, no other text, in this exact shape:
{{
  "fields": [
    {{"label": "<what this value represents, e.g. 'Wages, tips, other compensation (Box 1)'>",
     "value": "<the value as it appears, e.g. '$84,210.00'>",
     "region": "<where on the document, e.g. 'Box 1'>",
     "confidence": <float 0-1, your genuine confidence this was read correctly>,
     "reasoning": "<one short sentence on how you read it / why the confidence is what it is>"}}
  ],
  "flags": ["<short plain-text warning, e.g. 'image is partially blurry near Box 5'>"]
}}

Be honest about confidence: lower it for blurry, cropped, or ambiguous
values rather than defaulting to a high number."""

TARGETED_RETRY_PROMPT = """You previously read this value from the document:
Label: {label}
Region: {region}
Value you reported: {value}
Your stated confidence was low ({confidence:.2f}).

Look ONLY at that specific region again, closely. Respond with ONLY valid
JSON in this exact shape:
{{"label": "{label}", "value": "<your re-read value>", "region": "{region}",
  "confidence": <float 0-1, your genuine updated confidence>,
  "reasoning": "<what you did differently on this second look>"}}"""


class PipelineState(TypedDict, total=False):
    document_id: str
    return_id: str
    image_bytes: bytes
    media_type: str
    existing_fields: List[dict]      # fields already on this return, from OTHER documents
    doc_type: str
    extracted_fields: List[dict]
    validation_issues: List[str]
    retry_target_index: Optional[int]
    retry_count: int
    decision: str                     # "auto_accept" | "flag_for_review"
    flags: List[str]


LLMCall = Callable[[bytes, str, str, str], str]  # (image_bytes, media_type, system_prompt, user_prompt) -> raw text


def _default_llm_call(image_bytes: bytes, media_type: str, system_prompt: str, user_prompt: str) -> str:
    from google import genai
    from google.genai import types

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set")
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=MODEL,
        contents=[types.Part.from_bytes(data=image_bytes, mime_type=media_type), user_prompt],
        config=types.GenerateContentConfig(system_instruction=system_prompt),
    )
    return (response.text or "").strip()


def _strip_json_fence(text: str) -> str:
    return text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()


# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------

def _make_classify_node(llm_call: LLMCall):
    def classify_document(state: PipelineState) -> dict:
        if not os.getenv("GEMINI_API_KEY"):
            return {"doc_type": "UNKNOWN", "flags": state.get("flags", []) + [
                "No GEMINI_API_KEY configured — classification mocked, not a real read."
            ]}
        try:
            raw = llm_call(state["image_bytes"], state["media_type"], "", CLASSIFY_PROMPT)
            doc_type = raw.strip().splitlines()[0].strip().upper()
            if doc_type not in DOC_TYPES:
                doc_type = "UNKNOWN"
            return {"doc_type": doc_type}
        except Exception as e:
            return {"doc_type": "UNKNOWN", "flags": state.get("flags", []) + [f"Classification failed: {e}"]}
    return classify_document


def _make_extract_node(llm_call: LLMCall):
    def extract_fields(state: PipelineState) -> dict:
        retry_idx = state.get("retry_target_index")

        # --- Targeted retry: re-examine ONE low-confidence field only ---
        if retry_idx is not None:
            target = state["extracted_fields"][retry_idx]
            if not os.getenv("GEMINI_API_KEY"):
                new_field = {
                    **target,
                    "confidence": min(1.0, target["confidence"] + 0.3),
                    "reasoning": target["reasoning"] + " [MOCK retry: no GEMINI_API_KEY set]",
                }
            else:
                prompt = TARGETED_RETRY_PROMPT.format(
                    label=target["label"], region=target.get("region", "this area"),
                    value=target["value"], confidence=target["confidence"],
                )
                try:
                    raw = llm_call(state["image_bytes"], state["media_type"], "", prompt)
                    new_field = json.loads(_strip_json_fence(raw))
                except Exception as e:
                    new_field = {**target, "reasoning": target["reasoning"] + f" [retry failed: {e}]"}
            fields = list(state["extracted_fields"])
            fields[retry_idx] = new_field
            return {"extracted_fields": fields, "retry_target_index": None}

        # --- Full first-pass extraction ---
        doc_type = state.get("doc_type", "UNKNOWN")
        if not os.getenv("GEMINI_API_KEY"):
            mock_field = {
                "label": "Wages, tips, other compensation (Box 1)", "value": "$0.00", "region": "Box 1",
                "confidence": 0.0, "reasoning": "MOCK RESULT: no GEMINI_API_KEY set, real extraction was not run.",
            }
            return {"extracted_fields": [mock_field],
                    "flags": state.get("flags", []) + ["No GEMINI_API_KEY configured — extraction mocked."]}

        system_prompt = EXTRACTION_SYSTEM_PROMPT.format(doc_type=doc_type)
        raw = llm_call(state["image_bytes"], state["media_type"], system_prompt,
                        "Extract the fields from this tax document.")
        parsed = json.loads(_strip_json_fence(raw))
        return {"extracted_fields": parsed.get("fields", []),
                "flags": state.get("flags", []) + parsed.get("flags", [])}

    return extract_fields


def cross_validate(state: PipelineState) -> dict:
    """
    Pure code, no LLM call — checks the newly extracted fields against
    fields already on the return (from other documents) for consistency.
    This is the part a single API call structurally cannot do, since it
    only ever sees one document at a time.

    Each issue is a dict {"message": str, "field_label": str | None} so
    the caller can link the resulting AIFlag back to the specific field.
    """
    issues: List[dict] = []
    fields = state.get("extracted_fields", [])
    existing = state.get("existing_fields", [])

    def find(fields_list, keyword):
        return next((f for f in fields_list if keyword.lower() in f.get("label", "").lower()), None)

    # 1. Employer/payer name consistency across documents on the same return
    new_employer = find(fields, "employer") or find(fields, "payer")
    if new_employer:
        prior_employer = find(existing, "employer") or find(existing, "payer")
        if prior_employer and prior_employer.get("value", "").strip().lower() != new_employer.get("value", "").strip().lower():
            issues.append({
                "message": f"Employer/payer name \"{new_employer['value']}\" on this document doesn't match "
                           f"\"{prior_employer['value']}\" already on file for this return.",
                "field_label": new_employer["label"],
            })

    # 2. W-2 sanity check: SS wages should be roughly <= Box 1 wages
    box1 = find(fields, "wages, tips")
    ss_wages = find(fields, "social security wages")
    if box1 and ss_wages:
        try:
            b1 = float(str(box1["value"]).replace("$", "").replace(",", ""))
            ss = float(str(ss_wages["value"]).replace("$", "").replace(",", ""))
            if b1 > 0 and (ss > b1 * 1.05 or ss < b1 * 0.5):
                issues.append({
                    "message": f"Social security wages (${ss:,.2f}) looks inconsistent with Box 1 wages (${b1:,.2f}) — outside the normal ratio.",
                    "field_label": ss_wages["label"],
                })
        except (ValueError, KeyError):
            pass

    # 3. Duplicate check: same label+value already recorded from a different document
    for f in fields:
        dup = next((e for e in existing if e.get("label") == f.get("label") and e.get("value") == f.get("value")), None)
        if dup:
            issues.append({
                "message": f"\"{f['label']}\" = {f['value']} matches a value already recorded from another document — possible duplicate upload.",
                "field_label": f["label"],
            })

    return {"validation_issues": issues}


def prepare_retry(state: PipelineState) -> dict:
    low_conf = [i for i, f in enumerate(state.get("extracted_fields", [])) if f.get("confidence", 1.0) < CONFIDENCE_THRESHOLD]
    target = low_conf[0] if low_conf else None
    return {"retry_target_index": target, "retry_count": state.get("retry_count", 0) + 1}


def auto_accept(state: PipelineState) -> dict:
    return {"decision": "auto_accept"}


def flag_for_review(state: PipelineState) -> dict:
    return {"decision": "flag_for_review"}


def route_after_validation(state: PipelineState) -> str:
    low_conf = [f for f in state.get("extracted_fields", []) if f.get("confidence", 1.0) < CONFIDENCE_THRESHOLD]
    if low_conf and state.get("retry_count", 0) < MAX_RETRIES:
        return "retry"
    if low_conf or state.get("validation_issues"):
        return "flag"
    return "accept"


# ---------------------------------------------------------------------------
# Graph assembly
# ---------------------------------------------------------------------------

def build_graph(llm_call: Optional[LLMCall] = None):
    """Builds and compiles the extraction graph. `llm_call` is injectable for testing."""
    llm_call = llm_call or _default_llm_call
    graph = StateGraph(PipelineState)

    graph.add_node("classify_document", _make_classify_node(llm_call))
    graph.add_node("extract_fields", _make_extract_node(llm_call))
    graph.add_node("cross_validate", cross_validate)
    graph.add_node("prepare_retry", prepare_retry)
    graph.add_node("auto_accept", auto_accept)
    graph.add_node("flag_for_review", flag_for_review)

    graph.add_edge(START, "classify_document")
    graph.add_edge("classify_document", "extract_fields")
    graph.add_edge("extract_fields", "cross_validate")
    graph.add_conditional_edges("cross_validate", route_after_validation, {
        "retry": "prepare_retry",
        "accept": "auto_accept",
        "flag": "flag_for_review",
    })
    graph.add_edge("prepare_retry", "extract_fields")  # the actual loop
    graph.add_edge("auto_accept", END)
    graph.add_edge("flag_for_review", END)

    return graph.compile()


def run_extraction_pipeline(document_id: str, return_id: str, image_bytes: bytes,
                             media_type: str, existing_fields: List[dict],
                             llm_call: Optional[LLMCall] = None) -> dict:
    """
    Public entry point. Returns a dict with: doc_type, extracted_fields
    (list of dicts matching ExtractedField shape), validation_issues,
    decision ("auto_accept" | "flag_for_review"), flags.
    """
    app = build_graph(llm_call)
    initial: PipelineState = {
        "document_id": document_id, "return_id": return_id,
        "image_bytes": image_bytes, "media_type": media_type,
        "existing_fields": existing_fields, "retry_count": 0, "flags": [],
    }
    final_state = app.invoke(initial)
    return {
        "doc_type": final_state.get("doc_type", "UNKNOWN"),
        "extracted_fields": final_state.get("extracted_fields", []),
        "validation_issues": final_state.get("validation_issues", []),
        "decision": final_state.get("decision", "flag_for_review"),
        "flags": final_state.get("flags", []),
        "retry_count": final_state.get("retry_count", 0),
    }


def to_extraction_result(document_id: str, pipeline_output: dict) -> ExtractionResult:
    """Adapts the pipeline's dict output to the existing ExtractionResult schema."""
    fields = [ExtractedField(**f) for f in pipeline_output["extracted_fields"]]
    issue_messages = [i["message"] for i in pipeline_output["validation_issues"]]
    flags = list(pipeline_output["flags"]) + issue_messages
    return ExtractionResult(document_id=document_id, fields=fields, flags=flags)
