from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging_config import logger
from app.models.user import User
from app.models.session import UserSession
from app.repositories.user_repository import UserRepository
from app.schemas.auth import UserCreate, LoginRequest
from app.core.security import hash_password, verify_password, create_access_token
from app.services.audit_service import AuditService


class AuthService:

    @staticmethod
    def register_user(
        db: Session,
        user_data: UserCreate,
        is_admin_seed: bool = False,
        creator_user: Optional[User] = None,
        ip_address: Optional[str] = None,
    ) -> User:
        # Validate matching passwords if confirm_password provided
        if user_data.confirm_password is not None and user_data.password != user_data.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Passwords do not match."
            )

        if len(user_data.password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters in length."
            )

        if UserRepository.get_by_username(db, user_data.username.strip()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered."
            )
        
        if UserRepository.get_by_email(db, user_data.email.strip().lower()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address already registered."
            )

        # Public signups always receive inspector role; admin role requires admin seed or authenticated admin creator
        if is_admin_seed or (creator_user and creator_user.role == "admin" and user_data.role in ["admin", "inspector"]):
            assigned_role = user_data.role
        else:
            assigned_role = "inspector"

        hashed = hash_password(user_data.password)
        new_user = User(
            username=user_data.username.strip(),
            email=user_data.email.strip().lower(),
            hashed_password=hashed,
            full_name=user_data.full_name.strip() if user_data.full_name else None,
            role=assigned_role,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        user = UserRepository.create(db, new_user)
        logger.info(f"User registered successfully: username={user.username}, role={user.role}")

        AuditService.log_event(
            db=db,
            action="USER_CREATED",
            user_id=creator_user.id if creator_user else user.id,
            username=creator_user.username if creator_user else user.username,
            resource_type="USER",
            resource_id=str(user.id),
            status="SUCCESS",
            ip_address=ip_address,
            metadata={"created_username": user.username, "role": user.role}
        )

        return user

    @staticmethod
    def authenticate_user(
        db: Session,
        login_data: LoginRequest,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> dict:
        user = UserRepository.get_by_username_or_email(db, login_data.username.strip())
        if not user or not verify_password(login_data.password, user.hashed_password):
            logger.warning(f"Failed authentication attempt: username={login_data.username}")
            AuditService.log_event(
                db=db,
                action="FAILED_LOGIN",
                username=login_data.username,
                resource_type="AUTH",
                status="FAILURE",
                ip_address=ip_address,
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            logger.warning(f"Authentication attempt by inactive account: username={login_data.username}")
            AuditService.log_event(
                db=db,
                action="INACTIVE_LOGIN_BLOCKED",
                user_id=user.id,
                username=user.username,
                resource_type="AUTH",
                status="FORBIDDEN",
                ip_address=ip_address,
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive or suspended user account."
            )

        # Update last login timestamp
        try:
            user.last_login = datetime.now(timezone.utc)
            db.commit()
            db.refresh(user)
        except Exception:
            db.rollback()

        # Create JWT Access Token
        access_token = create_access_token(data={"sub": str(user.id), "username": user.username, "role": user.role})

        # Create Server-Side Session
        try:
            expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
            new_session = UserSession(
                user_id=user.id,
                session_token=access_token,
                ip_hash=AuditService.hash_ip(ip_address),
                user_agent=user_agent[:250] if user_agent else None,
                expires_at=datetime.now(timezone.utc) + expires_delta,
            )
            db.add(new_session)
            db.commit()
        except Exception as e:
            logger.warning(f"Session recording notice: {e}")
            db.rollback()

        AuditService.log_event(
            db=db,
            action="LOGIN",
            user_id=user.id,
            username=user.username,
            resource_type="AUTH",
            status="SUCCESS",
            ip_address=ip_address,
        )

        logger.info(f"User authenticated: username={user.username}, role={user.role}")
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user
        }

    @staticmethod
    def logout_user(db: Session, token: str, user: Optional[User] = None, ip_address: Optional[str] = None):
        """Revoke active user session in database."""
        if token:
            try:
                db_sess = db.query(UserSession).filter(UserSession.session_token == token).first()
                if db_sess:
                    db_sess.revoked_at = datetime.now(timezone.utc)
                    db.commit()
            except Exception as e:
                logger.error(f"Failed to revoke session: {e}")
                db.rollback()

        if user:
            AuditService.log_event(
                db=db,
                action="LOGOUT",
                user_id=user.id,
                username=user.username,
                resource_type="AUTH",
                status="SUCCESS",
                ip_address=ip_address,
            )

    @staticmethod
    def change_password(
        db: Session,
        user: User,
        current_password: str,
        new_password: str,
        ip_address: Optional[str] = None
    ) -> bool:
        if not verify_password(current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password verification failed."
            )

        if len(new_password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be at least 6 characters."
            )

        user.hashed_password = hash_password(new_password)
        user.updated_at = datetime.now(timezone.utc)
        db.commit()

        # Revoke all active sessions to force re-authentication
        try:
            db.query(UserSession).filter(
                UserSession.user_id == user.id,
                UserSession.revoked_at.is_(None)
            ).update({"revoked_at": datetime.now(timezone.utc)})
            db.commit()
        except Exception:
            db.rollback()

        AuditService.log_event(
            db=db,
            action="PASSWORD_CHANGED",
            user_id=user.id,
            username=user.username,
            resource_type="USER",
            resource_id=str(user.id),
            status="SUCCESS",
            ip_address=ip_address,
        )
        return True

    @staticmethod
    def update_user_status(db: Session, user_id: int, is_active: bool, admin_user: User, ip_address: Optional[str] = None) -> User:
        target_user = db.query(User).filter(User.id == user_id).first()
        if not target_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        # Prevent deactivating the last active admin
        if target_user.role == "admin" and not is_active:
            active_admin_count = db.query(User).filter(User.role == "admin", User.is_active == True).count()
            if active_admin_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot deactivate the final active administrator."
                )

        target_user.is_active = is_active
        target_user.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(target_user)

        AuditService.log_event(
            db=db,
            action="USER_STATUS_CHANGED",
            user_id=admin_user.id,
            username=admin_user.username,
            resource_type="USER",
            resource_id=str(target_user.id),
            status="SUCCESS",
            ip_address=ip_address,
            metadata={"target_username": target_user.username, "is_active": is_active}
        )
        return target_user

    @staticmethod
    def update_user_role(db: Session, user_id: int, new_role: str, admin_user: User, ip_address: Optional[str] = None) -> User:
        if new_role not in ["admin", "inspector"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role specified.")

        target_user = db.query(User).filter(User.id == user_id).first()
        if not target_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        # Prevent demoting the last active admin
        if target_user.role == "admin" and new_role != "admin":
            active_admin_count = db.query(User).filter(User.role == "admin", User.is_active == True).count()
            if active_admin_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot demote the final active administrator."
                )

        target_user.role = new_role
        target_user.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(target_user)

        AuditService.log_event(
            db=db,
            action="USER_ROLE_CHANGED",
            user_id=admin_user.id,
            username=admin_user.username,
            resource_type="USER",
            resource_id=str(target_user.id),
            status="SUCCESS",
            ip_address=ip_address,
            metadata={"target_username": target_user.username, "new_role": new_role}
        )
        return target_user

    @staticmethod
    def seed_default_user(db: Session) -> User:
        if UserRepository.count(db) == 0:
            default_user = UserCreate(
                username=settings.ADMIN_USERNAME,
                email=settings.ADMIN_EMAIL,
                password=settings.ADMIN_PASSWORD,
                full_name=settings.ADMIN_FULL_NAME,
                role="admin"
            )
            created = AuthService.register_user(db, default_user, is_admin_seed=True)
            logger.info(f"Default admin user seeded: username={created.username}")
            return created
        return None
