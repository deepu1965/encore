"""Pydantic schemas — request bodies and response shapes.

Response bodies are wrapped in encore_common's success_envelope /
error_envelope at the router layer (see docs/api/api-conventions.md
section 4); the models below describe the `data` payload only.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from .models import EventStatus, InventoryStatus, OrderStatus, TicketStatus, UserRole


class EventOut(BaseModel):
    id: uuid.UUID
    name: str
    venue_name: str
    city: str
    starts_at: datetime
    status: EventStatus
    description: str | None = None

    model_config = {"from_attributes": True}


class EventListOut(BaseModel):
    items: list[EventOut]
    next_cursor: str | None = None


class SeatOut(BaseModel):
    inventory_id: uuid.UUID
    seat_id: uuid.UUID
    section: str
    row_label: str
    seat_number: str
    status: InventoryStatus
    price_cents: int

    model_config = {"from_attributes": True}


class SeatListOut(BaseModel):
    event_id: uuid.UUID
    items: list[SeatOut]


class HoldCreate(BaseModel):
    event_id: uuid.UUID
    seat_id: uuid.UUID


class HoldOut(BaseModel):
    inventory_id: uuid.UUID
    event_id: uuid.UUID
    seat_id: uuid.UUID
    status: InventoryStatus
    held_by_user_id: uuid.UUID
    held_at: datetime
    hold_expires_at: datetime | None = None


class OrderCreate(BaseModel):
    event_id: uuid.UUID
    seat_id: uuid.UUID = Field(description="Seat must currently be HELD by the requesting user.")


class PaymentCreate(BaseModel):
    order_id: uuid.UUID = Field(description="Order ID to pay for. Must be in PENDING status.")


class TicketOut(BaseModel):
    id: uuid.UUID
    ticket_code: str
    status: TicketStatus
    seat_id: uuid.UUID

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    user_id: uuid.UUID
    status: OrderStatus
    total_cents: int
    created_at: datetime
    tickets: list[TicketOut]

    model_config = {"from_attributes": True}


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    display_name: str
    role: UserRole

    model_config = {"from_attributes": True}
