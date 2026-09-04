from typing import Optional, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.api.routes.auth import get_current_user, require_permission
from app.core.permissions import Permission
from app.services.case_service import CaseService
from app.core.logging_config import logger

router = APIRouter(
    prefix="/api/investigations",
    tags=["Case Management"]
)


class CreateCaseRequest(BaseModel):
    vehicle_number: str = Field(..., min_length=3, max_length=50)
    title: Optional[str] = None
    description: Optional[str] = None


class StatusUpdateRequest(BaseModel):
    status: str
    reason: Optional[str] = None


class AssignCaseRequest(BaseModel):
    assigned_to_id: Optional[int] = None


class CaseNoteRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)


class EvidenceReviewRequest(BaseModel):
    evidence_id: str
    status: str = Field("REVIEWED", description="REVIEWED | RELEVANT | NOT_RELEVANT | UNREVIEWED")
    notes: Optional[str] = None


class CaseResolutionRequest(BaseModel):
    resolution_type: str = Field(..., description="NO_ISSUE_FOUND | DATA_ERROR | COMPLIANCE_ISSUE | SUSPICIOUS_ACTIVITY_CONFIRMED | REFERRED_FOR_FURTHER_REVIEW | OTHER")
    summary: str = Field(..., min_length=5)
    notes: Optional[str] = None
    evidence_ids: Optional[List[str]] = None


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_investigation_case(
    payload: CreateCaseRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new formal investigation case from a vehicle risk assessment.
    Returns existing case if an active investigation is already ongoing.
    """
    ip_addr = request.client.host if request.client else None
    case_obj, is_new = await CaseService.create_investigation_case(
        db=db,
        vehicle_number=payload.vehicle_number,
        user=current_user,
        title=payload.title,
        description=payload.description,
        ip_address=ip_addr,
    )
    return {
        "case_id": case_obj.id,
        "case_number": case_obj.case_number,
        "vehicle_number": case_obj.vehicle_number,
        "status": case_obj.status,
        "investigation_priority": case_obj.investigation_priority,
        "is_newly_created": is_new,
        "message": "New case created successfully." if is_new else "Active case already exists for this vehicle."
    }


@router.get("")
def get_investigation_cases(
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    assigned_to: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve paginated, filterable list of formal investigation cases."""
    return CaseService.get_cases(
        db=db,
        search=search,
        status_filter=status_filter,
        priority_filter=priority_filter,
        assigned_to_id=assigned_to,
        limit=limit,
        offset=offset,
    )


@router.get("/stats")
def get_case_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return summary metric statistics for the Case Management dashboard."""
    return CaseService.get_case_statistics(db)


@router.get("/{case_id}")
async def get_case_detail(
    case_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch complete case dossier with live vs snapshot risk delta, notes, and evidence assessments."""
    return await CaseService.get_case_detail(db, case_id)


@router.patch("/{case_id}/status")
def update_case_status(
    case_id: int,
    payload: StatusUpdateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Advance case lifecycle status through validated transitions."""
    ip_addr = request.client.host if request.client else None
    case_obj = CaseService.update_case_status(
        db=db,
        case_id=case_id,
        new_status=payload.status,
        user=current_user,
        reason=payload.reason,
        ip_address=ip_addr,
    )
    return {
        "case_id": case_obj.id,
        "case_number": case_obj.case_number,
        "status": case_obj.status,
        "message": f"Case status updated to '{case_obj.status}'."
    }


@router.patch("/{case_id}/assignment")
def assign_case(
    case_id: int,
    payload: AssignCaseRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign or reassign an investigation case to an inspector."""
    ip_addr = request.client.host if request.client else None
    case_obj = CaseService.assign_case(
        db=db,
        case_id=case_id,
        assignee_id=payload.assigned_to_id,
        user=current_user,
        ip_address=ip_addr,
    )
    return {
        "case_id": case_obj.id,
        "case_number": case_obj.case_number,
        "assigned_to": case_obj.assigned_to,
        "message": "Case assignment updated."
    }


@router.post("/{case_id}/notes")
def add_case_note(
    case_id: int,
    payload: CaseNoteRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a timestamped inspector note to the case record."""
    ip_addr = request.client.host if request.client else None
    note_obj = CaseService.add_case_note(
        db=db,
        case_id=case_id,
        content=payload.content,
        user=current_user,
        ip_address=ip_addr,
    )
    return {
        "id": note_obj.id,
        "case_id": note_obj.case_id,
        "author": current_user.full_name or current_user.username,
        "content": note_obj.content,
        "created_at": note_obj.created_at.isoformat() if note_obj.created_at else None,
    }


@router.post("/{case_id}/evidence-review")
def review_case_evidence(
    case_id: int,
    payload: EvidenceReviewRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record an investigator's assessment and notes on a specific evidence item."""
    ip_addr = request.client.host if request.client else None
    review_obj = CaseService.review_case_evidence(
        db=db,
        case_id=case_id,
        evidence_id=payload.evidence_id,
        status_val=payload.status,
        notes=payload.notes,
        user=current_user,
        ip_address=ip_addr,
    )
    return {
        "id": review_obj.id,
        "evidence_id": review_obj.evidence_id,
        "status": review_obj.status,
        "notes": review_obj.notes,
        "updated_at": review_obj.updated_at.isoformat() if review_obj.updated_at else None,
    }


@router.post("/{case_id}/resolve")
def resolve_case(
    case_id: int,
    payload: CaseResolutionRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit formal investigation resolution and move case to RESOLVED status."""
    ip_addr = request.client.host if request.client else None
    case_obj = CaseService.resolve_case(
        db=db,
        case_id=case_id,
        resolution_type=payload.resolution_type,
        summary=payload.summary,
        notes=payload.notes,
        evidence_ids=payload.evidence_ids,
        user=current_user,
        ip_address=ip_addr,
    )
    return {
        "case_id": case_obj.id,
        "case_number": case_obj.case_number,
        "status": case_obj.status,
        "resolution_type": case_obj.resolution_type,
        "message": "Investigation resolution recorded successfully."
    }


@router.post("/{case_id}/close")
def close_case(
    case_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Formally close a resolved investigation case."""
    ip_addr = request.client.host if request.client else None
    case_obj = CaseService.close_case(
        db=db,
        case_id=case_id,
        user=current_user,
        ip_address=ip_addr,
    )
    return {
        "case_id": case_obj.id,
        "case_number": case_obj.case_number,
        "status": case_obj.status,
        "closed_at": case_obj.closed_at.isoformat() if case_obj.closed_at else None,
        "message": "Case closed successfully."
    }
