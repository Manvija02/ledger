import os
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/documents", tags=["documents"])

STORAGE_DIR = os.getenv("STORAGE_DIR", "./storage")
os.makedirs(STORAGE_DIR, exist_ok=True)


@router.get("", response_model=List[schemas.DocumentOut])
def list_documents(return_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Document).filter(models.Document.return_id == return_id).all()


@router.post("", response_model=schemas.DocumentOut)
async def upload_document(
    return_id: str = Form(...),
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    ret = db.query(models.Return).filter(models.Return.id == return_id).first()
    if not ret:
        raise HTTPException(404, "Return not found")
    if current_user.role == "client" and ret.client_id != current_user.id:
        raise HTTPException(403, "Not your return")

    doc_id = f"doc_{uuid.uuid4().hex[:10]}"
    ext = os.path.splitext(file.filename or "")[1] or ".bin"
    storage_path = os.path.join(STORAGE_DIR, f"{doc_id}{ext}")

    contents = await file.read()
    with open(storage_path, "wb") as f:
        f.write(contents)

    doc = models.Document(
        id=doc_id, return_id=return_id, name=file.filename or doc_type, type=doc_type,
        pages=1, storage_path=storage_path,
        uploaded_by=current_user.name, status="processing",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/{document_id}", response_model=schemas.DocumentOut)
def get_document(document_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc
