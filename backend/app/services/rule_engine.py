from typing import List, Dict, Any
from app.models.eway_bill import EwayBill
from app.models.fastag_transaction import FastagTransaction
from app.core.logging_config import logger


class RuleEngine:
    """
    Statutory GST Fraud Rule Engine.
    Evaluates vehicle telemetry and documentation against 6 distinct regulatory criteria.
    Exact weights:
      - Rule 1 (No FASTag): +25
      - Rule 2 (Duplicate EWB): +10
      - Rule 3 (FASTag Outside Validity): +20
      - Rule 4 (Impossible Speed >130 km/h): +30
      - Rule 5 (Route Mismatch 30°-35°): +25
      - Rule 6 (Suspicious Time Gap): +20
    Maximum Score: 130
    """

    @classmethod
    def evaluate(
        cls,
        vehicle_number: str,
        ewbs: List[EwayBill],
        fastag: List[FastagTransaction],
        trips_context: List[Dict[str, Any]],
        features: Dict[str, Any],
    ) -> Dict[str, Any]:
        logger.debug(f"Evaluating 6 statutory rules for vehicle: {vehicle_number}")

        rules_results = []
        total_risk_score = 0

        # -------------------------------------------------------------
        # Rule 1: No FASTag Data (+25 pts)
        # -------------------------------------------------------------
        r1_passed = True
        r1_score = 0
        r1_reason = "FASTag records verified."

        if len(ewbs) > 0 and len(fastag) == 0:
            r1_passed = False
            r1_score = 25
            r1_reason = "Vehicle has active E-Way Bills but zero FASTag toll transactions."
        elif len(ewbs) == 0 and len(fastag) == 0:
            r1_passed = True
            r1_score = 0
            r1_reason = "No E-Way Bills or FASTag records found."

        total_risk_score += r1_score
        rules_results.append({
            "rule_id": "R1",
            "rule": "No FASTag Data",
            "passed": r1_passed,
            "severity": "HIGH",
            "score": r1_score,
            "actual_value": len(fastag),
            "threshold": 1,
            "unit": "transactions",
            "reason": r1_reason,
            "details": [],
        })

        # -------------------------------------------------------------
        # Rule 2: Duplicate / Overlapping E-Way Bills (+10 pts)
        # -------------------------------------------------------------
        duplicate_details = []
        for i in range(len(trips_context)):
            t1 = trips_context[i]
            for j in range(i + 1, len(trips_context)):
                t2 = trips_context[j]
                ov = features.get("ewb", {}).get("overlapping_ewb_pairs", 0)
                if t1["ewb"].ewb_dt and t1["ewb"].ewb_final_valid_dt and t2["ewb"].ewb_dt and t2["ewb"].ewb_final_valid_dt:
                    from app.services.feature_service import FeatureEngineeringService
                    pct = FeatureEngineeringService.overlap_percentage(
                        t1["ewb"].ewb_dt, t1["ewb"].ewb_final_valid_dt,
                        t2["ewb"].ewb_dt, t2["ewb"].ewb_final_valid_dt
                    )
                    if pct >= 60.0:
                        duplicate_details.append({
                            "ewb1": t1["ewb"].ewb_no,
                            "ewb2": t2["ewb"].ewb_no,
                            "overlap": round(pct, 1),
                        })

        r2_passed = len(duplicate_details) == 0
        r2_score = 10 if not r2_passed else 0
        r2_reason = f"{len(duplicate_details)} overlapping E-Way Bill pairs detected." if not r2_passed else "No overlapping E-Way Bills found."

        total_risk_score += r2_score
        rules_results.append({
            "rule_id": "R2",
            "rule": "Duplicate E-Way Bill",
            "passed": r2_passed,
            "severity": "MEDIUM",
            "score": r2_score,
            "actual_value": len(duplicate_details),
            "threshold": 0,
            "unit": "overlapping pairs",
            "reason": r2_reason,
            "details": duplicate_details,
        })

        # -------------------------------------------------------------
        # Rule 3: FASTag Outside EWB Validity (+20 pts)
        # -------------------------------------------------------------
        outside_transactions = []
        for tx in fastag:
            if not tx.readertme:
                continue
            matched = False
            for trip in trips_context:
                ewb = trip["ewb"]
                if ewb.ewb_dt and ewb.ewb_final_valid_dt:
                    if ewb.ewb_dt <= tx.readertme <= ewb.ewb_final_valid_dt:
                        matched = True
                        break
            if not matched:
                outside_transactions.append({
                    "toll": tx.toll_name,
                    "time": tx.readertme.isoformat() if hasattr(tx.readertme, "isoformat") else str(tx.readertme),
                })

        r3_passed = len(outside_transactions) == 0
        r3_score = 20 if not r3_passed else 0
        r3_reason = f"{len(outside_transactions)} FASTag transactions occurred outside all E-Way Bill validity periods." if not r3_passed else "All FASTag transactions fall within an E-Way Bill validity period."

        total_risk_score += r3_score
        rules_results.append({
            "rule_id": "R3",
            "rule": "FASTag Outside Validity",
            "passed": r3_passed,
            "severity": "HIGH",
            "score": r3_score,
            "actual_value": len(outside_transactions),
            "threshold": 0,
            "unit": "unauthorized crossings",
            "reason": r3_reason,
            "details": outside_transactions,
        })

        # -------------------------------------------------------------
        # Rule 4: Impossible Average Speed (>130 km/h) (+30 pts)
        # -------------------------------------------------------------
        speed_details = []
        if len(fastag) >= 2:
            for trip in trips_context:
                valid_tolls = [t for t in trip.get("tolls", []) if t.readertme and t.geo_lat is not None and t.geo_long is not None]
                journey = sorted(valid_tolls, key=lambda x: x.readertme)
                if len(journey) < 2:
                    continue

                from app.services.feature_service import FeatureEngineeringService
                for i in range(len(journey) - 1):
                    c = journey[i]
                    n = journey[i + 1]
                    if c.toll_id == n.toll_id:
                        continue

                    d = FeatureEngineeringService.haversine(c.geo_lat, c.geo_long, n.geo_lat, n.geo_long)
                    hrs = (n.readertme - c.readertme).total_seconds() / 3600.0
                    if hrs <= 0:
                        continue

                    spd = d / hrs
                    if spd > 130.0:
                        speed_details.append({
                            "from": {"id": c.toll_id, "name": c.toll_name},
                            "to": {"id": n.toll_id, "name": n.toll_name},
                            "speed": round(spd, 2),
                        })

        r4_passed = len(speed_details) == 0
        r4_score = 30 if not r4_passed else 0
        r4_reason = f"{len(speed_details)} impossible speed events detected." if not r4_passed else "Vehicle speed is within acceptable limits."

        total_risk_score += r4_score
        rules_results.append({
            "rule_id": "R4",
            "rule": "Impossible Average Speed",
            "passed": r4_passed,
            "severity": "CRITICAL",
            "score": r4_score,
            "actual_value": max([s["speed"] for s in speed_details], default=0.0),
            "threshold": 130.0,
            "unit": "km/h",
            "reason": r4_reason,
            "details": speed_details,
        })

        # -------------------------------------------------------------
        # Rule 5: Route Mismatch (Bearing Angle 30°-35°) (+25 pts)
        # -------------------------------------------------------------
        route_mismatch = False
        mismatch_details = []

        if len(fastag) >= 2:
            from app.services.feature_service import FeatureEngineeringService
            for trip in trips_context:
                exp_bearing = trip.get("bearing")
                valid_trip_tolls = [t for t in trip.get("tolls", []) if t.readertme and t.geo_lat is not None and t.geo_long is not None]
                journey = sorted(valid_trip_tolls, key=lambda t: t.readertme)
                if len(journey) < 2 or exp_bearing is None:
                    continue

                first = journey[0]
                last = journey[-1]
                act_bearing = FeatureEngineeringService.bearing(first.geo_lat, first.geo_long, last.geo_lat, last.geo_long)
                diff = FeatureEngineeringService.bearing_difference(exp_bearing, act_bearing)

                if 30.0 <= diff < 35.0:
                    route_mismatch = True
                    reason_str = f"EWB {trip['ewb'].ewb_no}: Expected {exp_bearing:.1f}°, Actual {act_bearing:.1f}°, Difference {diff:.1f}°"
                    mismatch_details.append(reason_str)

        r5_passed = not route_mismatch
        r5_score = 25 if not r5_passed else 0
        r5_reason = mismatch_details[0] if mismatch_details else "Vehicle movement matches expected direction."

        total_risk_score += r5_score
        rules_results.append({
            "rule_id": "R5",
            "rule": "Route Mismatch",
            "passed": r5_passed,
            "severity": "HIGH",
            "score": r5_score,
            "actual_value": features.get("route", {}).get("bearing_deviation_deg", 0.0),
            "threshold": "30°-35°",
            "unit": "degrees",
            "reason": r5_reason,
            "details": mismatch_details,
        })

        # -------------------------------------------------------------
        # Rule 6: Suspicious Time Gap (+20 pts)
        # -------------------------------------------------------------
        gap_details = []
        for trip in trips_context:
            valid_tolls = [t for t in trip.get("tolls", []) if t.readertme and t.geo_lat is not None and t.geo_long is not None]
            journey = sorted(valid_tolls, key=lambda x: x.readertme)
            if len(journey) < 2:
                continue

            from app.services.feature_service import FeatureEngineeringService
            for i in range(len(journey) - 1):
                c = journey[i]
                n = journey[i + 1]
                if c.toll_id == n.toll_id:
                    continue

                d = FeatureEngineeringService.haversine(c.geo_lat, c.geo_long, n.geo_lat, n.geo_long)
                sec = (n.readertme - c.readertme).total_seconds()
                hrs = sec / 3600.0
                mins = sec / 60.0

                if hrs <= 0:
                    continue

                if d < 10.0 and hrs > 8.0:
                    gap_details.append({
                        "from": {"id": c.toll_id, "name": c.toll_name},
                        "to": {"id": n.toll_id, "name": n.toll_name},
                        "distance": round(d, 2),
                        "hours": round(hrs, 2),
                    })
                elif d > 100.0 and mins < 5.0:
                    gap_details.append({
                        "from": {"id": c.toll_id, "name": c.toll_name},
                        "to": {"id": n.toll_id, "name": n.toll_name},
                        "distance": round(d, 2),
                        "minutes": round(mins, 2),
                    })

        r6_passed = len(gap_details) == 0
        r6_score = 20 if not r6_passed else 0
        r6_reason = f"{len(gap_details)} suspicious time gap events detected." if not r6_passed else "FASTag timestamps appear normal."

        total_risk_score += r6_score
        rules_results.append({
            "rule_id": "R6",
            "rule": "Suspicious Time Gap",
            "passed": r6_passed,
            "severity": "MEDIUM",
            "score": r6_score,
            "actual_value": len(gap_details),
            "threshold": 0,
            "unit": "anomalous segments",
            "reason": r6_reason,
            "details": gap_details,
        })

        # Calculate risk band
        if total_risk_score >= 60:
            risk_level = "HIGH"
        elif total_risk_score >= 30:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        return {
            "fraud_risk_score": total_risk_score,
            "risk_level": risk_level,
            "rules": rules_results,
            "failed_rules_count": sum(1 for r in rules_results if not r["passed"]),
        }
