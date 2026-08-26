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

NOT in Week 3 scope (later weeks):
  - SETNX seat reservation locks (Week 8)
  - distributed locking (Week 8)
  - TTL expiry background jobs (Week 9)
"""

from .client import CacheClient, NullCacheClient, RedisCacheClient
from .consistent_hashing import ConsistentHashRing
from .helpers import cache_aside, event_key, event_seats_key, invalidate, session_key

__all__ = [
    "CacheClient",
    "RedisCacheClient",
    "NullCacheClient",
    "cache_aside",
    "invalidate",
    "event_key",
    "event_seats_key",
    "session_key",
    "ConsistentHashRing",
]
