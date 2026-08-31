"""POST /api/v1/payments.

Week 9 — Checkout Orchestration & Idempotent Payments.
This endpoint acts as the mock payment provider webhook/synchronous redirect.
It accepts an order ID and processes the payment using the provided idempotency key.
"""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select, update
from sqlalchemy.orm import Session, selectinload

from encore_cache import CacheClient, event_seats_key, invalidate
from encore_cache.helpers import hold_key, inventory_status_key
from encore_common import error_envelope, success_envelope
from encore_id_generator import SnowflakeIDGenerator
from encore_event_contracts import (
    ORDER_COMPLETED_EVENT_TYPE,
    ORDER_COMPLETED_TOPIC,
    ORDER_COMPLETED_VERSION,
    OrderCompletedPayload,
)
from encore_kafka_client import build_envelope

from ..auth import get_current_user
from ..cache import get_cache
from ..db import get_db
from ..domain.inventory_state import InventoryStatus as DomainInventoryStatus
from ..domain.inventory_state import generate_ticket_code
from ..idempotency import get_idempotent_response, save_idempotent_response
from ..models import Inventory, InventoryStatus, Order, OrderStatus, Ticket, User
from ..schemas import OrderOut, PaymentCreate, TicketOut


router = APIRouter(prefix="/api/v1/payments", tags=["payments"])

CREATE_ENDPOINT_NAME = "POST /api/v1/payments"

_id_gen = SnowflakeIDGenerator()


@router.post("", status_code=201)
def process_payment(
    payload: PaymentCreate,
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
            detail=error_envelope("MISSING_IDEMPOTENCY_KEY", "Idempotency-Key header is required.", request_id),
        )

    # --- Idempotency Check ---
    existing = get_idempotent_response(db, idempotency_key, CREATE_ENDPOINT_NAME)
    if existing is not None:
        return JSONResponse(status_code=existing.status_code, content=json.loads(existing.response_json))

    # --- Load Order ---
    order = db.execute(
        select(Order).options(selectinload(Order.tickets)).where(Order.id == payload.order_id)
    ).scalar_one_or_none()

    if order is None:
        raise HTTPException(
            status_code=404, detail=error_envelope("ORDER_NOT_FOUND", "No such order.", request_id)
        )

    if order.user_id != current_user.id:
        raise HTTPException(
            status_code=403, detail=error_envelope("FORBIDDEN", "Not your order.", request_id)
        )

    if order.status != OrderStatus.PENDING:
        body = error_envelope("INVALID_ORDER_STATE", f"Order is in {order.status} state, expected PENDING.", request_id)
        # Even if they reuse a new idempotency key on an already completed order, reject it.
        save_idempotent_response(db, idempotency_key, CREATE_ENDPOINT_NAME, 409, body)
        db.commit()
        return JSONResponse(status_code=409, content=body)

    # We need the inventory row to either release it or mark it sold.
    # We find the inventory row that belongs to this order's event and is currently held by this user.
    inventory_row = db.execute(
        select(Inventory).where(
            Inventory.event_id == order.event_id,
            Inventory.held_by_user_id == current_user.id,
            Inventory.status == InventoryStatus.HELD
        )
    ).scalar_one_or_none()

    if inventory_row is None:
        # If the hold naturally expired before payment was processed, we fail the order.
        order.status = OrderStatus.EXPIRED
        db.commit()
        body = error_envelope("HOLD_EXPIRED", "The seat hold has expired. Order cancelled.", request_id)
        save_idempotent_response(db, idempotency_key, CREATE_ENDPOINT_NAME, 409, body)
        db.commit()
        return JSONResponse(status_code=409, content=body)

    # --- Mock Payment Failure Path ---
    if idempotency_key.startswith("fail_"):
        order.status = OrderStatus.FAILED
        
        # Release the seat hold
        inventory_row.status = InventoryStatus.AVAILABLE
        inventory_row.held_by_user_id = None
        inventory_row.held_at = None
        inventory_row.hold_expires_at = None
        
        db.flush()
        
        body = error_envelope("PAYMENT_FAILED", "Mock payment failed.", request_id)
        save_idempotent_response(db, idempotency_key, CREATE_ENDPOINT_NAME, 402, body)
        db.commit()
        
        # Clean up Redis caches to reflect the seat is available again
        cache.delete(hold_key(str(inventory_row.event_id), str(inventory_row.seat_id)))
        cache.delete(inventory_status_key(str(inventory_row.id)))
        invalidate(cache, event_seats_key(str(inventory_row.event_id)))
        
        return JSONResponse(status_code=402, content=body)

    # --- Mock Payment Success Path ---
    order.status = OrderStatus.COMPLETED
    
    inventory_row.status = InventoryStatus.SOLD
    # Keep held_by_user_id since they are the purchaser, but the hold timestamp isn't relevant anymore
    # Though usually we keep it or it doesn't matter since status=SOLD
    
    ticket_id = _id_gen.next_id().as_uuid()
    ticket = Ticket(
        id=ticket_id,
        order_id=order.id,
        inventory_id=inventory_row.id,
        ticket_code=generate_ticket_code(str(order.id), sequence=0),
    )
    db.add(ticket)
    db.flush()
    
    order_out = OrderOut(
        id=order.id,
        event_id=order.event_id,
        user_id=order.user_id,
        status=order.status,
        total_cents=order.total_cents,
        created_at=order.created_at,
        tickets=[
            TicketOut(id=ticket.id, ticket_code=ticket.ticket_code, status=ticket.status, seat_id=inventory_row.seat_id)
        ],
    )
    body = success_envelope(order_out.model_dump(mode="json"), request_id=request_id)
    
    save_idempotent_response(db, idempotency_key, CREATE_ENDPOINT_NAME, 201, body)
    db.commit()
    
    # Update Redis cache
    cache.set(inventory_status_key(str(inventory_row.id)), InventoryStatus.SOLD.value)
    # The hold key will expire naturally, or we can delete it. It's safe to let it expire.
    invalidate(cache, event_seats_key(str(inventory_row.event_id)))
    
    # --- Emit Kafka event ---
    producer = getattr(request.app.state, "kafka_producer", None)
    if producer is not None:
        envelope = build_envelope(
            event_type=ORDER_COMPLETED_EVENT_TYPE,
            event_version=ORDER_COMPLETED_VERSION,
            key=str(order.id),
            payload=OrderCompletedPayload(
                order_id=str(order.id),
                user_id=str(order.user_id),
                event_id=str(order.event_id),
                seat_id=str(inventory_row.seat_id),
                total_cents=order.total_cents,
                ticket_id=str(ticket.id),
                ticket_code=ticket.ticket_code,
                completed_at=order.created_at.isoformat(),
            ).to_dict(),
            producer_name=request.app.state.kafka_producer.producer_name,
            trace_id=request_id,
            id_generator=_id_gen,
        )
        producer.publish(ORDER_COMPLETED_TOPIC, envelope)
        
    return JSONResponse(status_code=201, content=body)
