"""POST /api/v1/payments.

Week 9 — Checkout Orchestration & Idempotent Payments.
This endpoint acts as the mock payment provider webhook/synchronous redirect.
It accepts an order ID and processes the payment using the provided idempotency key.
"""

from __future__ import annotations

import json
import uuid

from encore_common import error_envelope
from encore_id_generator import SnowflakeIDGenerator
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..db import get_db
from ..idempotency import get_idempotent_response, save_idempotent_response
from ..models import (
    AuditEvent,
    AuditEventType,
    Inventory,
    InventoryStatus,
    Order,
    OrderStatus,
    Ticket,
    TicketStatus,
    User,
)
from ..schemas import PaymentCreate

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])

CREATE_ENDPOINT_NAME = "POST /api/v1/payments"

_id_gen = SnowflakeIDGenerator()


import httpx  # noqa: E402
from encore_common.circuit_breaker import CircuitBreaker, CircuitOpenException  # noqa: E402

from ..config import settings  # noqa: E402

payment_cb = CircuitBreaker(failure_threshold=5, recovery_timeout_sec=30.0)

@payment_cb
def _post_payment(url: str, json_data: dict, headers: dict) -> httpx.Response:
    with httpx.Client() as client:
        return client.post(url, json=json_data, headers=headers, timeout=5.0)

@router.post("", status_code=201)
def process_payment(
    payload: PaymentCreate,
    request: Request,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "")

    if not idempotency_key:
        raise HTTPException(
            status_code=400,
            detail=error_envelope("MISSING_IDEMPOTENCY_KEY", "Idempotency-Key header is required.", request_id),  # noqa: E501
        )

    # --- Idempotency Check ---
    existing = get_idempotent_response(db, idempotency_key, CREATE_ENDPOINT_NAME)
    if existing is not None:
        return JSONResponse(status_code=existing.status_code, content=json.loads(existing.response_json))  # noqa: E501

    # --- Load Order ---
    order = db.execute(
        select(Order).where(Order.id == payload.order_id)
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
        body = error_envelope("INVALID_ORDER_STATE", f"Order is in {order.status} state, expected PENDING.", request_id)  # noqa: E501
        save_idempotent_response(db, idempotency_key, CREATE_ENDPOINT_NAME, 409, body)
        db.commit()
        return JSONResponse(status_code=409, content=body)

    # Make internal synchronous HTTP call to payment-service
    payment_payload = {
        "order_id": str(order.id),
        "user_id": str(order.user_id),
        "amount_cents": order.total_cents,
    }

    try:
        resp = _post_payment(
            f"{settings.payment_service_url}/payments/charge",
            json_data=payment_payload,
            headers={"Idempotency-Key": idempotency_key, "X-Request-Id": request_id}
        )
        
        # Complete order and issue ticket synchronously if payment succeeded
        if resp.status_code == 201:
            order.status = OrderStatus.COMPLETED
            
            existing_tix = db.execute(
                select(Ticket).where(Ticket.order_id == order.id)
            ).scalars().first()

            if not existing_tix:
                used_inv_subq = select(Ticket.inventory_id)
                # Find held inventory for this user/event that does NOT already have a ticket
                inventory_row = db.execute(
                    select(Inventory).where(
                        Inventory.event_id == order.event_id,
                        Inventory.held_by_user_id == order.user_id,
                        Inventory.status == InventoryStatus.HELD,
                        ~Inventory.id.in_(used_inv_subq),
                    )
                ).scalars().first()
                
                if not inventory_row:
                    # Fallback to any inventory for this user/event not in tickets
                    inventory_row = db.execute(
                        select(Inventory).where(
                            Inventory.event_id == order.event_id,
                            Inventory.held_by_user_id == order.user_id,
                            ~Inventory.id.in_(used_inv_subq),
                        )
                    ).scalars().first()

                if not inventory_row:
                    # Fallback to any available inventory for this event not in tickets
                    inventory_row = db.execute(
                        select(Inventory).where(
                            Inventory.event_id == order.event_id,
                            ~Inventory.id.in_(used_inv_subq),
                        )
                    ).scalars().first()

                if inventory_row:
                    inventory_row.status = InventoryStatus.SOLD
                    inventory_row.held_by_user_id = None
                    inventory_row.held_at = None
                    inventory_row.hold_expires_at = None
                    inv_id = inventory_row.id

                    tix_code = f"TIX-{uuid.uuid4().hex[:8].upper()}"
                    tix = Ticket(
                        id=_id_gen.next_id().as_uuid(),
                        order_id=order.id,
                        user_id=order.user_id,
                        inventory_id=inv_id,
                        ticket_code=tix_code,
                        status=TicketStatus.ISSUED,
                    )
                    db.add(tix)
                    
                    audit_event = AuditEvent(
                        id=_id_gen.next_id().as_uuid(),
                        ticket_id=tix.id,
                        event_type=AuditEventType.ISSUED,
                        user_id=order.user_id,
                        new_owner_id=order.user_id,
                    )
                    db.add(audit_event)

        # Record response in our gateway idempotency table too
        save_idempotent_response(db, idempotency_key, CREATE_ENDPOINT_NAME, resp.status_code, resp.json())  # noqa: E501
        db.commit()
        
        return JSONResponse(status_code=resp.status_code, content=resp.json())
    except CircuitOpenException as e:
        raise HTTPException(
            status_code=503, detail=error_envelope("PAYMENT_SERVICE_UNAVAILABLE", "Circuit breaker OPEN: " + str(e), request_id)  # noqa: E501
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502, detail=error_envelope("PAYMENT_SERVICE_UNAVAILABLE", str(e), request_id)  # noqa: E501
        )
