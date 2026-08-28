"""FastAPI entrypoint for the waiting-room service.

`uvicorn encore_waiting_room.main:app` per the Dockerfile CMD.
"""

from __future__ import annotations

import uuid
from contextlib import asynccontextmanager

import redis as redis_lib
from encore_common import error_envelope
from encore_kafka_client import KafkaEventProducer
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .config import settings
from .queue import WaitingRoomQueue
from .routers.health import router as health_router
from .routers.queue_router import router as queue_router
from .ticker import AdmissionTicker


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle.

    Startup order:
      1. Connect to Redis → build WaitingRoomQueue
      2. Connect to Kafka → build KafkaEventProducer (optional, fail-open)
      3. Start AdmissionTicker background thread
    """
    # 1. Redis
    redis_client = redis_lib.Redis(
        host=settings.redis_host,
        port=settings.redis_port,
        decode_responses=True,
        socket_connect_timeout=2,
        socket_timeout=2,
    )
    app.state.queue = WaitingRoomQueue(
        redis_client=redis_client,
        token_ttl_secs=settings.admission_token_ttl_secs,
    )

    # 2. Kafka (fail-open)
    producer: KafkaEventProducer | None = None
    try:
        producer = KafkaEventProducer(
            bootstrap_servers=settings.kafka_bootstrap_servers,
            producer_name=settings.kafka_producer_name,
        )
        app.state.kafka_producer = producer
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning(
            "Kafka producer init failed; events will not be published: %s", exc
        )
        app.state.kafka_producer = None

    # 3. Admission ticker
    ticker = AdmissionTicker(
        queue=app.state.queue,
        event_ids=list(settings.flash_sale_set),
        batch_size=settings.admission_batch_size,
        interval_secs=settings.admission_interval_secs,
        producer=producer,
    )
    ticker.start()
    app.state.ticker = ticker

    yield

    # Shutdown
    ticker.stop()
    if producer is not None:
        producer.close()
    redis_client.close()


app = FastAPI(title="Encore Waiting Room", version="0.1.0", lifespan=lifespan)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    incoming = request.headers.get("X-Request-Id")
    request_id = incoming or f"req_{uuid.uuid4().hex}"
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-Id"] = request_id
    return response


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "")
    body = error_envelope("INTERNAL_ERROR", str(exc), request_id)
    return JSONResponse(status_code=500, content=body)


app.include_router(health_router)
app.include_router(queue_router)
