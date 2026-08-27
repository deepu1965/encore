# Thin Vertical Slice Plan (executed Week 2)

This is a Week 1 deliverable: the *plan* for the first runnable path
through Encore. Implementation happens in Week 2; this document is what
gets implemented against.

## Goal

One request path that goes all the way from an HTTP call to a persisted
"ticket," touching every architectural layer at its simplest possible
form — so later weeks are *deepening* an existing path, not building one
from scratch under Redis/Kafka/locking complexity all at once.

## Path

```text
GET  /api/v1/events                     → list events (from Postgres, no cache)
GET  /api/v1/events/{event_id}/seats    → list seats + status (Postgres read)
POST /api/v1/holds                      → naive hold (UPDATE seats SET status='HELD', no TTL, no lock yet)
POST /api/v1/orders                     → mock order: no real payment call, always "succeeds"
                                           → writes an order row
                                           → writes a ticket row (status=ISSUED)
GET  /api/v1/orders/{order_id}          → confirm the full record is readable back
```

## What is explicitly mocked / deferred

| Real thing | Week 2 stand-in | Real version lands |
|---|---|---|
| Redis hot-seat cache | none — read straight from Postgres | Week 3 |
| Distributed rate limiter | none | Week 4 |
| Snowflake ID generator | Postgres `SERIAL`/UUID placeholder | Week 4 |
| Kafka event backbone | none — synchronous calls only | Week 5 (Done) |
| Virtual waiting room | none — direct access | Week 6 |
| `SELECT ... FOR UPDATE` / atomic hold | plain `UPDATE`, **known race condition, accepted for now** | Week 7–8 |
| Real payment provider (even mocked properly) | hardcoded "always succeeds," no idempotency key check | Week 9–10 |
| Ticket ownership/ audit trail | minimal row, no audit log | Week 10 |

## Explicitly NOT acceptable to skip, even in the thin slice

- Every endpoint still follows `docs/api/api-conventions.md` (response
  envelope, status codes, `X-Request-Id`) — conventions apply from day
  one, not "later once it matters." Retrofitting response shape across 12
  services later is far more expensive than doing it right the first time.
- The slice runs against the real `docker-compose.yml` Postgres, not
  SQLite or an in-memory store — no throwaway persistence layer that gets
  discarded.

## Acceptance criteria for "Week 2 done"

```text
[ ] docker compose up brings up api-gateway + postgres
[ ] GET /api/v1/events returns seeded events
[ ] GET /api/v1/events/{id}/seats returns seats with status
[ ] POST /api/v1/holds moves a seat to HELD and returns 201
[ ] POST /api/v1/orders creates an order + ticket, returns 201
[ ] GET /api/v1/orders/{id} returns the order + ticket
[ ] Known race condition (double-hold under concurrent requests) is
    written down as a TODO referencing ADR-0003 and Week 7/8, not silently
    ignored
[ ] All responses match the envelope in api-conventions.md
```

## Explicit non-goal

This slice is **not** expected to survive concurrent load correctly — that
correctness is the entire point of Weeks 7–8 (Inventory Core, Hot
Inventory). Calling the Week 2 slice "done" does not mean "production
ready"; it means "the skeleton is provably wired end-to-end."
