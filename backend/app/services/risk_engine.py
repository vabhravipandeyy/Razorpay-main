from typing import List, Dict, Any
from app.models.eway_bill import EwayBill
from app.models.fastag_transaction import FastagTransaction
from app.services.feature_service import FeatureEngineeringService
from app.services.rule_engine import RuleEngine
from app.services.compliance_service import ComplianceService
from app.services.trust_service import TrustScoreService
from app.services.ml_anomaly_service import MLAnomalyService
from app.services.evidence_engine import EvidenceEngine
from app.services.explanation_engine import ExplanationEngine
from app.services.decision_engine import DecisionEngine
from app.core.logging_config import logger


class RiskEngine:
    """
    Phase 4 Unified Risk Intelligence Engine.
    Coordinates Feature Extraction, Rule Evaluation, ML Anomaly Inference,
    Hybrid Risk Calculation, Evidence Assembly, Explanation Synthesis, and Decision Intelligence.
    """

    RULE_WEIGHT = 0.70
    ML_WEIGHT = 0.30

    @classmethod
    def calculate_confidence(
        cls,
        ewbs: List[EwayBill],
        fastag: List[FastagTransaction],
        features: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Calculate Evidence Confidence Score (0-100).
        Represents observational richness and data completeness.
        """
        total_ewbs = len(ewbs)
        total_fastag = len(fastag)
        dq = features.get("data_quality", {})
        dq_score = dq.get("data_quality_score", 100.0)

        confidence_points = 0.0

        # EWB Coverage (up to 30 pts)
        if total_ewbs >= 3:
            confidence_points += 30.0
        elif total_ewbs >= 1:
            confidence_points += 20.0
        else:
            confidence_points += 5.0

        # FASTag Coverage (up to 40 pts)
        if total_fastag >= 10:
            confidence_points += 40.0
        elif total_fastag >= 4:
            confidence_points += 30.0
        elif total_fastag >= 1:
            confidence_points += 15.0
        else:
            confidence_points += 0.0

        # Data Quality Contribution (up to 30 pts)
        confidence_points += (dq_score / 100.0) * 30.0

        final_score = max(0, min(100, round(confidence_points)))

        if final_score >= 80:
            level = "HIGH CONFIDENCE"
            summary = "High observational coverage across both E-Way Bill documentation and FASTag telemetry."
        elif final_score >= 50:
            level = "MODERATE CONFIDENCE"
            summary = "Sufficient observations to evaluate statutory rules; partial telemetry available."
        else:
            level = "LOW CONFIDENCE"
            summary = "Sparse data points; assessments should be treated as preliminary findings."

        return {
            "score": final_score,
            "level": level,
            "summary": summary,
            "data_quality_score": dq_score,
        }

    @classmethod
    def extract_risk_drivers(
        cls,
        rules_eval: Dict[str, Any],
        features: Dict[str, Any],
        ml_eval: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """
        Extract prioritized risk drivers combining statutory violations and top ML anomalies.
        """
        drivers = []
        rules = rules_eval.get("rules", [])

        # 1. Statutory Rule Drivers
        for r in rules:
            if not r["passed"]:
                drivers.append({
                    "rule_id": r["rule_id"],
                    "title": r["rule"],
                    "category": "STATUTORY_RULE",
                    "severity": r["severity"],
                    "score_impact": r["score"],
                    "evidence": r["reason"],
                    "details": r.get("details", []),
                })

        # 2. ML Anomaly Driver if highly anomalous
        if ml_eval.get("status") == "AVAILABLE" and ml_eval.get("anomaly_level") == "HIGHLY_ANOMALOUS":
            top_feats = ml_eval.get("top_anomalous_features", [])
            evidence_str = ml_eval.get("explanation", "Statistically anomalous pattern detected by ML model.")
            drivers.append({
                "rule_id": "ML_ANOMALY",
                "title": "Unsupervised ML Statistical Anomaly",
                "category": "STATISTICAL_ML",
                "severity": "HIGH",
                "score_impact": round(ml_eval.get("ml_anomaly_score", 0) * 0.3),
                "evidence": evidence_str,
                "details": top_feats,
            })

        severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        drivers.sort(key=lambda d: (severity_order.get(d["severity"], 4), -d["score_impact"]))

        return drivers

    @classmethod
    def calculate_hybrid_risk(
        cls,
        rule_score: int,
        ml_eval: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Calculate normalized Hybrid Risk Score combining Rule Intelligence and ML Anomaly.
        """
        norm_rule_score = min(100.0, (rule_score / 130.0) * 100.0)
        ml_status = ml_eval.get("status", "UNAVAILABLE")
        ml_score = ml_eval.get("ml_anomaly_score", 0)

        if ml_status == "AVAILABLE":
            hybrid_score = round((cls.RULE_WEIGHT * norm_rule_score) + (cls.ML_WEIGHT * ml_score))
        else:
            hybrid_score = round(norm_rule_score)

        hybrid_score = max(0, min(100, hybrid_score))

        if hybrid_score >= 85:
            hybrid_level = "CRITICAL"
        elif hybrid_score >= 60:
            hybrid_level = "HIGH"
        elif hybrid_score >= 30:
            hybrid_level = "MEDIUM"
        else:
            hybrid_level = "LOW"

        is_rule_high = norm_rule_score >= 50
        is_ml_high = ml_score >= 50

        if is_rule_high and is_ml_high:
            diag_code = "HIGH_RULE_HIGH_ML"
            diag_summary = "High statutory rule risk confirmed by statistical ML anomaly. Priority investigation candidate."
        elif not is_rule_high and is_ml_high:
            diag_code = "LOW_RULE_HIGH_ML"
            diag_summary = "Novel or uncodified behavioral anomaly detected by ML despite passing conventional rules."
        elif is_rule_high and not is_ml_high:
            diag_code = "HIGH_RULE_LOW_ML"
            diag_summary = "Specific statutory rule triggered while overall statistical profile remains near population median."
        else:
            diag_code = "LOW_RULE_LOW_ML"
            diag_summary = "Consistent baseline. No statutory infractions or statistical anomalies detected."

        return {
            "score": hybrid_score,
            "level": hybrid_level,
            "normalized_rule_score": round(norm_rule_score, 1),
            "ml_anomaly_score": ml_score,
            "diagnostic_code": diag_code,
            "diagnostic_summary": diag_summary,
            "weights": {
                "rule_weight": cls.RULE_WEIGHT,
                "ml_weight": cls.ML_WEIGHT if ml_status == "AVAILABLE" else 0.0,
            },
        }

    @classmethod
    def generate_unified_profile(
        cls,
        vehicle_number: str,
        ewbs: List[EwayBill],
        fastag: List[FastagTransaction],
        trips_context: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Generate complete Phase 4 Unified Risk Profile with Evidence & Decision Intelligence.
        """
        logger.info(f"Generating Phase 4 unified profile: vehicle={vehicle_number}")

        # 1. Feature Engineering
        features = FeatureEngineeringService.extract_features(
            vehicle_number=vehicle_number,
            ewbs=ewbs,
            fastag=fastag,
            trips_context=trips_context,
        )

        # 2. Rule Evaluation (Statutory 6 Rules - 0 to 130 pts)
        rules_eval = RuleEngine.evaluate(
            vehicle_number=vehicle_number,
            ewbs=ewbs,
            fastag=fastag,
            trips_context=trips_context,
            features=features,
        )

        # 3. ML Anomaly Inference (Isolation Forest)
        ml_eval = MLAnomalyService.predict(features)

        # 4. Hybrid Risk Engine (Rule 70% + ML 30%)
        hybrid_eval = cls.calculate_hybrid_risk(
            rule_score=rules_eval["fraud_risk_score"],
            ml_eval=ml_eval,
        )

        # 5. Compliance Intelligence (0 to 100 pts)
        compliance_eval = ComplianceService.evaluate(
            features=features,
            rules_eval=rules_eval,
        )

        # 6. Vehicle Trust Engine (0 to 100 pts)
        trust_eval = TrustScoreService.evaluate(
            features=features,
            rules_eval=rules_eval,
        )

        # 7. Evidence Confidence (0 to 100 pts)
        confidence_eval = cls.calculate_confidence(
            ewbs=ewbs,
            fastag=fastag,
            features=features,
        )

        # 8. Structured Evidence Engine (Phase 4)
        evidence_items = EvidenceEngine.assemble_evidence(
            vehicle_number=vehicle_number,
            ewbs=ewbs,
            fastag=fastag,
            trips_context=trips_context,
            rules_eval=rules_eval,
            ml_eval=ml_eval,
            features=features,
        )

        # 9. Prioritized Risk Drivers & Clusters (Phase 4)
        raw_drivers = cls.extract_risk_drivers(
            rules_eval=rules_eval,
            features=features,
            ml_eval=ml_eval,
        )
        risk_clusters = ExplanationEngine.deduplicate_risk_drivers(
            risk_drivers=raw_drivers,
            evidence_items=evidence_items,
        )

        # 10. Executive Risk Summary & Financial Context (Phase 4)
        executive_summary = ExplanationEngine.generate_executive_summary(
            vehicle_number=vehicle_number,
            hybrid_eval=hybrid_eval,
            rules_eval=rules_eval,
            ml_eval=ml_eval,
            confidence_eval=confidence_eval,
            evidence_items=evidence_items,
        )
        financial_context = ExplanationEngine.calculate_financial_context(
            ewbs=ewbs,
            rules_eval=rules_eval,
        )

        # 11. Decision Intelligence & Investigation Recommendations (Phase 4)
        decision_eval = DecisionEngine.evaluate_decision(
            hybrid_eval=hybrid_eval,
            confidence_eval=confidence_eval,
            rules_eval=rules_eval,
            ml_eval=ml_eval,
            evidence_items=evidence_items,
        )

        # 12. Risk Signals for UI integration
        risk_signals = []
        for r in rules_eval.get("rules", []):
            is_flagged = not r["passed"]
            risk_signals.append({
                "id": r["rule_id"].lower(),
                "name": r["rule"],
                "severity": r["severity"] if is_flagged else "NORMAL",
                "status": "FLAGGED" if is_flagged else "PASSED",
                "summary": r["reason"],
                "score_impact": r["score"],
            })

        unified_profile = {
            "vehicle_number": vehicle_number,
            "fraud_risk": {
                "score": rules_eval["fraud_risk_score"],
                "max_score": 130,
                "level": rules_eval["risk_level"],
                "source": "statutory_rule_engine",
            },
            "hybrid_risk": hybrid_eval,
            "ml_analysis": ml_eval,
            "compliance": compliance_eval,
            "trust": trust_eval,
            "confidence": confidence_eval,
            "evidence": evidence_items,
            "risk_drivers": raw_drivers,
            "risk_clusters": risk_clusters,
            "executive_summary": executive_summary,
            "financial_context": financial_context,
            "decision": decision_eval,
            "risk_signals": risk_signals,
            "rules": rules_eval["rules"],
            "features": features,
            "behavior_profile": features["behavior_profile"],
            "statistics": {
                "eway_bill_count": len(ewbs),
                "fastag_count": len(fastag),
                "failed_rules_count": rules_eval["failed_rules_count"],
                "passed_rules_count": len(rules_eval["rules"]) - rules_eval["failed_rules_count"],
                "trips_count": len(trips_context),
                "evidence_count": len(evidence_items),
            },
        }

        logger.info(
            f"Phase 4 profile complete: vehicle={vehicle_number}, "
            f"priority={decision_eval['priority']}, "
            f"hybrid_score={hybrid_eval['score']}/100, "
            f"evidence_items={len(evidence_items)}"
        )
        return unified_profile
