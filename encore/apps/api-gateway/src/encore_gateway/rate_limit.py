"""Rate limiter dependency injection and checkout dependency factory.

This module mirrors cache.py in structure:
  init_rate_limiters(app) — called during lifespan, creates RateLimiter
                            singletons and stores them on app.state.
  get_rate_limiter()     — FastAPI dependency yielding the global RateLimiter.
  require_checkout_rate_limit() — Route-level dependency for POST /orders;
                            uses the tighter checkout config, keyed by user ID.

Two separate RateLimiter instances:
  app.state.global_rate_limiter   — used by the middleware (per-IP, all routes)
  app.state.checkout_rate_limiter — used as a route dependency (per-user, /orders)

Fail-open: both limiters inherit NullCacheClient fail-open behaviour — if
Redis is unavailable at startup, limiters are created with the NullCache
and every check() call returns allowed=True.
"""

from __future__ import annotations

import logging

from encore_cache import CacheClient
from encore_rate_limiter import RateLimitConfig, RateLimiter, RateLimitExceeded

from .config import settings

logger = logging.getLogger(__name__)


def init_rate_limiters(cache: CacheClient, app) -> None:  # noqa: ANN001
    """Create rate-limiter singletons and store them on app.state.

    Called from the lifespan context manager after init_cache() so that
    the limiters share the same CacheClient that the routers use.

    Args:
        cache: The initialized CacheClient (from init_cache()).
        app:   The FastAPI application instance.
    """
    global_config = RateLimitConfig(
        capacity=settings.rate_limit_global_capacity,
        rate_per_second=settings.rate_limit_global_per_second,
    )
    checkout_config = RateLimitConfig(
        capacity=settings.rate_limit_checkout_capacity,
        rate_per_second=settings.rate_limit_checkout_per_second,
    )
    app.state.global_rate_limiter = RateLimiter(cache=cache, config=global_config)
    app.state.checkout_rate_limiter = RateLimiter(cache=cache, config=checkout_config)
    logger.info(
        "Rate limiters initialized — global: %d burst / %.2f rps | checkout: %d burst / %.4f rps",
        global_config.capacity,
        global_config.rate_per_second,
        checkout_config.capacity,
        checkout_config.rate_per_second,
    )


def get_rate_limiter(app) -> RateLimiter | None:  # noqa: ANN001
    """Return the global rate limiter from app.state (or None if not set)."""
    return getattr(app.state, "global_rate_limiter", None)


def require_checkout_rate_limit(request):  # noqa: ANN001
    """FastAPI dependency for POST /orders checkout protection.

    Keyed by authenticated user ID (not IP) so that a user churning through
    checkout attempts is throttled regardless of their network location.

    NOTE: This dependency must be declared *after* get_current_user in the
    route signature so that the user object is available. In practice it is
    listed as a standalone Depends() without needing the user directly —
    see orders.py for usage.
    """
    from fastapi import Depends, HTTPException  # local to avoid circular import

    from .auth import get_current_user

    def _inner(
        request=request,  # noqa: B008
        current_user=Depends(get_current_user),
    ):
        limiter: RateLimiter | None = getattr(
            request.app.state, "checkout_rate_limiter", None
        )
        if limiter is None:
            return  # not initialized (test context) — allow
        from encore_cache.helpers import rate_limit_key
        key = rate_limit_key(f"checkout:{current_user.id}")
        try:
            limiter.check_or_raise(key)
        except RateLimitExceeded as exc:
            from encore_common import error_envelope
            request_id = getattr(request.state, "request_id", "")
            raise HTTPException(
                status_code=429,
                detail=error_envelope(
                    "CHECKOUT_RATE_LIMIT_EXCEEDED",
                    f"Too many checkout attempts. Retry in "
                    f"{exc.result.retry_after_seconds:.1f}s.",
                    request_id,
                ),
                headers={"Retry-After": str(int(exc.result.retry_after_seconds) + 1)},
            ) from exc

    return _inner
