from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field, EmailStr
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.permissions import Permission, Role
from app.models.user import User
from app.models.session import UserSession
from app.models.audit_log import AuditLog
from app.models.vehicle_analysis import VehicleAnalysisRecord
from app.api.routes.auth import get_current_user, require_permission
from app.services.auth_service import AuthService
from app.services.ml_anomaly_service import MLAnomalyService
from app.services.ai.rag_service import RAGService
from app.services.ai.llm_service import LLMService
from app.schemas.auth import UserResponse, MessageResponse
from app.core.logging_config import logger

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin Control Center"]
)


class AdminCreateUserRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None
    role: str = Field("inspector", description="Role: admin or inspector")


class UserStatusUpdateRequest(BaseModel):
    is_active: bool


class UserRoleUpdateRequest(BaseModel):
    role: str


@router.get("/overview")
def get_admin_overview(
    current_user: User = Depends(require_permission(Permission.VIEW_SYSTEM_HEALTH)),
    db: Session = Depends(get_db)
):
    """Return high-level enterprise statistics for the Admin Control Center."""
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    inactive_users = total_users - active_users
    admin_count = db.query(User).filter(User.role == "admin").count()
    inspector_count = db.query(User).filter(User.role == "inspector").count()

    total_analyses = db.query(VehicleAnalysisRecord).count()
    total_audit_events = db.query(AuditLog).count()
    active_sessions_count = db.query(UserSession).filter(
        UserSession.revoked_at.is_(None),
        UserSession.expires_at > datetime.now(timezone.utc)
    ).count()

    _, ml_meta = MLAnomalyService.load_model()
    rag_store = RAGService.get_vector_store()

    return {
        "user_statistics": {
            "total_users": total_users,
            "active_users": active_users,
            "inactive_users": inactive_users,
            "admin_count": admin_count,
            "inspector_count": inspector_count,
            "active_sessions": active_sessions_count,
        },
        "system_statistics": {
            "total_vehicles_analyzed": total_analyses,
            "total_audit_events": total_audit_events,
            "ml_model_status": "ONLINE" if ml_meta else "UNAVAILABLE",
            "ml_model_samples": ml_meta.get("training_samples", 0) if ml_meta else 0,
            "rag_documents_indexed": len(rag_store.documents) if rag_store else 0,
            "llm_provider": LLMService.get_provider(),
        }
    }


@router.get("/users")
def get_all_users(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    current_user: User = Depends(require_permission(Permission.MANAGE_USERS)),
    db: Session = Depends(get_db)
):
    """List all registered users with administrative details."""
    query = db.query(User)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter((User.username.ilike(s)) | (User.email.ilike(s)) | (User.full_name.ilike(s)))
    if role:
        query = query.filter(User.role == role.lower())

    users = query.order_by(User.created_at.desc()).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_login": u.last_login.isoformat() if u.last_login else None,
        }
        for u in users
    ]


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def admin_create_user(
    payload: AdminCreateUserRequest,
    request: Request,
    current_user: User = Depends(require_permission(Permission.MANAGE_USERS)),
    db: Session = Depends(get_db)
):
    """Admin-only endpoint to provision new tax inspectors or administrators."""
    from app.schemas.auth import UserCreate
    user_data = UserCreate(
        username=payload.username,
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
        role=payload.role
    )
    ip_addr = request.client.host if request.client else None
    return AuthService.register_user(
        db=db,
        user_data=user_data,
        is_admin_seed=False,
        creator_user=current_user,
        ip_address=ip_addr
    )


@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    payload: UserStatusUpdateRequest,
    request: Request,
    current_user: User = Depends(require_permission(Permission.MANAGE_USERS)),
    db: Session = Depends(get_db)
):
    """Activate or deactivate a user account."""
    ip_addr = request.client.host if request.client else None
    updated = AuthService.update_user_status(
        db=db,
        user_id=user_id,
        is_active=payload.is_active,
        admin_user=current_user,
        ip_address=ip_addr
    )
    return {
        "message": f"User '{updated.username}' status updated to {'Active' if updated.is_active else 'Deactivated'}.",
        "user_id": updated.id,
        "is_active": updated.is_active
    }


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    payload: UserRoleUpdateRequest,
    request: Request,
    current_user: User = Depends(require_permission(Permission.CHANGE_USER_ROLES)),
    db: Session = Depends(get_db)
):
    """Change a user's role between admin and inspector."""
    ip_addr = request.client.host if request.client else None
    updated = AuthService.update_user_role(
        db=db,
        user_id=user_id,
        new_role=payload.role,
        admin_user=current_user,
        ip_address=ip_addr
    )
    return {
        "message": f"User '{updated.username}' role updated to '{updated.role}'.",
        "user_id": updated.id,
        "role": updated.role
    }


@router.get("/audit-logs")
def get_audit_logs(
    action: Optional[str] = Query(None),
    username: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_permission(Permission.VIEW_AUDIT_LOGS)),
    db: Session = Depends(get_db)
):
    """Retrieve paginated, filterable enterprise audit logs."""
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if username:
        query = query.filter(AuditLog.username.ilike(f"%{username.strip()}%"))
    if status_filter:
        query = query.filter(AuditLog.status == status_filter)

    total = query.count()
    logs = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "logs": [
            {
                "id": log.id,
                "user_id": log.user_id,
                "username": log.username or "System/Anonymous",
                "action": log.action,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "status": log.status,
                "ip_hash": log.ip_hash,
                "metadata": log.metadata_json,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ]
    }


@router.get("/system")
def get_system_health(
    current_user: User = Depends(require_permission(Permission.VIEW_SYSTEM_HEALTH)),
    db: Session = Depends(get_db)
):
    """Comprehensive system health and security diagnostic check."""
    # Check DB
    db_ok = True
    try:
        db.execute(func.now())
    except Exception:
        db_ok = False

    _, ml_meta = MLAnomalyService.load_model()
    rag_store = RAGService.get_vector_store()

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {"status": "HEALTHY" if db_ok else "UNHEALTHY"},
        "ml_engine": {"status": "ONLINE" if ml_meta else "UNAVAILABLE", "version": ml_meta.get("model_version") if ml_meta else None},
        "rag_vector_store": {"status": "ONLINE" if (rag_store and rag_store.documents) else "DEGRADED", "documents_count": len(rag_store.documents) if rag_store else 0},
        "llm_service": {"status": "ONLINE", "provider": LLMService.get_provider()},
    }
