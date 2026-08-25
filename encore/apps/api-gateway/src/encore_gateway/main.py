"""FastAPI app entrypoint.

`uvicorn encore_gateway.main:app` per the Dockerfile CMD and README.
"""

from __future__ import annotations

import uuid

from encore_common import error_envelope
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .routers import events, health, holds, orders

app = FastAPI(title="Encore API Gateway", version="0.1.0")


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
        # Already a full envelope (routers build these via error_envelope()).
        # Backfill request_id in case it was built before the middleware
        # attached request.state.request_id (defensive, shouldn't happen).
        detail.setdefault("request_id", request_id)
        return JSONResponse(status_code=exc.status_code, content=detail)

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
app.include_router(orders.router)
