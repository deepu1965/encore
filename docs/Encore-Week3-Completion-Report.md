# Week 3 Completion Report: V1 Redis Foundation

**Date:** 2026-08-25

## Goal
Introduce Redis as a caching layer to protect PostgreSQL from read-heavy traffic, establish cache-aside patterns and TTL conventions, and implement consistent hashing for future horizontal scaling, all without prematurely building the final flash-sale reservation logic.

## Delivered Artifacts

1. **`packages/cache` (New Shared Package)**
   - **Protocol Interface:** `CacheClient` decouples application logic from `redis-py`.
   - **Adapters:** `RedisCacheClient` (production) and `NullCacheClient` (graceful fallback).
   - **Cache-Aside Helper:** Generic `cache_aside` function that handles HIT/MISS logic, serialization, and fallback execution.
   - **Consistent Hashing:** `ConsistentHashRing` implementation using virtual nodes and SHA-256 (stdlib only), ready for multi-node deployments in Week 16.
   - **Key Namespace Management:** Centralized cache key generation and documented TTL defaults (`event_key`, `event_seats_key`, `session_key`).
   - **Test Suite:** 19 robust tests for consistent hashing and 20+ tests for the cache clients and helpers (using `fakeredis` and in-memory mocks).

2. **API Gateway Integration**
   - **Dependency Injection:** Created `cache.py` to manage the global Redis connection lifecycle via FastAPI's `lifespan` context manager.
   - **Read Path Caching:** Applied `cache_aside` to `GET /api/v1/events/{id}/seats` to cache seat availability.
   - **Write Path Invalidation:** Added explicit `invalidate()` calls to `POST /holds` and `POST /orders` to clear the relevant event seats cache upon mutation.
   - **Graceful Degradation:** If Redis connection fails on startup or mid-request, the gateway falls back to `NullCacheClient` and continues serving requests directly from PostgreSQL without downtime.

3. **Infrastructure & CI Updates**
   - **Dockerfile & Makefile:** Updated to install the new local `packages/cache` dependency.
   - **CI Pipeline:** Extended `.github/workflows/ci.yml` to lint and test the `cache` package alongside `common` and `api-gateway`.
   - **Config:** Added `redis_host` and `redis_port` to the `Settings` class to read from the environment.

4. **Documentation**
   - **ADR-0005:** Documented the decision to use the cache-aside pattern, Null Object fallback, and consistent hashing while explicitly deferring distributed locks.

## Acceptance Criteria Checklist
- [x] Redis cache client created with proper interface abstraction.
- [x] `cache_aside` helper implemented and applied to key read paths.
- [x] Cache invalidation added to write paths.
- [x] Consistent hashing with virtual nodes implemented and tested.
- [x] Application survives Redis outage gracefully.
- [x] Tests written for the caching layer.
- [x] ADR added explaining trade-offs.

## Next Steps (Week 4)
Week 4 focuses on **V1 Edge & Rate Limiting**, building upon this week's foundation to implement token-bucket rate limiting (using Redis) and a robust Edge Gateway layer to protect the system from abuse.
