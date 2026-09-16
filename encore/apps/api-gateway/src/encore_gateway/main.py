"""FastAPI app entrypoint.

`uvicorn encore_gateway.main:app` per the Dockerfile CMD and README.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from contextlib import asynccontextmanager

from encore_common import error_envelope, setup_observability
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .cache import close_cache, init_cache
from .kafka_producer import close_producer, init_producer
from .middleware.rate_limit import RateLimitMiddleware
from .rate_limit import init_rate_limiters
from .routers import (
    ads,
    auth_router,
    chat,
    deployment,
    events,
    feed,
    health,
    holds,
    inventory,
    leaderboard,
    location,
    media,
    orders,
    payments,
    scheduler,
    search,
    short_urls,
    tickets,
)
from .routers.chat import get_redis_url, start_redis_pubsub

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle.

    Startup order:
      1. init_cache()          — connect to Redis (or fallback to Null)
      2. app.state.cache       — store the client so middleware / workers can reach it
      3. init_rate_limiters()  — create the two RateLimiter singletons
      4. init_producer()       — connect to Kafka
    """

    cache = init_cache()
    app.state.cache = cache
    init_rate_limiters(cache, app)
    init_producer(app)

    producer = getattr(app.state, "kafka_producer", None)  # noqa: F841

    # Start Redis PubSub Listener for Chat
    redis_url = get_redis_url(cache)
    pubsub_task = asyncio.create_task(start_redis_pubsub(redis_url))

    yield

    if not pubsub_task.done():
        pubsub_task.cancel()
    
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
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:  # noqa: E501
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
app.include_router(media.router)
app.include_router(location.router)
app.include_router(ads.router)
app.include_router(leaderboard.router)
app.include_router(scheduler.router)
app.include_router(deployment.router)
app.include_router(auth_router.router)
