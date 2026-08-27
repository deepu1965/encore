"""Cache dependency injection.

Provides the `get_cache` dependency for FastAPI routers. Configures the
production Redis client at startup and cleanly closes it at shutdown.
If Redis is unavailable, degrades gracefully via NullCacheClient.
"""

from __future__ import annotations

import logging
from collections.abc import Generator

from encore_cache import CacheClient, NullCacheClient, RedisCacheClient

from .config import settings

logger = logging.getLogger(__name__)

# Module-level singleton — set by init_cache(), read by get_cache().
_cache: CacheClient | None = None


def init_cache() -> CacheClient:
    """Initialize the global cache client. Call this on app startup.

    Returns the initialized client so callers (e.g. lifespan) can store it
    on app.state for middleware / other components that need direct access.
    """
    global _cache
    logger.info(
        "Initializing Redis cache client against %s:%s",
        settings.redis_host,
        settings.redis_port,
    )

    try:
        client = RedisCacheClient(
            host=settings.redis_host,
            port=settings.redis_port,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        if client.ping():
            logger.info("Redis cache connected successfully.")
            _cache = client
        else:
            logger.warning("Redis ping failed, falling back to NullCacheClient.")
            _cache = NullCacheClient()
    except Exception as exc:
        logger.warning(
            "Failed to connect to Redis (%s), falling back to NullCacheClient.", exc
        )
        _cache = NullCacheClient()

    return _cache


def close_cache() -> None:
    """Close the global cache client. Call this on app shutdown."""
    global _cache
    if isinstance(_cache, RedisCacheClient):
        _cache.close()
    _cache = None


def get_cache() -> Generator[CacheClient, None, None]:
    """FastAPI dependency: yields the global cache client."""
    if _cache is None:
        # Fallback if init_cache wasn't called (e.g. some test contexts).
        yield NullCacheClient()
    else:
        yield _cache
