from typing import Dict, Any, List
from app.core.logging_config import logger


class TrustScoreService:
    """
    Kinematic & Telemetry Vehicle Trust Engine.
    Evaluates physical movement feasibility, velocity limits, temporal progression,
    and sensor reliability.
    Output: 0-100 deterministic baseline trust score.
    """

    @classmethod
    def evaluate(
        cls,
        features: Dict[str, Any],
        rules_eval: Dict[str, Any],
    ) -> Dict[str, Any]:
        logger.debug("Calculating vehicle trust score and dimensional breakdown")

        rules = rules_eval.get("rules", [])
        failed_rule_ids = set(r["rule_id"] for r in rules if not r["passed"])

        deductions = []
        overall_deductions = 0

        # Dimension 1: Telemetry & Velocity Sanity
        telemetry_sanity = 100
        if "R4" in failed_rule_ids:
            telemetry_sanity -= 45
            overall_deductions += 35
            max_spd = features.get("speed", {}).get("max_speed_kmh", "130+")
            deductions.append({
                "dimension": "Physical Velocity Sanity",
                "penalty": 35,
                "reason": f"Impossible transit speed of {max_spd} km/h recorded between consecutive toll gates (Physical Limit: 130 km/h).",
            })

        # Dimension 2: Movement Progression & Temporal Continuity
        movement_consistency = 100
        if "R6" in failed_rule_ids:
            movement_consistency -= 35
            overall_deductions += 25
            deductions.append({
                "dimension": "Temporal Progression",
                "penalty": 25,
                "reason": "Unexplained extended idle periods (>8h) or impossible spatial teleportation (<5 min) detected.",
            })

        # Dimension 3: Documentation & Tracking Integrity
        documentation_consistency = 100
        if "R3" in failed_rule_ids:
            documentation_consistency -= 25
            overall_deductions += 20
            deductions.append({
                "dimension": "Checkpoint Alignment",
                "penalty": 20,
                "reason": "Vehicle observed in physical transit without registered statutory transportation coverage.",
            })

        if "R2" in failed_rule_ids:
            documentation_consistency -= 20
            overall_deductions += 20
            deductions.append({
                "dimension": "Billing Authenticity",
                "penalty": 20,
                "reason": "Concurrent duplicate bills suggest potential trip recycling or invoice splitting.",
            })

        # Dimension 4: Route Direction Consistency
        route_consistency = 100
        if "R5" in failed_rule_ids:
            route_consistency -= 25

        # Calculate overall trust score
        overall_score = max(0, min(100, 100 - overall_deductions))

        if overall_score >= 80:
            level = "HIGH TRUST"
        elif overall_score >= 50:
            level = "MODERATE TRUST"
        else:
            level = "LOW TRUST"

        return {
            "score": overall_score,
            "level": level,
            "breakdown": {
                "telemetry_sanity": max(0, min(100, telemetry_sanity)),
                "movement_consistency": max(0, min(100, movement_consistency)),
                "documentation_consistency": max(0, min(100, documentation_consistency)),
                "route_consistency": max(0, min(100, route_consistency)),
            },
            "deductions": deductions,
        }
