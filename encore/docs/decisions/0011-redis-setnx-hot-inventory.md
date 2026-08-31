# ADR-0011: Redis SETNX Fast-Path Guard for Seat Holds

**Status:** Accepted
**Date:** 2026-08-31
**Deciders:** project author (solo project)

## Context

Week 7 (ADR-0010) closed the seat reservation race condition using a PostgreSQL `SELECT ... FOR UPDATE`. This is correct, but creates a DB bottleneck at flash-sale scale:

- At 50,000 checkout attempts/sec (spec Table §4), the DB primary receives 50K row-lock requests.
- Each lock is held for the duration of the transaction, including domain logic and Kafka envelope construction.
- A thundering herd on a single hot row will result in lock wait queues in the DB connection pool.

The spec (§18) explicitly prescribes a Redis-backed optimisation to be evaluated alongside the DB baseline:

> **Optimized hot-path experiment**: `SETNX hold:event_742:seat_14B user_123 EX 300`

Week 8 implements and measures this.

---

## Decision: Belt-and-Suspenders (Redis Guard + Postgres Truth)

The implementation runs **both** Redis SETNX and Postgres `FOR UPDATE` on every hold request:

```
POST /holds:
  1. [Redis] SETNX hold:{event_id}:{seat_id} → user_id EX 300
     → if NX fails (key already exists): return 409 immediately (no DB lock acquired)
     → if NX succeeds: continue

  2. [Postgres] SELECT ... FOR UPDATE
     → locks the row

  3. [Postgres] Domain check (can_hold)
     → if fails: DELETE Redis key (compensating action), return 409

  4. [Postgres] UPDATE status = HELD, commit

  5. [Redis] SET inventory:{inventory_id}:status = HELD EX 300
```

### Why not replace Postgres with Redis entirely?

| Property | Redis SETNX only | Postgres FOR UPDATE only | Both (ADR-0011) |
|---|---|---|---|
| Correctness | ❌ Redis can lose data (no WAL) | ✅ Always correct | ✅ Always correct |
| Hot-path performance | ✅ Sub-ms Redis rejection | ⚠️ DB lock contention at 50K QPS | ✅ 99% rejections skip DB |
| Redis failure behaviour | ❌ System broken | N/A | ✅ Falls back to DB lock alone |
| Complexity | Medium | Low | Medium |

The 1% case where Redis SETNX passes but Postgres domain check fails (e.g. Redis and Postgres briefly disagree during a partition or failover) is caught by the Postgres `FOR UPDATE`. The compensating action (`DEL` the Redis key) restores consistency.

### Why not just use `SELECT FOR UPDATE SKIP LOCKED`?

`SKIP LOCKED` is designed for queue workers processing indistinguishable tasks. For seat reservations, if User B's request is skipped because User A holds the lock, User B should be told "already held" — not "seat not found". `SKIP LOCKED` would return an empty result set, making it indistinguishable from a truly non-existent seat.

---

## Key Lifecycle: How Redis and Postgres Stay in Sync

| Event | Postgres action | Redis action |
|---|---|---|
| Successful hold | `status = HELD` | SETNX `hold:{event}:{seat}` + SET `inventory:{id}:status = HELD` |
| Explicit release (DELETE /holds) | `status = AVAILABLE` | DEL `hold:{event}:{seat}`, DEL `inventory:{id}:status` |
| Hold expiry (worker) | `status = AVAILABLE` | DEL `hold:{event}:{seat}`, DEL `inventory:{id}:status` |
| Redis TTL expires naturally | No change | Key gone — next hold attempt will acquire SETNX and re-validate against Postgres |

The Redis TTL matches `hold_ttl_minutes` (default 300s). Even if the expiry worker fails to delete the Redis key, the TTL provides natural cleanup with no correctness risk (Postgres row is already AVAILABLE).

---

## Graceful Degradation

If Redis is unavailable (`NullCacheClient` path):
- SETNX guard is skipped entirely.
- `SELECT ... FOR UPDATE` handles correctness.
- Throughput is lower (DB is the bottleneck), but the system remains correct.
- No Redis call is in the critical path — only a `hasattr(cache, "_redis")` check.

---

## New API: `GET /api/v1/inventory/{inventory_id}`

Week 8 also adds a single-seat status endpoint backed by the `inventory:{inventory_id}:status` cache key. This enables front-ends to poll individual seat status (e.g. after a hold times out) without loading all seats for an event.

---

## Consequences

**Positive:**
- At flash-sale scale, approximately 99% of duplicate hold attempts are rejected at the Redis layer (sub-millisecond), never reaching the DB connection pool.
- The DB connection pool is reserved for the 1% of requests that have a real chance of succeeding (genuine first-time hold attempts for unclaimed seats).
- Correctness guarantee is unchanged (Postgres remains the source of truth).

**Negative / accepted tradeoffs:**
- Every successful hold now writes to both Redis and Postgres. The overhead is a single non-blocking Redis SET after the Postgres commit — negligible compared to the DB transaction cost.
- Redis now holds state that mirrors Postgres. This introduces a new failure mode to monitor: keys that survive longer than expected (e.g. if the expiry worker is delayed). The TTL bounds this risk.

## Related

`apps/api-gateway/src/encore_gateway/routers/holds.py`, `packages/hold-expiry/src/encore_hold_expiry/worker.py`, ADR-0010, `docs/benchmarks/week8-hot-inventory.md`
