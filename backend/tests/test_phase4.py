import pytest
from datetime import datetime, timedelta
from app.models.eway_bill import EwayBill
from app.models.fastag_transaction import FastagTransaction
from app.models.pincode_location import PincodeLocation
from app.services.evidence_engine import EvidenceEngine
from app.services.explanation_engine import ExplanationEngine
from app.services.decision_engine import DecisionEngine
from app.services.feature_service import FeatureEngineeringService
from app.services.rule_engine import RuleEngine
from app.services.ml_anomaly_service import MLAnomalyService
from app.services.risk_engine import RiskEngine


def test_evidence_engine_assembly():
    t0 = datetime(2026, 8, 1, 10, 0)
    t1 = t0 + timedelta(minutes=4)

    ewb = EwayBill(ewb_no=901, ewb_dt=t0, from_pin=110001, to_pin=400001, travel_distance=1150, ewb_final_valid_dt=t0 + timedelta(days=2), ewb_ass_amt=150000, vehicle_number="KA04EVIDENCE")
    f1 = FastagTransaction(toll_id=10, toll_name="North Toll", geo_lat=28.0, geo_long=77.0, readertme=t0, veh="KA04EVIDENCE")
    f2 = FastagTransaction(toll_id=20, toll_name="South Toll", geo_lat=27.8, geo_long=76.8, readertme=t1, veh="KA04EVIDENCE")  # ~30km in 4 min -> ~450 km/h

    trips_context = [{
        "ewb": ewb, "distance": 1150, "bearing": 210.0, "direction": "South-West",
        "source": type('Loc', (), {'latitude': 28.61, 'longitude': 77.20})(),
        "destination": type('Loc', (), {'latitude': 19.07, 'longitude': 72.87})(),
        "tolls": [f1, f2]
    }]

    features = FeatureEngineeringService.extract_features("KA04EVIDENCE", [ewb], [f1, f2], trips_context)
    rules_eval = RuleEngine.evaluate("KA04EVIDENCE", [ewb], [f1, f2], trips_context, features)
    ml_eval = MLAnomalyService.predict(features)

    evidence_items = EvidenceEngine.assemble_evidence(
        vehicle_number="KA04EVIDENCE",
        ewbs=[ewb],
        fastag=[f1, f2],
        trips_context=trips_context,
        rules_eval=rules_eval,
        ml_eval=ml_eval,
        features=features
    )

    assert len(evidence_items) > 0
    # Rule 4 evidence should be present
    speed_ev = [e for e in evidence_items if e["category"] == "KINEMATIC_VIOLATION"]
    assert len(speed_ev) == 1
    assert speed_ev[0]["threshold_value"] == 130.0
    assert speed_ev[0]["observed_value"] > 130.0
    assert len(speed_ev[0]["evidence_chain"]) >= 3


def test_explanation_engine_and_financial_context():
    ewb1 = EwayBill(ewb_no=1001, ewb_ass_amt=250000)
    ewb2 = EwayBill(ewb_no=1002, ewb_ass_amt=175000)
    
    fin = ExplanationEngine.calculate_financial_context([ewb1, ewb2], {})
    assert fin["total_associated_value_inr"] == 425000.0
    assert fin["total_bills_count"] == 2
    assert "₹425,000.00" in fin["formatted_valuation"]

    # Executive summary
    hybrid_eval = {"score": 88, "level": "CRITICAL"}
    rules_eval = {"rules": [{"rule_id": "R4", "rule": "Impossible Speed", "passed": False, "reason": "Speed exceeded 130 km/h"}]}
    ml_eval = {"status": "AVAILABLE", "anomaly_level": "HIGHLY_ANOMALOUS", "explanation": "Unusually high velocity"}
    conf_eval = {"score": 90, "level": "HIGH CONFIDENCE"}

    exec_summary = ExplanationEngine.generate_executive_summary(
        vehicle_number="KA04EXEC",
        hybrid_eval=hybrid_eval,
        rules_eval=rules_eval,
        ml_eval=ml_eval,
        confidence_eval=conf_eval,
        evidence_items=[{"category": "KINEMATIC_VIOLATION"}]
    )

    assert "CRITICAL RISK" in exec_summary["headline"]
    assert len(exec_summary["primary_concerns"]) >= 2
    assert exec_summary["total_evidence_points"] == 1


def test_decision_engine_priorities():
    # 1. Critical risk -> URGENT_REVIEW
    crit_decision = DecisionEngine.evaluate_decision(
        hybrid_eval={"score": 92, "level": "CRITICAL"},
        confidence_eval={"score": 85, "level": "HIGH CONFIDENCE"},
        rules_eval={"failed_rules_count": 2, "rules": [{"rule_id": "R4", "passed": False, "severity": "CRITICAL"}]},
        ml_eval={"status": "AVAILABLE", "anomaly_level": "HIGHLY_ANOMALOUS"},
        evidence_items=[]
    )
    assert crit_decision["priority"] == "URGENT_REVIEW"
    assert len(crit_decision["recommended_actions"]) > 0
    assert crit_decision["recommended_actions"][0]["action_id"] == "ACT-01"

    # 2. Low risk -> NORMAL
    normal_decision = DecisionEngine.evaluate_decision(
        hybrid_eval={"score": 15, "level": "LOW"},
        confidence_eval={"score": 90, "level": "HIGH CONFIDENCE"},
        rules_eval={"failed_rules_count": 0, "rules": []},
        ml_eval={"status": "AVAILABLE", "anomaly_level": "NORMAL"},
        evidence_items=[]
    )
    assert normal_decision["priority"] == "NORMAL"


@pytest.mark.asyncio
async def test_phase4_api_integration(client, auth_headers, db):
    db.add(PincodeLocation(pin_code=110001, latitude=28.61, longitude=77.20, office_name="New Delhi"))
    db.add(PincodeLocation(pin_code=400001, latitude=19.07, longitude=72.87, office_name="Mumbai"))
    
    t0 = datetime(2026, 8, 1, 8, 0)
    db.add(EwayBill(ewb_no=9901, ewb_dt=t0, from_pin=110001, to_pin=400001, travel_distance=1150, ewb_final_valid_dt=t0 + timedelta(days=2), ewb_ass_amt=650000, vehicle_number="DL04PHASE4"))
    db.add(FastagTransaction(toll_id=1, toll_name="Gate A", geo_lat=28.0, geo_long=77.0, readertme=t0, veh="DL04PHASE4"))
    db.add(FastagTransaction(toll_id=2, toll_name="Gate B", geo_lat=23.0, geo_long=75.0, readertme=t0 + timedelta(minutes=15), veh="DL04PHASE4"))
    db.commit()

    res = client.get("/analysis/DL04PHASE4/risk-profile", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()

    assert data["vehicle_number"] == "DL04PHASE4"
    assert "evidence" in data
    assert "executive_summary" in data
    assert "financial_context" in data
    assert "decision" in data
    assert data["decision"]["priority"] in ["URGENT_REVIEW", "INVESTIGATE"]
    assert data["financial_context"]["total_associated_value_inr"] == 650000.0
