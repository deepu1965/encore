"""POST /payments/charge
Internal payment endpoint. Called by API gateway after AuthN/Z.
"""

from __future__ import annotations

import json

from encore_event_contracts import (
    PAYMENT_FAILED_EVENT_TYPE,
    PAYMENT_SUCCEEDED_EVENT_TYPE,
    PAYMENT_TOPIC,
    PAYMENT_VERSION,
    PaymentFailedPayload,
    PaymentSucceededPayload,
)
from encore_id_generator import SnowflakeIDGenerator
from encore_kafka_client import build_envelope
from fastapi import APIRouter, Depends, Header, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import IdempotencyRecord, Payment, PaymentStatus
from ..schemas import PaymentCreate, PaymentOut

router = APIRouter(prefix="/payments", tags=["payments"])

CREATE_ENDPOINT_NAME = "POST /payments/charge"
_id_gen = SnowflakeIDGenerator()

def get_idempotent_response(db: Session, key: str, endpoint: str) -> IdempotencyRecord | None:
    return db.get(IdempotencyRecord, (key, endpoint))

def save_idempotent_response(db: Session, key: str, endpoint: str, status_code: int, body: dict) -> None:  # noqa: E501
    record = IdempotencyRecord(
        key=key,
        endpoint=endpoint,
        status_code=status_code,
        response_json=json.dumps(body),
    )
    db.add(record)

@router.post("/charge", status_code=201)
async def process_charge(
    payload: PaymentCreate,
    request: Request,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "")

    if not idempotency_key:
        return JSONResponse(
            status_code=400,
            content={"error": {"code": "MISSING_IDEMPOTENCY_KEY", "message": "Idempotency-Key header is required."}, "request_id": request_id}  # noqa: E501
        )

    # --- Timeout Mock ---
    import os
    if idempotency_key.startswith("timeout_") and os.environ.get("MOCK_TIMEOUT_ENABLED", "").lower() == "true":  # noqa: E501
        import asyncio
        await asyncio.sleep(15) # Non-blocking mock timeout

    # --- Idempotency Check ---
    existing = get_idempotent_response(db, idempotency_key, CREATE_ENDPOINT_NAME)
    if existing is not None:
        return JSONResponse(status_code=existing.status_code, content=json.loads(existing.response_json))  # noqa: E501

    # --- Mock Payment Failure Path ---
    if idempotency_key.startswith("fail_"):
        payment = Payment(
            id=_id_gen.next_id().as_uuid(),
            order_id=payload.order_id,
            user_id=payload.user_id,
            amount_cents=payload.amount_cents,
            status=PaymentStatus.FAILED,
            idempotency_key=idempotency_key,
        )
        db.add(payment)
        db.flush()

        body = {"error": {"code": "PAYMENT_FAILED", "message": "Mock payment failed."}, "request_id": request_id}  # noqa: E501
        save_idempotent_response(db, idempotency_key, CREATE_ENDPOINT_NAME, 402, body)
        db.commit()

        # Emit Kafka event
        producer = getattr(request.app.state, "kafka_producer", None)
        if producer is not None:
            envelope = build_envelope(
                event_type=PAYMENT_FAILED_EVENT_TYPE,
                event_version=PAYMENT_VERSION,
                key=str(payload.order_id),
                payload=PaymentFailedPayload(
                    payment_id=str(payment.id),
                    order_id=str(payload.order_id),
                    user_id=str(payload.user_id),
                    reason="Mock failure via fail_ prefix",
                    failed_at=payment.created_at.isoformat(),
                ).to_dict(),
                producer_name=request.app.state.kafka_producer.producer_name,
                trace_id=request_id,
                id_generator=_id_gen,
            )
            producer.publish(PAYMENT_TOPIC, envelope)

        return JSONResponse(status_code=402, content=body)

    # --- Mock Payment Success Path ---
    payment = Payment(
        id=_id_gen.next_id().as_uuid(),
        order_id=payload.order_id,
        user_id=payload.user_id,
        amount_cents=payload.amount_cents,
        status=PaymentStatus.SUCCESS,
        idempotency_key=idempotency_key,
    )
    db.add(payment)
    db.flush()

    payment_out = PaymentOut(
        id=payment.id,
        order_id=payment.order_id,
        user_id=payment.user_id,
        amount_cents=payment.amount_cents,
        status=payment.status,
        created_at=payment.created_at,
    )
    body = {"data": payment_out.model_dump(mode="json"), "request_id": request_id}
    save_idempotent_response(db, idempotency_key, CREATE_ENDPOINT_NAME, 201, body)
    db.commit()

    # Emit Kafka event
    producer = getattr(request.app.state, "kafka_producer", None)
    if producer is not None:
        envelope = build_envelope(
            event_type=PAYMENT_SUCCEEDED_EVENT_TYPE,
            event_version=PAYMENT_VERSION,
            key=str(payload.order_id),
            payload=PaymentSucceededPayload(
                payment_id=str(payment.id),
                order_id=str(payload.order_id),
                user_id=str(payload.user_id),
                amount_cents=payload.amount_cents,
                succeeded_at=payment.created_at.isoformat(),
            ).to_dict(),
            producer_name=request.app.state.kafka_producer.producer_name,
            trace_id=request_id,
            id_generator=_id_gen,
        )
        producer.publish(PAYMENT_TOPIC, envelope)

    return JSONResponse(status_code=201, content=body)
