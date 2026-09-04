import json
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.vehicle_analysis import VehicleAnalysisRecord
from app.core.vehicle import normalize_vehicle_number


class VehicleAnalysisRepository:

    @staticmethod
    def save_or_update(db: Session, vehicle_number: str, analysis: Dict[str, Any]) -> VehicleAnalysisRecord:
        v_num = normalize_vehicle_number(vehicle_number) or vehicle_number.strip()
        failed_rules = [r["rule"] for r in analysis.get("rules", []) if not r.get("passed", True)]
        failed_rules_count = len(failed_rules)
        summary_reasons = ", ".join(failed_rules) if failed_rules else "All rules passed"
        
        json_data = json.dumps(analysis, default=str)
        try:
            existing = db.query(VehicleAnalysisRecord).filter(
                (VehicleAnalysisRecord.vehicle_number == v_num) |
                (VehicleAnalysisRecord.vehicle_number == vehicle_number)
            ).first()

            if existing:
                existing.risk_score = analysis.get("risk_score", 0)
                existing.risk_level = analysis.get("risk_level", "LOW")
                existing.eway_bill_count = analysis.get("eway_bill_count", 0)
                existing.fastag_count = analysis.get("fastag_count", 0)
                existing.failed_rules_count = failed_rules_count
                existing.summary_reasons = summary_reasons
                existing.analysis_data = json_data
                existing.updated_at = datetime.now(timezone.utc)
                db.commit()
                db.refresh(existing)
                return existing
            else:
                record = VehicleAnalysisRecord(
                    vehicle_number=v_num,
                    risk_score=analysis.get("risk_score", 0),
                    risk_level=analysis.get("risk_level", "LOW"),
                    eway_bill_count=analysis.get("eway_bill_count", 0),
                    fastag_count=analysis.get("fastag_count", 0),
                    failed_rules_count=failed_rules_count,
                    summary_reasons=summary_reasons,
                    analysis_data=json_data,
                    analyzed_at=datetime.now(timezone.utc),
                )
                db.add(record)
                db.commit()
                db.refresh(record)
                return record
        except Exception:
            db.rollback()
            existing = db.query(VehicleAnalysisRecord).filter(
                (VehicleAnalysisRecord.vehicle_number == v_num) |
                (VehicleAnalysisRecord.vehicle_number == vehicle_number)
            ).first()
            if existing:
                existing.risk_score = analysis.get("risk_score", 0)
                existing.risk_level = analysis.get("risk_level", "LOW")
                existing.analysis_data = json_data
                db.commit()
                return existing
            raise


    @staticmethod
    def get_records(
        db: Session,
        search: Optional[str] = None,
        risk_level: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[VehicleAnalysisRecord]:
        query = db.query(VehicleAnalysisRecord)

        if search:
            clean_search = search.strip()
            norm_search = normalize_vehicle_number(search)
            query = query.filter(
                (VehicleAnalysisRecord.vehicle_number.ilike(f"%{clean_search}%")) |
                (VehicleAnalysisRecord.vehicle_number.ilike(f"%{norm_search}%"))
            )

        if risk_level and risk_level.upper() in ["HIGH", "MEDIUM", "LOW"]:
            query = query.filter(VehicleAnalysisRecord.risk_level == risk_level.upper())

        return (
            query.order_by(VehicleAnalysisRecord.risk_score.desc(), VehicleAnalysisRecord.analyzed_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_count(
        db: Session,
        search: Optional[str] = None,
        risk_level: Optional[str] = None
    ) -> int:
        query = db.query(func.count(VehicleAnalysisRecord.id))

        if search:
            clean_search = search.strip()
            norm_search = normalize_vehicle_number(search)
            query = query.filter(
                (VehicleAnalysisRecord.vehicle_number.ilike(f"%{clean_search}%")) |
                (VehicleAnalysisRecord.vehicle_number.ilike(f"%{norm_search}%"))
            )

        if risk_level and risk_level.upper() in ["HIGH", "MEDIUM", "LOW"]:
            query = query.filter(VehicleAnalysisRecord.risk_level == risk_level.upper())

        return query.scalar() or 0

    @staticmethod
    def get_by_vehicle(db: Session, vehicle_number: str) -> Optional[VehicleAnalysisRecord]:
        norm = normalize_vehicle_number(vehicle_number)
        raw = vehicle_number.strip() if vehicle_number else ""
        return db.query(VehicleAnalysisRecord).filter(
            (VehicleAnalysisRecord.vehicle_number == norm) |
            (VehicleAnalysisRecord.vehicle_number == raw)
        ).first()

    @staticmethod
    def get_stats(db: Session) -> Dict[str, Any]:
        total_records = db.query(func.count(VehicleAnalysisRecord.id)).scalar() or 0
        high_risk = db.query(func.count(VehicleAnalysisRecord.id)).filter(VehicleAnalysisRecord.risk_level == "HIGH").scalar() or 0
        medium_risk = db.query(func.count(VehicleAnalysisRecord.id)).filter(VehicleAnalysisRecord.risk_level == "MEDIUM").scalar() or 0
        low_risk = db.query(func.count(VehicleAnalysisRecord.id)).filter(VehicleAnalysisRecord.risk_level == "LOW").scalar() or 0
        avg_score = db.query(func.avg(VehicleAnalysisRecord.risk_score)).scalar() or 0.0

        return {
            "total_records": total_records,
            "high_risk": high_risk,
            "medium_risk": medium_risk,
            "low_risk": low_risk,
            "average_risk_score": round(float(avg_score), 1)
        }
