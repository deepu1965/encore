"""Global IP-based rate-limit middleware.

Applied to every request via `app.add_middleware(RateLimitMiddleware)` in
main.py. It runs *after* the X-Request-Id middleware (middleware execution
order is LIFO in Starlette — last added = first to run during response,
first added = first to run during request). We add X-Request-Id first so
the request_id is always populated before this middleware logs or responds.

IDENTITY:
  The rate-limit key is the client IP address, extracted from:
    1. X-Forwarded-For header (first IP in the chain, when present)
    2. request.client.host (direct socket IP, fallback)

  Using X-Forwarded-For is correct when the gateway is behind a proxy /
  load balancer (which sets this header). In production, the proxy should
  be trusted and configured to strip any client-supplied X-Forwarded-For
  before appending its own, to prevent IP spoofing. For Week 4 (local dev
  only), this is documented but not enforced.

RESPONSE ON DENIAL:
  HTTP 429 Too Many Requests
  Headers: Retry-After: <seconds>
  Body: standard error_envelope with code RATE_LIMIT_EXCEEDED

BYPASS:
  Health-check endpoint (`/health`) is excluded — it must always be
  reachable for Docker healthchecks regardless of rate limit state.
"""

from __future__ import annotations

import logging

from encore_common import error_envelope
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from encore_cache.helpers import rate_limit_key
from encore_rate_limiter import RateLimiter, RateLimitExceeded

logger = logging.getLogger(__name__)

# Routes that bypass the global IP rate limiter.
_EXEMPT_PATHS: frozenset[str] = frozenset({"/health"})


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Starlette middleware that enforces the global per-IP token-bucket limit.

    The RateLimiter instance is read from app.state.global_rate_limiter on
    every request (set during lifespan startup). If it isn't set yet (e.g.
    in unit-test contexts that don't run the full lifespan), all requests
    are allowed through.
    """

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        if request.url.path in _EXEMPT_PATHS:
            return await call_next(request)

        limiter: RateLimiter | None = getattr(
            request.app.state, "global_rate_limiter", None
        )
        if limiter is None:
            return await call_next(request)

        identity = self._extract_ip(request)
        key = rate_limit_key(identity)

        try:
            result = limiter.check_or_raise(key)
        except RateLimitExceeded as exc:
            request_id = getattr(request.state, "request_id", "")
            retry_after = int(exc.result.retry_after_seconds) + 1
            logger.info(
                "Rate limit exceeded for %s — retry after %ds (request_id=%s)",
                identity,
                retry_after,
                request_id,
            )
            body = error_envelope(
                "RATE_LIMIT_EXCEEDED",
                f"Too many requests. Retry after {retry_after}s.",
                request_id,
            )
            return JSONResponse(
                status_code=429,
                content=body,
                headers={"Retry-After": str(retry_after)},
            )

        response = await call_next(request)
        # Surface remaining tokens in response headers (useful for clients
        # implementing adaptive throttling).
        response.headers["X-RateLimit-Remaining"] = str(result.remaining)
        return response

    @staticmethod
    def _extract_ip(request: Request) -> str:
        """Extract the client IP for rate-limit keying.

        Prefers X-Forwarded-For (set by load balancers) over the raw socket
        address. Takes the *first* IP in the XFF chain (the original client).
        """
        xff = request.headers.get("X-Forwarded-For")
        if xff:
            return xff.split(",")[0].strip()
        if request.client:
            return request.client.host
        return "unknown"
