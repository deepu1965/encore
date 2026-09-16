"""FastAPI app entrypoint for encore-payment-service.
"""
from __future__ import annotations

import uuid
from contextlib import asynccontextmanager

from encore_kafka_client import KafkaEventProducer
from fastapi import FastAPI, Request

from .config import settings
from .routers import charge


class AppState:
    kafka_producer: KafkaEventProducer | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Init Kafka producer
    producer = KafkaEventProducer(
        bootstrap_servers=settings.kafka_bootstrap_servers,
        producer_name="payment-service-producer",
    )
    try:
        producer.start()
        app.state.kafka_producer = producer
    except Exception as exc:
        print(f"Failed to connect to Kafka, continuing without producer: {exc}")
        app.state.kafka_producer = None
    
    yield

    if app.state.kafka_producer:
        app.state.kafka_producer.stop()
        app.state.kafka_producer = None

    from .db import engine
    engine.dispose()

app = FastAPI(title="Encore Payment Service", version="0.1.0", lifespan=lifespan)

@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    incoming = request.headers.get("X-Request-Id")
    request_id = incoming or f"req_{uuid.uuid4().hex}"
    request.state.request_id = request_id

    response = await call_next(request)
    response.headers["X-Request-Id"] = request_id
    return response

app.include_router(charge.router)
