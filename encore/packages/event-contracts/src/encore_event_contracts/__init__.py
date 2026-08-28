"""Canonical Kafka event schemas and envelope for Encore services.

See docs/architecture/kafka-conventions.md for rules.
"""

from .envelope import EventEnvelope
from .events.inventory import (
    SEAT_HELD_EVENT_TYPE,
    SEAT_HELD_TOPIC,
    SEAT_HELD_VERSION,
    SeatHeldPayload,
)
from .events.order import (
    ORDER_COMPLETED_EVENT_TYPE,
    ORDER_COMPLETED_TOPIC,
    ORDER_COMPLETED_VERSION,
    OrderCompletedPayload,
)
from .events.waitingroom import (
    WAITING_ROOM_ADMITTED_EVENT_TYPE,
    WAITING_ROOM_ADMITTED_TOPIC,
    WAITING_ROOM_ADMITTED_VERSION,
    WAITING_ROOM_JOINED_EVENT_TYPE,
    WAITING_ROOM_JOINED_TOPIC,
    WAITING_ROOM_JOINED_VERSION,
    WaitingRoomAdmittedPayload,
    WaitingRoomJoinedPayload,
)

__all__ = [
    "EventEnvelope",
    "SEAT_HELD_EVENT_TYPE",
    "SEAT_HELD_TOPIC",
    "SEAT_HELD_VERSION",
    "SeatHeldPayload",
    "ORDER_COMPLETED_EVENT_TYPE",
    "ORDER_COMPLETED_TOPIC",
    "ORDER_COMPLETED_VERSION",
    "OrderCompletedPayload",
    "WAITING_ROOM_JOINED_EVENT_TYPE",
    "WAITING_ROOM_JOINED_TOPIC",
    "WAITING_ROOM_JOINED_VERSION",
    "WaitingRoomJoinedPayload",
    "WAITING_ROOM_ADMITTED_EVENT_TYPE",
    "WAITING_ROOM_ADMITTED_TOPIC",
    "WAITING_ROOM_ADMITTED_VERSION",
    "WaitingRoomAdmittedPayload",
]

