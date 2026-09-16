"""Queue endpoints: join and status.

POST /api/v1/waiting-room/{event_id}/join
    Adds the user to the queue (or returns their current state if already queued/admitted).
    Emits waitingroom.user.joined on new queue entries.

GET /api/v1/waiting-room/{event_id}/status
    Returns the user's current position or admission status (non-mutating).
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from encore_common import error_envelope, success_envelope
from encore_event_contracts import (
    WAITING_ROOM_JOINED_EVENT_TYPE,
    WAITING_ROOM_JOINED_TOPIC,
    WAITING_ROOM_JOINED_VERSION,
    WaitingRoomJoinedPayload,
)
from encore_id_generator import SnowflakeIDGenerator
from encore_kafka_client import KafkaEventProducer, build_envelope
from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import JSONResponse

from ..config import settings
from ..queue import WaitingRoomQueue

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/waiting-room", tags=["waiting-room"])

_id_gen = SnowflakeIDGenerator()


def _get_user_id(authorization: str) -> str:
    """Extract user ID from fake Bearer token (same pattern as api-gateway)."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Missing Bearer token."})  # noqa: E501
    user_id = authorization.removeprefix("Bearer ").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Empty Bearer token."})  # noqa: E501
    return user_id


def _queue_response(status, request_id: str) -> dict:
    """Build the standard waiting-room response payload."""
    estimated_wait_secs = 0
    if not status.admitted and status.position >= 0:
        # Rough estimate: (position / admission_batch_size) * interval_secs
        batches_to_wait = (status.position / max(settings.admission_batch_size, 1))
        estimated_wait_secs = int(batches_to_wait * settings.admission_interval_secs)

    return success_envelope(
        {
            "position": status.position,
            "queue_size": status.queue_size,
            "estimated_wait_secs": estimated_wait_secs,
            "admitted": status.admitted,
            "token": status.token,
        },
        request_id=request_id,
    )


@router.post("/{event_id}/join", status_code=201)
def join_queue(
    event_id: str,
    request: Request,
    authorization: str = Header(default=""),
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "")
    user_id = _get_user_id(authorization)

    if event_id not in settings.flash_sale_set:
        raise HTTPException(
            status_code=404,
            detail=error_envelope(
                "EVENT_NOT_FLASH_SALE",
                f"Event {event_id!r} is not a flash-sale event.",
                request_id,
            ),
        )

    queue: WaitingRoomQueue = request.app.state.queue
    was_queued_before = queue.get_status(event_id, user_id).position >= 0
    is_admitted_before = queue.get_status(event_id, user_id).admitted

    status = queue.join(event_id, user_id)

    # Emit joined event only on new queue entries (not re-joins or admitted users)
    if not is_admitted_before and not was_queued_before:
        producer: KafkaEventProducer | None = getattr(request.app.state, "kafka_producer", None)
        if producer is not None:
            now = datetime.now(UTC).isoformat(timespec="milliseconds")
            if now.endswith("+00:00"):
                now = now[:-6] + "Z"
            try:
                envelope = build_envelope(
                    event_type=WAITING_ROOM_JOINED_EVENT_TYPE,
                    event_version=WAITING_ROOM_JOINED_VERSION,
                    key=event_id,
                    payload=WaitingRoomJoinedPayload(
                        event_id=event_id,
                        user_id=user_id,
                        position=status.position,
                        queue_size=status.queue_size,
                        joined_at=now,
                    ).to_dict(),
                    producer_name="waiting-room",
                    trace_id=request_id,
                    id_generator=_id_gen,
                )
                producer.publish(WAITING_ROOM_JOINED_TOPIC, envelope)
            except Exception as exc:
                logger.warning("Failed to emit waiting-room joined event: %s", exc)

    return JSONResponse(status_code=201, content=_queue_response(status, request_id))


@router.get("/{event_id}/status")
def get_status(
    event_id: str,
    request: Request,
    authorization: str = Header(default=""),
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "")
    user_id = _get_user_id(authorization)

    if event_id not in settings.flash_sale_set:
        raise HTTPException(
            status_code=404,
            detail=error_envelope(
                "EVENT_NOT_FLASH_SALE",
                f"Event {event_id!r} is not a flash-sale event.",
                request_id,
            ),
        )

    queue: WaitingRoomQueue = request.app.state.queue
    status = queue.get_status(event_id, user_id)
    return JSONResponse(status_code=200, content=_queue_response(status, request_id))
