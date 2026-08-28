# ADR-0010: Inventory Core Locking and Expiry

**Status:** Accepted
**Date:** 2026-08-29
**Deciders:** project author (solo project)

## Context

Week 7 implements the core seat reservation guarantees deferred from the vertical slice in Week 2. When a user requests a hold via `POST /api/v1/holds`, two things must happen:
1. Two concurrent requests for the same seat must never both succeed (the race condition must be closed).
2. The hold must expire after a set time (5 minutes per spec) to return inventory to the pool if the user abandons checkout.

This ADR documents the choices made for locking and expiry in Week 7.

---

## Decision 1: `SELECT ... FOR UPDATE` (Pessimistic Locking)

We replace the naive `UPDATE ... WHERE status='AVAILABLE'` with a two-step locked transaction:
```sql
SELECT * FROM inventory WHERE id = ? FOR UPDATE;
-- perform domain checks
UPDATE inventory SET status = 'HELD', ...;
```

**Why FOR UPDATE (Pessimistic Locking)?**
PostgreSQL row-level locking ensures that concurrent transactions attempting to modify the same seat serialise perfectly at the database level.
- **Why not Optimistic Locking (version numbers)?** Optimistic locking throws concurrency errors that the application must retry. In a flash sale, contention for the *same* seat is low to moderate (thousands of users want tickets, but they are distributed across thousands of seats; collision only happens when two users randomly pick the *exact same* seat). Pessimistic locking handles this by making one wait 50ms while the other commits, which is a better UX than throwing a 409 to both.
- **Why not `SKIP LOCKED`?** `SKIP LOCKED` immediately skips locked rows. If User A holds the lock and hasn't committed yet, User B would see "seat not found". For seat reservations, waiting a few milliseconds for User A's transaction to resolve (and then correctly getting `SEAT_ALREADY_HELD`) is preferable. `SKIP LOCKED` is a pattern for queue workers processing indistinguishable tasks, not for users requesting specific identifiable resources. (Note: `SKIP LOCKED` remains an option for Week 8 "Hot Inventory" if load testing reveals lock contention latency is unacceptable).

---

## Decision 2: Hold Expiry as a Database Column + Daemon Thread

We added `hold_expires_at: TIMESTAMPTZ` to the `inventory` table. A background thread (`packages/hold-expiry`) polls the database every 60 seconds, releasing holds where `hold_expires_at < NOW()`.

**Why a database column?**
- Keeps the source of truth entirely in PostgreSQL.
- Avoids having to build a distributed delayed-message queue or complex Redis TTL replication right now.

**Why a daemon thread inside the API Gateway?**
- **Simplification for Week 7**: We did not extract the expiry worker into its own standalone microservice yet. Doing so would require duplicating the database connection pool, configuration parsing, and deployment boilerplate for a single SQL query.
- The worker runs inside the `api-gateway` process lifespan.
- **Concurrency protection**: To allow multiple API Gateway instances to run (horizontal scaling), the worker uses `pg_try_advisory_xact_lock(1001)`. This ensures that even if 5 instances of the API Gateway are running, only one instance successfully acquires the lock and executes the expiry query per tick, preventing duplicate `hold_expired` Kafka events.
- **Future Extraction**: In Week 23 (Distributed Scheduler), this logic will be extracted into a standalone cron/worker service.

---

## Decision 3: Partial Index for Expiry Polling

The query run by the expiry worker is:
```sql
UPDATE inventory SET ... WHERE status = 'HELD' AND hold_expires_at < NOW();
```
To prevent this query from scanning the entire table (which could contain millions of sold or available seats), we added a partial index:
```sql
CREATE INDEX ix_inventory_hold_expires_at ON inventory (hold_expires_at) WHERE status = 'HELD';
```
This index only contains rows currently in the `HELD` state, making it extremely small and fast to scan.

---

## Consequences

**Positive:**
- The race condition for seat holds is mathematically closed at the database level.
- Abandoned carts automatically release their seats back to the inventory pool.
- Multiple API Gateway instances can safely run the expiry worker without duplicating work due to the advisory lock.

**Negative / accepted tradeoffs:**
- `SELECT ... FOR UPDATE` means the database connection is held for the duration of the domain logic and Kafka event assembly. In this app, that logic is minimal and fully CPU-bound, but under extreme thundering-herd conditions, this could increase database connection pool contention. This is the exact problem space for Week 8 (Hot Inventory cache-aside).

## Related

`apps/api-gateway/src/encore_gateway/routers/holds.py`, `packages/hold-expiry/src/encore_hold_expiry/worker.py`
