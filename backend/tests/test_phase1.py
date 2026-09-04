import pytest
from datetime import datetime
from pydantic import ValidationError
from app.models.eway_bill import EwayBill
from app.models.fastag_transaction import FastagTransaction
from app.services.analysis_service import AnalysisService
from app.schemas.auth import UserCreate, LoginRequest
from app.services.auth_service import AuthService
from fastapi import HTTPException


def test_get_available_vehicles_api(client, auth_headers, db):
    # Seed EWBs and FASTags with various casing and spaces
    db.add(EwayBill(ewb_no=11, ewb_dt=datetime(2026, 8, 1), from_pin=110001, to_pin=400001, travel_distance=1000, ewb_final_valid_dt=datetime(2026, 8, 3), vehicle_number="ka 01 ab 1234"))
    db.add(EwayBill(ewb_no=12, ewb_dt=datetime(2026, 8, 1), from_pin=110001, to_pin=400001, travel_distance=1000, ewb_final_valid_dt=datetime(2026, 8, 3), vehicle_number="DL01CD9999"))
    db.add(FastagTransaction(toll_id=1, toll_name="Toll A", geo_lat=20.0, geo_long=75.0, readertme=datetime(2026, 8, 1), veh="KA-01-AB-1234"))
    db.add(FastagTransaction(toll_id=2, toll_name="Toll B", geo_lat=21.0, geo_long=76.0, readertme=datetime(2026, 8, 1), veh="MH12XY4321"))
    db.commit()

    # Unauthenticated request -> 401
    client.cookies.clear()
    res_unauth = client.get("/analysis/vehicles")
    assert res_unauth.status_code == 401

    # Authenticated request
    res = client.get("/analysis/vehicles", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "vehicles" in data
    assert "total" in data
    # Unique normalized vehicles: DL01CD9999, KA01AB1234, MH12XY4321
    assert data["vehicles"] == ["DL01CD9999", "KA01AB1234", "MH12XY4321"]
    assert data["total"] == 3


def test_registration_validation(db):
    # Passwords do not match
    with pytest.raises(HTTPException) as exc1:
        AuthService.register_user(db, UserCreate(
            username="user_mismatch",
            email="mismatch@gst.gov.in",
            password="password123",
            confirm_password="different_password",
            full_name="Mismatch User"
        ))
    assert exc1.value.status_code == 400
    assert "do not match" in exc1.value.detail

    # Password too short (< 6 chars) triggers Pydantic schema validation
    with pytest.raises(ValidationError):
        UserCreate(
            username="user_short",
            email="short@gst.gov.in",
            password="123",
            confirm_password="123",
            full_name="Short User"
        )

    # Self-registering as admin is forced to inspector
    user = AuthService.register_user(db, UserCreate(
        username="hacker_admin",
        email="hacker@gst.gov.in",
        password="secure_password_123",
        confirm_password="secure_password_123",
        role="admin"
    ))
    assert user.role == "inspector"


def test_cookie_login_and_logout_flow(client, test_user):
    client.cookies.clear()
    # Login via API
    login_res = client.post("/api/auth/login", json={"username": "test_inspector", "password": "inspector123"})
    assert login_res.status_code == 200
    assert "access_token" in login_res.cookies
    token_cookie = login_res.cookies["access_token"]
    assert len(token_cookie) > 20

    # Request /api/auth/me relying ONLY on cookie (no Authorization header)
    me_res = client.get("/api/auth/me")
    assert me_res.status_code == 200
    assert me_res.json()["username"] == "test_inspector"

    # Logout via API
    logout_res = client.post("/api/auth/logout")
    assert logout_res.status_code == 200
    assert logout_res.json()["message"] == "Session terminated successfully."

    # Next /api/auth/me should fail with 401
    client.cookies.clear()
    me_after_logout = client.get("/api/auth/me")
    assert me_after_logout.status_code == 401


@pytest.mark.asyncio
async def test_compliance_and_trust_scores_calculation(db):
    # Vehicle with no records -> default baseline 100
    res = await AnalysisService.analyze_vehicle(db, "CLEAN0001")
    assert res["compliance_score"] == 100
    assert res["compliance_level"] == "COMPLIANT"
    assert res["trust_score"] == 100
    assert res["trust_level"] == "HIGH TRUST"
    assert len(res["risk_signals"]) > 0
