from fastapi import APIRouter, Depends, HTTPException, status, Header, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional, List

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_access_token
from app.core.permissions import Role, Permission, has_permission
from app.core.rate_limiter import rate_limiter
from app.models.user import User
from app.models.session import UserSession
from app.repositories.user_repository import UserRepository
from app.schemas.auth import UserCreate, UserResponse, LoginRequest, TokenResponse, MessageResponse
from app.services.auth_service import AuthService
from app.core.logging_config import logger

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6)
    confirm_password: Optional[str] = None


def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    token = None

    # 1. Check HttpOnly cookie first
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        token = cookie_token
    # 2. Fallback to Authorization Bearer header
    elif authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing session cookie or authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = int(payload["sub"])
    user = UserRepository.get_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found, inactive, or suspended.",
        )

    # Check if session has been explicitly revoked
    revoked_session = db.query(UserSession).filter(
        UserSession.session_token == token,
        UserSession.revoked_at.isnot(None)
    ).first()
    if revoked_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been revoked. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def require_role(required_role: Role):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role != required_role.value and current_user.role != "admin":
            logger.warning(f"Forbidden access: User '{current_user.username}' with role '{current_user.role}' attempted action requiring '{required_role.value}'")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires '{required_role.value}' role privileges."
            )
        return current_user
    return role_checker


def require_permission(permission: Permission):
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        if not has_permission(current_user.role, permission):
            logger.warning(f"Forbidden permission: User '{current_user.username}' lacks permission '{permission.value}'")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Missing required permission: {permission.value}"
            )
        return current_user
    return permission_checker


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    user_data: UserCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    ip_addr = request.client.host if request.client else None
    rate_limiter.check(f"register_{ip_addr}", max_requests=10, window_seconds=60)
    return AuthService.register_user(db, user_data, is_admin_seed=False, ip_address=ip_addr)


@router.post("/login", response_model=TokenResponse)
def login(
    login_data: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    ip_addr = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    rate_limiter.check(f"login_{ip_addr}", max_requests=15, window_seconds=60)

    result = AuthService.authenticate_user(db, login_data, ip_address=ip_addr, user_agent=user_agent)
    access_token = result["access_token"]

    # Issue secure HttpOnly session cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False,
        path="/"
    )

    return result


@router.post("/logout", response_model=MessageResponse)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """End session, revoke server session record, and clear HttpOnly cookie."""
    token = request.cookies.get("access_token")
    if not token:
        auth_hdr = request.headers.get("authorization")
        if auth_hdr and auth_hdr.startswith("Bearer "):
            token = auth_hdr.split(" ")[1]

    ip_addr = request.client.host if request.client else None
    AuthService.logout_user(db, token=token, ip_address=ip_addr)
    response.delete_cookie(key="access_token", path="/")
    return {"message": "Session terminated successfully."}


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: PasswordChangeRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change current user password and revoke active sessions."""
    if payload.confirm_password and payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New passwords do not match.")

    ip_addr = request.client.host if request.client else None
    AuthService.change_password(
        db=db,
        user=current_user,
        current_password=payload.current_password,
        new_password=payload.new_password,
        ip_address=ip_addr
    )
    return {"message": "Password updated successfully. Active sessions invalidated."}


@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: User = Depends(get_current_user)
):
    return current_user


@router.post("/seed")
def seed_user(
    db: Session = Depends(get_db)
):
    seeded = AuthService.seed_default_user(db)
    if seeded:
        return {"message": "Default admin user created successfully", "username": seeded.username}
    return {"message": "Users table already populated"}
