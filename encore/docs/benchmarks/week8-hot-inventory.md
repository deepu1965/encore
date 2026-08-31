# Week 8 — Hot Inventory Load Test Results

> **Status:** Placeholder — fill in after running `make load-test-contention` and `make load-test-flash-sale`.
>
> Per spec §54: "Do not invent these values before running tests."

---

## Test Environment

| Item | Value |
|---|---|
| Date | — |
| API Gateway instances | 1 |
| Postgres | Single primary, no replicas |
| Redis | Single node (local Docker) |
| Host machine | — |

---

## Scenario A — Concurrent Hold Contention (Correctness)

**Goal**: Exactly 1 out of N users holds the seat. Double-sells = 0.

| Metric | Result |
|---|---|
| Concurrent users | 50 |
| Run time | 30 s |
| Successful holds (201) | ??? (must be = 1) |
| Rejected (409) | ??? |
| Unexpected errors | ??? |
| Double-sells | ??? (must be = 0) |
| **Pass / Fail** | ??? |

---

## Scenario B — Flash Sale Throughput (Performance)

**Goal**: Measure req/s and latency under load spread across a seat pool.

| Metric | Result |
|---|---|
| Concurrent users | 100 |
| Run time | 60 s |
| POST /holds throughput | ??? req/s |
| P50 latency | ??? ms |
| P95 latency | ??? ms |
| P99 latency | ??? ms |
| Error rate | ??? % |
| Cache hit rate (Redis) | ??? % |
| Double-sells | 0 |

---

## Comparison: Week 7 Baseline vs Week 8 Redis Guard

| Metric | Week 7 (FOR UPDATE only) | Week 8 (SETNX + FOR UPDATE) |
|---|---|---|
| P95 hold latency | — ms | — ms |
| DB lock wait time | — ms | — ms |
| Rejected @ Redis (no DB touch) | 0% | ~??% |
| Double-sells | 0 | 0 |

---

## Notes

- Redis hit rate for `inventory:{id}:status` reads measured at `GET /api/v1/inventory/{id}`.
- If Redis is stopped, re-run Scenario A to confirm graceful degradation: correctness must hold.
- Record Kafka lag at peak contention (visible in docker stats for the Kafka container).
