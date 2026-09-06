"""FastAPI app entrypoint.

`uvicorn encore_gateway.main:app` per the Dockerfile CMD and README.
"""

from __future__ import annotations

import uuid
import logging
from contextlib import asynccontextmanager

from encore_common import error_envelope, setup_observability
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .cache import close_cache, init_cache, get_cache
from .kafka_producer import close_producer, init_producer
from .middleware.rate_limit import RateLimitMiddleware
from .rate_limit import init_rate_limiters
from .routers import events, health, holds, inventory, orders, payments, tickets, search, short_urls, feed, chat
from .routers.chat import start_redis_pubsub, get_redis_url
import asyncio

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle.

    Startup order:
      1. init_cache()          — connect to Redis (or fallback to Null)
      2. app.state.cache       — store the client so middleware / workers can reach it
      3. init_rate_limiters()  — create the two RateLimiter singletons
      4. init_producer()       — connect to Kafka
      5. HoldExpiryWorker      — daemon thread for hold TTL cleanup (Week 7)
                                  passes redis_client for Redis key cleanup (Week 8)
    """
    from encore_hold_expiry import HoldExpiryWorker

    from .config import settings
    from .db import engine

    cache = init_cache()
    app.state.cache = cache
    init_rate_limiters(cache, app)
    init_producer(app)

    producer = getattr(app.state, "kafka_producer", None)

    # Extract raw Redis client for the expiry worker (Week 8 key cleanup)
    _redis_for_worker = getattr(cache, "_redis", None)
    
    from encore_gateway.db import get_shard_engines
    _shard_engines = list(get_shard_engines().values())

    expiry_worker = HoldExpiryWorker(
        primary_engine=engine,
        shard_engines=_shard_engines,
        producer=producer,
        poll_interval_secs=settings.expiry_poll_interval_secs,
        advisory_lock_id=settings.expiry_advisory_lock_id,
        redis_client=_redis_for_worker,
    )
    expiry_worker.start()
    app.state.expiry_worker = expiry_worker
    
    # Start Redis PubSub Listener for Chat
    redis_url = get_redis_url(cache)
    pubsub_task = asyncio.create_task(start_redis_pubsub(redis_url))

    yield

    if not pubsub_task.done():
        pubsub_task.cancel()
    
    expiry_worker.stop()
    close_producer(app)
    close_cache(cache)
    app.state.cache = None


app = FastAPI(title="Encore API Gateway", version="0.1.0", lifespan=lifespan)

# Initialize metrics, structured logging, and OpenTelemetry
setup_observability(app, "api-gateway")

# ---------------------------------------------------------------------------
# Middleware
# Starlette processes middleware LIFO during request (FIFO during response).
# We want:  request → X-Request-Id → RateLimit → route handler
# So add X-Request-Id *after* RateLimit (it will execute first).
# ---------------------------------------------------------------------------
app.add_middleware(RateLimitMiddleware)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    """Assigns X-Request-Id per docs/api/api-conventions.md section 3:
    generated at the gateway if absent, propagated to logs/responses.
    Downstream propagation into Kafka event envelopes (trace_id) starts
    once Kafka integration lands in Week 5 — there's nothing to propagate
    to yet.
    """
    incoming = request.headers.get("X-Request-Id")
    request_id = incoming or f"req_{uuid.uuid4().hex}"
    request.state.request_id = request_id

    response = await call_next(request)
    response.headers["X-Request-Id"] = request_id
    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Ensures every error response — even ones raised as plain
    HTTPException — matches the envelope in api-conventions.md section 4,
    instead of FastAPI's default {"detail": ...} shape.
    """
    request_id = getattr(request.state, "request_id", "")
    detail = exc.detail

    if isinstance(detail, dict) and "error" in detail:
        detail.setdefault("request_id", request_id)
        return JSONResponse(
            status_code=exc.status_code,
            content=detail,
            headers=dict(exc.headers or {}),
        )

    if isinstance(detail, dict) and "code" in detail:
        body = error_envelope(detail["code"], detail.get("message", ""), request_id)
        return JSONResponse(status_code=exc.status_code, content=body)

    body = error_envelope("HTTP_ERROR", str(detail), request_id)
    return JSONResponse(status_code=exc.status_code, content=body)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "")
    body = error_envelope("VALIDATION_ERROR", str(exc.errors()), request_id)
    return JSONResponse(status_code=400, content=body)


app.include_router(health.router)
app.include_router(events.router)
app.include_router(holds.router)
app.include_router(inventory.router)
app.include_router(orders.router)
app.include_router(payments.router)
app.include_router(tickets.router)
app.include_router(search.router)
app.include_router(short_urls.router)
app.include_router(feed.router)
app.include_router(chat.router)
