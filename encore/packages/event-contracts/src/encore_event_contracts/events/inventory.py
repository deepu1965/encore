"""Inventory event schemas."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

SEAT_HELD_EVENT_TYPE = "inventory.seat.held"
SEAT_HELD_TOPIC = "inventory.seat.held"
SEAT_HELD_VERSION = 1


@dataclass
class SeatHeldPayload:
    """Payload for inventory.seat.held events."""

    event_id: str
    seat_id: str
    inventory_id: str
    held_by_user_id: str
    held_at: str  # ISO 8601 UTC

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "SeatHeldPayload":
        return cls(**data)
