"""
Pydantic schemas: the request/response "contract" for the API.
This is the file both the frontend team and the AI-pipeline piece should
treat as the source of truth for data shapes.
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ---------- Auth ----------

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- Users ----------

class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    initials: Optional[str] = None
    firm_role: Optional[str] = None
    note: Optional[str] = None
    first_run: bool = False

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str
    firm_role: Optional[str] = None


# ---------- Documents ----------

class DocumentOut(BaseModel):
    id: str
    return_id: str
    name: str
    type: str
    pages: int
    uploaded_at: datetime
    uploaded_by: Optional[str] = None
    status: str

    class Config:
        from_attributes = True


# ---------- Fields ----------

class FieldOut(BaseModel):
    id: str
    return_id: str
    document_id: Optional[str] = None
    label: str
    value: Optional[str] = None
    page: Optional[int] = None
    region: Optional[str] = None
    transform: Optional[str] = None
    confidence: Optional[float] = None
    ai_generated: bool
    verified: bool
    editable: bool
    flagged: bool
    locked: bool
    source: Optional[str] = None
    corrected_by: Optional[str] = None
    corrected_from: Optional[str] = None

    class Config:
        from_attributes = True


class FieldCorrection(BaseModel):
    value: str
    corrected_by: str


# ---------- Returns ----------

class ReturnOut(BaseModel):
    id: str
    client_name: str
    client_id: Optional[str] = None
    type: str
    year: int
    stage: str
    preparer: Optional[str] = None
    reviewer: Optional[str] = None
    urgency: str
    due_date: Optional[str] = None
    blocked: bool
    is_staff_personal: bool
    docs_count: int = 0

    class Config:
        from_attributes = True


class ReturnCreate(BaseModel):
    client_name: str
    client_id: Optional[str] = None
    type: str
    year: int
    preparer: Optional[str] = None


class StageUpdate(BaseModel):
    stage: str


# ---------- Messages ----------

class MessageOut(BaseModel):
    id: str
    return_id: str
    visibility: str
    from_name: str
    role: Optional[str] = None
    linked_type: Optional[str] = None
    linked_id: Optional[str] = None
    linked_label: Optional[str] = None
    text: str
    created_at: datetime
    owner_next: Optional[str] = None
    resolved: bool

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    visibility: str = "client"
    text: str
    linked_type: Optional[str] = None
    linked_id: Optional[str] = None
    linked_label: Optional[str] = None
    owner_next: Optional[str] = None


# ---------- Tasks ----------

class TaskOut(BaseModel):
    id: str
    return_id: str
    title: str
    owner_user_id: Optional[str] = None
    urgency: str
    due: Optional[str] = None
    reason: Optional[str] = None

    class Config:
        from_attributes = True


# ---------- AI Flags ----------

class AIFlagOut(BaseModel):
    id: str
    return_id: str
    kind: str
    title: str
    confidence: Optional[float] = None
    field_id: Optional[str] = None
    evidence: List[str] = []
    suggestion: Optional[str] = None
    client_summary: Optional[str] = None
    status: str

    class Config:
        from_attributes = True


class AIFlagAction(BaseModel):
    action: str  # "accept" | "dismiss"
    corrected_value: Optional[str] = None  # required if action == "correct"


# ---------- AI Extraction ----------

class ExtractedField(BaseModel):
    label: str
    value: str
    region: Optional[str] = None
    confidence: float
    reasoning: str


class ExtractionResult(BaseModel):
    document_id: str
    fields: List[ExtractedField]
    flags: List[str] = []  # short plain-text warnings the model raised, if any
