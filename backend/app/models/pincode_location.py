from datetime import datetime

from sqlalchemy import BigInteger, Double, String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class PincodeLocation(Base):
    __tablename__ = "pincode_locations"

    pin_code: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True
    )
    latitude: Mapped[float] = mapped_column(Double)
    longitude: Mapped[float] = mapped_column(Double)
    office_name: Mapped[str | None] = mapped_column(
        String(255)
    )
    district: Mapped[str | None] = mapped_column(
        String(150)
    )
    state: Mapped[str | None] = mapped_column(
        String(150)
    )
    region: Mapped[str | None] = mapped_column(
        String(150)
    )
    circle: Mapped[str | None] = mapped_column(
        String(150)
    )
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now()
    )