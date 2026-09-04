from typing import List, Dict, Any
from app.models.eway_bill import EwayBill
from app.core.logging_config import logger


class ExplanationEngine:
    """
    Deterministic Explainability & Synthesis Engine (Phase 4).
    Produces human-readable investigation briefs, deduplicated risk clusters,
    and financial risk context without LLM hallucinations.
    """

    @classmethod
    def generate_executive_summary(
        cls,
        vehicle_number: str,
        hybrid_eval: Dict[str, Any],
        rules_eval: Dict[str, Any],
        ml_eval: Dict[str, Any],
        confidence_eval: Dict[str, Any],
        evidence_items: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Generate a concise, authoritative executive summary for tax enforcement officers.
        """
        hybrid_score = hybrid_eval.get("score", 0)
        hybrid_level = hybrid_eval.get("level", "LOW")
        conf_level = confidence_eval.get("level", "HIGH CONFIDENCE")

        # Collect concise bullet points of primary concerns
        concerns = []
        rules = rules_eval.get("rules", [])
        for r in rules:
            if not r["passed"]:
                concerns.append(f"{r['rule']}: {r['reason']}")

        if ml_eval.get("status") == "AVAILABLE" and ml_eval.get("anomaly_level") == "HIGHLY_ANOMALOUS":
            concerns.append(f"ML Statistical Outlier: {ml_eval.get('explanation')}")

        if not concerns:
            brief = f"Vehicle {vehicle_number} exhibits clean statutory compliance and typical telemetry patterns across all evaluated parameters."
        else:
            brief = f"Vehicle {vehicle_number} has been flagged with {hybrid_level} hybrid risk ({hybrid_score}/100) due to {len(concerns)} primary statutory or behavioral anomaly signal(s)."

        # Confidence interpretation
        if conf_level == "LOW CONFIDENCE":
            conf_note = "Observational telemetry data is sparse. Findings represent preliminary flags requiring field document verification."
        elif conf_level == "MODERATE CONFIDENCE":
            conf_note = "Sufficient observations available for core statutory evaluation; partial GPS/RFID coverage."
        else:
            conf_note = "High observational coverage across both E-Way Bill documentation and FASTag RFID passages confirms strong evidentiary grounding."

        return {
            "headline": f"{hybrid_level} RISK — {hybrid_score}/100 ({conf_level})",
            "brief": brief,
            "primary_concerns": concerns,
            "confidence_assessment": conf_note,
            "total_evidence_points": len(evidence_items),
        }

    @classmethod
    def deduplicate_risk_drivers(
        cls,
        risk_drivers: List[Dict[str, Any]],
        evidence_items: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Group correlated signals into coherent multi-signal clusters to prevent
        double-counting the same physical incident.
        """
        clusters = []
        rule_ids_present = set(d["rule_id"] for d in risk_drivers)

        # 1. Velocity & Kinematic Cluster
        if "R4" in rule_ids_present or any(e["category"] == "KINEMATIC_VIOLATION" for e in evidence_items):
            related_ev = [e for e in evidence_items if e["category"] == "KINEMATIC_VIOLATION"]
            clusters.append({
                "cluster_id": "CL-VELOCITY",
                "title": "Transit Velocity & Kinematic Anomaly",
                "severity": "CRITICAL",
                "signals_grouped": ["Rule 4 (Impossible Speed)", "ML Velocity Departure", "Vehicle Trust Sanity Penalty"],
                "summary": "Vehicle exceeded the 130 km/h physical heavy-freight threshold between RFID toll gates.",
                "evidence_count": len(related_ev),
                "primary_evidence": related_ev[0] if related_ev else None,
            })

        # 2. Route Vector Cluster
        if "R5" in rule_ids_present or any(e["category"] == "ROUTE_DIVERSION" for e in evidence_items):
            related_ev = [e for e in evidence_items if e["category"] == "ROUTE_DIVERSION"]
            clusters.append({
                "cluster_id": "CL-ROUTE",
                "title": "Route Bearing Diversion",
                "severity": "HIGH",
                "signals_grouped": ["Rule 5 (Route Mismatch)", "Compliance Route Conformity Penalty"],
                "summary": "Observed toll sequence deviates 30°-35° from legally declared origin-destination route vector.",
                "evidence_count": len(related_ev),
                "primary_evidence": related_ev[0] if related_ev else None,
            })

        # 3. Documentation & Validity Cluster
        if "R3" in rule_ids_present or "R2" in rule_ids_present or "R1" in rule_ids_present:
            doc_ev = [e for e in evidence_items if e["category"] in ["DOCUMENTATION_MISMATCH", "BILLING_ANOMALY", "TELEMETRY_DEFICIENCY"]]
            clusters.append({
                "cluster_id": "CL-DOCUMENTATION",
                "title": "E-Way Bill & Telemetry Misalignment",
                "severity": "HIGH",
                "signals_grouped": ["Statutory Validity Rules", "Documentation Integrity Index"],
                "summary": "Discrepancies identified between declared bill validity dates and physical toll passages.",
                "evidence_count": len(doc_ev),
                "primary_evidence": doc_ev[0] if doc_ev else None,
            })

        # 4. Temporal Progression Cluster
        if "R6" in rule_ids_present or any(e["category"] == "TEMPORAL_ANOMALY" for e in evidence_items):
            temp_ev = [e for e in evidence_items if e["category"] == "TEMPORAL_ANOMALY"]
            clusters.append({
                "cluster_id": "CL-TEMPORAL",
                "title": "Temporal Halts & Teleportation Jumps",
                "severity": "MEDIUM",
                "signals_grouped": ["Rule 6 (Suspicious Time Gap)", "Trust Temporal Progression Penalty"],
                "summary": "Unexplained stationary halts (>8h) or rapid spatial jumps detected in journey log.",
                "evidence_count": len(temp_ev),
                "primary_evidence": temp_ev[0] if temp_ev else None,
            })

        # 5. ML Statistical Outlier Cluster
        if any(e["category"] == "STATISTICAL_ML_OUTLIER" for e in evidence_items) and not any(c["cluster_id"] == "CL-VELOCITY" for c in clusters):
            ml_ev = [e for e in evidence_items if e["category"] == "STATISTICAL_ML_OUTLIER"]
            clusters.append({
                "cluster_id": "CL-ML",
                "title": "Unsupervised Multi-Dimensional Outlier",
                "severity": "HIGH",
                "signals_grouped": ["Isolation Forest Anomaly Score", "Fleet Reference Departure"],
                "summary": "Statistical telemetry departure detected across multidimensional feature space.",
                "evidence_count": len(ml_ev),
                "primary_evidence": ml_ev[0] if ml_ev else None,
            })

        return clusters

    @classmethod
    def calculate_financial_context(
        cls,
        ewbs: List[EwayBill],
        rules_eval: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Calculate the financial valuation of associated transport documents.
        NOTE: Clearly framed as 'Associated E-Way Bill Transaction Valuation', not 'Confirmed Fraud'.
        """
        total_inv_val = sum(float(e.ewb_ass_amt or 0) for e in ewbs)
        high_value_bills = [e for e in ewbs if float(e.ewb_ass_amt or 0) >= 50000.0]

        return {
            "total_associated_value_inr": round(total_inv_val, 2),
            "total_bills_count": len(ewbs),
            "high_value_bills_count": len(high_value_bills),
            "formatted_valuation": f"₹{total_inv_val:,.2f}",
            "exposure_note": "Associated statutory E-Way Bill transaction valuation subject to audit review.",
        }
