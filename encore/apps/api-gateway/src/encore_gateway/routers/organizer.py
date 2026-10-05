"""API Gateway Organizer Router.

Provides analytics, event administration, and inventory metrics for live event organizers.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from encore_common.envelope import error_envelope, success_envelope
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..db import get_db
from ..models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/organizer", tags=["organizer"])


class CreateEventPayload(BaseModel):
    name: str
    venue_id: uuid.UUID | None = None
    starts_at: str | None = None
    category: str | None = "Concert"


@router.get("/stats")
async def get_organizer_stats(
    request: Request,
    db: Session = Depends(get_db),
):
    row = db.execute(
        text(
            """
            SELECT 
                (SELECT coalesce(sum(total_cents), 0) FROM orders WHERE status = 'COMPLETED') as total_revenue_cents,
                (SELECT count(*) FROM tickets) as total_tickets_sold,
                (SELECT count(*) FROM events WHERE status IN ('ON_SALE', 'SCHEDULED')) as active_events_count
            """
        )
    ).mappings().first()

    rev = int(row["total_revenue_cents"]) if row else 0
    sold = int(row["total_tickets_sold"]) if row else 0
    active = int(row["active_events_count"]) if row else 0

    data = {
        "totalRevenueCents": rev,
        "total_revenue_cents": rev,
        "totalTicketsSold": sold,
        "total_tickets_sold": sold,
        "activeEventsCount": active,
        "active_events_count": active,
    }
    return success_envelope(data, getattr(request.state, "request_id", ""))


@router.get("/events")
async def get_organizer_events(
    request: Request,
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text(
            """
            SELECT e.id, e.name, v.name as venue_name, e.status, e.starts_at,
                   (SELECT count(*) FROM inventory i WHERE i.event_id = e.id AND i.status = 'SOLD') as tickets_sold,
                   (SELECT count(*) FROM inventory i WHERE i.event_id = e.id) as total_capacity,
                   (SELECT coalesce(sum(i.price_cents), 0) FROM inventory i WHERE i.event_id = e.id AND i.status = 'SOLD') as revenue_cents
            FROM events e
            JOIN venues v ON e.venue_id = v.id
            ORDER BY tickets_sold DESC, e.starts_at ASC
            LIMIT 50
            """
        )
    ).mappings().all()

    items = [
        {
            "id": str(r["id"]),
            "name": r["name"],
            "venueName": r["venue_name"],
            "venue_name": r["venue_name"],
            "status": r["status"],
            "date": r["starts_at"].isoformat() if r["starts_at"] else None,
            "starts_at": r["starts_at"].isoformat() if r["starts_at"] else None,
            "ticketsSold": int(r["tickets_sold"]),
            "tickets_sold": int(r["tickets_sold"]),
            "totalCapacity": int(r["total_capacity"]) if int(r["total_capacity"]) > 0 else 50,
            "total_capacity": int(r["total_capacity"]) if int(r["total_capacity"]) > 0 else 50,
            "revenueCents": int(r["revenue_cents"]),
            "revenue_cents": int(r["revenue_cents"]),
        }
        for r in rows
    ]
    return success_envelope({"items": items}, getattr(request.state, "request_id", ""))


@router.get("/events/{event_id}")
async def get_organizer_event(
    event_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    try:
        ev_uuid = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=error_envelope("INVALID_ID", "Invalid event ID", getattr(request.state, "request_id", "")),
        )

    row = db.execute(
        text(
            """
            SELECT e.id, e.name, v.name as venue_name, e.status, e.starts_at,
                   (SELECT count(*) FROM inventory i WHERE i.event_id = e.id AND i.status = 'SOLD') as tickets_sold,
                   (SELECT count(*) FROM inventory i WHERE i.event_id = e.id) as total_capacity,
                   (SELECT coalesce(sum(i.price_cents), 0) FROM inventory i WHERE i.event_id = e.id AND i.status = 'SOLD') as revenue_cents
            FROM events e
            JOIN venues v ON e.venue_id = v.id
            WHERE e.id = :event_id
            """
        ),
        {"event_id": ev_uuid},
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Event not found")

    data = {
        "id": str(row["id"]),
        "name": row["name"],
        "venueName": row["venue_name"],
        "venue_name": row["venue_name"],
        "status": row["status"],
        "date": row["starts_at"].isoformat() if row["starts_at"] else None,
        "starts_at": row["starts_at"].isoformat() if row["starts_at"] else None,
        "ticketsSold": int(row["tickets_sold"]),
        "tickets_sold": int(row["tickets_sold"]),
        "totalCapacity": int(row["total_capacity"]) if int(row["total_capacity"]) > 0 else 50,
        "total_capacity": int(row["total_capacity"]) if int(row["total_capacity"]) > 0 else 50,
        "revenueCents": int(row["revenue_cents"]),
        "revenue_cents": int(row["revenue_cents"]),
    }
    return success_envelope(data, getattr(request.state, "request_id", ""))
