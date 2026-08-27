# ADR-0008: Kafka Producer Fire-and-Forget & Abstraction

**Status:** Accepted
**Date:** 2026-08-27
**Deciders:** project author (solo project)

## Context

Week 5 introduces Kafka as the asynchronous event backbone for Encore. The
API Gateway needs to publish `inventory.seat.held` and `order.completed`
events after successfully persisting state to PostgreSQL.

This raises three architectural questions:
1. **Transactionality:** What happens if the DB commits, but the Kafka
   publish fails? Do we roll back the DB?
2. **Library Choice:** Do we use `kafka-python` (pure Python) or
   `confluent-kafka` (C bindings via `librdkafka`)?
3. **Acknowledgment:** Does the producer block waiting for broker
   acknowledgments?

## Decision

### 1. Non-Transactional Fire-and-Forget

**Publishing to Kafka does not participate in the DB transaction.** The API
Gateway commits the DB transaction, *then* attempts to publish to Kafka in
a background thread, returning `201 Created` immediately.

If the Kafka publish fails (e.g. brokers down, partition unavailable):
- The API *does not* roll back the DB transaction (it's already committed).
- The API *does not* return a 500 error to the client.
- The failure is logged and the event is routed to the DLQ (Dead Letter Queue).

**Why not 2PC (Two-Phase Commit)?**
Distributed transactions across Postgres and Kafka are notoriously fragile and
drastically reduce availability. The "Transactional Outbox" pattern is the
standard alternative, but for V1 of Encore, we accept the small risk of
message loss (or rather, message-in-DLQ requiring manual replay) to keep the
write path fast and resilient. The authoritative state is the DB.

### 2. `kafka-python` behind an Abstraction

We will use `kafka-python` for Week 5, hidden behind an internal
`KafkaEventProducer` abstraction.

**Why `kafka-python`?**
It is pure Python and has zero system-level dependencies. It installs cleanly
in any environment without requiring C compilers or `librdkafka`.

**Why an abstraction?**
The `KafkaEventProducer` class enforces our `EventEnvelope` schema and DLQ
routing logic. It also hides the underlying library choice. If load-testing
in Week 16 proves that `kafka-python`'s throughput is a bottleneck, we can
swap the internal implementation to `confluent-kafka` without changing any
calling code in the gateway or other services.

### 3. Acknowledgment Mode: `acks='all'`

The producer is configured with `acks='all'` for all Encore business events
(`inventory.seat.held`, `order.completed`, etc.).

**Why `acks='all'`?**
This ensures that the leader broker and all in-sync replicas have written the
message before acknowledging success. While this adds a small amount of latency
(typically a few milliseconds), it prevents message loss in the event of a
leader broker crash immediately after receiving the message.

We will not optimise acknowledgment latency (`acks=1` or `acks=0`) before
we have actual measurements demonstrating it is a problem. Lower-criticality
telemetry events (e.g. analytics, metrics) may use a less strict configuration
if justified by a future ADR, but business events require high durability.

## Consequences

**Positive:**
- HTTP responses are completely decoupled from Kafka availability. If Kafka
  goes down, the API Gateway still processes orders and holds seats (the DB
  is authoritative).
- `kafka-python` keeps the build fast and cross-platform simple for V1.
- `acks='all'` provides strong durability guarantees for business events.

**Negative / accepted tradeoffs:**
- If Kafka is down, events go to the DLQ and must be manually replayed
  later to restore consistency with downstream services (e.g. notifications).
  This is an accepted tradeoff over implementing the full Transactional
  Outbox pattern in Week 5.
- `acks='all'` introduces a minor latency penalty, which is accepted in
  exchange for data safety.

## Related

`docs/architecture/kafka-conventions.md`, `packages/kafka-client/`
