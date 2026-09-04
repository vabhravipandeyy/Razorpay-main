#!/usr/bin/env python3
"""
Offline / Admin Training Script for ML Anomaly Detection (Isolation Forest).
Builds vehicle feature matrix from database or synthetic population baseline,
trains the model, and outputs validated model artifacts.
"""
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
from app.core.database import SessionLocal
from app.services.analysis_service import AnalysisService
from app.services.feature_service import FeatureEngineeringService
from app.services.ml_anomaly_service import MLAnomalyService
from app.repositories.eway_bill_repository import EwayBillRepository
from app.repositories.fastag_repository import FastagRepository
from app.core.logging_config import logger


def generate_synthetic_training_data(n_samples: int = 250) -> list:
    """Generate realistic synthetic distribution of transport vehicle telemetry."""
    np.random.seed(42)
    dataset = []

    for i in range(n_samples):
        # 85% normal vehicles
        if i < int(n_samples * 0.85):
            ewb_count = int(np.random.randint(1, 6))
            avg_inv = float(np.random.normal(65000, 15000))
            max_inv = avg_inv * 1.2
            overlapping = 1 if np.random.rand() < 0.05 else 0
            fastag_count = int(np.random.randint(4, 20))
            unique_tolls = max(1, int(fastag_count * 0.7))
            night_cross = int(np.random.binomial(fastag_count, 0.15))
            spd_avg = float(np.random.normal(55, 10))
            spd_max = float(min(115, spd_avg + np.random.normal(20, 5)))
            spd_var = float(np.random.normal(30, 8))
            mov_dist = float(fastag_count * np.random.normal(45, 10))
            stationary_8h = 1 if np.random.rand() < 0.10 else 0
            rapid_jumps = 0
            bearing_dev = float(np.random.normal(8, 4))
        # 15% anomalous vehicles (extreme speed, route deviation, night runs, overlapping bills)
        else:
            ewb_count = int(np.random.randint(2, 10))
            avg_inv = float(np.random.normal(250000, 80000))
            max_inv = avg_inv * 1.8
            overlapping = int(np.random.randint(1, 4))
            fastag_count = int(np.random.randint(0, 30))
            unique_tolls = max(1, int(fastag_count * 0.6))
            night_cross = int(np.random.binomial(max(1, fastag_count), 0.75))
            spd_avg = float(np.random.normal(110, 20))
            spd_max = float(np.random.normal(145, 25))
            spd_var = float(np.random.normal(90, 20))
            mov_dist = float(fastag_count * np.random.normal(90, 30))
            stationary_8h = int(np.random.randint(1, 4))
            rapid_jumps = 1 if np.random.rand() < 0.50 else 0
            bearing_dev = float(np.random.normal(32, 6))

        vec = [
            max(0.0, float(ewb_count)),
            max(0.0, float(avg_inv)),
            max(0.0, float(max_inv)),
            max(0.0, float(overlapping)),
            max(0.0, float(fastag_count)),
            max(0.0, float(unique_tolls)),
            max(0.0, float(night_cross)),
            max(0.0, float(spd_avg)),
            max(0.0, float(spd_max)),
            max(0.0, float(spd_var)),
            max(0.0, float(mov_dist)),
            max(0.0, float(stationary_8h)),
            max(0.0, float(rapid_jumps)),
            max(0.0, float(bearing_dev)),
        ]
        dataset.append(vec)

    return dataset


def run_training_pipeline():
    logger.info("Initializing ML training pipeline...")
    db = SessionLocal()

    feature_matrix = []
    try:
        vehicles = AnalysisService.get_all_unique_vehicles(db)
        logger.info(f"Discovered {len(vehicles)} vehicles in SQL database.")

        for v in vehicles:
            ewbs = EwayBillRepository.get_by_vehicle(db, v)
            fastag = FastagRepository.get_by_vehicle(db, v)
            feats = FeatureEngineeringService.extract_features(v, ewbs, fastag, [])
            vec = MLAnomalyService.extract_feature_vector(feats)
            feature_matrix.append(vec)
    finally:
        db.close()

    if len(feature_matrix) < 20:
        logger.info("Database vehicle count < 20. Merging synthetic distribution baseline for robust statistical calibration...")
        synthetic_data = generate_synthetic_training_data(n_samples=300)
        feature_matrix = feature_matrix + synthetic_data

    # Train Isolation Forest
    metadata = MLAnomalyService.train(
        feature_matrix=feature_matrix,
        n_estimators=100,
        contamination=0.10,
        random_state=42,
        version="iforest_v1",
    )

    print("\n" + "=" * 60)
    print("✅ ML ANOMALY MODEL TRAINING COMPLETE")
    print("=" * 60)
    print(f"Model Version:     {metadata['model_version']}")
    print(f"Training Samples:  {metadata['training_samples']}")
    print(f"Features Used:     {len(metadata['feature_names'])}")
    print(f"Anomaly Baseline:  {metadata['anomaly_rate'] * 100:.1f}%")
    print(f"Saved Artifact:    {MLAnomalyService.MODEL_PATH}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    run_training_pipeline()
