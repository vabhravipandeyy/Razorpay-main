from typing import List, Dict, Any
from app.core.logging_config import logger


class DecisionEngine:
    """
    Statutory Decision Intelligence Engine (Phase 4).
    Maps multi-dimensional risk scores, confidence levels, and evidence dossiers
    to deterministic investigation priorities and targeted officer check-lists.
    """

    @classmethod
    def evaluate_decision(
        cls,
        hybrid_eval: Dict[str, Any],
        confidence_eval: Dict[str, Any],
        rules_eval: Dict[str, Any],
        ml_eval: Dict[str, Any],
        evidence_items: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        logger.debug("Evaluating statutory decision intelligence")

        hybrid_score = hybrid_eval.get("score", 0)
        conf_score = confidence_eval.get("score", 100)
        conf_level = confidence_eval.get("level", "HIGH CONFIDENCE")
        failed_count = rules_eval.get("failed_rules_count", 0)
        rules = rules_eval.get("rules", [])
        rules_dict = {r["rule_id"]: r for r in rules}

        critical_flags = sum(1 for r in rules if not r["passed"] and r.get("severity") in ["CRITICAL", "HIGH"])
        is_ml_anom = ml_eval.get("status") == "AVAILABLE" and ml_eval.get("anomaly_level") == "HIGHLY_ANOMALOUS"

        # -------------------------------------------------------------
        # 1. Determine Investigation Priority
        # -------------------------------------------------------------
        if hybrid_score >= 85 or (critical_flags >= 2 and conf_score >= 50):
            priority = "URGENT_REVIEW"
            priority_label = "URGENT REVIEW"
            badge_color = "rose"
            rationale = f"Critical risk score ({hybrid_score}/100) with {critical_flags} severe statutory infraction(s) verified by observational telemetry."
        elif (hybrid_score >= 50 or critical_flags >= 1) and conf_score >= 40:
            priority = "INVESTIGATE"
            priority_label = "INVESTIGATE"
            badge_color = "red"
            rationale = f"Elevated risk score ({hybrid_score}/100) with severe statutory flag ({critical_flags} critical/high violation(s)). Field audit recommended."
        elif (hybrid_score >= 50 or critical_flags >= 1) and conf_score < 40:
            priority = "REVIEW"
            priority_label = "REVIEW (LOW CONFIDENCE)"
            badge_color = "amber"
            rationale = "High risk indicators detected, but telemetry data is sparse. Manual verification of physical documents required."
        elif hybrid_score >= 30 or is_ml_anom:
            priority = "MONITOR"
            priority_label = "MONITOR"
            badge_color = "yellow"
            rationale = f"Moderate risk ({hybrid_score}/100) or statistical anomaly. Maintain heightened observation for recurring violations."
        else:
            priority = "NORMAL"
            priority_label = "ROUTINE AUDIT"
            badge_color = "emerald"
            rationale = "No statutory violations or statistical anomalies detected. Vehicle exhibits standard operational compliance."

        # -------------------------------------------------------------
        # 2. Targeted Actionable Recommendations
        # -------------------------------------------------------------
        recommended_actions = []

        if "R4" in rules_dict and not rules_dict["R4"]["passed"]:
            recommended_actions.append({
                "action_id": "ACT-01",
                "priority": "HIGH",
                "title": "Audit RFID Toll Timestamps & Clock Synchronization",
                "instruction": "Verify FASTag transaction logs between flagged toll plazas to confirm whether velocity anomaly is physical or a sensor timestamp glitch.",
            })

        if "R5" in rules_dict and not rules_dict["R5"]["passed"]:
            recommended_actions.append({
                "action_id": "ACT-02",
                "priority": "HIGH",
                "title": "Perform Physical Delivery Interception",
                "instruction": "Intercept vehicle along actual travel corridor or demand proof of delivery at destination pincode to verify diversion.",
            })

        if "R3" in rules_dict and not rules_dict["R3"]["passed"]:
            recommended_actions.append({
                "action_id": "ACT-03",
                "priority": "MEDIUM",
                "title": "Cross-Examine E-Way Bill Validity Expiration",
                "instruction": "Request justification from consignor/transporter for movements occurring after statutory validity window lapsed.",
            })

        if "R2" in rules_dict and not rules_dict["R2"]["passed"]:
            recommended_actions.append({
                "action_id": "ACT-04",
                "priority": "HIGH",
                "title": "Investigate Potential Invoice Recycling",
                "instruction": "Audit concurrent overlapping E-Way Bills to ensure the same physical consignment is not being billed multiple times for tax evasion.",
            })

        if "R1" in rules_dict and not rules_dict["R1"]["passed"]:
            recommended_actions.append({
                "action_id": "ACT-05",
                "priority": "CRITICAL",
                "title": "Investigate Potential Ghost Transport / Fake Invoicing",
                "instruction": "Inspect issuing GSTIN for fraudulent input tax credit (ITC) generation where active bills exist without physical road transit.",
            })

        if is_ml_anom:
            recommended_actions.append({
                "action_id": "ACT-06",
                "priority": "MEDIUM",
                "title": "Examine Uncodified Fleet Telemetry Outlier",
                "instruction": "Review night-time driving frequency and invoice valuation ratios against regional transport benchmarks.",
            })

        if not recommended_actions:
            recommended_actions.append({
                "action_id": "ACT-00",
                "priority": "LOW",
                "title": "Standard Statutory Compliance Maintained",
                "instruction": "No specific investigation steps required at this time.",
            })

        return {
            "priority": priority,
            "priority_label": priority_label,
            "badge_color": badge_color,
            "rationale": rationale,
            "recommended_actions": recommended_actions,
            "total_actions": len(recommended_actions),
        }
