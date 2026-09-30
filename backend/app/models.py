"""
Database models. These mirror the shapes that used to live as hardcoded
JS objects in the frontend's src/data.js, now as real, persisted tables.
"""
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, ForeignKey, DateTime, Text, JSON
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .database import Base


def now_utc():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)  # client | preparer | reviewer | admin | seasonal
    initials = Column(String, nullable=True)
    firm_role = Column(String, nullable=True)
    note = Column(String, nullable=True)
    first_run = Column(Boolean, default=False)

    returns_as_client = relationship("Return", back_populates="client", foreign_keys="Return.client_id")


class Return(Base):
    __tablename__ = "returns"

    id = Column(String, primary_key=True)
    client_name = Column(String, nullable=False)
    client_id = Column(String, ForeignKey("users.id"), nullable=True)
    type = Column(String, nullable=False)  # Individual (1040) | Partnership (1065) | Trust (1041)
    year = Column(Integer, nullable=False)
    stage = Column(String, nullable=False, default="Intake")
    preparer = Column(String, nullable=True)
    reviewer = Column(String, nullable=True)
    urgency = Column(String, nullable=False, default="low")
    due_date = Column(String, nullable=True)
    blocked = Column(Boolean, default=False)
    is_staff_personal = Column(Boolean, default=False)

    client = relationship("User", back_populates="returns_as_client", foreign_keys=[client_id])
    documents = relationship("Document", back_populates="return_", cascade="all, delete-orphan")
    fields = relationship("Field", back_populates="return_", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="return_", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="return_", cascade="all, delete-orphan")
    ai_flags = relationship("AIFlag", back_populates="return_", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True)
    return_id = Column(String, ForeignKey("returns.id"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    pages = Column(Integer, default=1)
    storage_path = Column(String, nullable=True)  # where the real file bytes live on disk/blob storage
    uploaded_at = Column(DateTime, default=now_utc)
    uploaded_by = Column(String, nullable=True)
    status = Column(String, default="processing")  # processing | processed | needs-review | flagged

    return_ = relationship("Return", back_populates="documents")
    fields = relationship("Field", back_populates="document")


class Field(Base):
    """A single extracted/entered value on a return, e.g. 'Wages (Line 1a)'."""
    __tablename__ = "fields"

    id = Column(String, primary_key=True)
    return_id = Column(String, ForeignKey("returns.id"), nullable=False)
    document_id = Column(String, ForeignKey("documents.id"), nullable=True)
    label = Column(String, nullable=False)
    value = Column(String, nullable=True)
    page = Column(Integer, nullable=True)
    region = Column(String, nullable=True)          # e.g. "Box 1" — where on the doc this came from
    transform = Column(String, nullable=True)        # human-readable explanation of how the value was derived
    confidence = Column(Float, nullable=True)         # real AI confidence, 0-1
    ai_generated = Column(Boolean, default=False)
    verified = Column(Boolean, default=False)
    editable = Column(Boolean, default=True)
    flagged = Column(Boolean, default=False)
    locked = Column(Boolean, default=False)
    source = Column(String, nullable=True)            # 'ai-extracted' | 'client-entered' | 'preparer-locked'
    corrected_by = Column(String, nullable=True)
    corrected_from = Column(String, nullable=True)     # previous value, for the "was $X" trail

    return_ = relationship("Return", back_populates="fields")
    document = relationship("Document", back_populates="fields")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True)
    return_id = Column(String, ForeignKey("returns.id"), nullable=False)
    visibility = Column(String, default="client")  # client | internal
    from_user_id = Column(String, ForeignKey("users.id"), nullable=True)
    from_name = Column(String, nullable=False)
    role = Column(String, nullable=True)
    linked_type = Column(String, nullable=True)   # document | field | task
    linked_id = Column(String, nullable=True)
    linked_label = Column(String, nullable=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=now_utc)
    owner_next = Column(String, nullable=True)
    resolved = Column(Boolean, default=False)

    return_ = relationship("Return", back_populates="messages")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True)
    return_id = Column(String, ForeignKey("returns.id"), nullable=False)
    title = Column(String, nullable=False)
    owner_user_id = Column(String, ForeignKey("users.id"), nullable=True)
    urgency = Column(String, default="medium")
    due = Column(String, nullable=True)
    reason = Column(String, nullable=True)

    return_ = relationship("Return", back_populates="tasks")


class AIFlag(Base):
    __tablename__ = "ai_flags"

    id = Column(String, primary_key=True)
    return_id = Column(String, ForeignKey("returns.id"), nullable=False)
    kind = Column(String, default="info")  # info | warning
    title = Column(String, nullable=False)
    confidence = Column(Float, nullable=True)
    field_id = Column(String, ForeignKey("fields.id"), nullable=True)
    evidence = Column(JSON, default=list)
    suggestion = Column(String, nullable=True)
    client_summary = Column(String, nullable=True)
    status = Column(String, default="open")  # open | accepted | corrected | dismissed

    return_ = relationship("Return", back_populates="ai_flags")
