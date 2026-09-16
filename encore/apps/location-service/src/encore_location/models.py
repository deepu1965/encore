import uuid
from datetime import datetime
from typing import Any

from geoalchemy2 import Geometry
from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from encore_location.db import Base


class Venue(Base):
    __tablename__ = "venues"
    # Overriding to avoid issues if other columns exist but aren't needed here
    __table_args__ = {'extend_existing': True}

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[Any] = mapped_column(Geometry("POINT", srid=4326), nullable=True)

class Event(Base):
    __tablename__ = "events"
    __table_args__ = {'extend_existing': True}

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    venue_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("venues.id"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    venue: Mapped["Venue"] = relationship()

class UserFollow(Base):
    __tablename__ = "user_follows"
    __table_args__ = {'extend_existing': True}

    follower_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    organizer_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
