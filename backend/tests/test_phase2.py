import pytest
from datetime import datetime, timedelta
from app.models.eway_bill import EwayBill
from app.models.fastag_transaction import FastagTransaction
from app.models.pincode_location import PincodeLocation
from app.services.feature_service import FeatureEngineeringService
from app.services.rule_engine import RuleEngine
from app.services.compliance_service import ComplianceService
from app.services.trust_service import TrustScoreService
from app.services.risk_engine import RiskEngine
from app.services.analysis_service import AnalysisService


def test_circular_bearing_difference():
    # 350 deg vs 10 deg must be 20 deg (NOT 340 deg)
    assert FeatureEngineeringService.bearing_difference(350.0, 10.0) == 20.0
    assert FeatureEngineeringService.bearing_difference(10.0, 350.0) == 20.0
    # Exactly opposite bearings
    assert FeatureEngineeringService.bearing_difference(0.0, 180.0) == 180.0
    assert FeatureEngineeringService.bearing_difference(90.0, 270.0) == 180.0


def test_feature_engineering_isolated():
    t0 = datetime(2026, 8, 1, 10, 0)
    t1 = t0 + timedelta(hours=2)
    t2 = t0 + timedelta(hours=3)

    ewb = EwayBill(
        ewb_no=501,
        ewb_dt=t0,
        from_pin=110001,
        to_pin=400001,
        travel_distance=1150,
        ewb_final_valid_dt=t2,
        ewb_ass_amt=75000,
        vehicle_number="KA01FE1234"
    )

    f1 = FastagTransaction(toll_id=1, toll_name="Toll 1", geo_lat=28.0, geo_long=77.0, readertme=t0, veh="KA01FE1234")
    f2 = FastagTransaction(toll_id=2, toll_name="Toll 2", geo_lat=27.0, geo_long=76.5, readertme=t1, veh="KA01FE1234")

    features = FeatureEngineeringService.extract_features(
        vehicle_number="KA01FE1234",
        ewbs=[ewb],
        fastag=[f1, f2],
        trips_context=[]
    )

    assert features["ewb"]["total_ewbs"] == 1
    assert features["ewb"]["high_value_ewb_count"] == 1
    assert features["ewb"]["avg_invoice_value"] == 75000.0
    assert features["fastag"]["total_transactions"] == 2
    assert features["fastag"]["unique_toll_plazas"] == 2
    assert features["speed"]["avg_speed_kmh"] > 0
    assert "data_quality" in features
    assert "behavior_profile" in features


def test_confidence_score_calculation():
    # Empty vehicle -> low confidence
    features_empty = FeatureEngineeringService.extract_features("EMPTY01", [], [], [])
    conf_empty = RiskEngine.calculate_confidence([], [], features_empty)
    assert conf_empty["score"] < 40
    assert conf_empty["level"] == "LOW CONFIDENCE"

    # Vehicle with rich telemetry -> high confidence
    dummy_ewbs = [EwayBill(ewb_no=i, ewb_dt=datetime(2026, 8, 1), from_pin=110001, to_pin=400001, travel_distance=1000, ewb_final_valid_dt=datetime(2026, 8, 3), vehicle_number="RICH01") for i in range(4)]
    dummy_fastag = [FastagTransaction(toll_id=i, toll_name=f"Toll {i}", geo_lat=20.0 + i*0.1, geo_long=75.0, readertme=datetime(2026, 8, 1) + timedelta(hours=i), veh="RICH01") for i in range(12)]
    
    features_rich = FeatureEngineeringService.extract_features("RICH01", dummy_ewbs, dummy_fastag, [])
    conf_rich = RiskEngine.calculate_confidence(dummy_ewbs, dummy_fastag, features_rich)
    assert conf_rich["score"] >= 80
    assert conf_rich["level"] == "HIGH CONFIDENCE"


@pytest.mark.asyncio
async def test_risk_profile_api_endpoint(client, auth_headers, db):
    # Seed PIN codes
    db.add(PincodeLocation(pin_code=110001, latitude=28.61, longitude=77.20, office_name="New Delhi"))
    db.add(PincodeLocation(pin_code=400001, latitude=19.07, longitude=72.87, office_name="Mumbai"))
    
    # Seed high-speed vehicle
    t0 = datetime(2026, 8, 1, 8, 0)
    db.add(EwayBill(ewb_no=8801, ewb_dt=t0, from_pin=110001, to_pin=400001, travel_distance=1150, ewb_final_valid_dt=t0 + timedelta(days=2), ewb_ass_amt=100000, vehicle_number="DL01SPEED"))
    db.add(FastagTransaction(toll_id=1, toll_name="Gate 1", geo_lat=28.0, geo_long=77.0, readertme=t0, veh="DL01SPEED"))
    # Speed ~500 km/h > 130 km/h
    db.add(FastagTransaction(toll_id=2, toll_name="Gate 2", geo_lat=23.0, geo_long=75.0, readertme=t0 + timedelta(hours=1), veh="DL01SPEED"))
    db.commit()

    # Unauthenticated call -> 401
    client.cookies.clear()
    res_unauth = client.get("/analysis/DL01SPEED/risk-profile")
    assert res_unauth.status_code == 401

    # Authenticated call -> 200
    res = client.get("/analysis/DL01SPEED/risk-profile", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["vehicle_number"] == "DL01SPEED"
    assert "fraud_risk" in data
    assert "compliance" in data
    assert "trust" in data
    assert "confidence" in data
    assert "risk_drivers" in data
    assert len(data["risk_drivers"]) > 0
    assert data["risk_drivers"][0]["rule_id"] == "R4"  # Impossible speed driver prioritized


@pytest.mark.asyncio
async def test_features_api_endpoint(client, auth_headers, db):
    res = client.get("/analysis/DL01SPEED/features", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "features" in data
    assert "ewb" in data["features"]
    assert "fastag" in data["features"]
    assert "speed" in data["features"]
    assert "behavior_profile" in data
