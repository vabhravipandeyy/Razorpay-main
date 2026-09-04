import pytest
from pydantic import ValidationError
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.services.auth_service import AuthService
from app.schemas.auth import UserCreate, LoginRequest


def test_password_hashing():
    raw = "secure_password_123"
    hashed = hash_password(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("wrong_password", hashed) is False


def test_jwt_token_lifecycle():
    payload = {"sub": "42", "username": "inspector_raj", "role": "inspector"}
    token = create_access_token(payload)
    assert isinstance(token, str)

    decoded = decode_access_token(token)
    assert decoded["sub"] == "42"
    assert decoded["username"] == "inspector_raj"


def test_auth_service_registration_and_login(db):
    user_data = UserCreate(
        username="officer1",
        email="officer1@gst.gov.in",
        password="officer_pass_123",
        confirm_password="officer_pass_123",
        full_name="Enforcement Officer 1",
        role="inspector"
    )
    user = AuthService.register_user(db, user_data)
    assert user.id is not None
    assert user.username == "officer1"

    # Authenticate successfully
    auth_result = AuthService.authenticate_user(db, LoginRequest(username="officer1", password="officer_pass_123"))
    assert "access_token" in auth_result
    assert auth_result["token_type"] == "bearer"
    assert auth_result["user"].username == "officer1"


def test_auth_api_routes(client, test_user, auth_headers):
    # Test /api/auth/login
    res = client.post("/api/auth/login", json={"username": "test_inspector", "password": "inspector123"})
    assert res.status_code == 200
    assert "access_token" in res.json()

    # Test /api/auth/me with Bearer token
    res_me = client.get("/api/auth/me", headers=auth_headers)
    assert res_me.status_code == 200
    assert res_me.json()["username"] == "test_inspector"

    # Test unauthenticated access by clearing cookies and headers
    client.cookies.clear()
    res_unauth = client.get("/api/auth/me")
    assert res_unauth.status_code == 401
