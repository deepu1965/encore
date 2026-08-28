# Week 5 Completion Report: V1 Kafka Event Backbone

**Date:** 2026-08-27

## Goal

Deliver the Week 5 item deferred from the vertical slice: the Kafka asynchronous event backbone.
1. **`event-contracts`** — Canonical, typed schemas for every Kafka message.
2. **`kafka-client`** — Abstractions for publishing and consuming events with DLQ routing.
3. **API Gateway integration** — Emitting events upon successful write operations.

---

## Delivered Artifacts

### 1. `packages/event-contracts`

| File | Purpose |
|---|---|
| `envelope.py` | `EventEnvelope` dataclass representing the canonical Kafka wrapper (id, type, version, occurred_at, trace_id, payload). |
| `events/inventory.py` | Schema for `inventory.seat.held`. |
| `events/order.py` | Schema for `order.completed`. |
| `tests/test_event_contracts.py` | Tests ensuring envelope JSON serialisation works perfectly. |

**Zero dependencies:** Pure Python stdlib (`dataclasses`, `json`).

### 2. `packages/kafka-client`

| File | Purpose |
|---|---|
| `producer.py` | `KafkaEventProducer` wrapping `kafka-python`. Enforces `EventEnvelope`, `acks='all'`, and routes failures to `{topic}.dlq`. |
| `consumer.py` | `KafkaEventConsumer` base class. Manual offset commits, exponential backoff (up to 3 retries), DLQ routing. |
| `helpers.py` | `build_envelope` helper to correctly populate timestamps and Snowflake IDs. |

**Library choice:** `kafka-python` used in Week 5 (easier local setup, no C dependencies). Configured with `acks='all'` for highest durability for business events.

### 3. API Gateway Integration

| File | Change |
|---|---|
| `kafka_producer.py` | Manages the global `KafkaEventProducer` lifecycle. |
| `main.py` | `lifespan` calls `init_producer()` and `close_producer()`. |
| `routers/holds.py` | Emits `inventory.seat.held` after the DB transaction commits. |
| `routers/orders.py` | Emits `order.completed` after the DB transaction commits. |
| `config.py` | Added `kafka_bootstrap_servers` and `kafka_producer_name` settings. |
| `scripts/create_topics.py` | Bootstrap script using `KafkaAdminClient` to create topics with appropriate partitions/replicas. |

**Fire-and-forget:** Kafka publish happens *after* DB commit. If Kafka is down, the DB is not rolled back, the API still returns a 201, and the Kafka client routes the event to the DLQ.

### 4. DevOps

- **Dockerfile:** `COPY` and `pip install` the two new packages.
- **Makefile:** Targets for `test-event-contracts`, `test-kafka-client`, and `create-topics`.
- **CI:** New packages added to `.github/workflows/ci.yml`.
- **Docker Compose:** Passed `REDIS_*` and `KAFKA_*` env vars directly into the `api-gateway` service.

### 5. Documentation

- **ADR-0008:** Documents the Fire-and-Forget decision vs 2PC, `kafka-python` vs `confluent-kafka` rationale, and `acks='all'` justification.

---

## Acceptance Criteria

- [x] Canonical `EventEnvelope` defined and used for all messages.
- [x] `inventory.seat.held` and `order.completed` schemas defined.
- [x] `KafkaEventProducer` implements `acks='all'` and DLQ routing.
- [x] `KafkaEventConsumer` base class implemented (ready for Week 6+ consumers).
- [x] API Gateway emits events after successful DB commit.
- [x] Kafka publish failures DO NOT block or roll back the HTTP request.
- [x] CI pipeline successfully tests all new packages.
- [x] Syntax regression passed.
- [x] ADR-0008 and Completion Report written.

---

## Explicitly NOT in Week 5

| Deferred item | Planned week |
|---|---|
| Actual consumer implementations | As services are built (e.g. `notification-service`) |
| `confluent-kafka` C bindings | Week 16 (if Python throughput is a bottleneck) |
| Transactional Outbox | Never (we accept the DLQ tradeoff for V1) |
