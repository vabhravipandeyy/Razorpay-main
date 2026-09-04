import os
import pytest
from datetime import datetime, timedelta
from app.models.eway_bill import EwayBill
from app.models.fastag_transaction import FastagTransaction
from app.models.pincode_location import PincodeLocation
from app.services.feature_service import FeatureEngineeringService
from app.services.ml_anomaly_service import MLAnomalyService
from app.services.risk_engine import RiskEngine
from scripts.train_anomaly_model import generate_synthetic_training_data


def test_feature_vector_extraction_and_cleaning():
    features = {
        "ewb": {"total_ewbs": 5, "avg_invoice_value": 75000, "max_invoice_value": 120000, "overlapping_ewb_pairs": 1},
        "fastag": {"total_transactions": 14, "unique_toll_plazas": 10, "night_crossings_count": 4},
        "speed": {"avg_speed_kmh": 62.5, "max_speed_kmh": 98.0, "speed_variance": 45.2},
        "movement": {"total_observed_movement_km": 680.0, "stationary_periods_gt_8h": 1, "rapid_long_distance_jumps": 0},
        "route": {"bearing_deviation_deg": 12.4},
    }
    vec = MLAnomalyService.extract_feature_vector(features)
    assert len(vec) == len(MLAnomalyService.FEATURE_NAMES)
    assert vec[0] == 5.0
    assert vec[7] == 62.5

    # Test NaN and None cleaning
    corrupt_features = {"ewb": {"total_ewbs": None}, "speed": {"avg_speed_kmh": float("nan")}}
    corrupt_vec = MLAnomalyService.extract_feature_vector(corrupt_features)
    assert corrupt_vec[0] == 0.0
    assert corrupt_vec[7] == 0.0


def test_ml_model_training_and_prediction():
    # Generate synthetic training dataset
    synthetic_data = generate_synthetic_training_data(n_samples=50)
    metadata = MLAnomalyService.train(
        feature_matrix=synthetic_data,
        n_estimators=30,
        contamination=0.10,
        random_state=42,
        version="test_v1"
    )

    assert metadata["model_version"] == "test_v1"
    assert metadata["training_samples"] == 50
    assert len(metadata["population_medians"]) == len(MLAnomalyService.FEATURE_NAMES)

    # Test prediction on normal feature set
    normal_feats = {
        "ewb": {"total_ewbs": 2, "avg_invoice_value": 60000, "max_invoice_value": 65000, "overlapping_ewb_pairs": 0},
        "fastag": {"total_transactions": 8, "unique_toll_plazas": 6, "night_crossings_count": 1},
        "speed": {"avg_speed_kmh": 52.0, "max_speed_kmh": 85.0, "speed_variance": 20.0},
        "movement": {"total_observed_movement_km": 300.0, "stationary_periods_gt_8h": 0, "rapid_long_distance_jumps": 0},
        "route": {"bearing_deviation_deg": 6.0},
    }
    pred_normal = MLAnomalyService.predict(normal_feats)
    assert pred_normal["status"] == "AVAILABLE"
    assert 0 <= pred_normal["ml_anomaly_score"] <= 100

    # Test prediction on extreme anomaly feature set (e.g. 180 km/h, 35 night runs, 8 overlapping bills)
    anom_feats = {
        "ewb": {"total_ewbs": 25, "avg_invoice_value": 900000, "max_invoice_value": 2500000, "overlapping_ewb_pairs": 12},
        "fastag": {"total_transactions": 60, "unique_toll_plazas": 20, "night_crossings_count": 45},
        "speed": {"avg_speed_kmh": 145.0, "max_speed_kmh": 190.0, "speed_variance": 120.0},
        "movement": {"total_observed_movement_km": 3500.0, "stationary_periods_gt_8h": 6, "rapid_long_distance_jumps": 4},
        "route": {"bearing_deviation_deg": 42.0},
    }
    pred_anom = MLAnomalyService.predict(anom_feats)
    assert pred_anom["status"] == "AVAILABLE"
    assert pred_anom["ml_anomaly_score"] > pred_normal["ml_anomaly_score"]
    assert len(pred_anom["top_anomalous_features"]) > 0


def test_hybrid_risk_calculation():
    # 1. High Rule (130 -> 100%) + High ML (80%) -> Hybrid = 0.70*100 + 0.30*80 = 94 (CRITICAL)
    ml_high = {"status": "AVAILABLE", "ml_anomaly_score": 80}
    hybrid_high = RiskEngine.calculate_hybrid_risk(130, ml_high)
    assert hybrid_high["score"] == 94
    assert hybrid_high["level"] == "CRITICAL"
    assert hybrid_high["diagnostic_code"] == "HIGH_RULE_HIGH_ML"

    # 2. Low Rule (0) + High ML (90%) -> Hybrid = 0.70*0 + 0.30*90 = 27 (LOW/Novel anomaly)
    ml_novel = {"status": "AVAILABLE", "ml_anomaly_score": 90}
    hybrid_novel = RiskEngine.calculate_hybrid_risk(0, ml_novel)
    assert hybrid_novel["score"] == 27
    assert hybrid_novel["diagnostic_code"] == "LOW_RULE_HIGH_ML"

    # 3. Cold start / ML unavailable -> 100% rule based fallback
    ml_unavail = {"status": "UNAVAILABLE", "ml_anomaly_score": 0}
    hybrid_fallback = RiskEngine.calculate_hybrid_risk(65, ml_unavail)  # 65/130 = 50%
    assert hybrid_fallback["score"] == 50
    assert hybrid_fallback["level"] == "MEDIUM"


@pytest.mark.asyncio
async def test_ml_api_endpoints(client, auth_headers, admin_headers, db):
    # Metadata endpoint (available to inspectors and admins)
    res_meta = client.get("/analysis/ml/metadata", headers=auth_headers)
    assert res_meta.status_code == 200
    assert res_meta.json()["status"] == "AVAILABLE"

    # Train endpoint (restricted to admin role)
    res_train = client.post("/analysis/ml/train?n_estimators=20&contamination=0.1", headers=admin_headers)
    assert res_train.status_code == 200
    assert "metadata" in res_train.json()
