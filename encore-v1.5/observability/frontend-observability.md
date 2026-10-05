# Frontend Observability

## §1 — Frontend errors

Every uncaught error hitting a boundary reports to Sentry with: the
boundary, the current route, the authenticated user's ID (not
email/PII), the current session's role, and the `X-Request-Id` of the
most recent API call before the error — enabling correlation with the
exact backend request that may have triggered it.

## §2 — API latency

Every `apiClient` call records duration, endpoint, status code, and
cache-hit status (a cache hit has no duration to report). Aggregated
into p50/p95 per endpoint, reported in batches.

## §3 — WebSocket disconnects

Every disconnect/reconnect cycle logs duration disconnected, reconnect
attempts taken, and which channels were active — useful for correlating
a disconnect spike with a backend deploy visible on the ops side.

## §4 — Page performance

Core Web Vitals measured via `web-vitals` in production, reported
per-route.

## §5 — Failed transactions

Every failed hold/order/payment/resale attempt is logged with its
domain error code (see `../state/state-management.md`'s catalog), not
just "request failed" — enabling a real product question like "how
often do users hit SEAT_ALREADY_HELD."

## §6 — Route errors

404s and segment error triggers logged with attempted path and, for
404s, the referring page (internal vs. external).

## §7 — Correlation IDs and trace propagation into the backend's tracing

Every `apiClient` request carries `X-Request-Id`; the backend's own
tracing uses that same ID as its trace root. Concretely: a frontend
error report or slow-API-call report includes that request's ID, which
an operator can paste directly into `/ops/traces` to see the exact
backend span waterfall for the request that caused the symptom —
closing the loop between "a user saw an error" and "here's exactly what
the backend did," without a manual correlation step. This is a REQUIRED
FRONTEND CONTRACT (the backend needs to honor an incoming `X-Request-Id`
as its trace root).
