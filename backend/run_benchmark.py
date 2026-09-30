"""
Runs the REAL extraction pipeline (ai_pipeline.py, real Gemini API call —
not a mock, not me reading images) against the 6 synthetic tax documents
in benchmark_docs/, and scores the result against known ground truth.

Usage:
    cd backend
    pip install -r requirements.txt
    export GEMINI_API_KEY=your_key_here      # https://aistudio.google.com/apikey
    python run_benchmark.py

Takes about 30-60 seconds (a handful of real API calls). Prints a
per-field table and a final coverage percentage.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

if not os.getenv("GEMINI_API_KEY"):
    print("ERROR: GEMINI_API_KEY is not set.")
    print("Get a free key at https://aistudio.google.com/apikey, then:")
    print("  export GEMINI_API_KEY=your_key_here")
    sys.exit(1)

from app import ai_pipeline  # noqa: E402

HERE = os.path.dirname(__file__)
DOCS_DIR = os.path.join(HERE, "benchmark_docs")
GROUND_TRUTH_PATH = os.path.join(HERE, "benchmark_ground_truth.json")

# Ground-truth field names use short keys (e.g. "box1_wages"); the pipeline
# returns human-readable labels (e.g. "Wages, tips, other compensation
# (Box 1)"). This maps one to the other so scoring can match them up.
FIELD_LABEL_KEYWORDS = {
    "employer_name": "employer",
    "employee_name": "employee",
    "box1_wages": "wages, tips",
    "box2_fed_tax_withheld": "federal income tax withheld",
    "box3_ss_wages": "social security wages",
    "payer_name": "payer",
    "recipient_name": "recipient",
    "box1_nonemployee_comp": "nonemployee compensation",
    "box4_fed_tax_withheld": "federal income tax withheld",
}


def normalize(v):
    if isinstance(v, (int, float)):
        return round(float(v), 2)
    s = str(v).replace("$", "").replace(",", "").strip()
    try:
        return round(float(s), 2)
    except ValueError:
        return s.lower()


def find_extracted(fields, keyword):
    return next((f for f in fields if keyword in f.get("label", "").lower()), None)


def main():
    ground_truth = json.load(open(GROUND_TRUTH_PATH))
    total = 0
    correct = 0
    rows = []

    for doc in ground_truth:
        doc_id = doc["doc_id"]
        image_path = os.path.join(DOCS_DIR, f"{doc_id}.png")
        print(f"Running real extraction on {doc_id}...", file=sys.stderr)

        with open(image_path, "rb") as f:
            image_bytes = f.read()

        output = ai_pipeline.run_extraction_pipeline(
            document_id=doc_id, return_id="benchmark", image_bytes=image_bytes,
            media_type="image/png", existing_fields=[],
        )
        extracted = output["extracted_fields"]

        for field_key, true_val in doc["fields"].items():
            total += 1
            keyword = FIELD_LABEL_KEYWORDS[field_key]
            got = find_extracted(extracted, keyword)
            got_val = got["value"] if got else None
            ok = got_val is not None and normalize(got_val) == normalize(true_val)
            if ok:
                correct += 1
            rows.append((doc_id, field_key, true_val, got_val, got["confidence"] if got else None, ok))

    print()
    print(f"{'doc':<16}{'field':<24}{'ground truth':<16}{'extracted':<16}{'confidence':<12}{'match'}")
    for r in rows:
        conf_str = f"{r[4]:.2f}" if r[4] is not None else "n/a"
        print(f"{r[0]:<16}{r[1]:<24}{str(r[2]):<16}{str(r[3]):<16}{conf_str:<12}{'OK' if r[5] else 'MISS'}")

    print()
    print(f"Coverage: {correct}/{total} fields correct = {100*correct/total:.1f}%")
    print()
    print("This ran the real ai_pipeline.py (classify -> extract -> cross_validate ->")
    print("retry/accept/flag), making real calls to the Gemini API you configured.")


if __name__ == "__main__":
    main()
