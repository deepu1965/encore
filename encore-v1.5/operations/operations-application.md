# Operations Application

Route-level metadata is in `../routes/route-inventory.md`. This is the
surface that exists to make Encore's distributed architecture (Redis,
Kafka, waiting room, locking, replicas, sharding, observability,
deployments) visually understandable. All `/ops/*` routes require
OPERATIONS or ADMIN role; every mutating action additionally checks role
per-action (OPERATIONS and ADMIN are not equivalent for writes).

## 1. Overview (`/ops`)

`ServiceHealthStrip` (one status chip per backend service) +
`ActiveIncidentBanner` (only rendered if one exists — absent when
healthy, never a reassuring "all clear" banner that could itself go
stale). Intentionally thin — links into every dashboard below rather
than duplicating their content.

## 2. Flash-Sale Control Center (`/ops/flash-sale`) — flagship screen

Only renders meaningfully during an active flash sale; otherwise shows
an event picker.

| Panel | Metric(s) | Real-time source |
|---|---|---|
| Traffic | Requests/sec at the API Gateway | `ops.flash-sale.{event_id}`, `traffic` |
| Waiting room | Queue size, admission rate | `waiting_room` |
| Inventory | Available/held/sold (stacked, live) | `inventory` |
| Payments | Throughput, failure rate | `payments` |
| Kafka | Consumer lag per topic | `kafka_lag` |
| Redis | Cache hit rate | `redis` |
| Database | Write latency p50/p95/p99 on the inventory table | `db_latency` |
| API latency/errors | p50/p95/p99, error rate | `api_latency` |
| Active users | Concurrent connected users | `active_users` |

All nine panels subscribe to **one** multiplexed WebSocket channel, not
nine separate connections. This page is observation-only — pausing
admission, if needed, happens on the organizer's own waiting-room
control page, kept there rather than duplicated here.

## 3. Kafka Dashboard (`/ops/kafka`)

`TopicTable`, `ConsumerLagChart`, `DLQPanel`. **Explicit non-goal:** no
administrative actions — no "replay DLQ message," no "pause consumer,"
no "delete topic." Visualization only; a real operational need for those
actions would be a distinct, carefully-scoped future capability.

## 4. Redis Dashboard (`/ops/redis`)

Hit/miss ratio, memory, keyspace size, active distributed locks (count +
oldest age, not lock keys themselves — those could be per-user/per-seat
identifiers), hot-keys panel if exposed. Read-only, same rationale as
Kafka.

## 5. Database Dashboard (`/ops/database`)

Primary/replica status, connections vs. pool size, replication lag,
query error rate, shard/event distribution if exposed. Read-only.

## 6. Payment Operations (`/ops/payments`)

Volume, success/failure/timeout rate, latency, and an
`IdempotencyEventsTable` surfacing duplicate-request-prevented events as
a positive operational signal, not just failures.

## 7. Service Map (`/ops/services`)

```text
API Gateway -> Services (inventory, checkout, payment, wallet, resale,
search, notification, chat, scheduler) -> Kafka, Redis, PostgreSQL,
Payment provider
```

Exact topology from the spec's own architecture, not invented. Paired
table view for anyone who needs the same data without the diagram.

## 8. Deployments (`/ops/deployments`, `.../[deploymentId]`)

**RBAC split, not just page-level gating:** OPERATIONS can view
everything; the **rollback action is ADMIN-only** — disabled-with-
tooltip for OPERATIONS, not hidden, since knowing a rollback capability
exists is useful situational awareness even for a role that can't
trigger it. The one deliberate exception to the general hide-by-default
rule.

## 9. Incidents (`/ops/incidents`, `.../[incidentId]`) — BACKEND GAP G-2

Fully specified so implementation starts immediately once the gap
closes: severity, status, affected services (cross-linked to Service
Map), timeline, linked alerts, linked logs/traces (deep-linked,
pre-filtered by incident window), linked deployment, resolution/
postmortem link. Feature-flagged off and absent from the ops nav until
G-2 closes.

## 10. Logs (`/ops/logs`)

Filterable by service, level, time range, request ID, trace ID, user ID
(ADMIN-only — see `../security/security.md` §5), event ID, correlation
ID. Cursor-paginated. "Jump to trace" per row when a trace_id is
present.

## 11. Distributed Tracing (`/ops/traces`, `.../[traceId]`)

`TraceWaterfall`: Request -> API Gateway -> Service A -> Kafka -> Service
B -> Database, with duration/error state per span. Exists specifically
to make "why does Encore use distributed tracing" self-evident — a slow
checkout, visualized as a waterfall, immediately shows whether the delay
was the payment provider, a Kafka publish, or a database write.

## 12. Metrics & Alerts (`/ops/metrics`, `/ops/alerts`)

`MetricsExplorer` covers only the metric names the spec actually lists —
nothing invented. Alert acknowledgement is intentionally **not**
ADMIN-gated (any OPERATIONS/ADMIN user can acknowledge — it's a "someone
is looking at it" signal, not a destructive action). Escalation shown
read-only if the backend supports it; not built as a configuration UI
unless confirmed.
