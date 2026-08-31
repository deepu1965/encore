"""GET /api/v1/inventory/{inventory_id} — per-seat status endpoint.

Week 8: Hot Inventory. Provides a fast, cache-backed read of a single
inventory row's status. Useful for front-ends that poll individual seat
availability after a hold or release event without loading the full event
seat list.

Cache-aside pattern:
  HIT  → inventory:{inventory_id}:status key in Redis (TTL_SEATS_SECONDS)
  MISS → read from DB, populate cache
  Redis down → always falls back to DB (NullCacheClient)

Write paths (holds.py, orders.py) invalidate this key on every transition
so staleness is bounded by TTL_SEATS_SECONDS (30 s) in the worst case.
"""

from __future__ import annotations

import uuid

from encore_cache import CacheClient, cache_aside
from encore_cache.helpers import TTL_SEATS_SECONDS, inventory_status_key
from encore_common import error_envelope, success_envelope
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..cache import get_cache
from ..db import get_db
from ..models import Inventory

router = APIRouter(prefix="/api/v1/inventory", tags=["inventory"])


@router.get("/{inventory_id}")
def get_inventory_status(
    inventory_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    cache: CacheClient = Depends(get_cache),
) -> dict:
    """Return the current status and price of a single inventory row.

    Response (200):
      {
        "data": {
          "inventory_id": "<uuid>",
          "status": "AVAILABLE" | "HELD" | "SOLD",
          "price_cents": <int>
        }
      }

    Response (404): inventory row not found.
    """
    request_id = getattr(request.state, "request_id", "")
    cache_key = inventory_status_key(str(inventory_id))

    def fallback() -> dict | None:
        row = db.get(Inventory, inventory_id)
        if row is None:
            return None
        return {
            "inventory_id": str(row.id),
            "status": row.status.value,
            "price_cents": row.price_cents,
        }

    import json
    payload = cache_aside(
        cache,
        cache_key,
        TTL_SEATS_SECONDS,
        fallback,
        serialize=json.dumps,
        deserialize=json.loads,
    )

    if payload is None:
        raise HTTPException(
            status_code=404,
            detail=error_envelope("INVENTORY_NOT_FOUND", "No such inventory row.", request_id),
        )

    return success_envelope(payload, request_id=request_id)
