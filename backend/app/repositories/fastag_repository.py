from datetime import datetime
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.fastag_transaction import FastagTransaction
from app.core.vehicle import normalize_vehicle_number


class FastagRepository:

    @staticmethod
    def get_all(
        db: Session,
    ):
        return (
            db.query(FastagTransaction)
            .all()
        )

    @staticmethod
    def get_by_vehicle(
        db: Session,
        vehicle_number: str,
    ):
        normalized = normalize_vehicle_number(vehicle_number)
        raw = vehicle_number.strip() if vehicle_number else ""
        return (
            db.query(FastagTransaction)
            .filter(
                or_(
                    FastagTransaction.veh == raw,
                    FastagTransaction.veh == normalized,
                    func.replace(func.replace(FastagTransaction.veh, " ", ""), "-", "") == normalized
                )
            )
            .order_by(
                FastagTransaction.readertme.asc()
            )
            .all()
        )

    @staticmethod
    def get_between(
        db: Session,
        vehicle_number: str,
        start_time: datetime,
        end_time: datetime,
    ):
        normalized = normalize_vehicle_number(vehicle_number)
        raw = vehicle_number.strip() if vehicle_number else ""
        return (
            db.query(FastagTransaction)
            .filter(
                or_(
                    FastagTransaction.veh == raw,
                    FastagTransaction.veh == normalized,
                    func.replace(func.replace(FastagTransaction.veh, " ", ""), "-", "") == normalized
                ),
                FastagTransaction.readertme >= start_time,
                FastagTransaction.readertme <= end_time,
            )
            .order_by(
                FastagTransaction.readertme.asc()
            )
            .all()
        )

    @staticmethod
    def get_by_toll(
        db: Session,
        toll_id: int,
    ):
        return (
            db.query(FastagTransaction)
            .filter(
                FastagTransaction.toll_id == toll_id
            )
            .all()
        )

    @staticmethod
    def get_latest(
        db: Session,
        vehicle_number: str,
    ):
        return (
            db.query(FastagTransaction)
            .filter(
                FastagTransaction.veh == vehicle_number
            )
            .order_by(
                FastagTransaction.readertme.desc()
            )
            .first()
        )