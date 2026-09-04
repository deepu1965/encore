"""ORM models for the Week 2 schema.

Six tables were explicitly named in the Week 2 plan: User, Event, Venue,
Seat, Inventory, Order. A seventh, `tickets`, is added because the vertical
slice's acceptance criteria (docs/architecture/vertical-slice-plan.md)
require a persisted ticket record, not just an order — "mock order -> mock
ticket" needs somewhere to put the ticket.

ID strategy: UUID primary keys everywhere, generated in Python
(`uuid4()`), NOT a Postgres SERIAL. This is a deliberate placeholder —
docs/architecture/vertical-slice-plan.md's mock table says the real
Snowflake-style distributed ID generator (packages/id-generator) lands
Week 4 and replaces this. UUID is chosen over SERIAL specifically because
it's the closer placeholder: both are opaque/non-sequential from the
client's perspective, unlike an auto-increment int which would encourage
callers to (wrongly) assume sequential/guessable IDs.

Known, tracked simplification: `Inventory.status` is mutated with a plain
UPDATE (see routers/holds.py, routers/orders.py) — no `SELECT ... FOR
UPDATE`, no TTL-based expiry. This is intentional and documented in
docs/architecture/vertical-slice-plan.md's "what is explicitly mocked"
table; the race condition it implies is closed in Week 7-8 (Inventory
Core, Hot Inventory), not here.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def _uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


class AuditEventType(str, enum.Enum):
    ISSUED = "ISSUED"
    TRANSFERRED = "TRANSFERRED"
    REVOKED = "REVOKED"


class UserRole(str, enum.Enum):
    BUYER = "BUYER"
    ORGANIZER = "ORGANIZER"
    ADMIN = "ADMIN"


class EventStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    ON_SALE = "ON_SALE"
    SOLD_OUT = "SOLD_OUT"
    CANCELLED = "CANCELLED"


class InventoryStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    HELD = "HELD"
    SOLD = "SOLD"


class OrderStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    EXPIRED = "EXPIRED"


class TicketStatus(str, enum.Enum):
    ISSUED = "ISSUED"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = _uuid_pk()
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"), nullable=False, default=UserRole.BUYER
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Venue(Base):
    __tablename__ = "venues"

    id: Mapped[uuid.UUID] = _uuid_pk()
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    city: Mapped[str] = mapped_column(String(255), nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="UTC")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    seats: Mapped[list["Seat"]] = relationship(back_populates="venue")
    events: Mapped[list["Event"]] = relationship(back_populates="venue")


class Event(Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = _uuid_pk()
    venue_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("venues.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[EventStatus] = mapped_column(
        Enum(EventStatus, name="event_status"), nullable=False, default=EventStatus.SCHEDULED
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    venue: Mapped["Venue"] = relationship(back_populates="events")
    inventory_rows: Mapped[list["Inventory"]] = relationship(back_populates="event")


class Seat(Base):
    __tablename__ = "seats"
    __table_args__ = (
        UniqueConstraint("venue_id", "section", "row_label", "seat_number", name="uq_seat_physical"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    venue_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("venues.id"), nullable=False, index=True
    )
    section: Mapped[str] = mapped_column(String(64), nullable=False)
    row_label: Mapped[str] = mapped_column(String(16), nullable=False)
    seat_number: Mapped[str] = mapped_column(String(16), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    venue: Mapped["Venue"] = relationship(back_populates="seats")


class Inventory(Base):
    """The hot row: one per (event, seat). See docs/architecture/v1-scope-freeze.md
    section 6 — this table is the entire reason the rest of the system exists."""

    __tablename__ = "inventory"
    __table_args__ = (UniqueConstraint("event_id", "seat_id", name="uq_inventory_event_seat"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    event_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("events.id"), nullable=False, index=True
    )
    seat_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("seats.id"), nullable=False, index=True
    )
    status: Mapped[InventoryStatus] = mapped_column(
        Enum(InventoryStatus, name="inventory_status"),
        nullable=False,
        default=InventoryStatus.AVAILABLE,
        index=True,
    )
    price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    held_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    held_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    hold_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    event: Mapped["Event"] = relationship(back_populates="inventory_rows")
    seat: Mapped["Seat"] = relationship()


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("events.id"), nullable=False, index=True
    )
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, name="order_status"), nullable=False, default=OrderStatus.PENDING
    )
    total_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    tickets: Mapped[list["Ticket"]] = relationship(back_populates="order")


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[uuid.UUID] = _uuid_pk()
    order_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False, index=True
    )
    inventory_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("inventory.id"), unique=True, nullable=False
    )
    ticket_code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    status: Mapped[TicketStatus] = mapped_column(
        Enum(TicketStatus, name="ticket_status"), nullable=False, default=TicketStatus.ISSUED
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    order: Mapped["Order"] = relationship(back_populates="tickets")


class IdempotencyRecord(Base):
    """Generic idempotency store for mutating endpoints (POST /holds, POST /orders).

    See docs/api/api-conventions.md section 3 — same Idempotency-Key + same
    endpoint within 24h returns the original result instead of re-executing.
    24h expiry isn't enforced yet (no TTL cleanup job until the scheduler
    exists, Week 23) — tracked, not silently ignored.
    """

    __tablename__ = "idempotency_records"

    key: Mapped[str] = mapped_column(String(255), primary_key=True)
    endpoint: Mapped[str] = mapped_column(String(255), primary_key=True)
    status_code: Mapped[int] = mapped_column(Integer, nullable=False)
    response_json: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = _uuid_pk()
    ticket_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False, index=True)
    event_type: Mapped[AuditEventType] = mapped_column(
        Enum(AuditEventType, name="audit_event_type"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False, index=True)
    previous_owner_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    new_owner_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
