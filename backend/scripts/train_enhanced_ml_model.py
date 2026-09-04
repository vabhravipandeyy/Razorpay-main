import sys
import os
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal
from app.models.eway_bill import EwayBill
from app.models.fastag_transaction import FastagTransaction
from app.services.feature_service import FeatureEngineeringService
from app.services.ml_anomaly_service import MLAnomalyService
from scripts.train_anomaly_model import generate_synthetic_training_data

def train_enhanced_model():
    print("Extracting features from live database and synthetic baseline...")
    db = SessionLocal()
    
    # 1. Generate 300 rich synthetic samples (270 normal, 30 anomalous)
    feature_matrix = generate_synthetic_training_data(n_samples=300)
    
    # 2. Extract features from actual vehicles in the database
    vehicles = [r[0] for r in db.query(EwayBill.vehicle_number).distinct().limit(150).all()]
    db_samples = 0
    for v in vehicles:
        ewbs = db.query(EwayBill).filter(EwayBill.vehicle_number == v).all()
        tolls = db.query(FastagTransaction).filter(FastagTransaction.veh == v).all()
        trips = [{"ewb": e, "tolls": tolls} for e in ewbs]
        feats = FeatureEngineeringService.extract_features(
            vehicle_number=v,
            ewbs=ewbs,
            fastag=tolls,
            trips_context=trips
        )
        vec = MLAnomalyService.extract_feature_vector(feats)
        feature_matrix.append(vec)
        db_samples += 1

    db.close()
    print(f"Total training dataset size: {len(feature_matrix)} vectors ({db_samples} live database vehicles + 300 synthetic baselines).")

    # 3. Train Enhanced Model
    metadata = MLAnomalyService.train(
        feature_matrix=feature_matrix,
        n_estimators=200,
        contamination=0.08,
        random_state=42,
        version="enhanced_robust_iforest_v2"
    )

    print("\nModel Training Results:")
    print(f"  - Version: {metadata['model_version']}")
    print(f"  - Algorithm: {metadata['algorithm']}")
    print(f"  - Anomaly rate: {metadata['anomaly_rate'] * 100:.1f}% ({metadata['anomalous_samples_count']} samples)")
    print(f"  - Saved to: {MLAnomalyService.MODEL_PATH}")
    print(f"  - Scaler saved to: {MLAnomalyService.SCALER_PATH}")

if __name__ == "__main__":
    train_enhanced_model()
