import pytest
from datetime import datetime, timezone
from app.models.user import User
from app.models.session import UserSession
from app.models.audit_log import AuditLog
from app.core.permissions import Role, Permission, has_permission
from app.core.security import hash_password, create_access_token
from app.services.auth_service import AuthService
from app.schemas.auth import UserCreate


def test_rbac_permission_matrix():
    assert has_permission("admin", Permission.MANAGE_USERS) is True
    assert has_permission("admin", Permission.TRAIN_ML) is True
    assert has_permission("admin", Permission.VIEW_AUDIT_LOGS) is True
    assert has_permission("admin", Permission.VIEW_DASHBOARD) is True

    assert has_permission("inspector", Permission.VIEW_DASHBOARD) is True
    assert has_permission("inspector", Permission.USE_COPILOT) is True
    assert has_permission("inspector", Permission.MANAGE_USERS) is False
    assert has_permission("inspector", Permission.TRAIN_ML) is False
    assert has_permission("inspector", Permission.VIEW_AUDIT_LOGS) is False


def test_public_registration_role_escalation_blocked(db):
    user_data = UserCreate(
        username="sneaky_user",
        email="sneaky@gst.gov.in",
        password="securePassword123",
        role="admin"  # Attempt to self-assign admin
    )
    user = AuthService.register_user(db, user_data, is_admin_seed=False)
    assert user.role == "inspector"  # Forced to inspector


def test_last_admin_protection(db):
    admin = User(
        username="sole_admin",
        email="sole_admin@gst.gov.in",
        hashed_password=hash_password("adminPass123"),
        role="admin",
        is_active=True
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    # Attempt to deactivate the only active admin
    with pytest.raises(Exception) as exc_info:
        AuthService.update_user_status(db, admin.id, is_active=False, admin_user=admin)
    assert "Cannot deactivate the final active administrator" in str(exc_info.value)

    # Attempt to demote the only active admin
    with pytest.raises(Exception) as exc_info2:
        AuthService.update_user_role(db, admin.id, new_role="inspector", admin_user=admin)
    assert "Cannot demote the final active administrator" in str(exc_info2.value)


@pytest.mark.asyncio
async def test_admin_api_authorization_and_audit(client, db):
    # Create Admin & Inspector
    admin_user = User(
        username="super_admin",
        email="super_admin@gst.gov.in",
        hashed_password=hash_password("adminPass123"),
        role="admin",
        is_active=True
    )
    inspector_user = User(
        username="field_inspector",
        email="field_inspector@gst.gov.in",
        hashed_password=hash_password("inspPass123"),
        role="inspector",
        is_active=True
    )
    db.add_all([admin_user, inspector_user])
    db.commit()

    admin_token = create_access_token(data={"sub": str(admin_user.id), "username": admin_user.username, "role": "admin"})
    inspector_token = create_access_token(data={"sub": str(inspector_user.id), "username": inspector_user.username, "role": "inspector"})

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    inspector_headers = {"Authorization": f"Bearer {inspector_token}"}

    # 1. Unauthenticated -> 401
    res_unauth = client.get("/api/admin/overview")
    assert res_unauth.status_code == 401

    # 2. Inspector accessing admin endpoint -> 403 Forbidden
    res_insp = client.get("/api/admin/overview", headers=inspector_headers)
    assert res_insp.status_code == 403

    # 3. Inspector attempting ML train -> 403 Forbidden
    res_train_insp = client.post("/analysis/ml/train", headers=inspector_headers)
    assert res_train_insp.status_code == 403

    # 4. Admin accessing admin overview -> 200 OK
    res_admin = client.get("/api/admin/overview", headers=admin_headers)
    assert res_admin.status_code == 200
    assert "user_statistics" in res_admin.json()

    # 5. Admin creates new user via admin API
    res_create = client.post("/api/admin/users", json={
        "username": "new_inspector_02",
        "email": "insp02@gst.gov.in",
        "password": "Password123",
        "full_name": "Inspector Two",
        "role": "inspector"
    }, headers=admin_headers)
    assert res_create.status_code == 201
    created_id = res_create.json()["id"]

    # 6. Admin updates status
    res_status = client.patch(f"/api/admin/users/{created_id}/status", json={"is_active": False}, headers=admin_headers)
    assert res_status.status_code == 200
    assert res_status.json()["is_active"] is False

    # 7. Audit log exists
    res_audit = client.get("/api/admin/audit-logs", headers=admin_headers)
    assert res_audit.status_code == 200
    assert res_audit.json()["total"] > 0
    actions = [l["action"] for l in res_audit.json()["logs"]]
    assert "USER_CREATED" in actions
