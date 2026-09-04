from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.core.logging_config import logger
from app.core.vehicle import normalize_vehicle_number
from app.models.eway_bill import EwayBill
from app.models.fastag_transaction import FastagTransaction
from app.repositories.eway_bill_repository import EwayBillRepository
from app.repositories.fastag_repository import FastagRepository
from app.repositories.vehicle_analysis_repository import VehicleAnalysisRepository
from app.services.location_service import LocationService
from app.services.feature_service import FeatureEngineeringService
from app.services.risk_engine import RiskEngine


class AnalysisService:
    # ----------------------------
    # Business Rules Constants (Preserved for compatibility)
    # ----------------------------
    MIN_TRIP_DISTANCE = 200          # km
    MIN_ORIGIN_DISTANCE = 500        # km
    MIN_INVOICE_VALUE = 50000        # ₹
    MIN_OVERLAP_PERCENT = 60.0       # %      
    MAX_AVERAGE_SPEED = 100.0        # km/h
    MIN_MOVEMENT_DISTANCE = 10.0     # km
    MAX_IDLE_HOURS = 8.0
    MIN_TIME_GAP_MINUTES = 5.0
    MAX_SPEED_KMPH = 130.0

    @staticmethod
    def haversine(lat1, lon1, lat2, lon2) -> float:
        return FeatureEngineeringService.haversine(lat1, lon1, lat2, lon2)

    @staticmethod
    def bearing(lat1, lon1, lat2, lon2) -> float:
        return FeatureEngineeringService.bearing(lat1, lon1, lat2, lon2)

    @staticmethod
    def direction(angle: float) -> str:
        directions = [
            "North", "North-East", "East", "South-East",
            "South", "South-West", "West", "North-West",
        ]
        index = round(angle / 45.0) % 8
        return directions[index]

    @staticmethod
    def bearing_difference(angle1: float, angle2: float) -> float:
        return FeatureEngineeringService.bearing_difference(angle1, angle2)

    @staticmethod
    def overlap_percentage(start1, end1, start2, end2) -> float:
        return FeatureEngineeringService.overlap_percentage(start1, end1, start2, end2)

    @staticmethod
    def get_all_unique_vehicles(db: Session) -> List[str]:
        """Fetch distinct, normalized, sorted vehicle numbers from E-Way Bill and FASTag datasets."""
        ewb_query = db.query(EwayBill.vehicle_number).filter(EwayBill.vehicle_number.isnot(None)).distinct().all()
        fastag_query = db.query(FastagTransaction.veh).filter(FastagTransaction.veh.isnot(None)).distinct().all()

        unique_set = set()
        for (v,) in ewb_query:
            norm = normalize_vehicle_number(v)
            if norm:
                unique_set.add(norm)

        for (v,) in fastag_query:
            norm = normalize_vehicle_number(v)
            if norm:
                unique_set.add(norm)

        return sorted(list(unique_set))

    @staticmethod
    async def analyze_vehicle(db: Session, vehicle_number: str) -> Dict[str, Any]:
        norm_vehicle = normalize_vehicle_number(vehicle_number) or (vehicle_number.strip() if vehicle_number else "")
        logger.info(f"AnalysisService.analyze_vehicle starting: vehicle={norm_vehicle} (raw={vehicle_number})")

        # 1. Fetch raw records
        ewbs = EwayBillRepository.get_by_vehicle(db, norm_vehicle)
        fastag = FastagRepository.get_by_vehicle(db, norm_vehicle)

        # 2. Build enriched trips context
        trips_context = []
        for ewb in ewbs:
            source = await LocationService.get_location(db, ewb.from_pin)
            destination = await LocationService.get_location(db, ewb.to_pin)

            if source is None or destination is None:
                continue

            distance = FeatureEngineeringService.haversine(
                source.latitude, source.longitude,
                destination.latitude, destination.longitude,
            )

            brg = FeatureEngineeringService.bearing(
                source.latitude, source.longitude,
                destination.latitude, destination.longitude,
            )

            tolls = FastagRepository.get_between(
                db=db,
                vehicle_number=norm_vehicle,
                start_time=ewb.ewb_dt,
                end_time=ewb.ewb_final_valid_dt,
            )

            trips_context.append({
                "ewb": ewb,
                "distance": distance,
                "bearing": brg,
                "direction": AnalysisService.direction(brg),
                "source": source,
                "destination": destination,
                "tolls": tolls,
            })

        # 3. Delegate to Unified Phase 4 RiskEngine
        unified_profile = RiskEngine.generate_unified_profile(
            vehicle_number=norm_vehicle,
            ewbs=ewbs,
            fastag=fastag,
            trips_context=trips_context,
        )

        # 4. Assemble complete payload with serialized trips for UI & DB caching
        trips_serialized = []
        for trip in trips_context:
            ewb = trip["ewb"]
            trips_serialized.append({
                "ewb_no": ewb.ewb_no,
                "vehicle_number": ewb.vehicle_number,
                "from_pin": ewb.from_pin,
                "to_pin": ewb.to_pin,
                "start_lat": trip["source"].latitude,
                "start_lon": trip["source"].longitude,
                "end_lat": trip["destination"].latitude,
                "end_lon": trip["destination"].longitude,
                "distance": round(trip["distance"], 2),
                "bearing": round(trip["bearing"], 2),
                "direction": trip["direction"],
                "start_time": ewb.ewb_dt.isoformat() if ewb.ewb_dt else None,
                "end_time": ewb.ewb_final_valid_dt.isoformat() if ewb.ewb_final_valid_dt else None,
                "invoice_amount": float(ewb.ewb_ass_amt or 0),
                "tolls": [
                    {
                        "toll_id": toll.toll_id,
                        "name": toll.toll_name,
                        "lat": float(toll.geo_lat) if toll.geo_lat is not None else 0.0,
                        "lon": float(toll.geo_long) if toll.geo_long is not None else 0.0,
                        "time": toll.readertme.isoformat() if toll.readertme else None,
                        "highway": toll.highway_type,
                        "status": toll.status,
                    }
                    for toll in trip["tolls"]
                ],
            })

        # Backward-compatible + Phase 1, 2, 3, 4 unified dictionary
        payload = {
            "vehicle_number": norm_vehicle,
            "risk_score": unified_profile["fraud_risk"]["score"],
            "risk_level": unified_profile["fraud_risk"]["level"],
            "eway_bill_count": len(ewbs),
            "fastag_count": len(fastag),
            "rules": unified_profile["rules"],
            "risk_signals": unified_profile["risk_signals"],
            "compliance_score": unified_profile["compliance"]["score"],
            "compliance_level": unified_profile["compliance"]["level"],
            "trust_score": unified_profile["trust"]["score"],
            "trust_level": unified_profile["trust"]["level"],
            "confidence_score": unified_profile["confidence"]["score"],
            "confidence_level": unified_profile["confidence"]["level"],
            "fraud_risk": unified_profile["fraud_risk"],
            "hybrid_risk": unified_profile["hybrid_risk"],
            "ml_analysis": unified_profile["ml_analysis"],
            "compliance": unified_profile["compliance"],
            "trust": unified_profile["trust"],
            "confidence": unified_profile["confidence"],
            "evidence": unified_profile["evidence"],
            "risk_drivers": unified_profile["risk_drivers"],
            "risk_clusters": unified_profile["risk_clusters"],
            "executive_summary": unified_profile["executive_summary"],
            "financial_context": unified_profile["financial_context"],
            "decision": unified_profile["decision"],
            "features": unified_profile["features"],
            "behavior_profile": unified_profile["behavior_profile"],
            "statistics": unified_profile["statistics"],
            "trips": trips_serialized,
        }

        # Auto-save cache in database
        try:
            VehicleAnalysisRepository.save_or_update(db, norm_vehicle, payload)
        except Exception as e:
            logger.error(f"Failed to auto-save analysis record for {norm_vehicle}: {e}")

        return payload

    @staticmethod
    async def batch_sync_vehicles(
        db: Session,
        limit: Optional[int] = 50,
        max_workers: int = 25,
        skip_existing: bool = True
    ) -> int:
        import asyncio
        from concurrent.futures import ThreadPoolExecutor, as_completed
        from app.models.eway_bill import EwayBill
        from app.models.fastag_transaction import FastagTransaction
        from app.models.vehicle_analysis import VehicleAnalysisRecord
        from app.core.database import SessionLocal

        logger.info(f"Batch sync starting: limit={limit}, max_workers={max_workers}, skip_existing={skip_existing}")

        ewb_query = db.query(EwayBill.vehicle_number).filter(EwayBill.vehicle_number.isnot(None)).distinct()
        fastag_query = db.query(FastagTransaction.veh).filter(FastagTransaction.veh.isnot(None)).distinct()

        all_vehicles = set(
            normalize_vehicle_number(r[0]) for r in ewb_query.all() if r[0]
        ).union(
            set(normalize_vehicle_number(r[0]) for r in fastag_query.all() if r[0])
        )
        all_vehicles.discard("")

        if skip_existing:
            existing_numbers = set(
                normalize_vehicle_number(r[0]) for r in db.query(VehicleAnalysisRecord.vehicle_number).all() if r[0]
            )
            all_vehicles = all_vehicles - existing_numbers

        vehicle_list = list(all_vehicles)
        if limit and limit > 0:
            vehicle_list = vehicle_list[:limit]

        if not vehicle_list:
            logger.info("Batch sync: No vehicles to process.")
            return 0

        def process_vehicle(v_num: str) -> bool:
            thread_db = SessionLocal()
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(AnalysisService.analyze_vehicle(thread_db, v_num))
                loop.close()
                return True
            except Exception as err:
                logger.error(f"Error in worker processing vehicle {v_num}: {err}")
                return False
            finally:
                thread_db.close()

        synced_count = 0
        total_to_process = len(vehicle_list)
        logger.info(f"Batch sync: Processing {total_to_process} vehicles with {max_workers} worker threads...")

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(process_vehicle, v_num) for v_num in vehicle_list]
            for future in as_completed(futures):
                if future.result():
                    synced_count += 1
                    if synced_count % 50 == 0 or synced_count == total_to_process:
                        logger.info(f"Batch sync progress: {synced_count}/{total_to_process} ({round(synced_count/total_to_process*100, 1)}%)")

        logger.info(f"Batch sync completed: total_processed={synced_count}/{total_to_process}")
        return synced_count
