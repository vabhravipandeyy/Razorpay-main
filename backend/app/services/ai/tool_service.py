from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.core.vehicle import normalize_vehicle_number
from app.services.analysis_service import AnalysisService
from app.repositories.eway_bill_repository import EwayBillRepository
from app.repositories.fastag_repository import FastagRepository
from app.core.logging_config import logger


class RiskToolService:
    """
    Controlled, read-only Risk Tools for AI Copilot.
    Executes through backend services to guarantee data veracity without arbitrary database queries.
    """

    @classmethod
    async def get_vehicle_risk_profile(cls, db: Session, vehicle_number: str) -> Optional[Dict[str, Any]]:
        norm_v = normalize_vehicle_number(vehicle_number)
        if not norm_v:
            return None
        analysis = await AnalysisService.analyze_vehicle(db, norm_v)
        return {
            "vehicle_number": norm_v,
            "fraud_risk_score": analysis.get("fraud_risk", {}).get("score", analysis.get("risk_score", 0)),
            "fraud_risk_level": analysis.get("fraud_risk", {}).get("level", analysis.get("risk_level", "LOW")),
            "hybrid_risk_score": analysis.get("hybrid_risk", {}).get("score", 0),
            "hybrid_risk_level": analysis.get("hybrid_risk", {}).get("level", "LOW"),
            "ml_anomaly_score": analysis.get("ml_analysis", {}).get("ml_anomaly_score", 0),
            "ml_anomaly_level": analysis.get("ml_analysis", {}).get("anomaly_level", "NORMAL"),
            "compliance_score": analysis.get("compliance_score", 100),
            "compliance_level": analysis.get("compliance_level", "COMPLIANT"),
            "trust_score": analysis.get("trust_score", 100),
            "trust_level": analysis.get("trust_level", "HIGH TRUST"),
            "confidence_score": analysis.get("confidence_score", 100),
            "confidence_level": analysis.get("confidence_level", "HIGH CONFIDENCE"),
            "investigation_priority": analysis.get("decision", {}).get("priority", "NORMAL"),
            "financial_exposure_inr": analysis.get("financial_context", {}).get("total_associated_value_inr", 0),
        }

    @classmethod
    async def get_vehicle_evidence(cls, db: Session, vehicle_number: str) -> Optional[List[Dict[str, Any]]]:
        norm_v = normalize_vehicle_number(vehicle_number)
        if not norm_v:
            return None
        analysis = await AnalysisService.analyze_vehicle(db, norm_v)
        return analysis.get("evidence", [])

    @classmethod
    async def get_vehicle_rules(cls, db: Session, vehicle_number: str) -> Optional[List[Dict[str, Any]]]:
        norm_v = normalize_vehicle_number(vehicle_number)
        if not norm_v:
            return None
        analysis = await AnalysisService.analyze_vehicle(db, norm_v)
        return analysis.get("rules", [])

    @classmethod
    async def get_fastag_events(cls, db: Session, vehicle_number: str) -> Optional[List[Dict[str, Any]]]:
        norm_v = normalize_vehicle_number(vehicle_number)
        if not norm_v:
            return None
        txs = FastagRepository.get_by_vehicle(db, norm_v)
        return [
            {
                "toll_id": t.toll_id,
                "toll_name": t.toll_name,
                "timestamp": t.readertme.isoformat() if t.readertme else None,
                "latitude": float(t.geo_lat) if t.geo_lat is not None else None,
                "longitude": float(t.geo_long) if t.geo_long is not None else None,
                "highway": t.highway_type,
            }
            for t in sorted(txs, key=lambda x: x.readertme if x.readertme else "")
        ]

    @classmethod
    async def get_eway_bills(cls, db: Session, vehicle_number: str) -> Optional[List[Dict[str, Any]]]:
        norm_v = normalize_vehicle_number(vehicle_number)
        if not norm_v:
            return None
        ewbs = EwayBillRepository.get_by_vehicle(db, norm_v)
        return [
            {
                "ewb_no": e.ewb_no,
                "from_pin": e.from_pin,
                "to_pin": e.to_pin,
                "declared_distance_km": float(e.travel_distance or 0),
                "invoice_value_inr": float(e.ewb_ass_amt or 0),
                "start_time": e.ewb_dt.isoformat() if e.ewb_dt else None,
                "valid_until": e.ewb_final_valid_dt.isoformat() if e.ewb_final_valid_dt else None,
            }
            for e in ewbs
        ]

    @classmethod
    async def get_investigation_recommendations(cls, db: Session, vehicle_number: str) -> Optional[Dict[str, Any]]:
        norm_v = normalize_vehicle_number(vehicle_number)
        if not norm_v:
            return None
        analysis = await AnalysisService.analyze_vehicle(db, norm_v)
        return analysis.get("decision", {})
