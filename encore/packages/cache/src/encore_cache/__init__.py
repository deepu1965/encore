"""encore-cache — Redis-backed caching layer for Encore v1.

Public surface:
  CacheClient          Protocol (interface) — dependency-inversion boundary
  RedisCacheClient     Production adapter backed by redis-py
  NullCacheClient      No-op fallback used when Redis is unavailable
  cache_aside          Generic cache-aside helper

Week 3 scope:
  - cache-aside GET / SET / TTL
  - key namespace conventions
  - graceful Redis-down fallback (NullCacheClient)

Week 8 scope:
  - hold_key           Redis SETNX seat hold lock
  - inventory_status_key  Per-seat availability status cache
"""

from .client import CacheClient, NullCacheClient, RedisCacheClient
from .consistent_hashing import ConsistentHashRing
from .helpers import (
    cache_aside,
    event_key,
    event_seats_key,
    hold_key,
    invalidate,
    inventory_status_key,
    session_key,
)

__all__ = [
    "CacheClient",
    "RedisCacheClient",
    "NullCacheClient",
    "cache_aside",
    "invalidate",
    "event_key",
    "event_seats_key",
    "session_key",
    "hold_key",
    "inventory_status_key",
    "ConsistentHashRing",
]
