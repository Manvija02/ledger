from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/returns", tags=["returns"])


def _to_out(r: models.Return) -> schemas.ReturnOut:
    return schemas.ReturnOut(
        id=r.id, client_name=r.client_name, client_id=r.client_id, type=r.type,
        year=r.year, stage=r.stage, preparer=r.preparer, reviewer=r.reviewer,
        urgency=r.urgency, due_date=r.due_date, blocked=r.blocked,
        is_staff_personal=r.is_staff_personal, docs_count=len(r.documents),
    )


@router.get("", response_model=List[schemas.ReturnOut])
def list_returns(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """
    Scoped by role, same rule the old ROLE_NAV/permissions logic encoded on
    the frontend: clients only see their own return(s), staff see the firm's
    queue (minus self-review restrictions handled at the write-endpoints).
    """
    q = db.query(models.Return)
    if current_user.role == "client":
        q = q.filter(models.Return.client_id == current_user.id)
    return [_to_out(r) for r in q.all()]


@router.get("/{return_id}", response_model=schemas.ReturnOut)
def get_return(return_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    r = db.query(models.Return).filter(models.Return.id == return_id).first()
    if not r:
        raise HTTPException(404, "Return not found")
    if current_user.role == "client" and r.client_id != current_user.id:
        raise HTTPException(403, "Not your return")
    return _to_out(r)


@router.post("", response_model=schemas.ReturnOut)
def create_return(payload: schemas.ReturnCreate, db: Session = Depends(get_db),
                   current_user: models.User = Depends(auth.require_role("preparer", "admin"))):
    import uuid
    r = models.Return(
        id=f"ret_{uuid.uuid4().hex[:8]}", client_name=payload.client_name,
        client_id=payload.client_id, type=payload.type, year=payload.year,
        preparer=payload.preparer, stage="Intake", urgency="low",
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return _to_out(r)


@router.patch("/{return_id}/stage", response_model=schemas.ReturnOut)
def update_stage(return_id: str, payload: schemas.StageUpdate, db: Session = Depends(get_db),
                  current_user: models.User = Depends(auth.require_role("preparer", "reviewer", "admin"))):
    r = db.query(models.Return).filter(models.Return.id == return_id).first()
    if not r:
        raise HTTPException(404, "Return not found")
    r.stage = payload.stage
    db.commit()
    db.refresh(r)
    return _to_out(r)


@router.get("/{return_id}/fields", response_model=List[schemas.FieldOut])
def list_fields(return_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Field).filter(models.Field.return_id == return_id).all()


@router.get("/{return_id}/tasks", response_model=List[schemas.TaskOut])
def list_tasks_for_return(return_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Task).filter(models.Task.return_id == return_id).all()


@router.get("/{return_id}/ai-flags", response_model=List[schemas.AIFlagOut])
def list_flags(return_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.AIFlag).filter(models.AIFlag.return_id == return_id).all()
