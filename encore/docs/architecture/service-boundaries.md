# Service Boundaries

Each service below owns exactly one slice of the domain and exactly one
primary datastore. No two services write to the same table. Cross-service
reads happen through an API call or a Kafka event — never a shared DB
connection.

| Service | Responsibility | Owns (data) | Sync in | Sync out | Async (Kafka) |
|---|---|---|---|---|---|
| `api-gateway` | AuthN/Z, routing, rate limiting, request validation, versioning | none (stateless) | client HTTP | all services | — |
| `inventory-service` | Seat/event inventory state machine (`AVAILABLE → HELD → SOLD`) | `seats`, `holds` (Postgres) + hot cache (Redis) | gateway, checkout | — | emits `inventory.*` |
| `waiting-room` | Virtual queue admission for flash sales | queue position state (Redis) | gateway | inventory | emits/consumes `waitingroom.*` |
| `checkout-service` | Orchestrates hold → charge → issue as a saga | `orders` (Postgres) | gateway, inventory, payment | payment, wallet, ticket issuance | emits `order.*` |
| `payment-service` | Idempotent charge/refund against a payment provider (mocked in V1 through Week 9, real mock provider from Week 10) | `payments` (Postgres) | checkout | external provider (mocked) | emits `payment.*` |
| `wallet-service` | Store credit ledger | `wallet_ledger` (Postgres, append-only) | checkout | — | consumes `payment.*`, emits `wallet.*` |
| `resale-engine` | Price-time-priority order book and matching | `resale_orders`, `trades` (Postgres) | gateway | payment, wallet | emits `resale.*` |
| `search-service` | Event/artist/venue search + autocomplete | search index (OpenSearch, later) | gateway | — | consumes `event.*` |
| `notification-service` | Push/SMS/email fan-out | `notifications` (Postgres, dedup log) | — | external providers (mocked) | consumes `order.*`, `waitingroom.*` |
| `chat-service` | Live per-event chat over WebSocket | message store (Postgres) | gateway (WS upgrade) | — | — |
| `scheduler` | Distributed job scheduling (hold expiry, delayed jobs) | `jobs` (Postgres) | — | inventory, notification | emits `job.*` |
| `deployment-service` | Deployment records, canary/rollback bookkeeping | `deployments` (Postgres) | CI/CD | — | — |

## Shared packages (not services — imported code, no runtime of their own)

| Package | Purpose |
|---|---|
| `id-generator` | Snowflake-style distributed ID generation, shared by every service that mints an ID |
| `event-contracts` | Canonical Kafka event schemas + envelope, versioned, imported by every producer/consumer |
| `auth` | Token verification, RBAC helpers |
| `rate-limiter` | Token-bucket / sliding-window primitives used by the gateway |
| `observability` | Structured logging, trace-ID propagation, metrics client wrappers |
| `common` | Shared types, error envelope, health-check helpers |

## Rules

1. **One writer per table.** If two services need the same data, one owns it
   and the other gets it via API or event — never a second writer.
2. **No service calls another service's database directly.** Ever.
3. **Every cross-service write that must survive a crash goes through
   Kafka**, not a direct synchronous call, unless the caller needs the
   result immediately in the same request (e.g. checkout → payment).
4. **New service = new subfolder under `apps/` + an ADR** explaining why
   it isn't a module inside an existing service.
