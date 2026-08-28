"""Inventory event schemas."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

SEAT_HELD_EVENT_TYPE = "inventory.seat.held"
SEAT_HELD_TOPIC = "inventory.seat.held"
SEAT_HELD_VERSION = 1

SEAT_RELEASED_EVENT_TYPE = "inventory.seat.released"
SEAT_RELEASED_TOPIC = "inventory.seat.released"
SEAT_RELEASED_VERSION = 1

SEAT_HOLD_EXPIRED_EVENT_TYPE = "inventory.seat.hold_expired"
SEAT_HOLD_EXPIRED_TOPIC = "inventory.seat.hold_expired"
SEAT_HOLD_EXPIRED_VERSION = 1


@dataclass
class SeatHeldPayload:
    """Payload for inventory.seat.held events."""

    event_id: str
    seat_id: str
    inventory_id: str
    held_by_user_id: str
    held_at: str       # ISO 8601 UTC
    hold_expires_at: str  # ISO 8601 UTC (added Week 7)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "SeatHeldPayload":
        return cls(**data)


@dataclass
class SeatReleasedPayload:
    """Payload for inventory.seat.released (explicit user release via DELETE /holds/{id})."""

    event_id: str
    seat_id: str
    inventory_id: str
    released_by_user_id: str
    released_at: str   # ISO 8601 UTC

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "SeatReleasedPayload":
        return cls(**data)


@dataclass
class SeatHoldExpiredPayload:
    """Payload for inventory.seat.hold_expired (automated TTL expiry by the hold-expiry worker)."""

    event_id: str
    seat_id: str
    inventory_id: str
    was_held_by_user_id: str
    expired_at: str    # ISO 8601 UTC

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "SeatHoldExpiredPayload":
        return cls(**data)

