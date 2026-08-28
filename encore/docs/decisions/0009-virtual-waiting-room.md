# ADR-0009: Virtual Waiting Room as a Dedicated Service

**Status:** Accepted
**Date:** 2026-08-29
**Deciders:** project author (solo project)

## Context

Week 6 introduces the virtual waiting room, which solves the thundering-herd
problem for flash-sale events. Two million users arriving simultaneously
must not reach PostgreSQL directly. They are queued, and admitted at a
controlled rate that the inventory system can safely absorb.

Per `docs/architecture/service-boundaries.md`:
> `waiting-room`: Virtual queue admission for flash sales. State: Redis.
> Sync in: gateway. Async out: emits `waitingroom.*`.

This ADR documents four key decisions.

---

## Decision 1: New Service, Not a Module in api-gateway

The service-boundaries doc states: "New service = new subfolder under `apps/`
+ an ADR explaining why it isn't a module in an existing service."

The waiting room is a separate service because:
- It has **distinct state** (Redis sorted sets, not Postgres).
- It has a **distinct deployment concern**: during a flash sale, the waiting
  room must scale independently of the API gateway.
- It runs a **background thread** (the admission ticker) that is conceptually
  separate from the request/response lifecycle of the API gateway.
- It will be consumed by **future services** (notification-service, Week 13)
  that need to react to `waitingroom.*` events without coupling to the gateway.

---

## Decision 2: Redis Sorted Set for the Queue

The queue is implemented as a Redis sorted set (`ZADD` / `ZRANK` / `ZPOPMIN`).

**Why not Kafka as the queue?**
Kafka is the event backbone, not a work queue. Using a Kafka topic as the
waiting-room queue would mean: consumers can't re-read their own position,
admission would require scanning or counting messages, and the queue would
persist across restarts (potentially stale after a flash sale ends). Redis
sorted sets give us O(log N) position queries and atomic batch admission via
`ZPOPMIN N` with a single command. Queue state is ephemeral: if Redis
restarts, the waiting room resets — which is acceptable because a brief
service restart during a flash sale is preferable to a corrupt queue state.

**Score = Unix ms timestamp at join time.**
This gives FIFO ordering. Users who join at the same millisecond receive the
same score; tie-breaking in that case is arbitrary (Redis selects by member
string order). This is acceptable for admission fairness.

---

## Decision 3: Direct Redis Read for Token Validation (Shortcut)

When a user is admitted, the waiting-room service writes a single-use token
into Redis: `SET waiting:token:{token} {user_id}|{event_id} EX 600`.

The API Gateway validates this token on `POST /holds` by calling Redis
`GETDEL waiting:token:{token}` — an atomic read-and-delete operation.

**This violates the service-boundaries rule** ("No service reads another
service's database directly") because the API Gateway reads from the
waiting-room's Redis keyspace.

**Why accepted for Week 6:**
- In V1, all services share a single Redis instance. There is no physical
  separation to enforce.
- The performance benefit is significant: zero inter-service HTTP latency on
  the critical `POST /holds` path during a flash sale.
- The risk is low: the gateway only *reads* (and deletes) a single key. It
  never writes waiting-room state.

**Migration path for Week 17+:**
When the system decomposes into independent Redis instances per service,
this becomes an API call:
```
GET http://waiting-room:8001/internal/validate-token/{token}
```
The waiting-room service returns 200 (valid, token consumed) or 404 (invalid).
Documented here so the shortcut is never forgotten.

---

## Decision 4: Env-Var Flash-Sale Event Detection (Shortcut)

Flash-sale events are configured via `FLASH_SALE_EVENT_IDS=uuid1,uuid2,...`
in both the api-gateway and waiting-room services.

**Long-term design:** An `is_flash_sale BOOLEAN DEFAULT FALSE` column on the
`events` table, readable by both services (or propagated via a Kafka event
when an event is marked flash-sale by an organiser). This is cleaner,
consistent with the database-as-source-of-truth principle, and handles
the case where a flash sale is declared mid-day without a deployment.

**Why env-var for Week 6:** Zero schema changes, zero migrations. Sufficient
for a demo/portfolio context where flash sales are known in advance.
The schema column approach is the correct next step (Week 9+).

---

## Consequences

**Positive:**
- Thundering-herd admission control is now implemented for flash-sale events.
- FIFO queue fairness is guaranteed by Redis sorted set scores.
- Admission tokens are single-use (GETDEL), preventing replay attacks.
- The service is fully optional: events not in `FLASH_SALE_EVENT_IDS` bypass
  the waiting room transparently.
- Kafka events (`waitingroom.user.joined`, `waitingroom.user.admitted`) are
  emitted for future notification-service integration.

**Negative / accepted tradeoffs:**
- Direct Redis read is a service-boundary violation (documented, tracked).
- Env-var flash-sale detection requires a redeploy to change (documented, tracked).
- Queue state is lost on Redis restart (acceptable for V1).

## Related

`apps/waiting-room/`, `docs/architecture/service-boundaries.md`,
`packages/event-contracts/events/waitingroom.py`
