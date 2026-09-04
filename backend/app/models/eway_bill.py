from sqlalchemy import (
    Column,
    BigInteger,
    Integer,
    String,
    DECIMAL,
    DateTime
)

from app.core.base import Base


class EwayBill(Base):
    __tablename__ = "eway_bills"

    ewb_no = Column(BigInteger, primary_key=True)
    ewb_dt = Column(DateTime, nullable=False)
    from_pin = Column(Integer, nullable=False)
    to_pin = Column(Integer, nullable=False)
    travel_distance = Column(Integer, nullable=False)
    ewb_final_valid_dt = Column(DateTime, nullable=False)
    ewb_ass_amt = Column(DECIMAL(15, 2))
    cgst_amt = Column(DECIMAL(15, 2))
    sgst_amt = Column(DECIMAL(15, 2))
    igst_amt = Column(DECIMAL(15, 2))
    vehicle_number = Column(String(20), index=True)