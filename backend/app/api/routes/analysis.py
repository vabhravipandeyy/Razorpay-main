import json
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.logging_config import logger
from app.core.vehicle import normalize_vehicle_number
from app.schemas.auth import UserResponse
from app.api.routes.auth import get_current_user
from app.services.analysis_service import AnalysisService
from app.services.ml_anomaly_service import MLAnomalyService
from app.services.feature_service import FeatureEngineeringService
from app.repositories.eway_bill_repository import EwayBillRepository
from app.repositories.fastag_repository import FastagRepository
from app.repositories.vehicle_analysis_repository import VehicleAnalysisRepository

router = APIRouter(
    prefix="/analysis",
    tags=["Analysis"]
)


@router.get("/vehicles")
def get_available_vehicles(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch unique, normalized, sorted list of all vehicle registration numbers
    present in E-Way Bill and FASTag datasets.
    """
    try:
        vehicles = AnalysisService.get_all_unique_vehicles(db)
        return {
            "vehicles": vehicles,
            "total": len(vehicles)
        }
    except Exception as e:
        logger.error(f"Error retrieving vehicle list: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to fetch vehicle registry."
        )


@router.get("/records")
def get_analysis_records(
    search: Optional[str] = Query(None, description="Search vehicle number"),
    risk_level: Optional[str] = Query(None, description="Filter by HIGH, MEDIUM, LOW"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetch pre-computed suspicious vehicle records directly from SQL database.
    Requires authenticated user session.
    """
    try:
        clean_search = normalize_vehicle_number(search) if search else None
        records = VehicleAnalysisRepository.get_records(
            db, search=clean_search or search, risk_level=risk_level, limit=limit, offset=offset
        )
        total = VehicleAnalysisRepository.get_count(db, search=clean_search or search, risk_level=risk_level)

        items = []
        for r in records:
            try:
                parsed_data = json.loads(r.analysis_data) if r.analysis_data else {}
            except Exception:
                parsed_data = {}

            items.append({
                "id": r.id,
                "vehicle_number": r.vehicle_number,
                "risk_score": r.risk_score,
                "risk_level": r.risk_level,
                "eway_bill_count": r.eway_bill_count,
                "fastag_count": r.fastag_count,
                "failed_rules_count": r.failed_rules_count,
                "summary_reasons": r.summary_reasons,
                "analyzed_at": r.analyzed_at.isoformat() if r.analyzed_at else None,
                "rules": parsed_data.get("rules", []),
                "trips_count": len(parsed_data.get("trips", [])),
                "compliance_score": parsed_data.get("compliance_score", 100),
                "trust_score": parsed_data.get("trust_score", 100),
                "confidence_score": parsed_data.get("confidence_score", 100),
                "hybrid_risk": parsed_data.get("hybrid_risk"),
                "ml_analysis": parsed_data.get("ml_analysis"),
                "decision": parsed_data.get("decision"),
                "risk_drivers": parsed_data.get("risk_drivers", []),
                "risk_clusters": parsed_data.get("risk_clusters", []),
                "financial_context": parsed_data.get("financial_context"),
            })

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "records": items
        }
    except Exception as e:
        logger.error(f"Error fetching analysis records: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to fetch analysis records."
        )


@router.get("/records/stats")
def get_analysis_stats(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return summary statistics of analyzed suspicious vehicles."""
    try:
        return VehicleAnalysisRepository.get_stats(db)
    except Exception as e:
        logger.error(f"Error fetching analysis stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve vehicle analysis statistics."
        )


from app.core.permissions import Permission
from app.api.routes.auth import get_current_user, require_permission

@router.post("/records/sync")
async def sync_analysis_records(
    limit: Optional[int] = Query(100, description="Batch limit (0 or None to sync all)"),
    sync_all: bool = Query(False, description="If True, syncs all remaining vehicles in database"),
    max_workers: int = Query(25, ge=1, le=50),
    current_user: UserResponse = Depends(require_permission(Permission.BATCH_SYNC)),
    db: Session = Depends(get_db)
):
    """Batch compute and persist analysis for vehicles present in database."""
    try:
        actual_limit = None if (sync_all or limit == 0) else limit
        count = await AnalysisService.batch_sync_vehicles(db, limit=actual_limit, max_workers=max_workers)
        return {
            "message": f"Successfully analyzed and recorded {count} vehicles.",
            "synced_count": count
        }
    except Exception as e:
        logger.error(f"Error in batch sync execution: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Batch synchronization failed."
        )


@router.get("/ml/metadata")
def get_ml_model_metadata(
    current_user: UserResponse = Depends(get_current_user)
):
    """Return metadata and population reference statistics of the active Isolation Forest model."""
    _, metadata = MLAnomalyService.load_model()
    if not metadata:
        return {
            "status": "UNAVAILABLE",
            "message": "No trained ML anomaly model artifact found."
        }
    return {
        "status": "AVAILABLE",
        "metadata": metadata
    }


@router.post("/ml/train")
def train_ml_model(
    n_estimators: int = Query(100, ge=10, le=500),
    contamination: float = Query(0.10, ge=0.01, le=0.5),
    current_user: UserResponse = Depends(require_permission(Permission.TRAIN_ML)),
    db: Session = Depends(get_db)
):
    """
    Administrative endpoint to train/retrain the unsupervised Isolation Forest model.
    """
    try:
        vehicles = AnalysisService.get_all_unique_vehicles(db)
        feature_matrix = []
        for v in vehicles:
            ewbs = EwayBillRepository.get_by_vehicle(db, v)
            fastag = FastagRepository.get_by_vehicle(db, v)
            feats = FeatureEngineeringService.extract_features(v, ewbs, fastag, [])
            feature_matrix.append(MLAnomalyService.extract_feature_vector(feats))

        if len(feature_matrix) < 10:
            from scripts.train_anomaly_model import generate_synthetic_training_data
            feature_matrix = feature_matrix + generate_synthetic_training_data(n_samples=250)

        metadata = MLAnomalyService.train(
            feature_matrix=feature_matrix,
            n_estimators=n_estimators,
            contamination=contamination,
            random_state=42,
            version="iforest_v1",
        )
        return {
            "message": "ML Anomaly model trained successfully.",
            "metadata": metadata
        }
    except Exception as e:
        logger.error(f"Error training ML model: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model training failed: {str(e)}"
        )


@router.get("/records/detail/{vehicle_number}")
async def get_record_detail(
    vehicle_number: str,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch stored full analysis payload for a vehicle, or calculate if not present."""
    try:
        norm_v = normalize_vehicle_number(vehicle_number) or vehicle_number
        record = VehicleAnalysisRepository.get_by_vehicle(db, norm_v)
        if record and record.analysis_data:
            try:
                return json.loads(record.analysis_data)
            except Exception:
                pass
        
        return await AnalysisService.analyze_vehicle(db, norm_v)
    except Exception as e:
        logger.error(f"Error retrieving vehicle detail for {vehicle_number}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve vehicle detail record."
        )


@router.get("/{vehicle_number}/risk-profile")
async def get_vehicle_risk_profile(
    vehicle_number: str,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Phase 4 Unified Risk Profile Endpoint.
    Returns complete breakdown of Fraud Risk, Hybrid Risk, ML Anomaly, Compliance,
    Vehicle Trust, Evidence Confidence, Structured Evidence Items, Risk Clusters,
    Executive Summary, Financial Context, and Decision Intelligence.
    """
    try:
        norm_v = normalize_vehicle_number(vehicle_number) or vehicle_number
        if not norm_v:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Valid vehicle registration number is required."
            )
        analysis_data = await AnalysisService.analyze_vehicle(db, norm_v)
        return {
            "vehicle_number": norm_v,
            "fraud_risk": analysis_data.get("fraud_risk"),
            "hybrid_risk": analysis_data.get("hybrid_risk"),
            "ml_analysis": analysis_data.get("ml_analysis"),
            "compliance": analysis_data.get("compliance"),
            "trust": analysis_data.get("trust"),
            "confidence": analysis_data.get("confidence"),
            "evidence": analysis_data.get("evidence", []),
            "risk_drivers": analysis_data.get("risk_drivers", []),
            "risk_clusters": analysis_data.get("risk_clusters", []),
            "executive_summary": analysis_data.get("executive_summary", {}),
            "financial_context": analysis_data.get("financial_context", {}),
            "decision": analysis_data.get("decision", {}),
            "behavior_profile": analysis_data.get("behavior_profile", {}),
            "statistics": analysis_data.get("statistics", {}),
            "rules": analysis_data.get("rules", []),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating risk profile for {vehicle_number}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to generate vehicle risk profile."
        )


@router.get("/{vehicle_number}/features")
async def get_vehicle_features(
    vehicle_number: str,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Phase 2 Feature Vector Endpoint.
    Returns engineered feature vectors (EWB, FASTag, Speed, Movement, Route, Quality).
    """
    try:
        norm_v = normalize_vehicle_number(vehicle_number) or vehicle_number
        if not norm_v:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Valid vehicle registration number is required."
            )
        analysis_data = await AnalysisService.analyze_vehicle(db, norm_v)
        return {
            "vehicle_number": norm_v,
            "features": analysis_data.get("features", {}),
            "behavior_profile": analysis_data.get("behavior_profile", {}),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving features for {vehicle_number}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve vehicle feature vector."
        )


@router.get("/{vehicle_number}")
async def analyze_vehicle(
    vehicle_number: str,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Compute vehicle analysis live and auto-save result into database."""
    try:
        norm_v = normalize_vehicle_number(vehicle_number) or vehicle_number
        if not norm_v:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Valid vehicle registration number is required."
            )
        return await AnalysisService.analyze_vehicle(db, norm_v)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing vehicle {vehicle_number}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to complete vehicle analysis."
        )
