# API Conventions

These conventions apply to every HTTP endpoint exposed through `api-gateway`,
regardless of which service implements it.

## 1. Versioning

All routes are prefixed `/api/v1/...`. A breaking change gets `/api/v2/...`
for that resource only — we do not version the whole API at once.

```text
GET  /api/v1/events
GET  /api/v1/events/{event_id}
GET  /api/v1/events/{event_id}/seats
POST /api/v1/waiting-room/join
GET  /api/v1/waiting-room/{entry_id}
POST /api/v1/holds
DEL  /api/v1/holds/{hold_id}
POST /api/v1/orders
GET  /api/v1/orders/{order_id}
POST /api/v1/payments
GET  /api/v1/payments/{payment_id}
POST /api/v1/resale/orders
GET  /api/v1/resale/order-book/{event_id}
POST /api/v1/jobs
GET  /api/v1/jobs/{job_id}
POST /api/v1/deployments
GET  /api/v1/deployments/{deployment_id}
```

## 2. Resource naming

- Plural nouns for collections: `/events`, `/orders`, not `/event`, `/order`.
- Nesting only one level deep: `/events/{event_id}/seats` is fine;
  `/events/{event_id}/seats/{seat_id}/holds/{hold_id}/...` is not — promote
  `holds` to its own top-level resource instead (as done above).
- Verbs only for actions that aren't CRUD on a resource, e.g.
  `POST /waiting-room/join`.

## 3. Request identity

Every request carries:

| Header | Purpose |
|---|---|
| `X-Request-Id` | Generated at the gateway if absent; propagated to every downstream call and into every log line and Kafka event. |
| `Authorization: Bearer <token>` | Required on all routes except `/health` and `/events` (public browse). |
| `Idempotency-Key` | Required on all mutating financial/inventory endpoints: `POST /holds`, `POST /orders`, `POST /payments`, `POST /resale/orders`. Same key + same body within 24h returns the original result instead of re-executing. |

## 4. Response envelope

Success:

```json
{
  "data": { "...": "..." },
  "request_id": "req_01HZY..."
}
```

Error:

```json
{
  "error": {
    "code": "SEAT_ALREADY_HELD",
    "message": "This seat is currently held by another user.",
    "retryable": false
  },
  "request_id": "req_01HZY..."
}
```

`code` is a stable, machine-readable string (`SCREAMING_SNAKE_CASE`) — client
code branches on `code`, never on `message` text.

## 5. Status codes

| Code | Meaning here |
|---|---|
| 200 | Success (read or completed action) |
| 201 | Resource created (`POST /orders`, `POST /holds`) |
| 202 | Accepted, processing async (e.g. `POST /jobs`) |
| 400 | Validation error |
| 401 / 403 | AuthN / AuthZ failure |
| 404 | Resource not found |
| 409 | Conflict — e.g. seat already held/sold, duplicate resale order |
| 422 | Semantically invalid (e.g. resale price below floor) |
| 429 | Rate-limited (see `Retry-After` header) |
| 5xx | Server fault — always logged with the request's trace ID |

## 6. Pagination

Cursor-based, not offset-based (offset pagination breaks under concurrent
writes, which this system has a lot of):

```text
GET /api/v1/events?limit=20&cursor=eyJpZCI6MTIzfQ
```

Response includes `next_cursor: string | null`.

## 7. Idempotency rule

Any endpoint that spends money, holds a seat, or issues a ticket **must**
accept `Idempotency-Key` and must be safe to call twice with the same key.
This is not optional per-endpoint — it's a gateway-level contract test run
in CI from Week 4 onward.

## 8. Tracing

Every request gets a trace ID at the gateway. That ID is:
- Returned to the client as `X-Request-Id` / `request_id`.
- Attached to every structured log line.
- Injected into the Kafka event envelope's `trace_id` field, so a single
  request can be followed from `gateway → kafka → inventory → checkout →
  payment` in Grafana/Tempo once Week 15 (Observability) lands.
