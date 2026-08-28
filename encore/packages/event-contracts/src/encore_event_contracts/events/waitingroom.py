"""Waiting-room event schemas."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

WAITING_ROOM_JOINED_EVENT_TYPE = "waitingroom.user.joined"
WAITING_ROOM_JOINED_TOPIC = "waitingroom.user.joined"
WAITING_ROOM_JOINED_VERSION = 1

WAITING_ROOM_ADMITTED_EVENT_TYPE = "waitingroom.user.admitted"
WAITING_ROOM_ADMITTED_TOPIC = "waitingroom.user.admitted"
WAITING_ROOM_ADMITTED_VERSION = 1


@dataclass
class WaitingRoomJoinedPayload:
    """Payload for waitingroom.user.joined events.

    Emitted by the waiting-room service immediately when a user joins the queue.
    Consumed by notification-service (Week 13) to send a "you're in the queue" notification.
    """

    event_id: str    # the flash-sale venue event the user wants tickets for
    user_id: str
    position: int    # 0-based rank in the queue at join time
    queue_size: int  # total users in queue at join time
    joined_at: str   # ISO 8601 UTC

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "WaitingRoomJoinedPayload":
        return cls(**data)


@dataclass
class WaitingRoomAdmittedPayload:
    """Payload for waitingroom.user.admitted events.

    Emitted by the admission ticker each time a user is admitted from the queue.
    Consumed by notification-service (Week 13) to send a "you're admitted, act fast" notification.
    """

    event_id: str    # the flash-sale venue event
    user_id: str
    admitted_at: str  # ISO 8601 UTC

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "WaitingRoomAdmittedPayload":
        return cls(**data)
