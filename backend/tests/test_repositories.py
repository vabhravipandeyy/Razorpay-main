import pytest
from datetime import datetime
from app.models.eway_bill import EwayBill
from app.models.fastag_transaction import FastagTransaction
from app.repositories.eway_bill_repository import EwayBillRepository
from app.repositories.fastag_repository import FastagRepository
from app.repositories.vehicle_analysis_repository import VehicleAnalysisRepository


def test_eway_bill_repository_normalized_query(db):
    db.add(EwayBill(
        ewb_no=9991,
        ewb_dt=datetime(2026, 8, 1, 10, 0),
        from_pin=110001,
        to_pin=400001,
        travel_distance=1150,
        ewb_final_valid_dt=datetime(2026, 8, 3, 10, 0),
        vehicle_number="KA01AB1234"
    ))
    db.commit()

    # Match exact
    res1 = EwayBillRepository.get_by_vehicle(db, "KA01AB1234")
    assert len(res1) == 1

    # Match with spaces and lowercase
    res2 = EwayBillRepository.get_by_vehicle(db, "ka 01 ab 1234")
    assert len(res2) == 1


def test_fastag_repository_normalized_query(db):
    db.add(FastagTransaction(
        toll_id=55,
        toll_name="Test Plaza",
        geo_lat=28.5,
        geo_long=77.1,
        readertme=datetime(2026, 8, 1, 11, 0),
        veh="DL04CD5678"
    ))
    db.commit()

    # Match with hyphens
    res = FastagRepository.get_by_vehicle(db, "DL-04-CD-5678")
    assert len(res) == 1


def test_vehicle_analysis_repository_save_and_stats(db):
    analysis_data = {
        "vehicle_number": "MH12DE1433",
        "risk_score": 75,
        "risk_level": "HIGH",
        "eway_bill_count": 2,
        "fastag_count": 4,
        "rules": [{"rule": "Impossible Average Speed", "passed": False, "score": 30}],
    }
    VehicleAnalysisRepository.save_or_update(db, "MH12DE1433", analysis_data)
    
    # Retrieve
    record = VehicleAnalysisRepository.get_by_vehicle(db, "mh 12 de 1433")
    assert record is not None
    assert record.risk_score == 75
    assert record.risk_level == "HIGH"

    # Stats
    stats = VehicleAnalysisRepository.get_stats(db)
    assert stats["total_records"] == 1
    assert stats["high_risk"] == 1
