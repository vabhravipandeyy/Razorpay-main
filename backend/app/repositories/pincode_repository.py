from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.pincode_location import PincodeLocation


class PincodeRepository:
    @staticmethod
    def get(
        db: Session,
        pin_code: int,
    ):
        return db.get(
            PincodeLocation,
            pin_code,
        )

    @staticmethod
    def save(
        db: Session,
        **kwargs,
    ):
        pin_code = kwargs.get("pin_code")
        if pin_code:
            existing = db.get(PincodeLocation, pin_code)
            if existing:
                return existing

        try:
            location = PincodeLocation(**kwargs)
            db.add(location)
            db.commit()
            db.refresh(location)
            return location
        except IntegrityError:
            db.rollback()
            return db.get(PincodeLocation, pin_code)
        except Exception as e:
            db.rollback()
            raise e