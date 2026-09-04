from datetime import datetime
from math import radians, sin, cos, atan2, sqrt, degrees
from typing import List, Dict, Any, Optional
import numpy as np

from app.models.eway_bill import EwayBill
from app.models.fastag_transaction import FastagTransaction
from app.core.logging_config import logger


class FeatureEngineeringService:
    """
    Deterministic Feature Engineering Service.
    Extracts quantifiable kinematic, temporal, route, and data-quality features
    from E-Way Bill and FASTag telemetry datasets.
    """

    MIN_OVERLAP_PERCENT = 60.0
    HIGH_SPEED_THRESHOLD = 100.0
    IMPOSSIBLE_SPEED_THRESHOLD = 130.0
    LONG_IDLE_HOURS = 8.0
    RAPID_JUMP_KM = 100.0
    RAPID_JUMP_MINUTES = 5.0
    HIGH_VALUE_THRESHOLD = 50000.0

    @staticmethod
    def haversine(lat1, lon1, lat2, lon2) -> float:
        """Calculate Great Circle distance (in km) between two lat/lon points."""
        try:
            lat1, lon1, lat2, lon2 = float(lat1), float(lon1), float(lat2), float(lon2)
        except (ValueError, TypeError):
            return 0.0

        if not (-90 <= lat1 <= 90 and -90 <= lat2 <= 90 and -180 <= lon1 <= 180 and -180 <= lon2 <= 180):
            return 0.0

        r = 6371.0
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)

        a = sin(dlat / 2.0) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2.0) ** 2
        a = min(1.0, max(0.0, a))
        c = 2.0 * atan2(sqrt(a), sqrt(1.0 - a))
        return r * c

    @staticmethod
    def bearing(lat1, lon1, lat2, lon2) -> float:
        """Calculate initial bearing angle in degrees [0, 360)."""
        try:
            lat1, lon1, lat2, lon2 = float(lat1), float(lon1), float(lat2), float(lon2)
        except (ValueError, TypeError):
            return 0.0

        lat1_rad = radians(lat1)
        lat2_rad = radians(lat2)
        dlon_rad = radians(lon2 - lon1)

        x = sin(dlon_rad) * cos(lat2_rad)
        y = cos(lat1_rad) * sin(lat2_rad) - sin(lat1_rad) * cos(lat2_rad) * cos(dlon_rad)

        angle = degrees(atan2(x, y))
        return (angle + 360.0) % 360.0

    @staticmethod
    def bearing_difference(angle1: float, angle2: float) -> float:
        """Calculate shortest angular difference across 0/360 boundary."""
        diff = abs(angle1 - angle2)
        return min(diff, 360.0 - diff)

    @staticmethod
    def overlap_percentage(start1, end1, start2, end2) -> float:
        if not start1 or not end1 or not start2 or not end2:
            return 0.0

        latest_start = max(start1, start2)
        earliest_end = min(end1, end2)

        if latest_start >= earliest_end:
            return 0.0

        overlap_seconds = (earliest_end - latest_start).total_seconds()
        duration_seconds = (end1 - start1).total_seconds()

        if duration_seconds <= 0:
            return 0.0

        return (overlap_seconds / duration_seconds) * 100.0

    @classmethod
    def extract_features(
        cls,
        vehicle_number: str,
        ewbs: List[EwayBill],
        fastag: List[FastagTransaction],
        trips_context: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Extract complete structured feature dictionary for a given vehicle.
        """
        logger.debug(f"Extracting features for vehicle: {vehicle_number}")

        # -------------------------------------------------------------
        # 1. E-Way Bill Features
        # -------------------------------------------------------------
        total_ewbs = len(ewbs)
        now = datetime.now()

        active_ewbs = 0
        expired_ewbs = 0
        invoice_values = []
        travel_distances = []
        validity_durations_hrs = []
        high_value_ewbs = 0

        for e in ewbs:
            val = float(e.ewb_ass_amt or 0)
            invoice_values.append(val)
            if val >= cls.HIGH_VALUE_THRESHOLD:
                high_value_ewbs += 1

            if e.travel_distance:
                travel_distances.append(float(e.travel_distance))

            if e.ewb_final_valid_dt:
                if e.ewb_final_valid_dt >= now:
                    active_ewbs += 1
                else:
                    expired_ewbs += 1

            if e.ewb_dt and e.ewb_final_valid_dt:
                dur = (e.ewb_final_valid_dt - e.ewb_dt).total_seconds() / 3600.0
                if dur > 0:
                    validity_durations_hrs.append(dur)

        # Overlapping EWB pairs
        overlapping_pairs_count = 0
        for i in range(len(ewbs)):
            for j in range(i + 1, len(ewbs)):
                e1, e2 = ewbs[i], ewbs[j]
                if e1.ewb_dt and e1.ewb_final_valid_dt and e2.ewb_dt and e2.ewb_final_valid_dt:
                    ov = cls.overlap_percentage(e1.ewb_dt, e1.ewb_final_valid_dt, e2.ewb_dt, e2.ewb_final_valid_dt)
                    if ov >= cls.MIN_OVERLAP_PERCENT:
                        overlapping_pairs_count += 1

        ewb_features = {
            "total_ewbs": total_ewbs,
            "active_ewbs": active_ewbs,
            "expired_ewbs": expired_ewbs,
            "avg_invoice_value": round(float(np.mean(invoice_values)), 2) if invoice_values else 0.0,
            "max_invoice_value": round(float(np.max(invoice_values)), 2) if invoice_values else 0.0,
            "total_declared_distance_km": round(float(sum(travel_distances)), 2) if travel_distances else 0.0,
            "avg_declared_distance_km": round(float(np.mean(travel_distances)), 2) if travel_distances else 0.0,
            "avg_validity_hours": round(float(np.mean(validity_durations_hrs)), 2) if validity_durations_hrs else 0.0,
            "overlapping_ewb_pairs": overlapping_pairs_count,
            "high_value_ewb_count": high_value_ewbs,
        }

        # -------------------------------------------------------------
        # 2. FASTag & Movement Telemetry Features
        # -------------------------------------------------------------
        total_fastag = len(fastag)
        unique_tolls = len(set(t.toll_id for t in fastag if t.toll_id is not None))
        
        valid_coords_tx = [
            t for t in fastag 
            if t.readertme and t.geo_lat is not None and t.geo_long is not None and
            -90 <= float(t.geo_lat) <= 90 and -180 <= float(t.geo_long) <= 180
        ]
        sorted_tx = sorted(valid_coords_tx, key=lambda x: x.readertme)

        speeds = []
        inter_toll_distances = []
        inter_toll_times_min = []
        night_crossings = 0
        impossible_speeds_count = 0
        high_speeds_count = 0
        stationary_periods_gt_8h = 0
        longest_stationary_hrs = 0.0
        rapid_jumps_count = 0
        total_observed_movement = 0.0

        for t in fastag:
            if t.readertme:
                hour = t.readertme.hour
                if hour >= 22 or hour < 6:
                    night_crossings += 1

        if len(sorted_tx) >= 2:
            for i in range(len(sorted_tx) - 1):
                cur = sorted_tx[i]
                nxt = sorted_tx[i + 1]

                if cur.toll_id == nxt.toll_id:
                    continue

                dist = cls.haversine(cur.geo_lat, cur.geo_long, nxt.geo_lat, nxt.geo_long)
                time_diff_sec = (nxt.readertme - cur.readertme).total_seconds()
                time_diff_hrs = time_diff_sec / 3600.0
                time_diff_min = time_diff_sec / 60.0

                if time_diff_hrs <= 0:
                    continue

                total_observed_movement += dist
                inter_toll_distances.append(dist)
                inter_toll_times_min.append(time_diff_min)

                spd = dist / time_diff_hrs
                speeds.append(spd)

                if spd > cls.IMPOSSIBLE_SPEED_THRESHOLD:
                    impossible_speeds_count += 1
                elif spd > cls.HIGH_SPEED_THRESHOLD:
                    high_speeds_count += 1

                # Idle periods
                if dist < 10.0 and time_diff_hrs > cls.LONG_IDLE_HOURS:
                    stationary_periods_gt_8h += 1
                    if time_diff_hrs > longest_stationary_hrs:
                        longest_stationary_hrs = time_diff_hrs

                # Rapid jumps
                if dist > cls.RAPID_JUMP_KM and time_diff_min < cls.RAPID_JUMP_MINUTES:
                    rapid_jumps_count += 1

        fastag_features = {
            "total_transactions": total_fastag,
            "unique_toll_plazas": unique_tolls,
            "night_crossings_count": night_crossings,
            "avg_time_between_tolls_min": round(float(np.mean(inter_toll_times_min)), 2) if inter_toll_times_min else 0.0,
            "min_time_gap_min": round(float(np.min(inter_toll_times_min)), 2) if inter_toll_times_min else 0.0,
            "max_time_gap_min": round(float(np.max(inter_toll_times_min)), 2) if inter_toll_times_min else 0.0,
            "avg_distance_between_tolls_km": round(float(np.mean(inter_toll_distances)), 2) if inter_toll_distances else 0.0,
        }

        speed_features = {
            "avg_speed_kmh": round(float(np.mean(speeds)), 2) if speeds else 0.0,
            "max_speed_kmh": round(float(np.max(speeds)), 2) if speeds else 0.0,
            "min_speed_kmh": round(float(np.min(speeds)), 2) if speeds else 0.0,
            "speed_variance": round(float(np.var(speeds)), 2) if speeds else 0.0,
            "high_speed_events_gt_100": high_speeds_count,
            "impossible_speed_events_gt_130": impossible_speeds_count,
        }

        movement_features = {
            "total_observed_movement_km": round(total_observed_movement, 2),
            "movement_segments_count": len(inter_toll_distances),
            "avg_movement_per_segment_km": round(float(np.mean(inter_toll_distances)), 2) if inter_toll_distances else 0.0,
            "longest_movement_segment_km": round(float(np.max(inter_toll_distances)), 2) if inter_toll_distances else 0.0,
            "stationary_periods_gt_8h": stationary_periods_gt_8h,
            "longest_stationary_hours": round(longest_stationary_hrs, 2),
            "rapid_long_distance_jumps": rapid_jumps_count,
        }

        # -------------------------------------------------------------
        # 3. Route Features
        # -------------------------------------------------------------
        declared_bearing = None
        observed_bearing = None
        bearing_deviation = None
        route_mismatch_detected = False

        if trips_context:
            primary_trip = trips_context[0]
            declared_bearing = primary_trip.get("bearing")
            
            trip_tolls = primary_trip.get("tolls", [])
            valid_trip_tolls = [
                t for t in trip_tolls 
                if t.readertme and t.geo_lat is not None and t.geo_long is not None
            ]
            sorted_trip_tolls = sorted(valid_trip_tolls, key=lambda x: x.readertme)

            if len(sorted_trip_tolls) >= 2 and declared_bearing is not None:
                first_t = sorted_trip_tolls[0]
                last_t = sorted_trip_tolls[-1]
                observed_bearing = cls.bearing(first_t.geo_lat, first_t.geo_long, last_t.geo_lat, last_t.geo_long)
                bearing_deviation = cls.bearing_difference(declared_bearing, observed_bearing)
                if 30.0 <= bearing_deviation < 35.0:
                    route_mismatch_detected = True

        route_features = {
            "declared_bearing_deg": round(declared_bearing, 2) if declared_bearing is not None else None,
            "observed_bearing_deg": round(observed_bearing, 2) if observed_bearing is not None else None,
            "bearing_deviation_deg": round(bearing_deviation, 2) if bearing_deviation is not None else None,
            "route_mismatch_detected": route_mismatch_detected,
        }

        # -------------------------------------------------------------
        # 4. Data Quality Features
        # -------------------------------------------------------------
        missing_coords = sum(1 for t in fastag if t.geo_lat is None or t.geo_long is None)
        missing_timestamps = sum(1 for t in fastag if t.readertme is None)
        invalid_coords = sum(
            1 for t in fastag 
            if t.geo_lat is not None and t.geo_long is not None and 
            not (-90 <= float(t.geo_lat) <= 90 and -180 <= float(t.geo_long) <= 180)
        )

        total_points = total_ewbs * 2 + total_fastag
        quality_score = 100.0
        if total_points > 0:
            flaws = missing_coords + missing_timestamps + invalid_coords
            quality_score = max(0.0, min(100.0, 100.0 - (flaws / total_points) * 100.0))

        data_quality_features = {
            "missing_coordinates_count": missing_coords,
            "missing_timestamps_count": missing_timestamps,
            "invalid_coordinates_count": invalid_coords,
            "data_quality_score": round(quality_score, 1),
        }

        # -------------------------------------------------------------
        # 5. Behavior Profile Summary
        # -------------------------------------------------------------
        behavior_profile = {
            "vehicle_number": vehicle_number,
            "ewb_activity_level": "HIGH" if total_ewbs >= 5 else "MODERATE" if total_ewbs > 0 else "NONE",
            "fastag_activity_level": "HIGH" if total_fastag >= 10 else "MODERATE" if total_fastag > 0 else "NONE",
            "speed_profile": "ANOMALOUS" if impossible_speeds_count > 0 else "ELEVATED" if high_speeds_count > 0 else "NORMAL",
            "route_alignment": "DEVIATED" if route_mismatch_detected else "ALIGNED" if bearing_deviation is not None else "UNVERIFIED",
            "night_operation_ratio": round((night_crossings / total_fastag), 2) if total_fastag > 0 else 0.0,
            "data_quality_grade": "HIGH" if quality_score >= 85 else "MODERATE" if quality_score >= 60 else "LOW",
        }

        return {
            "ewb": ewb_features,
            "fastag": fastag_features,
            "speed": speed_features,
            "movement": movement_features,
            "route": route_features,
            "data_quality": data_quality_features,
            "behavior_profile": behavior_profile,
        }
