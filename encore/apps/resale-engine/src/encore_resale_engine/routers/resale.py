import uuid
from datetime import datetime, timezone
from uuid import UUID

from encore_event_contracts.events.resale import (
    RESALE_LISTING_CREATED_EVENT_TYPE,
    RESALE_LISTING_CREATED_TOPIC,
    RESALE_LISTING_CREATED_VERSION,
    RESALE_ORDER_CREATED_EVENT_TYPE,
    RESALE_ORDER_CREATED_TOPIC,
    RESALE_ORDER_CREATED_VERSION,
    ResaleListingCreatedPayload,
    ResaleOrderCreatedPayload,
)
from encore_id_generator import SnowflakeIDGenerator
from encore_kafka_client import build_envelope
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import ListingStatus, ResaleListing, ResaleOrder, ResaleTrade
from ..schemas import ListingCreate, OrderCreate

router = APIRouter(prefix="/api/v1/resale", tags=["resale"])
_id_gen = SnowflakeIDGenerator()


@router.get("/health", tags=["health"])
def health_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "healthy", "service": "resale-engine"}


@router.post("/listings", status_code=status.HTTP_201_CREATED)
def create_listing(
    payload: ListingCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    listing_id = _id_gen.next_id().as_uuid()

    # Save to PostgreSQL
    listing = ResaleListing(
        id=listing_id,
        event_id=payload.event_id,
        ticket_id=payload.ticket_id,
        seller_id=payload.seller_id,
        ask_price_cents=payload.ask_price_cents,
        status=ListingStatus.ACTIVE,
    )
    db.add(listing)
    db.commit()

    # Publish to Kafka
    producer = getattr(request.app.state, "kafka_producer", None)
    if producer:
        envelope = build_envelope(
            event_type=RESALE_LISTING_CREATED_EVENT_TYPE,
            event_version=RESALE_LISTING_CREATED_VERSION,
            key=str(payload.event_id),
            payload=ResaleListingCreatedPayload(
                listing_id=str(listing_id),
                event_id=str(payload.event_id),
                ticket_id=str(payload.ticket_id),
                seller_id=str(payload.seller_id),
                ask_price_cents=payload.ask_price_cents,
                created_at=datetime.now(timezone.utc).isoformat(),
            ).to_dict(),
            producer_name="resale-engine",
            trace_id=getattr(request.state, "request_id", ""),
            id_generator=_id_gen,
        )
        producer.publish(RESALE_LISTING_CREATED_TOPIC, envelope)

    return {"status": "success", "listing_id": str(listing_id)}


@router.post("/orders", status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    order_id = _id_gen.next_id().as_uuid()

    # Save to PostgreSQL
    order = ResaleOrder(
        id=order_id,
        event_id=payload.event_id,
        buyer_id=payload.buyer_id,
        bid_price_cents=payload.bid_price_cents,
        status=ListingStatus.ACTIVE,
    )
    db.add(order)
    db.commit()

    # Publish to Kafka
    producer = getattr(request.app.state, "kafka_producer", None)
    if producer:
        envelope = build_envelope(
            event_type=RESALE_ORDER_CREATED_EVENT_TYPE,
            event_version=RESALE_ORDER_CREATED_VERSION,
            key=str(payload.event_id),
            payload=ResaleOrderCreatedPayload(
                order_id=str(order_id),
                event_id=str(payload.event_id),
                buyer_id=str(payload.buyer_id),
                bid_price_cents=payload.bid_price_cents,
                created_at=datetime.now(timezone.utc).isoformat(),
            ).to_dict(),
            producer_name="resale-engine",
            trace_id=getattr(request.state, "request_id", ""),
            id_generator=_id_gen,
        )
        producer.publish(RESALE_ORDER_CREATED_TOPIC, envelope)

    return {"status": "success", "order_id": str(order_id)}


@router.get("/listings/by-event/{event_id}")
def get_event_listings(event_id: str, db: Session = Depends(get_db)):
    try:
        ev_uuid = UUID(event_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid event UUID")

    listings = db.execute(
        select(ResaleListing)
        .where(ResaleListing.event_id == ev_uuid, ResaleListing.status == ListingStatus.ACTIVE)
        .order_by(ResaleListing.ask_price_cents.asc(), ResaleListing.created_at.asc())
    ).scalars().all()

    return {
        "items": [
            {
                "id": str(l.id),
                "event_id": str(l.event_id),
                "ticket_id": str(l.ticket_id),
                "seller_id": str(l.seller_id),
                "ask_price_cents": l.ask_price_cents,
                "status": l.status.value,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in listings
        ]
    }


@router.get("/listings/{listing_id}")
def get_listing_detail(listing_id: str, db: Session = Depends(get_db)):
    try:
        list_uuid = UUID(listing_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid listing UUID")

    listing = db.execute(
        select(ResaleListing).where(ResaleListing.id == list_uuid)
    ).scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    return {
        "id": str(listing.id),
        "event_id": str(listing.event_id),
        "ticket_id": str(listing.ticket_id),
        "seller_id": str(listing.seller_id),
        "ask_price_cents": listing.ask_price_cents,
        "status": listing.status.value,
        "created_at": listing.created_at.isoformat() if listing.created_at else None,
    }


@router.get("/trades/{trade_id}")
def get_trade_detail(trade_id: str, db: Session = Depends(get_db)):
    try:
        tr_uuid = UUID(trade_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid trade UUID")

    trade = db.execute(
        select(ResaleTrade).where(ResaleTrade.id == tr_uuid)
    ).scalar_one_or_none()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    return {
        "id": str(trade.id),
        "event_id": str(trade.event_id),
        "listing_id": str(trade.listing_id),
        "order_id": str(trade.order_id),
        "price_cents": trade.price_cents,
        "created_at": trade.created_at.isoformat() if trade.created_at else None,
    }
