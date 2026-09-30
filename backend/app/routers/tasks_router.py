from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/tasks", tags=["tasks"])

URGENCY_RANK = {"critical": 0, "high": 1, "medium": 2, "low": 3}


@router.get("", response_model=List[schemas.TaskOut])
def list_tasks(
    owner_user_id: Optional[str] = None,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Real prioritization (Challenge 07): sorted by urgency rank then due
    date, not a hardcoded order. Defaults to the current user's own queue.
    Pass owner_user_id="all" (admin only) for the firm-wide view.
    """
    q = db.query(models.Task)
    if owner_user_id == "all":
        if current_user.role != "admin":
            raise HTTPException(403, "Only admins can view the firm-wide task list")
        # no filter — every task in the firm
    else:
        scope = owner_user_id or current_user.id
        if current_user.role not in ("admin",) and scope != current_user.id:
            scope = current_user.id  # non-admins can only ever see their own queue
        q = q.filter(models.Task.owner_user_id == scope)

    tasks = q.all()
    tasks.sort(key=lambda t: (URGENCY_RANK.get(t.urgency, 9), t.due or "9999-99-99"))
    return tasks[:limit]
