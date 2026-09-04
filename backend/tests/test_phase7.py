import pytest
from datetime import datetime, timedelta
from app.models.eway_bill import EwayBill
from app.models.fastag_transaction import FastagTransaction
from app.models.pincode_location import PincodeLocation
from app.models.user import User
from app.models.investigation import InvestigationCase, InvestigationNote, CaseEvidenceReview
from app.services.case_service import CaseService


def test_case_number_generation_sequence(db):
    num1 = CaseService.generate_case_number(db)
    assert "GST-2026-" in num1
    assert num1.endswith("000001")

    # Add dummy case
    c = InvestigationCase(case_number=num1, vehicle_number="KA01TEST", status="NEW")
    db.add(c)
    db.commit()

    num2 = CaseService.generate_case_number(db)
    assert num2.endswith("000002")


@pytest.mark.asyncio
async def test_case_creation_and_duplicate_protection(db, test_user):
    db.add(PincodeLocation(pin_code=110001, latitude=28.61, longitude=77.20, office_name="New Delhi"))
    db.add(PincodeLocation(pin_code=400001, latitude=19.07, longitude=72.87, office_name="Mumbai"))
    t0 = datetime(2026, 8, 1, 8, 0)
    db.add(EwayBill(ewb_no=8801, ewb_dt=t0, from_pin=110001, to_pin=400001, travel_distance=1150, ewb_final_valid_dt=t0 + timedelta(days=2), ewb_ass_amt=500000, vehicle_number="KA01CASE"))
    db.commit()

    # 1. Create first case
    case1, is_new = await CaseService.create_investigation_case(
        db=db,
        vehicle_number="KA01CASE",
        user=test_user,
        title="Test Investigation"
    )
    assert is_new is True
    assert case1.case_number.startswith("GST-")
    assert case1.status == "NEW"
    assert case1.snapshot_json is not None

    # 2. Attempt duplicate creation while active
    case2, is_new2 = await CaseService.create_investigation_case(
        db=db,
        vehicle_number="KA01CASE",
        user=test_user
    )
    assert is_new2 is False
    assert case2.id == case1.id
    assert case2.case_number == case1.case_number


def test_case_notes_and_evidence_review(db, test_user):
    case = InvestigationCase(case_number="GST-2026-999999", vehicle_number="KA01NOTE", status="NEW", created_by=test_user.id)
    db.add(case)
    db.commit()
    db.refresh(case)

    # 1. Add Note
    note = CaseService.add_case_note(db, case.id, "FASTag sensor clock audit needed.", test_user)
    assert note.id is not None
    assert note.content == "FASTag sensor clock audit needed."
    assert len(case.notes) == 1

    # 2. Review Evidence
    rev = CaseService.review_case_evidence(db, case.id, "EV-SPEED-01", "RELEVANT", "Clock confirmed synchronized.", test_user)
    assert rev.status == "RELEVANT"
    assert rev.notes == "Clock confirmed synchronized."


def test_status_lifecycle_and_resolution(db, test_user):
    case = InvestigationCase(case_number="GST-2026-888888", vehicle_number="KA01FLOW", status="NEW", created_by=test_user.id)
    db.add(case)
    db.commit()
    db.refresh(case)

    # NEW -> UNDER_REVIEW
    CaseService.update_case_status(db, case.id, "UNDER_REVIEW", test_user)
    assert case.status == "UNDER_REVIEW"

    # UNDER_REVIEW -> INVESTIGATION
    CaseService.update_case_status(db, case.id, "INVESTIGATION", test_user)
    assert case.status == "INVESTIGATION"

    # Resolve case
    CaseService.resolve_case(
        db=db,
        case_id=case.id,
        resolution_type="COMPLIANCE_ISSUE",
        summary="E-Way Bill expired during transit due to engine breakdown.",
        notes="Taxpayer provided toll receipt and repair bill.",
        evidence_ids=["EV-VALIDITY-01"],
        user=test_user
    )
    assert case.status == "RESOLVED"
    assert case.resolution_type == "COMPLIANCE_ISSUE"

    # Close case
    CaseService.close_case(db, case.id, test_user)
    assert case.status == "CLOSED"
    assert case.closed_at is not None


@pytest.mark.asyncio
async def test_investigation_api_endpoints(client, auth_headers, db):
    db.add(PincodeLocation(pin_code=110001, latitude=28.61, longitude=77.20, office_name="New Delhi"))
    db.add(PincodeLocation(pin_code=400001, latitude=19.07, longitude=72.87, office_name="Mumbai"))
    t0 = datetime(2026, 8, 1, 8, 0)
    db.add(EwayBill(ewb_no=6601, ewb_dt=t0, from_pin=110001, to_pin=400001, travel_distance=1150, ewb_final_valid_dt=t0 + timedelta(days=2), ewb_ass_amt=750000, vehicle_number="MH04PHASE7"))
    db.commit()

    # 1. POST /api/investigations
    res_create = client.post("/api/investigations", json={
        "vehicle_number": "MH04PHASE7",
        "title": "Suspected Toll Evasion"
    }, headers=auth_headers)
    assert res_create.status_code == 201
    data_c = res_create.json()
    case_id = data_c["case_id"]
    assert "GST-" in data_c["case_number"]

    # 2. GET /api/investigations/stats
    res_stats = client.get("/api/investigations/stats", headers=auth_headers)
    assert res_stats.status_code == 200
    assert res_stats.json()["total_cases"] >= 1

    # 3. GET /api/investigations (List)
    res_list = client.get("/api/investigations", headers=auth_headers)
    assert res_list.status_code == 200
    assert res_list.json()["total"] >= 1

    # 4. GET /api/investigations/{case_id} (Detail)
    res_detail = client.get(f"/api/investigations/{case_id}", headers=auth_headers)
    assert res_detail.status_code == 200
    d_data = res_detail.json()
    assert d_data["vehicle_number"] == "MH04PHASE7"
    assert "snapshot" in d_data
    assert "current_risk" in d_data

    # 5. POST note
    res_note = client.post(f"/api/investigations/{case_id}/notes", json={
        "content": "Contacted consignor for delivery challan."
    }, headers=auth_headers)
    assert res_note.status_code == 200
    assert res_note.json()["content"] == "Contacted consignor for delivery challan."
