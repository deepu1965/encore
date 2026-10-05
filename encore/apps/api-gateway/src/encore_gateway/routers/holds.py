"""POST /api/v1/holds — create a seat hold.
DELETE /api/v1/holds/{inventory_id} — release a seat hold.

The "select seat" step of docs/architecture/vertical-slice-plan.md.

Week 7: SELECT ... FOR UPDATE (pessimistic locking baseline — ADR-0010).
Week 8: Redis SETNX fast-path guard before the Postgres lock (ADR-0011).
  - SETNX eliminates DB lock contention for the 99% case (seat already held).
  - Postgres FOR UPDATE remains the authoritative correctness guarantee.
  - If Redis is down, the Postgres lock catches all races (graceful degradation).

Idempotency-Key is enforced per docs/api/api-conventions.md sections 3/7 —
POST /holds is explicitly listed as a required-idempotency endpoint.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from uuid import UUID

from encore_cache import CacheClient, event_seats_key, hold_key, invalidate, inventory_status_key
from encore_common import error_envelope, success_envelope
from encore_event_contracts import (
    SEAT_HELD_EVENT_TYPE,
    SEAT_HELD_TOPIC,
    SEAT_HELD_VERSION,
    SEAT_RELEASED_EVENT_TYPE,
    SEAT_RELEASED_TOPIC,
    SEAT_RELEASED_VERSION,
    SeatHeldPayload,
    SeatReleasedPayload,
)
from encore_id_generator import SnowflakeIDGenerator
from encore_kafka_client import build_envelope
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..cache import get_cache
from ..config import settings
from ..domain.inventory_state import InventoryStatus as DomainInventoryStatus
from ..domain.inventory_state import can_hold, can_release
from ..idempotency import get_idempotent_response, save_idempotent_response
from ..models import Inventory, InventoryStatus, User
from ..schemas import HoldCreate, HoldOut

router = APIRouter(prefix="/api/v1/holds", tags=["holds"])

ENDPOINT_NAME = "POST /api/v1/holds"
_id_gen = SnowflakeIDGenerator()


def _validate_waiting_room_token(
    event_id: str,
    token: str | None,
    cache: CacheClient,
    request_id: str,
) -> None:
    """Validate the X-Waiting-Room-Token for flash-sale events.

    Atomically consumes the token (GETDEL) — single-use. If the token is
    missing, invalid, or already used, raises HTTPException 403.

    Direct Redis read shortcut: the api-gateway reads the waiting-room's
    Redis keys directly (shared Redis instance). See ADR-0009 for the
    migration path to a proper inter-service API call at Week 17+.
    """
    if str(event_id) not in settings.flash_sale_set:
        return  # event is not a flash sale — no token required

    if not token:
        raise HTTPException(
            status_code=403,
            detail=error_envelope(
                "WAITING_ROOM_TOKEN_REQUIRED",
                "This event requires a waiting-room admission token. "
                "Join the queue at POST /api/v1/waiting-room/{event_id}/join.",
                request_id,
            ),
        )

    # Atomically consume (GETDEL) the single-use token from shared Redis.
    token_key = f"waiting:token:{token}"
    token_data: str | None = None

    if hasattr(cache, "_redis") and cache._redis is not None:  # noqa: SLF001
        raw = cache._redis.getdel(token_key)
        token_data = str(raw) if raw is not None else None
    else:
        # NullCacheClient (no Redis) — fail open in test/dev contexts without
        # a real Redis. Document this path clearly; it should never occur in
        # production because the api-gateway startup always tries Redis first.
        return

    if token_data is None:
        raise HTTPException(
            status_code=403,
            detail=error_envelope(
                "WAITING_ROOM_TOKEN_INVALID",
                "Waiting-room token is invalid, expired, or already used.",
                request_id,
            ),
        )

def get_shard_db_for_hold(payload: HoldCreate):
    from ..db import shard_manager
    db = shard_manager.get_session(payload.event_id)
    try:
        yield db
    finally:
        db.close()

@router.post("", status_code=201)
def create_hold(
    payload: HoldCreate,
    request: Request,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    waiting_room_token: str | None = Header(default=None, alias="X-Waiting-Room-Token"),
    db: Session = Depends(get_shard_db_for_hold),
    current_user: User = Depends(get_current_user),
    cache: CacheClient = Depends(get_cache),
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "")

    # --- Waiting-room admission guard (Week 6) ---
    _validate_waiting_room_token(
        str(payload.event_id),
        waiting_room_token,
        cache,
        request_id=request_id,
    )

    if not idempotency_key:
        raise HTTPException(
            status_code=400,
            detail=error_envelope(
                "MISSING_IDEMPOTENCY_KEY", "Idempotency-Key header is required.", request_id
            ),
        )

    existing = get_idempotent_response(db, idempotency_key, ENDPOINT_NAME)
    if existing is not None:
        return JSONResponse(status_code=existing.status_code, content=json.loads(existing.response_json))  # noqa: E501

    # --- Week 8: Redis SETNX fast-path guard ---
    # Attempt to acquire a per-seat lock BEFORE the Postgres SELECT FOR UPDATE.
    # If another user already holds the Redis key → 409 immediately, no DB lock acquired.
    # If Redis is unavailable (NullCacheClient) → skip, correctness falls back to Postgres.
    _redis_lock_key = hold_key(str(payload.event_id), str(payload.seat_id))
    _acquired_redis_lock = False
    _redis = getattr(cache, "_redis", None)
    if _redis is not None:
        acquired = _redis.set(
            _redis_lock_key,
            str(current_user.id),
            nx=True,
            ex=settings.hold_ttl_seconds,
        )
        if not acquired:
            body = error_envelope("SEAT_ALREADY_HELD", "Seat is already held.", request_id)
            save_idempotent_response(db, idempotency_key, ENDPOINT_NAME, 409, body)
            db.commit()
            return JSONResponse(status_code=409, content=body)
        _acquired_redis_lock = True

    # Week 7: Use SELECT ... FOR UPDATE to acquire a row-level exclusive lock.
    # We do NOT use SKIP LOCKED here — if another concurrent request is holding the lock,
    # we want to wait (briefly) and then correctly return 409 SEAT_ALREADY_HELD.
    inventory_row = db.execute(
        select(Inventory)
        .where(
            Inventory.event_id == payload.event_id,
            Inventory.seat_id == payload.seat_id,
        )
        .with_for_update()
    ).scalar_one_or_none()

    if inventory_row is None:
        if _acquired_redis_lock and _redis is not None:
            _redis.delete(_redis_lock_key)  # compensate: release the lock we took
        raise HTTPException(
            status_code=404, detail=error_envelope("SEAT_NOT_FOUND", "No such seat for this event.", request_id)  # noqa: E501
        )

    now = datetime.now(UTC)
    if (
        inventory_row.status == InventoryStatus.HELD
        and inventory_row.hold_expires_at is not None
        and inventory_row.hold_expires_at < now
    ):
        inventory_row.status = InventoryStatus.AVAILABLE
        inventory_row.held_by_user_id = None
        inventory_row.held_at = None
        inventory_row.hold_expires_at = None

    # --- Week 8: If domain check fails, release the Redis lock (compensating action) ---
    transition = can_hold(DomainInventoryStatus(inventory_row.status.value))
    if not transition.allowed:
        if _acquired_redis_lock and _redis is not None:
            _redis.delete(_redis_lock_key)
        body = error_envelope(transition.reason, "Seat is not available to hold.", request_id)
        save_idempotent_response(db, idempotency_key, ENDPOINT_NAME, 409, body)
        db.commit()
        return JSONResponse(status_code=409, content=body)

    now = datetime.now(UTC)
    expires_at = now + timedelta(minutes=settings.hold_ttl_minutes)

    # Week 7: Direct mutation within the locked transaction
    inventory_row.status = InventoryStatus.HELD
    inventory_row.held_by_user_id = current_user.id
    inventory_row.held_at = now
    inventory_row.hold_expires_at = expires_at

    hold_out = HoldOut(
        inventory_id=inventory_row.id,
        event_id=payload.event_id,
        seat_id=payload.seat_id,
        status=InventoryStatus.HELD,
        held_by_user_id=current_user.id,
        held_at=now,
        hold_expires_at=expires_at,
    )
    body = success_envelope(hold_out.model_dump(mode="json"), request_id=request_id)

    save_idempotent_response(db, idempotency_key, ENDPOINT_NAME, 201, body)
    db.commit()

    # --- Week 8: Update per-seat status cache after successful commit ---
    if _redis is not None:
        try:
            _redis.set(
                inventory_status_key(str(inventory_row.id)),
                InventoryStatus.HELD.value,
                ex=settings.hold_ttl_seconds,
            )
        except Exception:
            pass  # Cache write failure never blocks the response

    # Invalidate the seats list cache
    invalidate(cache, event_seats_key(str(payload.event_id)))

    # --- Emit Kafka event (Week 5) ---
    producer = getattr(request.app.state, "kafka_producer", None)
    if producer is not None:
        envelope = build_envelope(
            event_type=SEAT_HELD_EVENT_TYPE,
            event_version=SEAT_HELD_VERSION,
            key=str(payload.event_id),  # Partition by event_id
            payload=SeatHeldPayload(
                event_id=str(payload.event_id),
                seat_id=str(payload.seat_id),
                inventory_id=str(inventory_row.id),
                held_by_user_id=str(current_user.id),
                held_at=now.isoformat(),
                hold_expires_at=expires_at.isoformat(),
            ).to_dict(),
            producer_name=request.app.state.kafka_producer.producer_name,
            trace_id=request_id,
            id_generator=_id_gen,
        )
        producer.publish(SEAT_HELD_TOPIC, envelope)

    return JSONResponse(status_code=201, content=body)


@router.delete("/{inventory_id}", status_code=200)
def release_hold(
    inventory_id: UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    cache: CacheClient = Depends(get_cache),
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "")
    from ..db import shard_manager

    # Scatter-gather across shards to find the inventory row
    inventory_row = None
    db = None
    for session_factory in shard_manager.session_factories:
        test_db = session_factory()
        inventory_row = test_db.execute(
            select(Inventory).where(Inventory.id == inventory_id).with_for_update()
        ).scalar_one_or_none()
        
        if inventory_row is not None:
            db = test_db
            break
        else:
            test_db.close()

    if inventory_row is None:
        raise HTTPException(
            status_code=404,
            detail=error_envelope("SEAT_NOT_FOUND", "No such seat.", request_id)
        )

    # 2. Domain check
    transition = can_release(
        current_status=DomainInventoryStatus(inventory_row.status.value),
        held_by_user_id=inventory_row.held_by_user_id,
        requesting_user_id=current_user.id,
    )
    if not transition.allowed:
        db.rollback()
        raise HTTPException(
            status_code=409 if transition.reason != "HOLD_NOT_OWNED_BY_USER" else 403,
            detail=error_envelope(transition.reason, "Cannot release hold.", request_id)
        )

    event_id = inventory_row.event_id
    seat_id = inventory_row.seat_id

    # 3. Release
    inventory_row.status = InventoryStatus.AVAILABLE
    inventory_row.held_by_user_id = None
    inventory_row.held_at = None
    inventory_row.hold_expires_at = None
    db.commit()

    # 4. Cache invalidate (seats list + individual status + Redis SETNX lock)
    _redis = getattr(cache, "_redis", None)
    invalidate(cache, event_seats_key(str(event_id)))
    if _redis is not None:
        try:
            _redis.delete(
                hold_key(str(event_id), str(seat_id)),
                inventory_status_key(str(inventory_id)),
            )
        except Exception:
            pass  # Redis failure never blocks the release

    # 5. Emit Kafka event
    producer = getattr(request.app.state, "kafka_producer", None)
    if producer is not None:
        now_str = datetime.now(UTC).isoformat()
        envelope = build_envelope(
            event_type=SEAT_RELEASED_EVENT_TYPE,
            event_version=SEAT_RELEASED_VERSION,
            key=str(event_id),
            payload=SeatReleasedPayload(
                event_id=str(event_id),
                seat_id=str(seat_id),
                inventory_id=str(inventory_id),
                released_by_user_id=str(current_user.id),
                released_at=now_str,
            ).to_dict(),
            producer_name=request.app.state.kafka_producer.producer_name,
            trace_id=request_id,
            id_generator=_id_gen,
        )
        producer.publish(SEAT_RELEASED_TOPIC, envelope)

    try:
        return JSONResponse(
            status_code=200,
            content=success_envelope({"inventory_id": str(inventory_id), "released": True}, request_id)  # noqa: E501
        )
    finally:
        if db is not None:
            db.close()
