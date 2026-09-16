from datetime import datetime, timezone

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
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from ..schemas import ListingCreate, OrderCreate

router = APIRouter(prefix="/api/v1/resale", tags=["resale"])
_id_gen = SnowflakeIDGenerator()

def get_db():
    yield None

@router.post("/listings", status_code=201)
def create_listing(payload: ListingCreate, request: Request, db: Session = Depends(get_db)):  # noqa: B008
    listing_id = _id_gen.next_id().as_uuid()
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
                created_at=datetime.now(timezone.utc).isoformat()
            ).to_dict(),
            producer_name="resale-engine",
            trace_id=getattr(request.state, "request_id", ""),
            id_generator=_id_gen
        )
        producer.publish(RESALE_LISTING_CREATED_TOPIC, envelope)
    return {"status": "success", "listing_id": str(listing_id)}

@router.post("/orders", status_code=201)
def create_order(payload: OrderCreate, request: Request, db: Session = Depends(get_db)):  # noqa: B008
    order_id = _id_gen.next_id().as_uuid()
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
                created_at=datetime.now(timezone.utc).isoformat()
            ).to_dict(),
            producer_name="resale-engine",
            trace_id=getattr(request.state, "request_id", ""),
            id_generator=_id_gen
        )
        producer.publish(RESALE_ORDER_CREATED_TOPIC, envelope)
    return {"status": "success", "order_id": str(order_id)}
