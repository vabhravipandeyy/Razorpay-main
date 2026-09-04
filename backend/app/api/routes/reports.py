from typing import Optional
from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.api.routes.auth import get_current_user, require_role
from app.core.permissions import Role
from app.services.reporting_service import ReportingService

router = APIRouter(
    prefix="/api/reports",
    tags=["Risk Reports & Exports"]
)


@router.get("/executive")
def get_executive_report(
    days: int = Query(30, ge=1, le=365),
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate formal executive risk intelligence summary."""
    ip_addr = request.client.host if request and request.client else None
    return ReportingService.generate_executive_report(db, days=days, user=current_user, ip_address=ip_addr)


@router.get("/vehicle/{vehicle_number}")
async def get_vehicle_report(
    vehicle_number: str,
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate formal vehicle risk assessment dossier."""
    ip_addr = request.client.host if request and request.client else None
    return await ReportingService.generate_vehicle_report(db, vehicle_number=vehicle_number, user=current_user, ip_address=ip_addr)


@router.post("/auto-responder/notice/{vehicle_number}")
async def generate_auto_responder_notice(
    vehicle_number: str,
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Track 02 Auto-Responder Evidence & Statutory Notice Generator."""
    ip_addr = request.client.host if request and request.client else None
    return await ReportingService.generate_auto_responder_notice(db, vehicle_number=vehicle_number, user=current_user, ip_address=ip_addr)



@router.get("/investigation/{case_id}")
async def get_investigation_report(
    case_id: int,
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate formal investigation case report."""
    ip_addr = request.client.host if request and request.client else None
    return await ReportingService.generate_investigation_report(db, case_id=case_id, user=current_user, ip_address=ip_addr)


@router.get("/export/vehicles-csv")
def export_vehicles_csv(
    request: Request = None,
    current_user: User = Depends(require_role(Role.ADMIN)),
    db: Session = Depends(get_db)
):
    """Export all vehicle risk evaluation records to CSV format (Admin Only)."""
    ip_addr = request.client.host if request and request.client else None
    csv_content = ReportingService.export_high_risk_vehicles_csv(db, user=current_user, ip_address=ip_addr)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=gst_vehicle_risk_export.csv"}
    )


@router.get("/export/cases-csv")
def export_cases_csv(
    request: Request = None,
    current_user: User = Depends(require_role(Role.ADMIN)),
    db: Session = Depends(get_db)
):
    """Export investigation cases to CSV format (Admin Only)."""
    ip_addr = request.client.host if request and request.client else None
    csv_content = ReportingService.export_investigations_csv(db, user=current_user, ip_address=ip_addr)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=gst_investigations_export.csv"}
    )
