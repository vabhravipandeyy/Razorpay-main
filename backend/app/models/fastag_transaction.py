from sqlalchemy import (
    Column,
    Integer,
    BigInteger,
    String,
    DECIMAL,
    DateTime
)

from app.core.base import Base


class FastagTransaction(Base):
    __tablename__ = "fastag_transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    toll_id = Column(BigInteger)
    toll_name = Column(String(255))
    highway_type = Column(String(20))
    geo_lat = Column(DECIMAL(10, 6))
    geo_long = Column(DECIMAL(10, 6))
    updated_at_npci = Column(DateTime)
    status = Column(String(1))
    toll = Column(BigInteger)
    readertme = Column(DateTime, index=True)
    veh = Column(String(20), index=True)