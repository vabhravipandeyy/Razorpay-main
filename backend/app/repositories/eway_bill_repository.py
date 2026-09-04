from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from app.models.eway_bill import EwayBill
from app.core.vehicle import normalize_vehicle_number


class EwayBillRepository:

    @staticmethod
    def get_all(db: Session):
        return db.query(EwayBill).all()

    @staticmethod
    def get_by_ewb_no(db: Session, ewb_no: int):
        return db.query(EwayBill).filter(EwayBill.ewb_no == ewb_no).first()

    @staticmethod
    def get_by_vehicle(db: Session, vehicle_number: str):
        normalized = normalize_vehicle_number(vehicle_number)
        raw = vehicle_number.strip() if vehicle_number else ""
        return (
            db.query(EwayBill)
            .filter(
                or_(
                    EwayBill.vehicle_number == raw,
                    EwayBill.vehicle_number == normalized,
                    func.replace(func.replace(EwayBill.vehicle_number, " ", ""), "-", "") == normalized
                )
            )
            .order_by(EwayBill.ewb_dt.asc())
            .all()
        )

    @staticmethod
    def get_active_between(db: Session, start_time, end_time):
        """
        Returns all EWBs whose validity overlaps
        the supplied time interval.
        """
        return (
            db.query(EwayBill)
            .filter(
                EwayBill.ewb_dt <= end_time,
                EwayBill.ewb_final_valid_dt >= start_time,
            )
            .all()
        )

    @staticmethod
    def get_by_from_pin(db: Session, from_pin: int):
        return db.query(EwayBill).filter(EwayBill.from_pin == from_pin).all()

    @staticmethod
    def get_by_to_pin(db: Session, to_pin: int):
        return db.query(EwayBill).filter(EwayBill.to_pin == to_pin).all()

    @staticmethod
    def get_by_date_range(db: Session, start_date, end_date):
        return (
            db.query(EwayBill)
            .filter(
                EwayBill.ewb_dt >= start_date,
                EwayBill.ewb_dt <= end_date,
            )
            .order_by(EwayBill.ewb_dt.asc())
            .all()
        )

    @staticmethod
    def search(
        db: Session,
        vehicle_number: str | None = None,
        from_pin: int | None = None,
        to_pin: int | None = None,
    ):
        query = db.query(EwayBill)

        if vehicle_number:
            query = query.filter(EwayBill.vehicle_number == vehicle_number)

        if from_pin:
            query = query.filter(EwayBill.from_pin == from_pin)

        if to_pin:
            query = query.filter(EwayBill.to_pin == to_pin)

        return query.order_by(EwayBill.ewb_dt.asc()).all()