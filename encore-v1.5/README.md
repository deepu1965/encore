# Encore V1.5 — Complete Frontend Engineering Plan

**Status: implementation-ready.** Every route, component, API, WebSocket
event, and named failure path has an explicit backlog task, verified
with zero gaps by live spreadsheet formula, not assertion. See
`audit/v1.5-completeness-audit.md` for the full proof.

This is an **update**, not a rewrite, of the original V1.5 plan. The
architecture, route map, design system, API contracts, real-time
architecture, security model, and testing strategy were already correct
and are preserved below with their content intact — only relocated into
this structure and stripped of stale cross-references. The one thing
that changed substantively: the implementation backlog went from a
representative sample to all 1,120 tasks, generated systematically from
the same route/component/API/event inventories that back every other
document here, so nothing can drift out of sync.

## Source of truth

`Encore_v1_Final.md` remains the authoritative V1 backend specification.
Nothing here redesigns it, and nothing here implements V2 (verified
absent — see `audit/v1.5-completeness-audit.md` and the V2 Integration
Readiness note at the bottom of this file).

## How to actually use this package

1. Read this file, then `architecture/frontend-architecture.md`.
2. Pick a phase from `planning/dependency-graph.md` (start with Phase 1
   if nothing exists yet).
3. Open `Encore-V1.5-Exhaustive-Backlog.xlsx`, filter the `Backlog` sheet
   to that phase, and start at the first uncompleted task.
4. For any task, its row tells you: the exact route/component, every
   backend contract it needs (cross-referenced into `api/api-contracts.md`
   and `api/backend-gaps.md` if the backend doesn't support it yet), every
   UI state to implement (cross-referenced into the relevant application
   doc), how it's tested, and its acceptance criteria — no second
   planning pass required, which is the standard this update was held to.

## Package structure

```
README.md                              this file
Encore-V1.5-Exhaustive-Backlog.xlsx    the backlog — 1,120 tasks, 10 sheets, live audit formulas
architecture/
  frontend-architecture.md             layered request flow, error boundaries, env config, telemetry placement
  frontend-folder-structure.md         the actual frontend/ directory layout, folder-by-folder rationale
  frontend-data-flow.md                server/client/realtime state boundaries (architectural view)
  realtime-architecture.md             WebSocketManager design — Connection/Subscription/EventRouter/Reconnect/Heartbeat/Dedup
  auth-rbac.md                         auth flow, token storage, RBAC gating mechanism
routes/
  route-inventory.md                   every route, generated from the same data as the backlog — 0 without tasks
design/
  design-system.md                     typography, color tokens, spacing/radius/elevation, per-persona density
  component-inventory.md               every reusable component with real task-ID references
customer/
  customer-application.md              seat sync, hold countdown, checkout, 8-state payment machine, chat
resale/
  resale-application.md                marketplace, listing/trade state machines, price-time-priority UX
organizer/
  organizer-application.md             dashboard, inventory consistency rules, waiting-room control split
operations/
  operations-application.md            flash-sale control center, Kafka/Redis/DB dashboards, deployments, logs, traces
api/
  api-contracts.md                     every endpoint — method, request/response, auth, idempotency, caching
  backend-gaps.md                      the 7-gap matrix — Blocking?/Priority/Resolution/Mitigation Task per gap
realtime/
  websocket-contracts.md               every channel × message type, full field set, one row per event — 0 without tasks
state/
  state-management.md                  cache policy per resource, optimistic-update rules, error/retry catalog
testing/
  testing-strategy.md                  unit/integration targets, 20 E2E scenarios, 9 failure-mode tests
  test-matrix.md                       feature × test-category coverage, generated from the route inventory
security/
  security.md                          XSS, CSRF, PII, RBAC enforcement, payment-data handling
performance/
  performance.md                       Core Web Vitals targets, seat-map/chart rendering strategy
accessibility/
  accessibility.md                     WCAG 2.1 AA plan, seat-map and chart accessibility specifically
observability/
  frontend-observability.md            error/latency/WS telemetry, trace correlation into backend tracing
planning/
  implementation-phases.md             18 phases with entry/exit criteria
  dependency-graph.md                  corrected phase dependencies (normal vs. high-demand purchase path)
  exhaustive-task-backlog.md           how the 1,120-task backlog was generated, phase/epic breakdowns
  acceptance-criteria.md               the 13-point Definition of Done, bad-vs-good acceptance-criteria standard
  traceability-matrix.md               every V1 capability → epic → routes → tasks, 0 unclassified
  demo-scenarios.md                    5 interview-ready scripted demos
audit/
  v1.5-completeness-audit.md           the formal audit — every required tally, formula-verified, zero gaps
```

## What changed in this update, precisely

- **Backlog**: representative → exhaustive (1,120 tasks, generated not
  hand-typed, self-consistency-checked).
- **New**: `api/backend-gaps.md` (matrix format), `realtime/websocket-contracts.md`
  (per-event field table), `testing/test-matrix.md`, `planning/dependency-graph.md`
  (fixes the Checkout-depends-on-Waiting-Room error), `planning/traceability-matrix.md`,
  `audit/v1.5-completeness-audit.md`.
- **Corrected**: the normal purchase path (Event → Seat → Hold →
  Checkout) no longer has an implementation dependency on Waiting Room —
  see `planning/dependency-graph.md` for the full explanation.
- **Unchanged in substance, relocated**: architecture, design system,
  the four application documents, API contracts, real-time architecture,
  state management, security, accessibility, performance, observability,
  testing strategy — these were already correct and are preserved.

## V2 Integration Readiness

V1.5 implements no ML/RAG/agent functionality anywhere — verified in
`audit/v1.5-completeness-audit.md`. The layering this plan already
establishes (Design System → Application Shell → API/WebSocket/State
Architecture → V1 Features) is the extension point V2 plugs into later:
a V2 AI surface would consume the same design system, the same
`apiClient`/`WebSocketManager` infrastructure, and the same auth/RBAC
layer, arriving as new routes and new feature folders rather than
requiring any of the above to be rebuilt. Nothing in this update
implements that layer — it only confirms the seam exists.
