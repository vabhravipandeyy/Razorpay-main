import pytest
import json
from datetime import datetime, timedelta
from app.models.eway_bill import EwayBill
from app.models.fastag_transaction import FastagTransaction
from app.models.pincode_location import PincodeLocation
from app.models.user import User
from app.models.investigation import InvestigationCase


def test_health_check_endpoints(client):
    res_liveness = client.get("/health")
    assert res_liveness.status_code == 200
    assert res_liveness.json()["status"] == "HEALTHY"

    res_readiness = client.get("/health/ready")
    assert res_readiness.status_code == 200
    assert "status" in res_readiness.json()


@pytest.mark.asyncio
async def test_full_end_to_end_investigation_lifecycle(client, auth_headers, db, test_user):
    # 1. Seed geospatial, EWB and FASTag data for a test vehicle
    p1 = PincodeLocation(pin_code=560001, latitude=12.97, longitude=77.59, office_name="Bengaluru GPO")
    p2 = PincodeLocation(pin_code=400001, latitude=19.07, longitude=72.87, office_name="Mumbai GPO")
    db.add_all([p1, p2])

    t0 = datetime(2026, 8, 1, 8, 0)
    ewb = EwayBill(
        ewb_no=990011,
        vehicle_number="KA04E2ETEST",
        from_pin=560001,
        to_pin=400001,
        travel_distance=980,
        ewb_dt=t0,
        ewb_final_valid_dt=t0 + timedelta(days=2),
        ewb_ass_amt=1200000
    )
    db.add(ewb)

    # Add impossible speed transaction
    tx1 = FastagTransaction(toll_name="Toll Plaza Alpha", veh="KA04E2ETEST", readertme=t0 + timedelta(hours=1))
    tx2 = FastagTransaction(toll_name="Toll Plaza Beta", veh="KA04E2ETEST", readertme=t0 + timedelta(hours=1, minutes=5))
    db.add_all([tx1, tx2])
    db.commit()

    # 2. Analyze Vehicle via API
    res_analysis = client.get("/analysis/KA04E2ETEST", headers=auth_headers)
    assert res_analysis.status_code == 200
    a_data = res_analysis.json()
    assert a_data["vehicle_number"] == "KA04E2ETEST"
    assert "fraud_risk" in a_data
    assert "evidence" in a_data

    # 3. Ask Copilot about this vehicle
    res_copilot = client.post("/api/copilot/chat", json={
        "message": "Why is vehicle KA04E2ETEST marked with elevated risk?",
        "vehicle_number": "KA04E2ETEST"
    }, headers=auth_headers)
    assert res_copilot.status_code == 200
    c_data = res_copilot.json()
    assert "answer" in c_data

    # 4. Open formal investigation case
    res_case = client.post("/api/investigations", json={
        "vehicle_number": "KA04E2ETEST",
        "title": "E2E Speed Discrepancy Case"
    }, headers=auth_headers)
    assert res_case.status_code == 201
    case_id = res_case.json()["case_id"]

    # 5. Add note to case
    res_note = client.post(f"/api/investigations/{case_id}/notes", json={
        "content": "Requested CCTV footage from Toll Plaza Alpha."
    }, headers=auth_headers)
    assert res_note.status_code == 200

    # 6. Advance status: NEW -> UNDER_REVIEW -> INVESTIGATION
    client.patch(f"/api/investigations/{case_id}/status", json={"status": "UNDER_REVIEW"}, headers=auth_headers)
    client.patch(f"/api/investigations/{case_id}/status", json={"status": "INVESTIGATION"}, headers=auth_headers)

    # 7. Resolve case
    res_resolve = client.post(f"/api/investigations/{case_id}/resolve", json={
        "resolution_type": "SUSPICIOUS_ACTIVITY_CONFIRMED",
        "summary": "Verified impossible velocity between Alpha and Beta plazas.",
        "notes": "Forwarded to regional enforcement division.",
        "evidence_ids": ["EV-SPEED-01"]
    }, headers=auth_headers)
    assert res_resolve.status_code == 200

    # 8. Command Center Analytics reflect the case
    res_cc = client.get("/api/analytics/overview", headers=auth_headers)
    assert res_cc.status_code == 200
    assert res_cc.json()["investigations"]["total_cases"] >= 1

    # 9. Generate Executive Report
    res_rep = client.get("/api/reports/executive", headers=auth_headers)
    assert res_rep.status_code == 200
    assert "disclaimer" in res_rep.json()
