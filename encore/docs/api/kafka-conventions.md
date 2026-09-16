# Kafka Event Conventions

Kafka is the asynchronous backbone connecting services that must not block
on each other. These conventions are frozen in Week 1 because every later
producer/consumer (starting Week 5) depends on them.

## 1. Topic naming

```text
<domain>.<entity>.<event-past-tense>
```

Examples already identified from the design:

```text
ticket.purchase.requested
ticket.purchase.completed
ticket.expired
payment.requested
payment.completed
resale.order.created
notification.requested
media.transcode.requested
job.scheduled
deployment.requested
audit.events
```

Rules:
- Always past tense for the event itself (`completed`, not `complete`) —
  a topic carries facts that happened, not commands.
- Domain prefix matches the owning service's domain (`inventory.*`,
  `order.*`, `payment.*`, `wallet.*`, `resale.*`, `waitingroom.*`,
  `notification.*`, `job.*`, `deployment.*`, `audit.*`).
- Every topic gets a matching dead-letter topic: `<topic>.dlq`.

## 2. Event envelope (every message, no exceptions)

```json
{
  "event_id": "evt_01HZYABC123",
  "event_type": "ticket.purchase.completed",
  "event_version": 1,
  "occurred_at": "2026-08-24T10:15:00Z",
  "trace_id": "req_01HZY9XYZ",
  "producer": "checkout-service",
  "key": "order_9f8a...",
  "payload": { "...": "..." }
}
```

- `event_version` bumps whenever `payload` shape changes in a
  backward-incompatible way. Consumers check this field and reject/DLQ
  versions they don't understand rather than guessing.
- `trace_id` is always the originating HTTP request's `X-Request-Id` (see
  `docs/api/api-conventions.md` §8) — this is what makes cross-service
  tracing possible later.
- `key` is the Kafka partition key (see §3) and is also included in the
  payload for convenience, not just used as the raw Kafka message key.

Schemas for each event type live in `packages/event-contracts/` as the
single source of truth — a service imports the contract, it does not
hand-roll a payload shape.

## 3. Partitioning

Partition key = the entity the event is about, so all events for that
entity stay in order on one partition:

| Topic family | Partition key |
|---|---|
| `ticket.*`, `inventory.*` | `event_id` (keeps one show's contention on one partition) |
| `order.*`, `payment.*` | `order_id` |
| `wallet.*` | `user_id` |
| `resale.*` | `event_id` (order book is per-event) |
| `waitingroom.*` | `event_id` |

This is a deliberate tradeoff: partitioning `inventory.*` by `event_id`
means one massive flash-sale event is entirely single-partitioned (a
potential hot partition), which is the same hot-row problem from
`v1-scope-freeze.md` §6 reappearing at the Kafka layer. Week 17
(Sharding + Flash-Sale Validation) is where this gets load-tested and,
if needed, revisited with a composite key (`event_id:seat_shard`) — logged
as a forward-looking note here, decision deferred to an ADR when the load
test data exists.

## 4. Delivery semantics

- **At-least-once delivery** everywhere. No topic assumes exactly-once.
- Every consumer must therefore be **idempotent** — safe to process the
  same `event_id` twice. Standard pattern: consumer checks/records
  `event_id` in a dedup table (or Redis set with TTL) before acting.
- Consumer groups: one group per logical service, named
  `<service-name>-consumer`, so scaling a service's replicas scales its
  consumption automatically via Kafka's group rebalancing.

## 5. Retry / DLQ

```text
attempt fails
   → retry with exponential backoff (max 3 attempts, in-process)
       → still failing
           → publish to <topic>.dlq with failure reason + attempt count
               → alert fires (Week 15) on any DLQ topic depth > 0
```

DLQ messages are never silently dropped — they require a human decision
(replay or discard), logged in `docs/incidents/` if it happens after V1
is live.

## 6. Ordering

Ordering is only guaranteed **within a partition**. Cross-entity ordering
(e.g. "did the hold happen before the payment") is established via
`occurred_at` + `trace_id` correlation, not via Kafka global order —
Kafka does not promise that and no consumer should assume it.
