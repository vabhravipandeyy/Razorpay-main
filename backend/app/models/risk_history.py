from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.base import Base


class VehicleRiskHistory(Base):
    __tablename__ = "vehicle_risk_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    vehicle_number = Column(String(50), index=True, nullable=False)
    risk_score = Column(Integer, default=0, nullable=False)
    risk_level = Column(String(20), default="LOW", nullable=False)
    rule_score = Column(Integer, default=0, nullable=False)
    ml_anomaly_score = Column(Integer, default=0, nullable=False)
    hybrid_risk_score = Column(Integer, default=0, nullable=False)
    compliance_score = Column(Integer, default=100, nullable=False)
    trust_score = Column(Integer, default=100, nullable=False)
    confidence_score = Column(Integer, default=100, nullable=False)
    trigger_source = Column(String(50), default="ANALYSIS", nullable=False)  # ANALYSIS, BATCH_SYNC, MANUAL, CASE_CREATION
    recorded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_vrh_vehicle_recorded", "vehicle_number", "recorded_at"),
        Index("ix_vrh_level_recorded", "risk_level", "recorded_at"),
    )


class ReportMetadata(Base):
    __tablename__ = "report_metadata"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    report_type = Column(String(50), index=True, nullable=False)  # EXECUTIVE_REPORT, VEHICLE_REPORT, INVESTIGATION_REPORT, REGIONAL_REPORT
    title = Column(String(255), nullable=False)
    generated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    parameters_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    generator = relationship("User")
