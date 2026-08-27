# Week 4 Completion Report: V1 Edge & Rate Limiting

**Date:** 2026-08-27

## Goal

Deliver two Week 4 items deferred from the vertical slice:
1. **Distributed rate limiter** — token-bucket, Redis-backed, per-IP global + per-user checkout
2. **Snowflake ID generator** — 64-bit time-sorted IDs replacing `uuid4()` for orders and tickets

---

## Delivered Artifacts

### 1. `packages/id-generator` (New Package — Zero External Dependencies)

| File | Purpose |
|---|---|
| `src/encore_id_generator/generator.py` | `SnowflakeIDGenerator` + `SnowflakeID` value object |
| `src/encore_id_generator/__init__.py` | Package exports with rationale docstring |
| `tests/test_id_generator.py` | 24 tests covering correctness, ordering, uniqueness, bit extraction, UUID storage, thread safety |

**Snowflake layout:** 41-bit timestamp (ms since 2024-01-01) + 10-bit worker ID + 12-bit sequence.  
**Thread safety:** `threading.Lock` guards `(last_ms, sequence)` state.  
**Clock skew:** Spin-wait until clock catches up, with WARNING log.  
**Storage:** `as_uuid()` packs Snowflake value into a `uuid.UUID` (lower 64 bits) — zero schema changes.

### 2. `packages/rate-limiter` (New Package)

| File | Purpose |
|---|---|
| `src/encore_rate_limiter/lua.py` | Atomic Lua script constant (token-bucket read-modify-write) |
| `src/encore_rate_limiter/limiter.py` | `RateLimitConfig`, `RateLimitResult`, `RateLimitExceeded`, `RateLimiter`, `_apply_token_bucket` |
| `src/encore_rate_limiter/__init__.py` | Package exports |
| `tests/test_rate_limiter.py` | Unit tests (pure Python) + integration tests (fakeredis) |

**Algorithm:** Token bucket — O(1) memory per identity, burst-tolerant.  
**Atomicity:** Lua script via `redis.eval()` — no WATCH/MULTI/EXEC retry loops.  
**Fail-open:** If Redis is unreachable, all `check()` calls return `allowed=True`.  
**`_apply_token_bucket`:** Pure-Python mirror of the Lua script for unit testing without Redis.

### 3. API Gateway Integration

| File | Change |
|---|---|
| `config.py` | Added `rate_limit_global_*`, `rate_limit_checkout_*`, `snowflake_worker_id` settings |
| `cache.py` | `init_cache()` now returns the `CacheClient` for `app.state` storage |
| `rate_limit.py` (new) | `init_rate_limiters()`, stores two limiters on `app.state` |
| `middleware/rate_limit.py` (new) | `RateLimitMiddleware` — per-IP global limit, `Retry-After` + `X-RateLimit-Remaining` headers |
| `main.py` | Lifespan stores cache on `app.state`, calls `init_rate_limiters()`, adds middleware |
| `routers/holds.py` | Cleaned up mid-file imports from Week 3 |
| `routers/orders.py` | Snowflake IDs for Order + Ticket PKs; in-line checkout rate limit |

### 4. DevOps

- **Dockerfile:** Copies and installs `packages/rate-limiter` + `packages/id-generator`
- **Makefile:** Added `test-rate-limiter`, `lint-rate-limiter`, `test-id-generator`, `lint-id-generator`
- **CI:** Both new packages added to the test matrix
- **`.env.example`:** New env vars for rate limit thresholds + worker ID

### 5. Documentation

- **ADR-0006:** Token-bucket rationale, Lua atomicity, fail-open policy, identity scheme
- **ADR-0007:** Snowflake ID vs UUID4 / ULID, transitional UUID storage, future BIGINT migration path

---

## Acceptance Criteria

- [x] Redis-backed token-bucket rate limiter implemented with Lua atomicity
- [x] Global per-IP middleware (100/min default, 10-burst) on all routes except `/health`
- [x] Per-user checkout rate limit (3/min, 1-burst) on `POST /api/v1/orders`
- [x] Fail-open behaviour when Redis is unavailable
- [x] `Retry-After` and `X-RateLimit-Remaining` headers on 429 and 2xx responses
- [x] Snowflake ID generator (41+10+12 bits, thread-safe, clock-skew handled)
- [x] Snowflake IDs used for Order and Ticket PKs (stored as UUID, zero schema changes)
- [x] `SNOWFLAKE_WORKER_ID` env-var configurable
- [x] 24 ID generator tests pass (pure Python)
- [x] Rate limiter unit tests (pure Python) + integration tests (fakeredis)
- [x] All existing 23 api-gateway tests unaffected (regression clean)
- [x] ADR-0006 + ADR-0007 written
- [x] Syntax check: `python3 -m py_compile` passes on all source files

---

## Explicitly NOT in Week 4 (next weeks)

| Deferred item | Planned week |
|---|---|
| Kafka event emission for rate limit events | Week 5 |
| Virtual waiting room / queue | Week 6 |
| `SETNX` seat reservation locks | Week 7-8 |
| Real JWT auth | Future `packages/auth` |
| Dedicated edge service extraction | Post-Week 9 |
| `BIGINT` PK migration (full Snowflake schema) | Week 15+ |
