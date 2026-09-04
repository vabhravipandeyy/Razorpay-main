import sys
import os
import json
from pathlib import Path
from datetime import datetime, timezone
import numpy as np
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import RobustScaler
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import roc_auc_score, precision_score, recall_score, f1_score
import xgboost as xgb

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal
from app.models.eway_bill import EwayBill
from app.models.fastag_transaction import FastagTransaction
from app.services.feature_service import FeatureEngineeringService
from app.services.ml_anomaly_service import MLAnomalyService
from scripts.train_anomaly_model import generate_synthetic_training_data


def train_hybrid_model():
    print("=" * 70)
    print("  GST SENTINEL: HYBRID ML TRAINING PIPELINE (IFOREST + XGBOOST)")
    print("=" * 70)
    print("\n[Step 1/5] Extracting features from Live Database & Highway Baselines...")

    db = SessionLocal()

    # 1. Generate 300 calibrated synthetic vectors (270 normal freight, 30 evasion patterns)
    feature_matrix = generate_synthetic_training_data(n_samples=300)
    # Synthetic ground-truth pseudo labels: first 270 are 0 (normal), last 30 are 1 (anomalous)
    labels = [0] * 270 + [1] * 30

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

        # Ground truth check based on statutory criteria:
        # If speed > 130 km/h or overlapping pairs > 0 or bearing dev > 90 deg -> Label 1
        speed_max = feats.get("speed", {}).get("max_speed_kmh", 0) or 0
        overlapping = feats.get("ewb", {}).get("overlapping_ewb_pairs", 0) or 0
        bearing = feats.get("route", {}).get("bearing_deviation_deg", 0) or 0
        is_fraud = 1 if (speed_max > 130 or overlapping > 0 or bearing > 90) else 0
        labels.append(is_fraud)
        db_samples += 1

    db.close()

    X = np.array(feature_matrix, dtype=np.float64)
    X = np.nan_to_num(X, nan=0.0, posinf=1e6, neginf=-1e6)
    y = np.array(labels, dtype=np.int32)

    total_samples = len(X)
    fraud_count = int(np.sum(y == 1))
    print(f"Dataset assembled: {total_samples} vectors ({db_samples} live DB + 300 baselines).")
    print(f"Target distribution: {total_samples - fraud_count} Compliant (0) | {fraud_count} Flagged Violations (1)")

    # [Step 2/5] Train Stage 1: Robust-Scaled Isolation Forest (Unsupervised)
    print("\n[Step 2/5] Training Stage 1: Robust-Scaled Isolation Forest (200 Trees)...")
    X_trans = MLAnomalyService._preprocess_matrix(X)
    scaler = RobustScaler()
    X_scaled = scaler.fit_transform(X_trans)

    iforest = IsolationForest(
        n_estimators=200,
        contamination=0.08,
        random_state=42,
        bootstrap=True,
        n_jobs=-1
    )
    iforest.fit(X_scaled)

    # Compute uncalibrated anomaly scores from Isolation Forest
    decision_scores = iforest.decision_function(X_scaled)
    iforest_prob = 1.0 / (1.0 + np.exp(12.0 * decision_scores))

    # [Step 3/5] Stack Features: 14 Telemetry Dimensions + Isolation Forest Anomaly Score
    print("\n[Step 3/5] Stacking 14 Telemetry Vectors + Isolation Forest Signal...")
    X_stacked = np.column_stack([X_scaled, iforest_prob])
    feature_names_stacked = MLAnomalyService.FEATURE_NAMES + ["iforest_anomaly_score"]

    # [Step 4/5] 5-Fold Stratified Cross-Validation for Exact Accuracy Metrics
    print("\n[Step 4/5] Performing 5-Fold Stratified Cross-Validation on XGBoost...")
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    roc_scores, prec_scores, rec_scores, f1_scores = [], [], [], []

    for fold, (train_idx, val_idx) in enumerate(skf.split(X_stacked, y), 1):
        X_train, X_val = X_stacked[train_idx], X_stacked[val_idx]
        y_train, y_val = y[train_idx], y[val_idx]

        clf = xgb.XGBClassifier(
            n_estimators=120,
            max_depth=4,
            learning_rate=0.08,
            subsample=0.85,
            colsample_bytree=0.85,
            eval_metric="logloss",
            random_state=42
        )
        clf.fit(X_train, y_train)
        val_probs = clf.predict_proba(X_val)[:, 1]
        val_preds = (val_probs >= 0.5).astype(int)

        roc_scores.append(roc_auc_score(y_val, val_probs))
        prec_scores.append(precision_score(y_val, val_preds, zero_division=0))
        rec_scores.append(recall_score(y_val, val_preds, zero_division=0))
        f1_scores.append(f1_score(y_val, val_preds, zero_division=0))

    mean_roc = float(np.mean(roc_scores))
    mean_prec = float(np.mean(prec_scores))
    mean_rec = float(np.mean(rec_scores))
    mean_f1 = float(np.mean(f1_scores))

    # Train Final Production XGBoost Model on Full Stacked Dataset
    final_xgb = xgb.XGBClassifier(
        n_estimators=150,
        max_depth=4,
        learning_rate=0.06,
        subsample=0.85,
        colsample_bytree=0.85,
        eval_metric="logloss",
        random_state=42
    )
    final_xgb.fit(X_stacked, y)

    # Feature Importance
    importances = final_xgb.feature_importances_
    sorted_idx = np.argsort(importances)[::-1]
    top_features = {}
    for idx in sorted_idx[:5]:
        top_features[feature_names_stacked[idx]] = round(float(importances[idx]) * 100, 2)

    # [Step 5/5] Save Binary Artifacts
    print("\n[Step 5/5] Exporting Production Artifacts & Metadata...")
    model_dir = MLAnomalyService.MODEL_DIR
    os.makedirs(model_dir, exist_ok=True)

    joblib.dump(iforest, MLAnomalyService.MODEL_PATH)
    joblib.dump(scaler, MLAnomalyService.SCALER_PATH)
    xgb_path = os.path.join(model_dir, "xgboost_model.json")
    final_xgb.save_model(xgb_path)

    metadata = {
        "model_version": "hybrid_iforest_xgboost_v3",
        "algorithm": "Stacked_IsolationForest_XGBoost_v3",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "training_samples": total_samples,
        "feature_names": feature_names_stacked,
        "evaluation_metrics": {
            "roc_auc_score": round(mean_roc, 4),
            "precision": round(mean_prec, 4),
            "recall": round(mean_rec, 4),
            "f1_score": round(mean_f1, 4),
            "cross_validation_folds": 5
        },
        "top_feature_importance_gain_pct": top_features,
        "anomalous_samples_count": fraud_count,
        "anomaly_rate": round(fraud_count / total_samples, 3),
        "decision_offset": float(iforest.offset_),
        "hyperparameters": {
            "iforest_n_estimators": 200,
            "iforest_contamination": 0.08,
            "xgb_n_estimators": 150,
            "xgb_max_depth": 4,
            "xgb_learning_rate": 0.06
        }
    }

    with open(MLAnomalyService.METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)

    print("\n" + "=" * 70)
    print("  MODEL TRAINING COMPLETED WITH VERIFIED EVALUATION METRICS")
    print("=" * 70)
    print(f"  - Model Version:     {metadata['model_version']}")
    print(f"  - Model Architecture: Stacked Isolation Forest + XGBoost Classifier")
    print(f"  - ROC-AUC Score:      {mean_roc * 100:.2f}% (Area Under Curve)")
    print(f"  - Model Precision:    {mean_prec * 100:.2f}% (Precision on Flagged Vehicles)")
    print(f"  - Model Recall:       {mean_rec * 100:.2f}% (Detection Rate)")
    print(f"  - Model F1-Score:     {mean_f1 * 100:.2f}%")
    print("\nTop 5 Driving Risk Factors (XGBoost Feature Importance):")
    for feat, pct in top_features.items():
        print(f"    * {feat:25s}: {pct:.2f}%")
    print("\nSaved Artifacts:")
    print(f"  * Isolation Forest:  {MLAnomalyService.MODEL_PATH}")
    print(f"  * Robust Scaler:     {MLAnomalyService.SCALER_PATH}")
    print(f"  * XGBoost Model:     {xgb_path}")
    print(f"  * Model Metadata:    {MLAnomalyService.METADATA_PATH}")
    print("=" * 70)


if __name__ == "__main__":
    train_hybrid_model()
