import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/returns/{return_id}/messages", tags=["messages"])


@router.get("", response_model=List[schemas.MessageOut])
def list_messages(return_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    q = db.query(models.Message).filter(models.Message.return_id == return_id)
    if current_user.role == "client":
        q = q.filter(models.Message.visibility == "client")  # clients never see internal threads
    return q.order_by(models.Message.created_at).all()


@router.post("", response_model=schemas.MessageOut)
def create_message(return_id: str, payload: schemas.MessageCreate, db: Session = Depends(get_db),
                    current_user: models.User = Depends(auth.get_current_user)):
    ret = db.query(models.Return).filter(models.Return.id == return_id).first()
    if not ret:
        raise HTTPException(404, "Return not found")
    if current_user.role == "client" and payload.visibility == "internal":
        raise HTTPException(403, "Clients cannot post to internal threads")

    msg = models.Message(
        id=f"m_{uuid.uuid4().hex[:10]}", return_id=return_id, visibility=payload.visibility,
        from_user_id=current_user.id, from_name=current_user.name, role=current_user.role,
        linked_type=payload.linked_type, linked_id=payload.linked_id, linked_label=payload.linked_label,
        text=payload.text, owner_next=payload.owner_next, resolved=False,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg
