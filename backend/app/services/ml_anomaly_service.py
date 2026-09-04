import os
import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import RobustScaler

from app.core.logging_config import logger


class MLAnomalyService:
    """
    Enhanced Unsupervised ML Anomaly Detection Service.
    Combines Robust Feature Scaling, High-Density Bagged Isolation Forest (200 trees),
    and Calibrated Sigmoid Anomaly Probabilities for GST Telemetry & Document Movement.
    """

    MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "ml_artifacts")
    MODEL_PATH = os.path.join(MODEL_DIR, "isolation_forest.joblib")
    SCALER_PATH = os.path.join(MODEL_DIR, "robust_scaler.joblib")
    METADATA_PATH = os.path.join(MODEL_DIR, "model_metadata.json")

    FEATURE_NAMES = [
        "ewb_total_count",
        "ewb_avg_invoice_value",
        "ewb_max_invoice_value",
        "ewb_overlapping_pairs",
        "fastag_total_count",
        "fastag_unique_tolls",
        "fastag_night_crossings",
        "speed_avg_kmh",
        "speed_max_kmh",
        "speed_variance",
        "movement_total_km",
        "movement_stationary_8h",
        "movement_rapid_jumps",
        "route_bearing_deviation",
    ]

    _cached_model: Optional[IsolationForest] = None
    _cached_scaler: Optional[RobustScaler] = None
    _cached_metadata: Optional[Dict[str, Any]] = None

    @classmethod
    def extract_feature_vector(cls, features: Dict[str, Any]) -> List[float]:
        """Convert engineered feature dictionary into an ordered numerical vector."""
        ewb = features.get("ewb", {})
        fastag = features.get("fastag", {})
        speed = features.get("speed", {})
        movement = features.get("movement", {})
        route = features.get("route", {})

        def clean_val(val, default=0.0) -> float:
            if val is None or np.isnan(val) or np.isinf(val):
                return default
            return float(val)

        return [
            clean_val(ewb.get("total_ewbs")),
            clean_val(ewb.get("avg_invoice_value")),
            clean_val(ewb.get("max_invoice_value")),
            clean_val(ewb.get("overlapping_ewb_pairs")),
            clean_val(fastag.get("total_transactions")),
            clean_val(fastag.get("unique_toll_plazas")),
            clean_val(fastag.get("night_crossings_count")),
            clean_val(speed.get("avg_speed_kmh")),
            clean_val(speed.get("max_speed_kmh")),
            clean_val(speed.get("speed_variance")),
            clean_val(movement.get("total_observed_movement_km")),
            clean_val(movement.get("stationary_periods_gt_8h")),
            clean_val(movement.get("rapid_long_distance_jumps")),
            clean_val(route.get("bearing_deviation_deg")),
        ]

    @classmethod
    def _preprocess_matrix(cls, X: np.ndarray) -> np.ndarray:
        """Apply logarithmic dampening to heavy-tailed financial and distance metrics."""
        X_trans = np.copy(X)
        X_trans[:, 1] = np.log1p(np.maximum(0.0, X_trans[:, 1]))
        X_trans[:, 2] = np.log1p(np.maximum(0.0, X_trans[:, 2]))
        X_trans[:, 10] = np.log1p(np.maximum(0.0, X_trans[:, 10]))
        return X_trans

    @classmethod
    def train(
        cls,
        feature_matrix: List[List[float]],
        n_estimators: int = 200,
        contamination: float = 0.08,
        random_state: int = 42,
        version: str = "iforest_v2_robust",
    ) -> Dict[str, Any]:
        """
        Train High-Accuracy Isolation Forest with Robust Feature Preprocessing.
        """
        logger.info(f"Starting enhanced ML model training: samples={len(feature_matrix)}, features={len(cls.FEATURE_NAMES)}")

        if len(feature_matrix) < 3:
            raise ValueError(f"Insufficient training samples ({len(feature_matrix)}). Minimum 3 samples required.")

        X = np.array(feature_matrix, dtype=np.float64)
        X = np.nan_to_num(X, nan=0.0, posinf=1e6, neginf=-1e6)

        X_trans = cls._preprocess_matrix(X)
        scaler = RobustScaler()
        X_scaled = scaler.fit_transform(X_trans)

        model = IsolationForest(
            n_estimators=n_estimators,
            contamination=contamination,
            random_state=random_state,
            bootstrap=True,
            n_jobs=-1,
        )
        model.fit(X_scaled)

        pop_medians = {name: float(np.median(X[:, idx])) for idx, name in enumerate(cls.FEATURE_NAMES)}
        pop_means = {name: float(np.mean(X[:, idx])) for idx, name in enumerate(cls.FEATURE_NAMES)}
        pop_stds = {name: float(np.std(X[:, idx])) for idx, name in enumerate(cls.FEATURE_NAMES)}

        predictions = model.predict(X_scaled)
        anomalous_count = int(np.sum(predictions == -1))

        metadata = {
            "model_version": version,
            "algorithm": "RobustScaledIsolationForest_v2",
            "feature_names": cls.FEATURE_NAMES,
            "training_samples": len(feature_matrix),
            "anomalous_samples_count": anomalous_count,
            "anomaly_rate": round(anomalous_count / len(feature_matrix), 3),
            "decision_offset": float(model.offset_),
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "hyperparameters": {
                "n_estimators": n_estimators,
                "contamination": contamination,
                "random_state": random_state,
                "bootstrap": True,
            },
            "population_medians": pop_medians,
            "population_means": pop_means,
            "population_stds": pop_stds,
        }

        os.makedirs(cls.MODEL_DIR, exist_ok=True)
        joblib.dump(model, cls.MODEL_PATH)
        joblib.dump(scaler, cls.SCALER_PATH)
        with open(cls.METADATA_PATH, "w") as f:
            json.dump(metadata, f, indent=2)

        cls._cached_model = model
        cls._cached_scaler = scaler
        cls._cached_metadata = metadata

        logger.info(f"Enhanced ML Model saved successfully: version={version}, samples={len(feature_matrix)}")
        return metadata

    @classmethod
    def load_model(cls) -> Tuple[Optional[IsolationForest], Optional[Dict[str, Any]]]:
        """Load model and metadata with in-memory caching. Returns (model, metadata) for backward-compatibility."""
        if cls._cached_model is not None and cls._cached_metadata is not None:
            return cls._cached_model, cls._cached_metadata

        if not os.path.exists(cls.MODEL_PATH) or not os.path.exists(cls.METADATA_PATH):
            return None, None

        try:
            model = joblib.load(cls.MODEL_PATH)
            with open(cls.METADATA_PATH, "r") as f:
                metadata = json.load(f)
            cls._cached_model = model
            cls._cached_metadata = metadata
            if os.path.exists(cls.SCALER_PATH):
                cls._cached_scaler = joblib.load(cls.SCALER_PATH)
            return model, metadata
        except Exception as e:
            logger.error(f"Failed to load ML model artifact: {e}")
            return None, None

    @classmethod
    def load_scaler(cls) -> Optional[RobustScaler]:
        """Load robust scaler artifact."""
        if cls._cached_scaler is not None:
            return cls._cached_scaler
        if os.path.exists(cls.SCALER_PATH):
            try:
                cls._cached_scaler = joblib.load(cls.SCALER_PATH)
                return cls._cached_scaler
            except Exception:
                pass
        return None

    @classmethod
    def predict(
        cls,
        features: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Run calibrated unsupervised anomaly inference on vehicle features.
        Returns normalized ML Anomaly Score (0-100), Anomaly Level, and Top Deviant Features.
        """
        model, metadata = cls.load_model()
        scaler = cls.load_scaler()

        if model is None or metadata is None:
            return {
                "status": "UNAVAILABLE",
                "message": "ML anomaly detection model is not trained yet. Fallback to rule-based risk.",
                "ml_anomaly_score": 0,
                "anomaly_level": "NORMAL",
                "model_version": "none",
                "top_anomalous_features": [],
                "explanation": "ML model artifact is currently offline.",
            }

        vec = cls.extract_feature_vector(features)
        X = np.array([vec], dtype=np.float64)
        X = np.nan_to_num(X, nan=0.0, posinf=1e6, neginf=-1e6)

        try:
            X_trans = cls._preprocess_matrix(X)
            if scaler is not None:
                X_scaled = scaler.transform(X_trans)
            else:
                X_scaled = X_trans

            raw_score = float(model.decision_function(X_scaled)[0])

            # Calibrated Sigmoid Anomaly Score:
            calibrated_prob = 1.0 / (1.0 + np.exp(12.0 * raw_score))
            norm_anomaly_score = int(np.clip(round(calibrated_prob * 100.0), 0, 100))

            if norm_anomaly_score >= 70:
                anomaly_level = "HIGHLY_ANOMALOUS"
            elif norm_anomaly_score >= 45:
                anomaly_level = "UNUSUAL"
            else:
                anomaly_level = "NORMAL"

            # Identify top deviant features based on population z-scores
            pop_medians = metadata.get("population_medians", {})
            pop_stds = metadata.get("population_stds", {})
            deviant_features = []

            for idx, name in enumerate(cls.FEATURE_NAMES):
                val = float(vec[idx])
                med = pop_medians.get(name, 0.0)
                std = pop_stds.get(name, 1.0)
                std = max(std, 0.001)

                z_score = abs(val - med) / std
                if z_score > 1.5 and val > med:
                    units = {
                        "ewb_total_count": "bills",
                        "ewb_avg_invoice_value": "INR",
                        "ewb_max_invoice_value": "INR",
                        "ewb_overlapping_pairs": "pairs",
                        "fastag_total_count": "scans",
                        "fastag_unique_tolls": "plazas",
                        "fastag_night_crossings": "runs",
                        "speed_avg_kmh": "km/h",
                        "speed_max_kmh": "km/h",
                        "speed_variance": "variance",
                        "movement_total_km": "km",
                        "movement_stationary_8h": "events",
                        "movement_rapid_jumps": "jumps",
                        "route_bearing_deviation": "deg",
                    }
                    dev_pct = round(((val - med) / med) * 100.0, 1) if med > 0 else 100.0
                    deviant_features.append({
                        "feature_name": name,
                        "feature": name,
                        "vehicle_value": round(val, 2),
                        "value": round(val, 2),
                        "population_reference": round(med, 2),
                        "population_median": round(med, 2),
                        "unit": units.get(name, ""),
                        "deviation_pct": dev_pct,
                        "deviation_score": round(z_score, 2),
                        "severity": "HIGH" if z_score > 3.0 else "MEDIUM",
                    })

            deviant_features.sort(key=lambda x: x["deviation_score"], reverse=True)

            return {
                "status": "AVAILABLE",
                "ml_anomaly_score": norm_anomaly_score,
                "raw_decision_score": round(raw_score, 4),
                "anomaly_level": anomaly_level,
                "model_version": metadata.get("model_version", "v2"),
                "top_anomalous_features": deviant_features[:4],
                "explanation": (
                    f"ML Anomaly score: {norm_anomaly_score}/100 ({anomaly_level}). "
                    f"{len(deviant_features)} telemetry metrics deviate from typical commercial transit norms."
                ),
            }
        except Exception as e:
            logger.error(f"Inference error in MLAnomalyService: {e}")
            return {
                "status": "ERROR",
                "message": str(e),
                "ml_anomaly_score": 0,
                "anomaly_level": "NORMAL",
                "model_version": metadata.get("model_version", "v2"),
                "top_anomalous_features": [],
                "explanation": "Prediction error occurred during feature scaling.",
            }
