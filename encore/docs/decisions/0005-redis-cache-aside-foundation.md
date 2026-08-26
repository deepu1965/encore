# ADR-0005: Redis Cache-Aside Foundation

**Status:** Accepted
**Date:** 2026-08-25
**Deciders:** project author (solo project)

## Context

Week 3 focuses on the "V1 Redis Foundation". The system needs a caching layer to protect PostgreSQL from read-heavy traffic (like flash sales), but the final seat reservation system (which requires Redis distributed locks or Lua scripts) is explicitly deferred to Weeks 7-8. We need a way to introduce Redis safely and cleanly without overstepping the Week 3 boundary.

## Decision

1.  **Cache-Aside Pattern:** We implement a generic `cache_aside` helper in a new `encore-cache` package. All read paths (e.g., fetching seat availability) will check the cache first. If a miss occurs, the fallback function (DB query) is executed, the result is cached, and then returned.
2.  **Graceful Degradation (Null Object Pattern):** If Redis is unavailable, the application must not crash. We implement a `NullCacheClient` that acts as a no-op fallback. The `cache_aside` helper gracefully handles cache misses and Redis connection errors, meaning the API degrades to "Postgres only" rather than failing.
3.  **Consistent Hashing:** We implement a `ConsistentHashRing` with virtual nodes. Even though the local environment only uses one Redis node, providing a fully tested, framework-free consistent hashing abstraction now prepares us for Week 16-17 (Scaling / Sharding) without refactoring the cache client later.
4.  **No Reservation Logic Yet:** We strictly avoid using Redis for state mutation (`SETNX` locks, etc.) in this week. The naive PostgreSQL `UPDATE` hold remains the source of truth for now. Write paths (`POST /holds`, `POST /orders`) simply invalidate the cache via explicit `invalidate()` calls so subsequent reads see the updated state.

## Consequences

**Positive:**
-   **Dependency Inversion:** Services depend on a `CacheClient` Protocol, not directly on `redis-py`. This allows seamless testing using fakes/mocks or `NullCacheClient`.
-   **Resilience:** The API survives Redis outages.
-   **Performance:** Flash-sale read queries (like polling for seat status) hit Redis instead of overwhelming PostgreSQL.

**Negative / accepted tradeoffs:**
-   **Cache Invalidation Staleness:** Invalidation currently happens synchronously in the API gateway. In a multi-replica setup (before Kafka is introduced), other replicas might serve stale data for the duration of the TTL. We mitigate this with short TTLs (30s for seats).
-   **Negative Caching:** We explicitly do *not* cache `None` (misses from the DB) to avoid complex cache poisoning edge cases in this initial phase.

## Related

`docs/architecture/v1-scope-freeze.md`, `packages/cache/src/encore_cache/client.py`
