from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.api.routes.auth import get_current_user, require_role
from app.core.permissions import Role
from app.services.analytics_service import AnalyticsService

router = APIRouter(
    prefix="/api/analytics",
    tags=["Command Center Analytics"]
)


@router.get("/overview")
def get_command_center_overview(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aggregate top-level KPI metrics across the vehicle population."""
    return AnalyticsService.get_overview_kpis(db, days)


@router.get("/risk-distribution")
def get_risk_distribution(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Distribution of vehicles across HIGH, MEDIUM, and LOW risk bands."""
    return AnalyticsService.get_risk_distribution(db)


@router.get("/risk-trends")
def get_risk_trends(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Time-series daily trajectory of average risk and high-risk vehicle counts."""
    return AnalyticsService.get_risk_trends(db, days)


@router.get("/risk-signals")
def get_risk_signals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aggregate frequency breakdown of triggered statutory fraud detection rules."""
    return AnalyticsService.get_risk_signals_frequency(db)


@router.get("/routes")
def get_suspicious_routes(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Identify top high-risk transit origin-destination corridors."""
    return AnalyticsService.get_suspicious_routes_analytics(db, limit)


@router.get("/tolls")
def get_suspicious_tolls(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Identify toll plazas associated with frequent anomaly and speed violation signals."""
    return AnalyticsService.get_suspicious_tolls_analytics(db, limit)


@router.get("/regions")
def get_regional_risk(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aggregate risk index ranking by Indian State / Region."""
    return AnalyticsService.get_regional_risk_analytics(db)


@router.get("/repeat-risk")
def get_repeat_risk_vehicles(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Identify repeat-investigation vehicles and acute risk escalations."""
    return AnalyticsService.get_repeat_risk_vehicles(db, limit)


@router.get("/inspector-workload")
def get_inspector_workload(
    current_user: User = Depends(require_role(Role.ADMIN)),
    db: Session = Depends(get_db)
):
    """Supervisor workload and resolution efficiency metrics (Admin Only)."""
    return AnalyticsService.get_inspector_workload(db)


@router.get("/cost-roi-matrix")
def get_cost_roi_matrix(
    threshold: float = Query(0.50, ge=0.10, le=0.90),
    cost_fp: float = Query(4500.0, ge=100.0, le=100000.0),
    cost_fn: float = Query(280000.0, ge=1000.0, le=10000000.0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Track 02 False-Positive Cost & ROI Matrix Model."""
    return AnalyticsService.get_cost_roi_matrix(db, threshold, cost_fp, cost_fn)

