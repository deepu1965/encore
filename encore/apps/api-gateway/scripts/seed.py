"""Seed data for local dev / manual testing of the vertical slice.

Run with: `python -m scripts.seed` from apps/api-gateway (after migrations
have been applied). Idempotent-ish: re-running skips creation if the demo
venue already exists, rather than erroring or duplicating rows.

Creates:
- 1 demo user (id printed at the end — use it as the Bearer token per
  auth.py's Week 2 shortcut)
- 1 venue, 1 event
- 20 seats (2 sections x 10 seats) with inventory rows, all AVAILABLE

This is exactly enough data to exercise the full vertical slice:
GET /events -> GET /events/{id}/seats -> POST /holds -> POST /orders ->
GET /orders/{id}.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from encore_gateway.db import SessionLocal
from encore_gateway.models import Event, EventStatus, Inventory, InventoryStatus, Seat, User, UserRole, Venue

DEMO_VENUE_NAME = "Encore Arena"


def seed() -> None:
    db = SessionLocal()
    try:
        existing = db.query(Venue).filter_by(name=DEMO_VENUE_NAME).one_or_none()
        if existing is not None:
            print(f"Seed data already present (venue id={existing.id}). Skipping.")
            return

        user = User(
            id=uuid.uuid4(),
            email="demo.buyer@example.com",
            display_name="Demo Buyer",
            role=UserRole.BUYER,
        )
        db.add(user)

        venue = Venue(id=uuid.uuid4(), name=DEMO_VENUE_NAME, city="Hyderabad", timezone="Asia/Kolkata")
        db.add(venue)

        event = Event(
            id=uuid.uuid4(),
            venue_id=venue.id,
            name="Encore Launch Night",
            starts_at=datetime.now(timezone.utc) + timedelta(days=30),
            status=EventStatus.ON_SALE,
        )
        db.add(event)

        db.flush()  # assign IDs before referencing them below

        for section, base_price in (("A", 5000), ("B", 3000)):
            for seat_number in range(1, 11):
                seat = Seat(
                    id=uuid.uuid4(),
                    venue_id=venue.id,
                    section=section,
                    row_label="1",
                    seat_number=str(seat_number),
                )
                db.add(seat)
                db.flush()

                inventory = Inventory(
                    id=uuid.uuid4(),
                    event_id=event.id,
                    seat_id=seat.id,
                    status=InventoryStatus.AVAILABLE,
                    price_cents=base_price,
                )
                db.add(inventory)

        db.commit()

        print("Seed complete.")
        print(f"  demo user id (use as Bearer token): {user.id}")
        print(f"  event id: {event.id}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
