import pytest
import json
from datetime import datetime, timedelta
from app.models.vehicle_analysis import VehicleAnalysisRecord
from app.models.investigation import InvestigationCase
from app.models.eway_bill import EwayBill
from app.models.fastag_transaction import FastagTransaction
from app.models.user import User
from app.services.analytics_service import AnalyticsService
from app.services.reporting_service import ReportingService, DISCLAIMER


def test_record_risk_snapshot_and_trends(db):
    s1 = AnalyticsService.record_risk_snapshot(
        db=db,
        vehicle_number="KA01TREND",
        risk_score=75,
        risk_level="HIGH",
        rule_score=80,
        ml_anomaly_score=70,
        hybrid_risk_score=77,
        compliance_score=40,
        trust_score=50,
        confidence_score=90
    )
    assert s1.id is not None
    assert s1.vehicle_number == "KA01TREND"

    trends = AnalyticsService.get_risk_trends(db, days=30)
    assert len(trends) >= 1
    assert "average_risk" in trends[0]


def test_overview_kpis_and_distribution(db):
    # Seed analysis records
    d1 = json.dumps({"compliance_score": 30, "trust_score": 40, "confidence_score": 95})
    d2 = json.dumps({"compliance_score": 70, "trust_score": 60, "confidence_score": 80})
    d3 = json.dumps({"compliance_score": 95, "trust_score": 90, "confidence_score": 70})

    db.add(VehicleAnalysisRecord(vehicle_number="KA01HIGH", risk_score=85, risk_level="HIGH", analysis_data=d1))
    db.add(VehicleAnalysisRecord(vehicle_number="MH02MED", risk_score=50, risk_level="MEDIUM", analysis_data=d2))
    db.add(VehicleAnalysisRecord(vehicle_number="DL03LOW", risk_score=15, risk_level="LOW", analysis_data=d3))
    db.commit()

    kpis = AnalyticsService.get_overview_kpis(db)
    assert kpis["total_vehicles"] >= 3
    assert kpis["high_risk_vehicles"] >= 1
    assert kpis["medium_risk_vehicles"] >= 1
    assert kpis["low_risk_vehicles"] >= 1
    assert kpis["average_risk_score"] > 0

    dist = AnalyticsService.get_risk_distribution(db)
    assert dist["high"] >= 1
    assert dist["high_percentage"] > 0


def test_signals_routes_and_regional_aggregation(db):
    data_gj = json.dumps({
        "compliance_score": 20,
        "rule_flags": {"impossible_speed": True, "route_mismatch": True}
    })
    db.add(VehicleAnalysisRecord(
        vehicle_number="GJ01TEST",
        risk_score=90,
        risk_level="HIGH",
        analysis_data=data_gj
    ))
    db.add(EwayBill(
        ewb_no=9901,
        vehicle_number="GJ01TEST",
        from_pin=380001,
        to_pin=400001,
        travel_distance=500,
        ewb_dt=datetime.now(),
        ewb_final_valid_dt=datetime.now() + timedelta(days=2),
        ewb_ass_amt=1000000
    ))
    db.add(FastagTransaction(
        toll_name="Ahmedabad Toll Plaza",
        veh="GJ01TEST",
        readertme=datetime.now()
    ))
    db.commit()

    signals = AnalyticsService.get_risk_signals_frequency(db)
    assert signals["total_signals_detected"] >= 2

    routes = AnalyticsService.get_suspicious_routes_analytics(db)
    assert len(routes) >= 1

    tolls = AnalyticsService.get_suspicious_tolls_analytics(db)
    assert len(tolls) >= 1
    assert tolls[0]["toll_plaza_name"] == "Ahmedabad Toll Plaza"

    regions = AnalyticsService.get_regional_risk_analytics(db)
    assert any(r["state_code"] == "GJ" for r in regions)


def test_reporting_engine(db, test_user):
    rep = ReportingService.generate_executive_report(db, days=30, user=test_user)
    assert rep["report_type"] == "EXECUTIVE_RISK_SUMMARY"
    assert "disclaimer" in rep
    assert DISCLAIMER in rep["disclaimer"]

    csv_data = ReportingService.export_high_risk_vehicles_csv(db, user=test_user)
    assert "Vehicle Number" in csv_data
    assert "Risk Score" in csv_data


@pytest.mark.asyncio
async def test_analytics_and_reports_api(client, auth_headers, db):
    # 1. GET /api/analytics/overview
    res_ov = client.get("/api/analytics/overview", headers=auth_headers)
    assert res_ov.status_code == 200
    assert "total_vehicles" in res_ov.json()

    # 2. GET /api/analytics/risk-distribution
    res_dist = client.get("/api/analytics/risk-distribution", headers=auth_headers)
    assert res_dist.status_code == 200
    assert "high" in res_dist.json()

    # 3. GET /api/analytics/risk-signals
    res_sig = client.get("/api/analytics/risk-signals", headers=auth_headers)
    assert res_sig.status_code == 200
    assert "signals" in res_sig.json()

    # 4. GET /api/analytics/routes
    res_r = client.get("/api/analytics/routes", headers=auth_headers)
    assert res_r.status_code == 200

    # 5. GET /api/reports/executive
    res_rep = client.get("/api/reports/executive", headers=auth_headers)
    assert res_rep.status_code == 200
    assert "disclaimer" in res_rep.json()
