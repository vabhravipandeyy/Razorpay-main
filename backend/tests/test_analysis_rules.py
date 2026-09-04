import pytest
from datetime import datetime, timedelta
from app.services.analysis_service import AnalysisService
from app.models.eway_bill import EwayBill
from app.models.fastag_transaction import FastagTransaction
from app.models.pincode_location import PincodeLocation


def test_haversine_distance():
    # Distance between New Delhi (28.6139, 77.2090) and Mumbai (19.0760, 72.8777) approx 1148 km
    dist = AnalysisService.haversine(28.6139, 77.2090, 19.0760, 72.8777)
    assert 1140 < dist < 1160

    # Same point distance is zero
    assert AnalysisService.haversine(28.61, 77.20, 28.61, 77.20) == 0.0

    # Invalid coordinates return 0.0 without crashing
    assert AnalysisService.haversine("invalid", 77.20, 28.61, 77.20) == 0.0
    assert AnalysisService.haversine(95.0, 77.20, 28.61, 77.20) == 0.0


def test_bearing_calculation_and_difference():
    # Due North bearing is 0 deg
    bearing_n = AnalysisService.bearing(20.0, 75.0, 25.0, 75.0)
    assert round(bearing_n) == 0

    # Due East bearing along Equator is 90 deg
    bearing_e = AnalysisService.bearing(0.0, 75.0, 0.0, 80.0)
    assert round(bearing_e) == 90

    # Bearing difference wrapping across 0/360 boundary (e.g. 350 deg vs 10 deg is 20 deg)
    diff = AnalysisService.bearing_difference(350.0, 10.0)
    assert diff == 20.0

    # Normal bearing difference
    assert AnalysisService.bearing_difference(40.0, 70.0) == 30.0


def test_direction_names():
    assert AnalysisService.direction(0) == "North"
    assert AnalysisService.direction(45) == "North-East"
    assert AnalysisService.direction(90) == "East"
    assert AnalysisService.direction(180) == "South"
    assert AnalysisService.direction(270) == "West"


def test_overlap_percentage():
    t0 = datetime(2026, 8, 1, 10, 0, 0)
    t1 = datetime(2026, 8, 1, 12, 0, 0)  # 2h duration
    t2 = datetime(2026, 8, 1, 11, 0, 0)
    t3 = datetime(2026, 8, 1, 13, 0, 0)  # Overlap 11:00-12:00 = 1h (50% of trip1)

    overlap = AnalysisService.overlap_percentage(t0, t1, t2, t3)
    assert overlap == 50.0

    # Exactly 60% overlap
    t_60 = t0 + timedelta(minutes=72)
    overlap_60 = AnalysisService.overlap_percentage(t0, t1, t0, t_60)
    assert round(overlap_60) == 60

    # No overlap
    t_after_start = datetime(2026, 8, 1, 14, 0, 0)
    t_after_end = datetime(2026, 8, 1, 16, 0, 0)
    assert AnalysisService.overlap_percentage(t0, t1, t_after_start, t_after_end) == 0.0

    # Zero or negative duration
    assert AnalysisService.overlap_percentage(t1, t0, t0, t1) == 0.0


@pytest.mark.asyncio
async def test_rule_1_no_fastag(db):
    """Rule 1: Vehicle has active E-Way Bills but zero FASTag toll transactions (+25 points)."""
    # Seed pincodes
    db.add(PincodeLocation(pin_code=110001, latitude=28.61, longitude=77.20, office_name="Connaught Place"))
    db.add(PincodeLocation(pin_code=400001, latitude=19.07, longitude=72.87, office_name="Mumbai GPO"))
    
    # Add EWB
    db.add(EwayBill(
        ewb_no=1001,
        ewb_dt=datetime(2026, 8, 1, 8, 0),
        from_pin=110001,
        to_pin=400001,
        travel_distance=1150,
        ewb_final_valid_dt=datetime(2026, 8, 3, 20, 0),
        ewb_ass_amt=100000,
        vehicle_number="KA01AB1111"
    ))
    db.commit()

    result = await AnalysisService.analyze_vehicle(db, "KA01AB1111")
    
    rule1 = next(r for r in result["rules"] if r["rule"] == "No FASTag Data")
    assert rule1["passed"] is False
    assert rule1["score"] == 25
    assert result["risk_score"] >= 25


@pytest.mark.asyncio
async def test_rule_2_duplicate_overlapping_ewb(db):
    """Rule 2: Duplicate / Overlapping E-Way Bills (>= 60% overlap, +10 points)."""
    db.add(PincodeLocation(pin_code=110001, latitude=28.61, longitude=77.20))
    db.add(PincodeLocation(pin_code=400001, latitude=19.07, longitude=72.87))

    t_start = datetime(2026, 8, 1, 8, 0)
    t_end = datetime(2026, 8, 3, 8, 0)

    # Two heavily overlapping EWBs (100% overlap)
    db.add(EwayBill(ewb_no=2001, ewb_dt=t_start, from_pin=110001, to_pin=400001, travel_distance=1150, ewb_final_valid_dt=t_end, vehicle_number="KA02CD2222"))
    db.add(EwayBill(ewb_no=2002, ewb_dt=t_start, from_pin=110001, to_pin=400001, travel_distance=1150, ewb_final_valid_dt=t_end, vehicle_number="KA02CD2222"))
    
    # Add dummy fastag to not trigger Rule 1
    db.add(FastagTransaction(toll_id=1, toll_name="Toll 1", geo_lat=25.0, geo_long=75.0, readertme=t_start + timedelta(hours=5), veh="KA02CD2222"))
    db.commit()

    result = await AnalysisService.analyze_vehicle(db, "KA02CD2222")

    rule2 = next(r for r in result["rules"] if r["rule"] == "Duplicate E-Way Bill")
    assert rule2["passed"] is False
    assert rule2["score"] == 10


@pytest.mark.asyncio
async def test_rule_3_fastag_outside_validity(db):
    """Rule 3: FASTag transactions occurred outside all EWB validity periods (+20 points)."""
    db.add(PincodeLocation(pin_code=110001, latitude=28.61, longitude=77.20))
    db.add(PincodeLocation(pin_code=400001, latitude=19.07, longitude=72.87))

    t_start = datetime(2026, 8, 1, 8, 0)
    t_end = datetime(2026, 8, 2, 8, 0)

    db.add(EwayBill(ewb_no=3001, ewb_dt=t_start, from_pin=110001, to_pin=400001, travel_distance=1150, ewb_final_valid_dt=t_end, vehicle_number="KA03EF3333"))
    
    # FASTag scan 10 days after EWB expired
    db.add(FastagTransaction(toll_id=10, toll_name="Late Toll", geo_lat=25.0, geo_long=75.0, readertme=t_end + timedelta(days=10), veh="KA03EF3333"))
    db.commit()

    result = await AnalysisService.analyze_vehicle(db, "KA03EF3333")

    rule3 = next(r for r in result["rules"] if r["rule"] == "FASTag Outside Validity")
    assert rule3["passed"] is False
    assert rule3["score"] == 20


@pytest.mark.asyncio
async def test_rule_4_impossible_speed(db):
    """Rule 4: Impossible Average Speed (> 130 km/h, +30 points)."""
    db.add(PincodeLocation(pin_code=110001, latitude=28.61, longitude=77.20))
    db.add(PincodeLocation(pin_code=400001, latitude=19.07, longitude=72.87))

    t_start = datetime(2026, 8, 1, 8, 0)
    t_end = datetime(2026, 8, 3, 8, 0)

    db.add(EwayBill(ewb_no=4001, ewb_dt=t_start, from_pin=110001, to_pin=400001, travel_distance=1150, ewb_final_valid_dt=t_end, vehicle_number="KA04GH4444"))
    
    # Two toll scans ~500 km apart in 1 hour (Speed ~500 km/h > 130 km/h)
    db.add(FastagTransaction(toll_id=101, toll_name="Toll North", geo_lat=28.0, geo_long=77.0, readertme=t_start + timedelta(hours=1), veh="KA04GH4444"))
    db.add(FastagTransaction(toll_id=102, toll_name="Toll South", geo_lat=23.0, geo_long=75.0, readertme=t_start + timedelta(hours=2), veh="KA04GH4444"))
    db.commit()

    result = await AnalysisService.analyze_vehicle(db, "KA04GH4444")

    rule4 = next(r for r in result["rules"] if r["rule"] == "Impossible Average Speed")
    assert rule4["passed"] is False
    assert rule4["score"] == 30


@pytest.mark.asyncio
async def test_risk_level_bands(db):
    """Test risk level band calculations (0-29 LOW, 30-59 MEDIUM, 60+ HIGH)."""
    # 0 score vehicle
    res_low = await AnalysisService.analyze_vehicle(db, "EMPTY0000")
    assert res_low["risk_score"] == 0
    assert res_low["risk_level"] == "LOW"
