from typing import List, Dict, Any, Optional
from datetime import datetime
from app.models.eway_bill import EwayBill
from app.models.fastag_transaction import FastagTransaction
from app.core.logging_config import logger


class EvidenceEngine:
    """
    Statutory Evidence Engine (Phase 4).
    Assembles structured, verifiable factual evidence objects and end-to-end evidence chains
    for all flagged risk drivers and anomalies.
    """

    @classmethod
    def assemble_evidence(
        cls,
        vehicle_number: str,
        ewbs: List[EwayBill],
        fastag: List[FastagTransaction],
        trips_context: List[Dict[str, Any]],
        rules_eval: Dict[str, Any],
        ml_eval: Dict[str, Any],
        features: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        logger.debug(f"Assembling evidence dossier for vehicle: {vehicle_number}")

        evidence_items = []
        rules = rules_eval.get("rules", [])
        rules_dict = {r["rule_id"]: r for r in rules}

        # -------------------------------------------------------------
        # 1. Impossible Speed Evidence (Rule 4)
        # -------------------------------------------------------------
        r4 = rules_dict.get("R4")
        if r4 and not r4["passed"]:
            for idx, detail in enumerate(r4.get("details", [])):
                from_toll = detail.get("from", {})
                to_toll = detail.get("to", {})
                spd = detail.get("speed", 0.0)

                chain = [
                    f"E-Way Bill active for vehicle {vehicle_number}",
                    f"FASTag RFID sensor checkpoint recorded at '{from_toll.get('name')}' (ID: {from_toll.get('id')})",
                    f"Subsequent FASTag RFID scan recorded at '{to_toll.get('name')}' (ID: {to_toll.get('id')})",
                    f"Calculated interval velocity of {spd} km/h strictly exceeds the 130 km/h physical heavy-freight threshold (+{round(spd - 130.0, 1)} km/h excess)",
                    f"Statutory Rule R4 triggered (+30 pts risk weight)",
                ]

                evidence_items.append({
                    "evidence_id": f"EV-SPEED-{idx+1:02d}",
                    "category": "KINEMATIC_VIOLATION",
                    "title": "Impossible Transit Speed",
                    "severity": "CRITICAL",
                    "observed_value": spd,
                    "threshold_value": 130.0,
                    "unit": "km/h",
                    "source": "FASTAG_RFID_TELEMETRY",
                    "location": f"{from_toll.get('name')} → {to_toll.get('name')}",
                    "description": f"Vehicle recorded traveling at {spd} km/h between {from_toll.get('name')} and {to_toll.get('name')}, exceeding maximum realistic heavy freight velocity.",
                    "evidence_chain": chain,
                    "metadata": detail,
                })

        # -------------------------------------------------------------
        # 2. Route Mismatch Evidence (Rule 5)
        # -------------------------------------------------------------
        r5 = rules_dict.get("R5")
        if r5 and not r5["passed"]:
            route_feat = features.get("route", {})
            dec_brg = route_feat.get("declared_bearing_deg")
            obs_brg = route_feat.get("observed_bearing_deg")
            dev_deg = route_feat.get("bearing_deviation_deg", 0.0)

            primary_ewb = ewbs[0] if ewbs else None
            chain = [
                f"E-Way Bill #{primary_ewb.ewb_no if primary_ewb else 'N/A'} declared transport route between PIN {primary_ewb.from_pin if primary_ewb else ''} and PIN {primary_ewb.to_pin if primary_ewb else ''} (Declared Bearing: {dec_brg}°)",
                f"Toll passage sequence telemetry established an actual transit trajectory along bearing {obs_brg}°",
                f"Geodesic angular deviation of {dev_deg}° falls squarely within the statutory diversion band (30.0° - 35.0°)",
                f"Statutory Rule R5 triggered (+25 pts risk weight)",
            ]

            evidence_items.append({
                "evidence_id": "EV-ROUTE-01",
                "category": "ROUTE_DIVERSION",
                "title": "Route Direction Mismatch",
                "severity": "HIGH",
                "observed_value": dev_deg,
                "threshold_value": "30.0° - 35.0°",
                "unit": "degrees",
                "source": "EWB_DECLARED_VS_FASTAG_TRAJECTORY",
                "location": f"Declared: {dec_brg}° vs Observed: {obs_brg}°",
                "description": f"Observed vehicular heading deviates by {dev_deg}° from the legally declared origin-destination route.",
                "evidence_chain": chain,
                "metadata": {"declared_bearing": dec_brg, "observed_bearing": obs_brg, "deviation": dev_deg},
            })

        # -------------------------------------------------------------
        # 3. FASTag Outside EWB Validity (Rule 3)
        # -------------------------------------------------------------
        r3 = rules_dict.get("R3")
        if r3 and not r3["passed"]:
            for idx, detail in enumerate(r3.get("details", [])[:3]):
                toll_name = detail.get("toll", "Toll Checkpoint")
                tx_time = detail.get("time", "")

                chain = [
                    f"Active E-Way Bill registers coverage window for vehicle {vehicle_number}",
                    f"FASTag toll transaction recorded at '{toll_name}' at timestamp {tx_time}",
                    f"Transaction timestamp falls completely outside all registered E-Way Bill validity start/expiration bounds",
                    f"Statutory Rule R3 triggered (+20 pts risk weight)",
                ]

                evidence_items.append({
                    "evidence_id": f"EV-VALIDITY-{idx+1:02d}",
                    "category": "DOCUMENTATION_MISMATCH",
                    "title": "Unregistered Physical Movement",
                    "severity": "HIGH",
                    "observed_value": 1,
                    "threshold_value": 0,
                    "unit": "unauthorized events",
                    "source": "FASTAG_TIMESTAMP_VS_EWB_VALIDITY",
                    "location": toll_name,
                    "timestamp": tx_time,
                    "description": f"Toll passage recorded at '{toll_name}' with no corresponding valid E-Way Bill in effect.",
                    "evidence_chain": chain,
                    "metadata": detail,
                })

        # -------------------------------------------------------------
        # 4. Duplicate / Overlapping E-Way Bills (Rule 2)
        # -------------------------------------------------------------
        r2 = rules_dict.get("R2")
        if r2 and not r2["passed"]:
            for idx, detail in enumerate(r2.get("details", [])):
                e1 = detail.get("ewb1")
                e2 = detail.get("ewb2")
                overlap_pct = detail.get("overlap", 0.0)

                chain = [
                    f"E-Way Bill #{e1} generated for vehicle {vehicle_number}",
                    f"Concurrent E-Way Bill #{e2} generated for identical vehicle registration",
                    f"Temporal validity window overlap of {overlap_pct}% detected (Statutory threshold: 60.0%)",
                    f"Statutory Rule R2 triggered (+10 pts risk weight)",
                ]

                evidence_items.append({
                    "evidence_id": f"EV-DUPLICATE-{idx+1:02d}",
                    "category": "BILLING_ANOMALY",
                    "title": "Duplicate / Overlapping E-Way Bills",
                    "severity": "MEDIUM",
                    "observed_value": overlap_pct,
                    "threshold_value": 60.0,
                    "unit": "% overlap",
                    "source": "EWB_TEMPORAL_OVERLAP",
                    "location": f"EWB #{e1} & EWB #{e2}",
                    "description": f"Multiple concurrent E-Way Bills active simultaneously with {overlap_pct}% temporal overlap, indicating potential invoice recycling.",
                    "evidence_chain": chain,
                    "metadata": detail,
                })

        # -------------------------------------------------------------
        # 5. No FASTag Data (Rule 1)
        # -------------------------------------------------------------
        r1 = rules_dict.get("R1")
        if r1 and not r1["passed"]:
            chain = [
                f"Vehicle {vehicle_number} has {len(ewbs)} declared active E-Way Bill(s) requiring highway transit",
                "Zero electronic FASTag toll RFID transactions recorded across national toll plazas",
                "Indicates potential ghost transport, fake invoice generation, or toll evasion",
                "Statutory Rule R1 triggered (+25 pts risk weight)",
            ]

            evidence_items.append({
                "evidence_id": "EV-NOFASTAG-01",
                "category": "TELEMETRY_DEFICIENCY",
                "title": "Zero FASTag Telemetry on Active Movement",
                "severity": "HIGH",
                "observed_value": 0,
                "threshold_value": 1,
                "unit": "FASTag transactions",
                "source": "NATIONAL_FASTAG_REGISTRY",
                "location": "National Highway Network",
                "description": f"E-Way Bills declared for road transport but zero electronic toll passages registered in the FASTag network.",
                "evidence_chain": chain,
                "metadata": {"ewb_count": len(ewbs), "fastag_count": 0},
            })

        # -------------------------------------------------------------
        # 6. Suspicious Time Gap / Teleportation (Rule 6)
        # -------------------------------------------------------------
        r6 = rules_dict.get("R6")
        if r6 and not r6["passed"]:
            for idx, detail in enumerate(r6.get("details", [])):
                f_toll = detail.get("from", {}).get("name", "Toll A")
                t_toll = detail.get("to", {}).get("name", "Toll B")
                d = detail.get("distance", 0.0)
                hrs = detail.get("hours")
                mins = detail.get("minutes")

                if hrs is not None:
                    desc = f"Extended stationary halt of {hrs} hours with only {d} km traversed between {f_toll} and {t_toll}."
                    chain = [
                        f"Toll passage recorded at '{f_toll}'",
                        f"Subsequent toll passage at '{t_toll}' recorded {hrs} hours later ({d} km distance)",
                        f"Unexplained stationary halt exceeding 8.0 hours",
                        f"Statutory Rule R6 triggered (+20 pts risk weight)",
                    ]
                else:
                    desc = f"Spatial jump anomaly: {d} km traversed in only {mins} minutes between {f_toll} and {t_toll}."
                    chain = [
                        f"Toll passage recorded at '{f_toll}'",
                        f"Subsequent toll passage at '{t_toll}' ({d} km away) recorded in {mins} minutes",
                        f"Kinematically impossible teleportation jump (>100 km in <5 min)",
                        f"Statutory Rule R6 triggered (+20 pts risk weight)",
                    ]

                evidence_items.append({
                    "evidence_id": f"EV-TIMEGAP-{idx+1:02d}",
                    "category": "TEMPORAL_ANOMALY",
                    "title": "Suspicious Temporal / Kinematic Gap",
                    "severity": "MEDIUM",
                    "observed_value": hrs or mins,
                    "threshold_value": "8.0h / 5.0m",
                    "unit": "hours" if hrs is not None else "minutes",
                    "source": "FASTAG_TIMESTAMP_INTERVALS",
                    "location": f"{f_toll} → {t_toll}",
                    "description": desc,
                    "evidence_chain": chain,
                    "metadata": detail,
                })

        # -------------------------------------------------------------
        # 7. Unsupervised ML Anomaly Evidence
        # -------------------------------------------------------------
        if ml_eval.get("status") == "AVAILABLE" and ml_eval.get("anomaly_level") in ["HIGHLY_ANOMALOUS", "UNUSUAL"]:
            top_feats = ml_eval.get("top_anomalous_features", [])
            feat_summaries = [
                f"{f['feature_name']}: {f['vehicle_value']} {f['unit']} (Fleet median: {f['population_reference']} {f['unit']}, {'+' if f['deviation_pct'] > 0 else ''}{f['deviation_pct']}%)"
                for f in top_feats[:3]
            ]

            chain = [
                f"14-dimensional feature vector extracted for vehicle {vehicle_number}",
                f"Isolation Forest benchmarked vehicle against population baseline",
                f"Normalized ML Anomaly Score computed at {ml_eval.get('ml_anomaly_score')}/100 ({ml_eval.get('anomaly_level')})",
                f"Key statistical departures identified: {'; '.join(feat_summaries)}",
            ]

            evidence_items.append({
                "evidence_id": "EV-ML-01",
                "category": "STATISTICAL_ML_OUTLIER",
                "title": "Unsupervised Multi-Dimensional Anomaly",
                "severity": "HIGH" if ml_eval.get("anomaly_level") == "HIGHLY_ANOMALOUS" else "MEDIUM",
                "observed_value": ml_eval.get("ml_anomaly_score", 0),
                "threshold_value": 50.0,
                "unit": "anomaly index",
                "source": "ISOLATION_FOREST_V1",
                "location": "Fleet-Wide Telemetry Space",
                "description": ml_eval.get("explanation", "Statistically unusual feature distribution detected."),
                "evidence_chain": chain,
                "metadata": {"top_features": top_feats, "raw_score": ml_eval.get("raw_decision_score")},
            })

        return evidence_items
