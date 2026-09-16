from __future__ import annotations

import uuid
from contextlib import asynccontextmanager

from encore_common import setup_observability
from encore_kafka_client import KafkaEventProducer
from fastapi import FastAPI, Request

from .consumer import MatchingEngineConsumer
from .routers import resale


class AppState:
    kafka_producer: KafkaEventProducer | None = None
    matching_consumer: MatchingEngineConsumer | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    producer = KafkaEventProducer(
        bootstrap_servers="localhost:9092",
        producer_name="resale-engine-producer",
    )
    try:
        producer.start()
        app.state.kafka_producer = producer
    except Exception as exc:  # noqa: BLE001
        print(f"Failed to connect to Kafka producer: {exc}")
        app.state.kafka_producer = None

    # We would use a real DB engine here, mocking for now
    consumer = MatchingEngineConsumer(engine=None, bootstrap_servers="localhost:9092", producer=app.state.kafka_producer)
    consumer.start()
    app.state.matching_consumer = consumer

    yield

    if app.state.matching_consumer:
        app.state.matching_consumer.stop()
        app.state.matching_consumer = None
    if app.state.kafka_producer:
        app.state.kafka_producer.stop()
        app.state.kafka_producer = None

app = FastAPI(title="Encore Resale Engine", lifespan=lifespan)

# Initialize metrics, structured logging, and OpenTelemetry
setup_observability(app, "resale-engine")

@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    incoming = request.headers.get("X-Request-Id")
    request_id = incoming or f"req_{uuid.uuid4().hex}"
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-Id"] = request_id
    return response

app.include_router(resale.router)
