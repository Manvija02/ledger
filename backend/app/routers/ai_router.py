import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, auth, ai_pipeline
from ..database import get_db

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/extract/{document_id}", response_model=schemas.ExtractionResult)
def extract_document(document_id: str, db: Session = Depends(get_db),
                      current_user: models.User = Depends(auth.require_role("preparer", "reviewer", "admin", "seasonal"))):
    """
    Runs the LangGraph extraction pipeline on an uploaded document:
    classify -> extract -> cross-validate against the return's other
    documents -> retry low-confidence fields once -> route to auto-accept
    or flag for human review. Persists the results as Field rows (and
    AIFlag rows for anything low-confidence or inconsistent) so Review &
    Traceability reflects genuine model output, not fabricated data.
    """
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc or not doc.storage_path:
        raise HTTPException(404, "Document not found or has no stored file")

    with open(doc.storage_path, "rb") as f:
        image_bytes = f.read()
    media_type = "application/pdf" if doc.storage_path.endswith(".pdf") else "image/png"

    # Fields already on this return from OTHER documents — this is what
    # lets cross_validate catch a mismatched employer name or a duplicate
    # upload, which a single isolated API call structurally can't do.
    existing_field_rows = (
        db.query(models.Field)
        .filter(models.Field.return_id == doc.return_id, models.Field.document_id != doc.id)
        .all()
    )
    existing_fields = [{"label": f.label, "value": f.value} for f in existing_field_rows]

    output = ai_pipeline.run_extraction_pipeline(
        document_id=doc.id, return_id=doc.return_id,
        image_bytes=image_bytes, media_type=media_type,
        existing_fields=existing_fields,
    )
    auto_verified = output["decision"] == "auto_accept"

    label_to_field_id = {}
    for ef in output["extracted_fields"]:
        field = models.Field(
            id=f"f_{uuid.uuid4().hex[:10]}", return_id=doc.return_id, document_id=doc.id,
            label=ef["label"], value=ef["value"], region=ef.get("region"), transform=ef.get("reasoning"),
            confidence=ef.get("confidence"), ai_generated=True,
            verified=auto_verified, flagged=(not auto_verified) and ef.get("confidence", 1.0) < 0.75,
            editable=True, source="ai-extracted",
        )
        db.add(field)
        db.flush()  # so field.id is available below
        label_to_field_id[ef["label"]] = field.id

        if not auto_verified and ef.get("confidence", 1.0) < 0.75:
            db.add(models.AIFlag(
                id=f"a_{uuid.uuid4().hex[:10]}", return_id=doc.return_id, kind="warning",
                title=f"Low confidence on: {ef['label']}", confidence=ef.get("confidence"), field_id=field.id,
                evidence=[ef.get("reasoning", "")], suggestion="Review this value against the source document before sign-off.",
                client_summary="One of your document values needs a closer look from your preparer.",
            ))

    # Cross-document validation issues become their own flags, linked back
    # to whichever field the pipeline determined was responsible.
    for issue in output["validation_issues"]:
        db.add(models.AIFlag(
            id=f"a_{uuid.uuid4().hex[:10]}", return_id=doc.return_id, kind="warning",
            title=f"Inconsistency detected ({output['doc_type']})",
            field_id=label_to_field_id.get(issue["field_label"]),
            evidence=[issue["message"]],
            suggestion="Compare against the other document(s) on this return before sign-off.",
            client_summary="We spotted something on this document that doesn't quite match your other records — your preparer will take a look.",
        ))

    doc.status = "processed" if auto_verified else "flagged"
    db.commit()
    return ai_pipeline.to_extraction_result(document_id, output)


@router.post("/flags/{flag_id}", response_model=schemas.AIFlagOut)
def act_on_flag(flag_id: str, payload: schemas.AIFlagAction, db: Session = Depends(get_db),
                 current_user: models.User = Depends(auth.require_role("preparer", "reviewer", "admin", "seasonal"))):
    flag = db.query(models.AIFlag).filter(models.AIFlag.id == flag_id).first()
    if not flag:
        raise HTTPException(404, "Flag not found")

    if payload.action == "accept":
        flag.status = "accepted"
        if flag.field_id:
            field = db.query(models.Field).filter(models.Field.id == flag.field_id).first()
            if field:
                field.verified = True
                field.flagged = False
    elif payload.action == "correct":
        if not payload.corrected_value:
            raise HTTPException(400, "corrected_value required for a correction")
        flag.status = "corrected"
        if flag.field_id:
            field = db.query(models.Field).filter(models.Field.id == flag.field_id).first()
            if field:
                field.corrected_from = field.value
                field.value = payload.corrected_value
                field.corrected_by = current_user.name
                field.verified = True
                field.flagged = False
    elif payload.action == "dismiss":
        flag.status = "dismissed"
    else:
        raise HTTPException(400, "action must be accept, correct, or dismiss")

    db.commit()
    db.refresh(flag)
    return flag


@router.patch("/fields/{field_id}", response_model=schemas.FieldOut)
def correct_field(field_id: str, payload: schemas.FieldCorrection, db: Session = Depends(get_db),
                   current_user: models.User = Depends(auth.require_role("preparer", "reviewer", "admin", "seasonal"))):
    """Manual correction directly on a field (the 'corrected by X, was $Y' trail)."""
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field:
        raise HTTPException(404, "Field not found")
    if field.locked:
        raise HTTPException(403, "This field is locked")
    field.corrected_from = field.value
    field.value = payload.value
    field.corrected_by = payload.corrected_by
    field.verified = True
    field.flagged = False
    db.commit()
    db.refresh(field)
    return field
