"""POST /api/v1/holds.

The "select seat" step of docs/architecture/vertical-slice-plan.md.

KNOWN, TRACKED SIMPLIFICATION: this uses a plain UPDATE ... WHERE
status='AVAILABLE', not `SELECT ... FOR UPDATE` and not a TTL-based
expiry. Two concurrent requests for the same seat can both read
AVAILABLE before either UPDATE commits, so — unlike the WHERE clause
below — this is not actually race-proof under real concurrency yet. That
race is exactly what Weeks 7-8 (Inventory Core, Hot Inventory) close, with
load-test evidence. Recorded here, not hidden: see
docs/architecture/vertical-slice-plan.md's "what is explicitly mocked"
table and ADR-0003.

Idempotency-Key is enforced per docs/api/api-conventions.md sections 3/7 —
POST /holds is explicitly listed as a required-idempotency endpoint.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

from encore_common import error_envelope, success_envelope
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..db import get_db
from ..domain.inventory_state import InventoryStatus as DomainInventoryStatus
from ..domain.inventory_state import can_hold
from ..idempotency import get_idempotent_response, save_idempotent_response
from ..models import Inventory, InventoryStatus, User
from ..schemas import HoldCreate, HoldOut

router = APIRouter(prefix="/api/v1/holds", tags=["holds"])

ENDPOINT_NAME = "POST /api/v1/holds"


from encore_cache import CacheClient, event_seats_key, invalidate
from ..cache import get_cache

# ...

@router.post("", status_code=201)
def create_hold(
    payload: HoldCreate,
    request: Request,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    cache: CacheClient = Depends(get_cache),
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "")

    if not idempotency_key:
        raise HTTPException(
            status_code=400,
            detail=error_envelope(
                "MISSING_IDEMPOTENCY_KEY", "Idempotency-Key header is required.", request_id
            ),
        )

    existing = get_idempotent_response(db, idempotency_key, ENDPOINT_NAME)
    if existing is not None:
        return JSONResponse(status_code=existing.status_code, content=json.loads(existing.response_json))

    inventory_row = db.execute(
        select(Inventory).where(
            Inventory.event_id == payload.event_id, Inventory.seat_id == payload.seat_id
        )
    ).scalar_one_or_none()

    if inventory_row is None:
        raise HTTPException(
            status_code=404, detail=error_envelope("SEAT_NOT_FOUND", "No such seat for this event.", request_id)
        )

    transition = can_hold(DomainInventoryStatus(inventory_row.status.value))
    if not transition.allowed:
        body = error_envelope(transition.reason, "Seat is not available to hold.", request_id)
        save_idempotent_response(db, idempotency_key, ENDPOINT_NAME, 409, body)
        db.commit()
        return JSONResponse(status_code=409, content=body)

    now = datetime.now(timezone.utc)

    # Plain UPDATE, scoped by status='AVAILABLE' as a best-effort guard —
    # see module docstring for why this is not sufficient under real
    # concurrency yet.
    result = db.execute(
        update(Inventory)
        .where(Inventory.id == inventory_row.id, Inventory.status == InventoryStatus.AVAILABLE)
        .values(status=InventoryStatus.HELD, held_by_user_id=current_user.id, held_at=now)
    )

    if result.rowcount == 0:
        # Lost the race between our read above and this UPDATE.
        db.rollback()
        body = error_envelope("SEAT_ALREADY_HELD", "Seat was held by another request.", request_id)
        return JSONResponse(status_code=409, content=body)

    hold_out = HoldOut(
        inventory_id=inventory_row.id,
        event_id=payload.event_id,
        seat_id=payload.seat_id,
        status=InventoryStatus.HELD,
        held_by_user_id=current_user.id,
        held_at=now,
    )
    body = success_envelope(hold_out.model_dump(mode="json"), request_id=request_id)

    save_idempotent_response(db, idempotency_key, ENDPOINT_NAME, 201, body)
    db.commit()

    # Invalidate the seats cache for this event so subsequent reads see the hold
    invalidate(cache, event_seats_key(str(payload.event_id)))

    return JSONResponse(status_code=201, content=body)
