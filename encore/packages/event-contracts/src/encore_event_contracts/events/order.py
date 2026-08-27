"""Order event schemas."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

ORDER_COMPLETED_EVENT_TYPE = "order.completed"
ORDER_COMPLETED_TOPIC = "order.completed"
ORDER_COMPLETED_VERSION = 1


@dataclass
class OrderCompletedPayload:
    """Payload for order.completed events."""

    order_id: str
    user_id: str
    event_id: str
    seat_id: str
    total_cents: int
    ticket_id: str
    ticket_code: str
    completed_at: str  # ISO 8601 UTC

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "OrderCompletedPayload":
        return cls(**data)
