"""Cache-aside helper and key namespace definitions.

cache_aside()
  Generic cache-aside pattern implementation. Callers provide:
    - a cache key
    - a TTL
    - a callable that returns the authoritative value from the DB

  The function returns the cached value if present (HIT), or calls the
  fallback, caches its result, and returns it (MISS). On a Redis error
  the fallback is always called and the result is returned uncached.

  Importantly, cache_aside never stores None — a fallback that returns None
  (e.g. entity not found) bypasses the cache. This avoids negative caching
  issues in Week 3 while keeping the door open for explicit negative-cache
  strategies in later weeks.

Key namespace constants:
  Collected here as a single source of truth. All callers import keys from
  this module rather than hand-rolling strings, so a rename touches one
  place. Examples:
    event_key("42")                          → "event:42"
    event_seats_key("42")                    → "event:42:seats"
    session_key("u1")                        → "session:u1"
    hold_key("evt-1", "seat-2")              → "hold:evt-1:seat-2"
    inventory_status_key("inv-3")            → "inventory:inv-3:status"

Serialization:
  cache_aside serializes / deserializes values as JSON strings. The
  serialize/deserialize callables are injected so callers control the exact
  schema without coupling this module to FastAPI or SQLAlchemy.

TTL defaults (documented for Week 3, tuned with real metrics later):
  Event metadata   60 s  — low staleness cost; changed rarely
  Seat availability  30 s  — higher turnover, short flash-sale windows
  Session          900 s  — 15 min — revisit with real auth in packages/auth
"""

from __future__ import annotations

import json
import logging
from collections.abc import Callable
from typing import Any, TypeVar

from .client import CacheClient

logger = logging.getLogger(__name__)

T = TypeVar("T")

# ---------------------------------------------------------------------------
# Key namespace constants
# ---------------------------------------------------------------------------

# Week 3 TTL defaults — chosen conservatively until load tests validate them.
# Tuned in Week 17 (Flash-Sale Load Testing) based on measured staleness vs.
# DB load tradeoff. See docs/benchmarks/ for future results.
TTL_EVENT_SECONDS = 60
TTL_SEATS_SECONDS = 30
TTL_SESSION_SECONDS = 900


def event_key(event_id: str) -> str:
    """Cache key for event metadata: event:{event_id}"""
    return f"event:{event_id}"


def event_seats_key(event_id: str) -> str:
    """Cache key for seat-availability list: event:{event_id}:seats"""
    return f"event:{event_id}:seats"


def session_key(user_id: str) -> str:
    """Cache key for user session data: session:{user_id}"""
    return f"session:{user_id}"


def hold_key(event_id: str, seat_id: str) -> str:
    """Redis key for the SETNX per-seat hold lock (Week 8).

    Namespace: hold:{event_id}:{seat_id}
    Value: user_id of the holder (informational; not used for auth checks).
    TTL: matches hold_ttl_seconds (default 300s / 5 min).

    The key is acquired via SETNX before the Postgres FOR UPDATE — it acts
    as a fast-path guard to eliminate DB lock contention in the common case.
    The Postgres row lock remains the authoritative correctness guarantee.
    """
    return f"hold:{event_id}:{seat_id}"


def inventory_status_key(inventory_id: str) -> str:
    """Redis key for the per-seat inventory status cache (Week 8).

    Namespace: inventory:{inventory_id}:status
    Value: 'AVAILABLE' | 'HELD' | 'SOLD'
    TTL: TTL_SEATS_SECONDS (30 s), refreshed on every write.

    Used by GET /api/v1/inventory/{inventory_id} as a cache-aside read,
    and populated on every successful hold/release/purchase transition.
    """
    return f"inventory:{inventory_id}:status"


def rate_limit_key(identity: str) -> str:
    """Cache key for rate-limit counters: ratelimit:{identity}
    Placeholder — actual token-bucket logic lands Week 4 (edge controls).
    """
    return f"ratelimit:{identity}"


# ---------------------------------------------------------------------------
# cache_aside
# ---------------------------------------------------------------------------


def cache_aside(
    cache: CacheClient,
    key: str,
    ttl_seconds: int,
    fallback: Callable[[], T | None],
    serialize: Callable[[T], str] | None = None,
    deserialize: Callable[[str], T] | None = None,
) -> T | None:
    """Generic cache-aside (lazy-population) helper.

    Flow:
        1. Try cache.get(key)
        2. HIT  → deserialize and return
        3. MISS → call fallback()
               → if result is not None: serialize and cache.set()
               → return result (cached or not)

    Args:
        cache:        A CacheClient (RedisCacheClient or NullCacheClient).
        key:          The full, namespaced cache key.
        ttl_seconds:  Expiry for the cached value in seconds.
        fallback:     Callable returning the authoritative value (DB query etc.)
                      Called on every cache miss. Must be free of side effects
                      that should only happen once.
        serialize:    Convert T → str for storage. Defaults to json.dumps.
        deserialize:  Convert str → T on cache hit. Defaults to json.loads.

    Returns:
        The value (from cache or from fallback), or None if fallback returns
        None (e.g. entity not found). None is never stored in the cache.

    Invariants:
        - If Redis is down, NullCacheClient.get() always returns None, so the
          fallback is always called and the result returned uncached. The API
          degrades to "no caching" rather than failing.
        - The fallback is never called on a cache HIT.
        - None is never cached (avoids stale negative entries in Week 3).
    """
    _serialize: Callable[[Any], str] = serialize or json.dumps
    _deserialize: Callable[[str], Any] = deserialize or json.loads

    # --- 1. Cache lookup ---
    cached_raw = cache.get(key)
    if cached_raw is not None:
        logger.debug("Cache HIT: %s", key)
        try:
            return _deserialize(cached_raw)
        except (ValueError, TypeError) as exc:
            # Corrupted cache entry — treat as miss, re-populate below.
            logger.warning("Cache deserialize error for key %s: %s", key, exc)

    # --- 2. Cache miss — call authoritative source ---
    logger.debug("Cache MISS: %s", key)
    result = fallback()

    # --- 3. Populate cache if we got a real value ---
    if result is not None:
        try:
            serialized = _serialize(result)
            cache.set(key, serialized, ttl_seconds=ttl_seconds)
        except (TypeError, ValueError) as exc:
            # Serialization failure: log and continue — the caller still gets
            # the correct result, just uncached this time.
            logger.warning("Cache serialize error for key %s: %s", key, exc)

    return result


def invalidate(cache: CacheClient, *keys: str) -> int:
    """Delete one or more cache keys (explicit invalidation).

    Used on write paths — e.g. after POST /holds or POST /orders — to ensure
    subsequent reads see fresh data within the next TTL window rather than
    waiting out the full TTL.

    Returns the number of keys that were actually deleted.

    Design note: in Week 3, invalidation is synchronous and in-process.
    A future week (post-Kafka) could publish an invalidation event to let
    other API replicas also flush their cache entries — but that's a
    premature optimization here.
    """
    if not keys:
        return 0
    count = cache.delete(*keys)
    logger.debug("Cache invalidated %d/%d keys: %s", count, len(keys), keys)
    return count
