"""Cache client interface and adapters.

Design:
  CacheClient is a Protocol — any class with get/set/delete/ping methods
  satisfies it. This means the api-gateway (and every future service) depends
  on the *interface*, not on redis-py directly, and tests can swap in
  NullCacheClient or fakeredis without patching import paths.

Adapters:
  RedisCacheClient  — production, backed by redis-py
  NullCacheClient   — no-op, used as a fallback when Redis is unavailable
                      so callers never need to branch on Redis health themselves.

All values are stored as UTF-8 strings (JSON-serialised by the caller or by
cache_aside). The client does not perform serialization itself — that keeps
the interface simple and the serialization logic in one place (helpers.py).

Key naming:
  Keys follow the namespace conventions in
  docs/architecture/redis-key-design.md (created this week). Examples:
    event:{event_id}
    event:{event_id}:seats
    session:{user_id}

Failure handling:
  RedisCacheClient catches redis.RedisError in every method and returns the
  safe/empty value instead of raising. This means a Redis outage degrades
  gracefully to cache-miss / no-op rather than taking down the API.
  The exception is logged (stdlib logging) so ops teams see it.
"""

from __future__ import annotations

import logging
from typing import Protocol, runtime_checkable

import redis

logger = logging.getLogger(__name__)


@runtime_checkable
class CacheClient(Protocol):
    """Dependency-inversion boundary for the cache layer.

    Any object that implements get / set / delete / ping satisfies this
    Protocol without inheriting from it. Services should type-hint against
    CacheClient, not against RedisCacheClient, so the implementation can be
    swapped without changing call sites.
    """

    def get(self, key: str) -> str | None:
        """Return the cached string value, or None on miss or error."""
        ...

    def set(self, key: str, value: str, ttl_seconds: int | None = None) -> bool:
        """Store value under key. Returns True on success, False on error."""
        ...

    def delete(self, *keys: str) -> int:
        """Delete one or more keys. Returns number of keys removed."""
        ...

    def ping(self) -> bool:
        """Return True if the cache is reachable, False otherwise."""
        ...


class RedisCacheClient:
    """Production Redis adapter using redis-py.

    Connection pooling is handled internally by redis-py's ConnectionPool.
    pool_kwargs are forwarded to redis.Redis() at construction time, so
    callers can tune pool size, socket timeout, etc. without subclassing.

    Every method silently absorbs RedisError and returns the safe fallback
    value (None / False / 0) while logging the exception at WARNING level.
    This implements the graceful-degradation requirement from
    docs/architecture/v1-scope-freeze.md §44 (Redis failure scenario).
    """

    def __init__(
        self,
        host: str = "localhost",
        port: int = 6379,
        db: int = 0,
        decode_responses: bool = True,
        **pool_kwargs,
    ) -> None:
        self._redis = redis.Redis(
            host=host,
            port=port,
            db=db,
            decode_responses=decode_responses,
            **pool_kwargs,
        )

    # ------------------------------------------------------------------
    # CacheClient implementation
    # ------------------------------------------------------------------

    def get(self, key: str) -> str | None:
        try:
            return self._redis.get(key)  # type: ignore[return-value]
        except redis.RedisError as exc:
            logger.warning("Redis GET %s failed: %s", key, exc)
            return None

    def set(self, key: str, value: str, ttl_seconds: int | None = None) -> bool:
        try:
            kwargs: dict = {}
            if ttl_seconds is not None:
                kwargs["ex"] = ttl_seconds
            result = self._redis.set(key, value, **kwargs)
            return bool(result)
        except redis.RedisError as exc:
            logger.warning("Redis SET %s failed: %s", key, exc)
            return False

    def delete(self, *keys: str) -> int:
        if not keys:
            return 0
        try:
            return int(self._redis.delete(*keys))
        except redis.RedisError as exc:
            logger.warning("Redis DELETE %s failed: %s", keys, exc)
            return 0

    def ping(self) -> bool:
        try:
            return bool(self._redis.ping())
        except redis.RedisError:
            return False

    def close(self) -> None:
        """Close the underlying connection pool gracefully."""
        try:
            self._redis.close()
        except Exception:  # noqa: BLE001
            pass


class NullCacheClient:
    """No-op cache client — every method is a safe no-op.

    Used as the fallback when Redis is unavailable at startup or when
    running tests that don't need caching behaviour. Satisfies CacheClient
    without inheriting from it (structural subtyping via Protocol).

    Why a NullCacheClient instead of Optional[CacheClient]?
    Because callers never need to branch:
        cache.get(key)   → always safe to call
    is cleaner than:
        if cache is not None: cache.get(key)
    everywhere. The null object pattern eliminates the conditional burden
    at every call site. See Fowler, Refactoring §10.
    """

    def get(self, key: str) -> str | None:  # noqa: ARG002
        return None

    def set(self, key: str, value: str, ttl_seconds: int | None = None) -> bool:  # noqa: ARG002
        return False

    def delete(self, *keys: str) -> int:  # noqa: ARG002
        return 0

    def ping(self) -> bool:
        return False
