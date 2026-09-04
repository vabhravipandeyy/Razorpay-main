from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from app.core.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    username = Column(String(50), nullable=True, index=True)
    action = Column(String(50), nullable=False, index=True)  # LOGIN, USER_CREATED, VEHICLE_ANALYZED, etc.
    resource_type = Column(String(50), nullable=True)  # USER, VEHICLE, ML_MODEL, RAG_STORE, SYSTEM
    resource_id = Column(String(100), nullable=True)  # e.g. vehicle number, user ID
    status = Column(String(20), default="SUCCESS", nullable=False)  # SUCCESS, FAILURE, FORBIDDEN
    ip_hash = Column(String(64), nullable=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
