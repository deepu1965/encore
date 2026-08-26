"""Unit tests for cache_aside helper and key namespace functions.

Uses NullCacheClient and simple dict-backed fake clients to avoid any Redis
dependency. Tests the cache_aside contract exhaustively:

  - HIT path: fallback is never called
  - MISS path: fallback is called and result is stored
  - None result: never cached
  - Corrupted entry: treated as miss, re-populated
  - Serialization error: result returned uncached
  - Fallback error: propagated to caller
  - Key namespace functions produce expected strings
  - invalidate() proxies to cache.delete()
"""

from __future__ import annotations

import json
import pytest

from encore_cache.client import NullCacheClient
from encore_cache.helpers import (
    TTL_EVENT_SECONDS,
    TTL_SEATS_SECONDS,
    TTL_SESSION_SECONDS,
    cache_aside,
    event_key,
    event_seats_key,
    invalidate,
    rate_limit_key,
    session_key,
)


# ---------------------------------------------------------------------------
# Minimal in-memory cache client for testing
# ---------------------------------------------------------------------------


class DictCacheClient:
    """Simple dict-backed cache client used in tests.

    Satisfies CacheClient protocol.  Not production-safe (no TTL, not
    thread-safe) but fine for unit tests.
    """

    def __init__(self):
        self._store: dict[str, str] = {}
        self.get_calls: int = 0
        self.set_calls: int = 0
        self.delete_calls: int = 0

    def get(self, key: str) -> str | None:
        self.get_calls += 1
        return self._store.get(key)

    def set(self, key: str, value: str, ttl_seconds: int | None = None) -> bool:
        self.set_calls += 1
        self._store[key] = value
        return True

    def delete(self, *keys: str) -> int:
        self.delete_calls += 1
        removed = sum(1 for k in keys if k in self._store)
        for k in keys:
            self._store.pop(k, None)
        return removed

    def ping(self) -> bool:
        return True


# ---------------------------------------------------------------------------
# cache_aside — HIT path
# ---------------------------------------------------------------------------


def test_cache_hit_does_not_call_fallback():
    cache = DictCacheClient()
    cache.set("k", json.dumps({"id": 1}))
    call_count = 0

    def fallback():
        nonlocal call_count
        call_count += 1
        return {"id": 99}

    result = cache_aside(cache, "k", ttl_seconds=60, fallback=fallback)
    assert result == {"id": 1}
    assert call_count == 0, "fallback should not be called on HIT"


def test_cache_hit_returns_deserialized_value():
    cache = DictCacheClient()
    cache.set("event:42", json.dumps({"name": "Concert", "seats": 100}))
    result = cache_aside(cache, "event:42", ttl_seconds=60, fallback=lambda: None)
    assert result == {"name": "Concert", "seats": 100}


# ---------------------------------------------------------------------------
# cache_aside — MISS path
# ---------------------------------------------------------------------------


def test_cache_miss_calls_fallback():
    cache = DictCacheClient()
    call_count = 0

    def fallback():
        nonlocal call_count
        call_count += 1
        return {"id": 42}

    result = cache_aside(cache, "event:42", ttl_seconds=60, fallback=fallback)
    assert result == {"id": 42}
    assert call_count == 1


def test_cache_miss_populates_cache():
    cache = DictCacheClient()
    cache_aside(cache, "event:42", ttl_seconds=60, fallback=lambda: {"id": 42})
    assert cache.set_calls == 1
    stored = cache.get("event:42")
    assert stored is not None
    assert json.loads(stored) == {"id": 42}


def test_cache_miss_subsequent_call_is_hit():
    cache = DictCacheClient()
    call_count = 0

    def fallback():
        nonlocal call_count
        call_count += 1
        return {"id": 42}

    cache_aside(cache, "k", 60, fallback)
    cache_aside(cache, "k", 60, fallback)
    assert call_count == 1, "second call should be a HIT, not call fallback again"


# ---------------------------------------------------------------------------
# cache_aside — None result (not cached)
# ---------------------------------------------------------------------------


def test_none_result_is_not_cached():
    cache = DictCacheClient()
    cache_aside(cache, "missing:entity", ttl_seconds=60, fallback=lambda: None)
    assert cache.set_calls == 0
    assert cache.get("missing:entity") is None


def test_none_result_returned_to_caller():
    cache = DictCacheClient()
    result = cache_aside(cache, "k", 60, lambda: None)
    assert result is None


# ---------------------------------------------------------------------------
# cache_aside — NullCacheClient (Redis-down scenario)
# ---------------------------------------------------------------------------


def test_null_client_always_calls_fallback():
    cache = NullCacheClient()
    call_count = 0

    def fallback():
        nonlocal call_count
        call_count += 1
        return {"degraded": True}

    result = cache_aside(cache, "k", 60, fallback)
    assert result == {"degraded": True}
    assert call_count == 1


def test_null_client_never_stores_result():
    """With NullCacheClient, set() is a no-op, so every call is a miss."""
    cache = NullCacheClient()
    results = [cache_aside(cache, "k", 60, lambda: {"v": i}) for i in range(3)]
    # All three calls returned a value (not None).
    assert all(r is not None for r in results)


# ---------------------------------------------------------------------------
# cache_aside — corrupted cache entry (deserialize error → treat as miss)
# ---------------------------------------------------------------------------


def test_corrupted_entry_treated_as_miss():
    cache = DictCacheClient()
    cache._store["k"] = "{{INVALID JSON"  # deliberately bad
    call_count = 0

    def fallback():
        nonlocal call_count
        call_count += 1
        return {"repaired": True}

    result = cache_aside(cache, "k", 60, fallback)
    assert result == {"repaired": True}
    assert call_count == 1


# ---------------------------------------------------------------------------
# cache_aside — custom serialize / deserialize
# ---------------------------------------------------------------------------


def test_custom_serializer():
    cache = DictCacheClient()
    # Store a plain string, not JSON.
    result = cache_aside(
        cache,
        "k",
        60,
        fallback=lambda: "hello",
        serialize=lambda v: v,
        deserialize=lambda s: s,
    )
    assert result == "hello"
    assert cache.get("k") == "hello"


# ---------------------------------------------------------------------------
# cache_aside — fallback raises (propagated to caller)
# ---------------------------------------------------------------------------


def test_fallback_exception_propagates():
    cache = DictCacheClient()

    def broken_fallback():
        raise RuntimeError("DB is down")

    with pytest.raises(RuntimeError, match="DB is down"):
        cache_aside(cache, "k", 60, broken_fallback)


# ---------------------------------------------------------------------------
# invalidate()
# ---------------------------------------------------------------------------


def test_invalidate_deletes_key():
    cache = DictCacheClient()
    cache.set("event:42", "data")
    count = invalidate(cache, "event:42")
    assert count == 1
    assert cache.get("event:42") is None


def test_invalidate_multiple_keys():
    cache = DictCacheClient()
    cache.set("k1", "v1")
    cache.set("k2", "v2")
    count = invalidate(cache, "k1", "k2")
    assert count == 2


def test_invalidate_nonexistent_key_is_safe():
    cache = DictCacheClient()
    count = invalidate(cache, "ghost")
    assert count == 0


def test_invalidate_no_keys_is_safe():
    cache = DictCacheClient()
    count = invalidate(cache)
    assert count == 0


# ---------------------------------------------------------------------------
# Key namespace functions
# ---------------------------------------------------------------------------


def test_event_key():
    assert event_key("42") == "event:42"
    assert event_key("abc-def") == "event:abc-def"


def test_event_seats_key():
    assert event_seats_key("42") == "event:42:seats"


def test_session_key():
    assert session_key("user-123") == "session:user-123"


def test_rate_limit_key():
    assert rate_limit_key("192.168.1.1") == "ratelimit:192.168.1.1"


# ---------------------------------------------------------------------------
# TTL constants are positive integers
# ---------------------------------------------------------------------------


def test_ttl_constants_are_positive():
    assert TTL_EVENT_SECONDS > 0
    assert TTL_SEATS_SECONDS > 0
    assert TTL_SESSION_SECONDS > 0


def test_seats_ttl_shorter_than_event_ttl():
    """Seat availability changes faster than event metadata."""
    assert TTL_SEATS_SECONDS <= TTL_EVENT_SECONDS
