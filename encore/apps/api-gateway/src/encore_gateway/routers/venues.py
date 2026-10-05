"""API Gateway Venues Router.

Provides venue directory, detail queries, and venue-specific event listings.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from encore_common.envelope import error_envelope, success_envelope
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from ..db import get_db, get_db_read
from ..models import Event, EventStatus, Seat, Venue

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/venues", tags=["venues"])


class VenueOut(BaseModel):
    id: uuid.UUID
    name: str
    city: str
    timezone: str
    capacity: int
    address: str | None = None
    upcoming_events_count: int = 0
    image_url: str | None = None


# Curated venue showcase imagery
VENUE_IMAGES: dict[str, str] = {
    "Ahmedabad": "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&auto=format&fit=crop&q=80",
    "Mumbai": "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&auto=format&fit=crop&q=80",
    "Delhi": "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80",
    "Bengaluru": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80",
    "Kolkata": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80",
    "Chennai": "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&auto=format&fit=crop&q=80",
    "Hyderabad": "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80",
}
DEFAULT_VENUE_IMG = "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&auto=format&fit=crop&q=80"


@router.get("")
@router.get("/")
def list_venues(
    request: Request,
    city: str | None = None,
    db: Session = Depends(get_db_read),
) -> dict:
    """List all venues with active event counts and seating capacities."""
    query = (
        select(
            Venue.id,
            Venue.name,
            Venue.city,
            Venue.timezone,
            func.count(Event.id).label("upcoming_events_count"),
        )
        .outerjoin(
            Event,
            (Event.venue_id == Venue.id) & (Event.status == EventStatus.SCHEDULED),
        )
        .group_by(Venue.id, Venue.name, Venue.city, Venue.timezone)
    )

    if city and city.lower() != "all":
        query = query.where(func.lower(Venue.city) == city.lower())

    query = query.order_by(Venue.city.asc(), Venue.name.asc())
    rows = db.execute(query).all()

    items = []
    for r in rows:
        v_id, name, v_city, tz, ev_count = r
        img = VENUE_IMAGES.get(v_city, DEFAULT_VENUE_IMG)
        items.append(
            {
                "id": str(v_id),
                "name": name,
                "city": v_city,
                "timezone": tz,
                "capacity": 35000 if "Stadium" in name or "Arena" in name else 12500,
                "address": f"{name}, {v_city}, India",
                "upcoming_events_count": ev_count,
                "image_url": img,
            }
        )

    return success_envelope(
        {"items": items, "total": len(items)},
        request_id=getattr(request.state, "request_id", ""),
    )


@router.get("/{venue_id}")
def get_venue(
    venue_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db_read),
) -> dict:
    """Fetch detailed venue metadata."""
    venue = db.get(Venue, venue_id)
    if not venue:
        raise HTTPException(
            status_code=404,
            detail=error_envelope(
                "VENUE_NOT_FOUND",
                f"Venue {venue_id} not found",
                request_id=getattr(request.state, "request_id", ""),
            ),
        )

    ev_count = (
        db.execute(
            select(func.count(Event.id)).where(
                Event.venue_id == venue_id,
                Event.status == EventStatus.SCHEDULED,
            )
        ).scalar()
        or 0
    )

    img = VENUE_IMAGES.get(venue.city, DEFAULT_VENUE_IMG)
    data = {
        "id": str(venue.id),
        "name": venue.name,
        "city": venue.city,
        "timezone": venue.timezone,
        "capacity": 35000 if "Stadium" in venue.name or "Arena" in venue.name else 12500,
        "address": f"{venue.name}, {venue.city}, India",
        "upcoming_events_count": ev_count,
        "image_url": img,
    }

    return success_envelope(data, request_id=getattr(request.state, "request_id", ""))


@router.get("/{venue_id}/events")
def list_venue_events(
    venue_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db_read),
) -> dict:
    """Fetch upcoming scheduled events at this venue."""
    venue = db.get(Venue, venue_id)
    if not venue:
        raise HTTPException(
            status_code=404,
            detail=error_envelope(
                "VENUE_NOT_FOUND",
                f"Venue {venue_id} not found",
                request_id=getattr(request.state, "request_id", ""),
            ),
        )

    stmt = (
        select(Event)
        .where(
            Event.venue_id == venue_id,
            Event.status == EventStatus.SCHEDULED,
        )
        .order_by(Event.starts_at.asc())
    )
    events = db.execute(stmt).scalars().all()

    items = [
        {
            "id": str(e.id),
            "name": e.name,
            "venue_id": str(venue.id),
            "venue_name": venue.name,
            "city": venue.city,
            "starts_at": e.starts_at.isoformat() if e.starts_at else None,
            "status": e.status.value,
            "description": e.description,
            "min_price_cents": 4500,
        }
        for e in events
    ]

    return success_envelope(
        {"items": items, "total": len(items)},
        request_id=getattr(request.state, "request_id", ""),
    )
