# Week 6 Completion Report: Virtual Waiting Room

**Date:** 2026-08-29

## Goal

Deliver the Week 6 item deferred from the vertical slice: the Virtual Waiting Room.
> Solve the thundering-herd problem for flash-sale events by queuing users and admitting them at a controlled rate.

---

## Delivered Artifacts

### 1. `apps/waiting-room` (New Service)

| File | Purpose |
|---|---|
| `config.py` | Settings: Redis, Kafka, Snowflake worker ID, flash-sale event IDs, admission parameters |
| `queue.py` | `WaitingRoomQueue` — all Redis operations: ZADD, ZRANK, ZPOPMIN, pipeline, GETDEL |
| `ticker.py` | `AdmissionTicker` — daemon thread, ticks every `interval_secs`, calls `admit_batch()`, emits Kafka events |
| `routers/health.py` | `GET /health` |
| `routers/queue_router.py` | `POST /{event_id}/join`, `GET /{event_id}/status` |
| `main.py` | Lifespan: Redis → Queue → Kafka → Ticker |
| `Dockerfile` | Same root-context build pattern as api-gateway |
| `tests/test_queue.py` | 17 tests covering all queue operations with fakeredis |

**Redis key scheme:**
| Key | Type | Purpose |
|---|---|---|
| `waiting:queue:{event_id}` | Sorted Set | FIFO queue (score = join timestamp in ms) |
| `waiting:admitted:{event_id}:{user_id}` | String | Admission flag (TTL = 600s) |
| `waiting:token:{token}` | String | Single-use token → `user_id|event_id` (GETDEL consumed) |
| `waiting:user_token:{event_id}:{user_id}` | String | Reverse lookup for status queries |

### 2. `packages/event-contracts` (Extended)

| Schema | Topic | When emitted |
|---|---|---|
| `WaitingRoomJoinedPayload` | `waitingroom.user.joined` | On new queue entry (not re-join) |
| `WaitingRoomAdmittedPayload` | `waitingroom.user.admitted` | On each ticker admission |

### 3. API Gateway Integration

| Change | Detail |
|---|---|
| `config.py` | `flash_sale_event_ids` (comma-sep env var) + `flash_sale_set` property |
| `routers/holds.py` | `_validate_waiting_room_token()` guard — checks `X-Waiting-Room-Token` header, GETDEL from shared Redis, raises 403 if missing/invalid/used |

**Single-use token enforcement:** `cache._redis.getdel(token_key)` — atomic read-and-delete. The same token cannot be reused.

### 4. DevOps

| Change | Detail |
|---|---|
| `docker-compose.yml` | `waiting-room` service on port 8001, depends on Redis + Kafka |
| `scripts/create_topics.py` | 4 new topics: `waitingroom.user.joined{,.dlq}`, `waitingroom.user.admitted{,.dlq}` |
| `Makefile` | `test-waiting-room`, `lint-waiting-room`, `run-waiting-room` |
| CI | `apps/waiting-room` added to matrix |
| `.env.example` | `FLASH_SALE_EVENT_IDS`, `ADMISSION_BATCH_SIZE`, `ADMISSION_INTERVAL_SECS` |

### 5. Documentation

- **ADR-0009** — Four decisions: new service rationale, Redis sorted set choice, direct-Redis token validation shortcut + migration path, env-var flash-sale detection shortcut.

---

## Acceptance Criteria

- [x] Flash-sale users must join a queue before holding a seat
- [x] Queue is FIFO (sorted set score = join timestamp)
- [x] Admission ticker runs every N seconds, admits up to M users per event
- [x] Admitted users receive a single-use token
- [x] `POST /holds` validates and consumes token atomically (GETDEL)
- [x] Replay attacks blocked: second use of same token → 403
- [x] Non-flash-sale events bypass the waiting room transparently
- [x] `waitingroom.user.joined` emitted on new queue entry
- [x] `waitingroom.user.admitted` emitted by ticker per admitted user
- [x] 17 queue unit tests pass (fakeredis)
- [x] All existing api-gateway tests unaffected
- [x] ADR-0009 written and documents the two V1 shortcuts
- [x] Syntax regression passed

---

## Explicitly NOT in Week 6

| Deferred item | Planned week |
|---|---|
| `is_flash_sale` DB column + migration | Week 9+ |
| Inter-service HTTP token validation | Week 17+ |
| Virtual queue for resale (separate admission) | Not in V1 scope |
| Waiting-room notification to user | Week 13 (notification-service) |
