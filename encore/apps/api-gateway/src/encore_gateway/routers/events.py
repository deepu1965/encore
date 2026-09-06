"""GET /api/v1/events, GET /api/v1/events/{event_id}/seats.

The "browse" step of docs/architecture/vertical-slice-plan.md. Public —
no auth required, matching api-conventions.md section 3 ("required on all
routes except /health and /events").
"""

from __future__ import annotations

import uuid

from encore_common import success_envelope
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session
from encore_cache import CacheClient, cache_aside, event_seats_key
from encore_cache.helpers import TTL_SEATS_SECONDS

from ..cache import get_cache
from ..db import get_db, get_db_read, get_shard_db
from ..models import Event, Inventory, Seat, Venue
from ..pagination import decode_cursor, encode_cursor
from ..schemas import EventListOut, EventOut, SeatListOut, SeatOut

router = APIRouter(prefix="/api/v1/events", tags=["events"])

DEFAULT_PAGE_SIZE = 20


@router.get("")
def list_events(
    request: Request,
    limit: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=100),
    cursor: str | None = Query(default=None),
    db: Session = Depends(get_db_read),
) -> dict:
    stmt = select(Event, Venue).join(Venue, Event.venue_id == Venue.id).order_by(
        Event.created_at.asc(), Event.id.asc()
    )

    if cursor:
        cursor_created_at, cursor_id = decode_cursor(cursor)
        stmt = stmt.where(
            (Event.created_at > cursor_created_at)
            | ((Event.created_at == cursor_created_at) & (Event.id > cursor_id))
        )

    rows = db.execute(stmt.limit(limit + 1)).all()

    has_more = len(rows) > limit
    rows = rows[:limit]

    items = [
        EventOut(
            id=event.id,
            name=event.name,
            venue_name=venue.name,
            city=venue.city,
            starts_at=event.starts_at,
            status=event.status,
        )
        for event, venue in rows
    ]

    next_cursor = None
    if has_more and rows:
        last_event, _ = rows[-1]
        next_cursor = encode_cursor(last_event.created_at, last_event.id)

    body = EventListOut(items=items, next_cursor=next_cursor)
    request_id = getattr(request.state, "request_id", "")
    return success_envelope(body.model_dump(mode="json"), request_id=request_id)


@router.get("/{event_id}/seats")
def list_event_seats(
    event_id: uuid.UUID,
    request: Request,
    cache: CacheClient = Depends(get_cache),
) -> dict:
    # Need to manually get the shard db session because Depends doesn't easily take arguments in FastAPI without a closure
    # We'll use a nested function to get it or just get it directly.
    def get_shard_session():
        from ..db import shard_manager
        return shard_manager.get_session(event_id)

    def fallback() -> dict | None:
        db = get_shard_session()
        try:
            # Note: We must also check if the event exists on the primary, but since we replicate Event to shards, we can check it there.
            event = db.get(Event, event_id)
            if event is None:
                return None

            stmt = (
                select(Inventory, Seat)
                .join(Seat, Inventory.seat_id == Seat.id)
                .where(Inventory.event_id == event_id)
                .order_by(Seat.section.asc(), Seat.row_label.asc(), Seat.seat_number.asc())
            )
            rows = db.execute(stmt).all()

            items = [
                SeatOut(
                    inventory_id=inv.id,
                    seat_id=seat.id,
                    section=seat.section,
                    row_label=seat.row_label,
                    seat_number=seat.seat_number,
                    status=inv.status,
                    price_cents=inv.price_cents,
                )
                for inv, seat in rows
            ]

            return SeatListOut(event_id=event_id, items=items).model_dump(mode="json")
        finally:
            db.close()

    cache_key = event_seats_key(str(event_id))
    payload = cache_aside(cache, cache_key, TTL_SEATS_SECONDS, fallback)

    if payload is None:
        raise HTTPException(status_code=404, detail={"code": "EVENT_NOT_FOUND"})

    request_id = getattr(request.state, "request_id", "")
    return success_envelope(payload, request_id=request_id)
