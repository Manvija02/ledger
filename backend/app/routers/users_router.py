from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=List[schemas.UserOut])
def list_users(db: Session = Depends(get_db),
               current_user: models.User = Depends(auth.require_role("preparer", "reviewer", "admin", "seasonal"))):
    """Staff directory for the Team page. Clients can't list other users."""
    return db.query(models.User).all()
