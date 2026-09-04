from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.dialects.mysql import LONGTEXT

from app.core.base import Base


class VehicleAnalysisRecord(Base):
    __tablename__ = "vehicle_analysis_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    vehicle_number = Column(String(50), unique=True, index=True, nullable=False)
    risk_score = Column(Integer, index=True, nullable=False)
    risk_level = Column(String(20), index=True, nullable=False)  # HIGH, MEDIUM, LOW
    eway_bill_count = Column(Integer, default=0, nullable=False)
    fastag_count = Column(Integer, default=0, nullable=False)
    failed_rules_count = Column(Integer, default=0, nullable=False)
    summary_reasons = Column(Text().with_variant(LONGTEXT, "mysql"), nullable=True)
    analysis_data = Column(Text().with_variant(LONGTEXT, "mysql"), nullable=False)  # Supports up to 4GB JSON payload
    analyzed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True, nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
