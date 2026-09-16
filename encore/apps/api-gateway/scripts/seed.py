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
from datetime import UTC, datetime, timedelta

from encore_gateway.db import SessionWrite, shard_manager
from encore_gateway.models import (
    Event,
    EventStatus,
    Inventory,
    InventoryStatus,
    Seat,
    User,
    UserRole,
    Venue,
)

DEMO_VENUE_NAME = "Encore Arena"


def seed() -> None:
    db = SessionWrite()
    try:
        existing = db.query(Venue).filter_by(name=DEMO_VENUE_NAME).one_or_none()
        if existing is not None:
            print(f"Seed data already present (venue id={existing.id}). Skipping.")
            return

        user = User(
            id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
            email="demo.buyer@example.com",
            display_name="Demo Buyer",
            role=UserRole.BUYER,
        )
        db.add(user)

        admin = User(
            id=uuid.UUID("00000000-0000-0000-0000-000000000000"),
            email="admin@example.com",
            display_name="Admin User",
            role=UserRole.ADMIN,
        )
        db.add(admin)

        venue = Venue(
            id=uuid.uuid4(),
            name=DEMO_VENUE_NAME,
            city="Hyderabad",
            timezone="Asia/Kolkata",
        )
        db.add(venue)

        event = Event(
            id=uuid.uuid4(),
            venue_id=venue.id,
            name="Encore Launch Night",
            starts_at=datetime.now(UTC) + timedelta(days=30),
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

        # --- Seed the Shard DB ---
        shard_db = shard_manager.get_session(event.id)
        try:
            # Replicate Venue and Event to shard
            shard_venue = Venue(id=venue.id, name=venue.name, city=venue.city, timezone=venue.timezone)  # noqa: E501
            shard_db.add(shard_venue)
            shard_event = Event(
                id=event.id, venue_id=venue.id, name=event.name,
                starts_at=event.starts_at, status=event.status
            )
            shard_db.add(shard_event)
            shard_db.flush()

            for section, base_price in (("A", 5000), ("B", 3000)):
                for seat_number in range(1, 11):
                    seat = Seat(
                        id=uuid.uuid4(),
                        venue_id=venue.id,
                        section=section,
                        row_label="1",
                        seat_number=str(seat_number),
                    )
                    shard_db.add(seat)
                    shard_db.flush()

                    inventory = Inventory(
                        id=uuid.uuid4(),
                        event_id=event.id,
                        seat_id=seat.id,
                        status=InventoryStatus.AVAILABLE,
                        price_cents=base_price,
                    )
                    shard_db.add(inventory)
            shard_db.commit()
        finally:
            shard_db.close()

        print("Seed complete.")
        print(f"  demo user id (use as Bearer token): {user.id}")
        print(f"  event id: {event.id}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
