from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float
from sqlalchemy.orm import relationship
from app.core.base import Base


class InvestigationCase(Base):
    __tablename__ = "investigation_cases"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    case_number = Column(String(50), unique=True, index=True, nullable=False)
    vehicle_number = Column(String(50), index=True, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_to = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Immutable snapshot at case creation
    risk_score = Column(Integer, default=0, nullable=False)
    risk_level = Column(String(20), default="LOW", nullable=False)
    investigation_priority = Column(String(30), default="NORMAL", nullable=False)
    snapshot_json = Column(Text, nullable=True)

    status = Column(String(30), default="NEW", index=True, nullable=False)  # NEW, UNDER_REVIEW, INVESTIGATION, RESOLVED, CLOSED
    title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)

    # Resolution & Closure
    resolution_type = Column(String(50), nullable=True)  # NO_ISSUE_FOUND, DATA_ERROR, COMPLIANCE_ISSUE, SUSPICIOUS_ACTIVITY_CONFIRMED, REFERRED_FOR_FURTHER_REVIEW, OTHER
    resolution_summary = Column(Text, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    resolution_evidence_ids = Column(Text, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    closed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    creator = relationship("User", foreign_keys=[created_by], backref="created_cases")
    assignee = relationship("User", foreign_keys=[assigned_to], backref="assigned_cases")
    closer = relationship("User", foreign_keys=[closed_by])
    notes = relationship("InvestigationNote", back_populates="case", cascade="all, delete-orphan", order_by="InvestigationNote.created_at")
    evidence_reviews = relationship("CaseEvidenceReview", back_populates="case", cascade="all, delete-orphan")


class InvestigationNote(Base):
    __tablename__ = "investigation_notes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    case_id = Column(Integer, ForeignKey("investigation_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    case = relationship("InvestigationCase", back_populates="notes")
    author = relationship("User")


class CaseEvidenceReview(Base):
    __tablename__ = "case_evidence_reviews"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    case_id = Column(Integer, ForeignKey("investigation_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    evidence_id = Column(String(100), nullable=False, index=True)
    status = Column(String(30), default="REVIEWED", nullable=False)  # REVIEWED, RELEVANT, NOT_RELEVANT, UNREVIEWED
    notes = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    case = relationship("InvestigationCase", back_populates="evidence_reviews")
    reviewer = relationship("User")
