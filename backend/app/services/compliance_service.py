from typing import Dict, Any, List
from app.core.logging_config import logger


class ComplianceService:
    """
    Statutory Compliance Intelligence Engine.
    Evaluates regulatory compliance across documentation validity, route conformity,
    movement authorization, and telemetry consistency.
    Output: 0-100 deterministic explainable score.
    """

    @classmethod
    def evaluate(
        cls,
        features: Dict[str, Any],
        rules_eval: Dict[str, Any],
    ) -> Dict[str, Any]:
        logger.debug("Calculating compliance score and dimensional breakdown")

        ewb_feat = features.get("ewb", {})
        fastag_feat = features.get("fastag", {})
        route_feat = features.get("route", {})
        rules = rules_eval.get("rules", [])

        # Find rule failures
        failed_rule_ids = set(r["rule_id"] for r in rules if not r["passed"])

        deductions = []
        overall_deductions = 0

        # Dimension 1: FASTag Telemetry Consistency
        fastag_consistency = 100
        if "R1" in failed_rule_ids:
            fastag_consistency -= 40
            overall_deductions += 30
            deductions.append({
                "dimension": "FASTag Coverage",
                "penalty": 30,
                "reason": "Active E-Way Bills declared without any electronic FASTag toll crossings.",
            })

        # Dimension 2: E-Way Bill Validity & Non-Duplication
        ewb_validity = 100
        if "R2" in failed_rule_ids:
            ewb_validity -= 35
            overall_deductions += 25
            deductions.append({
                "dimension": "E-Way Bill Uniqueness",
                "penalty": 25,
                "reason": "Duplicate or overlapping E-Way Bills detected exceeding 60% concurrent validity.",
            })

        # Dimension 3: Authorized Physical Movement
        movement_compliance = 100
        if "R3" in failed_rule_ids:
            movement_compliance -= 35
            overall_deductions += 25
            deductions.append({
                "dimension": "Movement Authorization",
                "penalty": 25,
                "reason": "FASTag toll passages recorded outside all active E-Way Bill validity windows.",
            })

        # Dimension 4: Route Vector Conformity
        route_compliance = 100
        if "R5" in failed_rule_ids:
            route_compliance -= 30
            overall_deductions += 20
            deductions.append({
                "dimension": "Route Direction Alignment",
                "penalty": 20,
                "reason": "Observed toll sequence bearing deviates significantly (30°-35°) from declared route vector.",
            })

        # Calculate overall deterministic compliance score
        overall_score = max(0, min(100, 100 - overall_deductions))

        if overall_score >= 80:
            level = "COMPLIANT"
        elif overall_score >= 50:
            level = "MODERATE"
        else:
            level = "NON-COMPLIANT"

        return {
            "score": overall_score,
            "level": level,
            "breakdown": {
                "ewb_validity": max(0, min(100, ewb_validity)),
                "movement_compliance": max(0, min(100, movement_compliance)),
                "route_compliance": max(0, min(100, route_compliance)),
                "fastag_consistency": max(0, min(100, fastag_consistency)),
            },
            "deductions": deductions,
        }
