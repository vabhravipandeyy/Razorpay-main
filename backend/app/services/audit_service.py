import json
import hashlib
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from app.core.logging_config import logger


class AuditService:
    """
    Central Audit Logging Service (Phase 6).
    Records security events and user actions with IP hashing and metadata sanitization.
    """

    @staticmethod
    def hash_ip(ip_address: Optional[str]) -> Optional[str]:
        if not ip_address:
            return None
        return hashlib.sha256(ip_address.encode("utf-8")).hexdigest()[:16]

    @classmethod
    def log_event(
        cls,
        db: Session,
        action: str,
        user_id: Optional[int] = None,
        username: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        status: str = "SUCCESS",
        ip_address: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        try:
            sanitized_meta = None
            if metadata:
                # Strip sensitive fields
                clean = {
                    k: v for k, v in metadata.items()
                    if k not in ["password", "token", "secret", "authorization", "hashed_password"]
                }
                sanitized_meta = json.dumps(clean)

            entry = AuditLog(
                user_id=user_id,
                username=username,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                status=status,
                ip_hash=cls.hash_ip(ip_address),
                metadata_json=sanitized_meta,
            )
            db.add(entry)
            db.commit()
            db.refresh(entry)
            logger.info(f"AuditLog recorded: action={action}, user={username}, status={status}, resource={resource_id}")
            return entry
        except Exception as e:
            logger.error(f"Failed to record audit log: {e}")
            db.rollback()
            return None
