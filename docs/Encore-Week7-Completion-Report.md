# Week 7 Completion Report: Inventory Core

**Date:** 2026-08-29

## Goal

Fix the known race condition in seat reservation (deferred from Week 2) and implement hold expiry to release abandoned seats back into the available pool.

---

## Delivered Artifacts

### 1. `packages/hold-expiry` (New Package)

An internal package providing a background daemon thread that polls the database for expired holds.
- **`HoldExpiryWorker`**: Uses a PostgreSQL transaction-level advisory lock (`pg_try_advisory_xact_lock`) to ensure only one process executes the expiry logic, even when multiple API Gateway instances are running.
- Executes `UPDATE ... WHERE hold_expires_at < NOW() RETURNING ...` to release seats atomically and retrieve their IDs.
- Emits `inventory.seat.hold_expired` Kafka events for downstream processing.
- Full unit test coverage via an in-memory SQLite database with mocked Postgres lock functions.

### 2. API Gateway Enhancements

- **`POST /api/v1/holds`**: Replaced the non-atomic `UPDATE ... WHERE status='AVAILABLE'` with a fully isolated `SELECT ... FOR UPDATE` pessimistic lock.
- **`DELETE /api/v1/holds/{inventory_id}`**: Added explicit endpoint for users to release their own holds early (emits `inventory.seat.released`).
- **Database Schema**: Added `hold_expires_at` (TIMESTAMPTZ) to the `inventory` table via Alembic migration (`0002_add_hold_expires_at.py`).
- **Index**: Created a partial index on `hold_expires_at WHERE status = 'HELD'` to ensure the expiry worker's polling query remains highly performant, regardless of table size.
- **Lifespan Integration**: The `HoldExpiryWorker` runs inside the API Gateway's application lifespan.

### 3. Event Contracts

Added two new event schemas to `encore-event-contracts`:
- `inventory.seat.released`
- `inventory.seat.hold_expired`
Added `hold_expires_at` to the existing `SeatHeldPayload`.

### 4. DevOps & Infrastructure

- **Topics**: Automatically provisions the two new Kafka topics via `scripts/create_topics.py`.
- **Environment**: Added `HOLD_TTL_MINUTES` and `EXPIRY_POLL_INTERVAL_SECS` to configuration and `docker-compose.yml`.
- **Make/CI**: Added `test-hold-expiry` and `lint-hold-expiry` to `Makefile` and `ci.yml`.

---

## Acceptance Criteria Met

- [x] Concurrent seat holds are safe (Postgres `FOR UPDATE` serialisation).
- [x] Holds automatically expire (5-minute TTL via database column).
- [x] Abandoned carts return seats to `AVAILABLE` status.
- [x] Expiry mechanism is horizontally scalable (Advisory lock prevents duplicate processing).
- [x] Users can explicitly release their holds (`DELETE /holds`).
- [x] Kafka events correctly emitted for both automated expiry and explicit release.
- [x] Background worker unit tests pass.
- [x] All API tests continue to pass.
- [x] ADR-0010 published.

---

## Technical Debt / Deferred Items

- `FOR UPDATE SKIP LOCKED` optimisation is deferred. If load testing in Week 8 shows excessive latency from lock contention, we may switch to `SKIP LOCKED`.
- The hold expiry worker currently runs inside the API Gateway process to minimise the number of deployable units for now. It will be moved to a standalone service in Week 23 (Distributed Scheduler).
