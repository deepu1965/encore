# Exhaustive Implementation Backlog

**This replaces the previous "representative task set" entirely.** Every
route, every reusable component, every API integration, every WebSocket
event, and every named failure path has an explicit, atomic task — not a
sample of them. The source of truth is
`../Encore-V1.5-Exhaustive-Backlog.xlsx` (sheet: `Backlog`, 1,120 rows);
this document is the readable summary and the explanation of how it was
built, so a reviewer can trust the numbers rather than just the claim.

## Why a spreadsheet, not one giant markdown table

At this granularity — every task carrying Task ID, Phase, Epic, Feature,
Route, Task, Description, Dependencies, Backend Dependency, API
Dependency, WebSocket Dependency, Components, State Management,
Acceptance Criteria, Testing Requirement, Priority, and Estimated Effort
— 1,120 rows as one markdown table would be unreadable and, more
importantly, unverifiable. The workbook's **Completeness Audit** sheet
computes every coverage number below as a live formula against the
**Backlog**, **Route Inventory**, **Component Inventory**, **API
Inventory**, **WebSocket Contracts**, **Traceability Matrix**, and
**Backend Gap Matrix** sheets — so "zero routes without tasks" is a
`COUNTIF` result, not an assertion. Every number in this document was
read back from that recalculated workbook, not hand-counted.

## How the backlog was generated

Every task below is derived mechanically from the same structured data
that produced `../routes/route-inventory.md`, `../design/component-inventory.md`,
`../realtime/websocket-contracts.md`, and `../api/backend-gaps.md` — a route's
tasks are generated from its documented API/WebSocket/component list, not
invented per row. This is deliberate: hand-typing ~1,100 rows would
introduce exactly the kind of inconsistency (stale references, mismatched
IDs, contradictory priorities) this update was commissioned to eliminate.
One generation bug *was* found and fixed during this pass — a gap
mitigation task (G-2) had an invalid priority value (`"P0-when-unblocked"`)
that would have silently corrupted the audit's priority-breakdown count;
a hard consistency check (`generate_all.py`'s priority-enum assertion) now
fails the build if this recurs, rather than letting it through quietly.

## Task ID scheme

`V15-{EPIC}-{NNN}`, sequential per epic, stable once assigned. Route
epics match `../routes/route-inventory.md` exactly (`AUTH`, `DISC`, `SEAT`,
`CHECK`, `RESALE`, `OPS-FS`, `ORG-INV`, etc.); cross-cutting epics are
`COMP` (component library), `WS` (realtime infrastructure), `SEC`,
`OBS`, `PERF`, `A11Y`, `SETUP`, `DESIGN-TOKEN`, `GAP` (backend-gap
mitigations), and `POLISH` (P3).

## What "one task per atomic unit" means here, concretely

Per the update request's own example, a page is never one task. Every
route in `../routes/route-inventory.md` decomposes into (as applicable):
route shell → one task per page-specific component → one task per API
connection → WebSocket wiring → loading state → empty state (list pages)
→ error handling → permission handling (RBAC-gated routes) → responsive
behavior → accessibility pass → field validation (forms) → tests. Seat
Selection alone is 17 tasks (V15-SEAT-001 through V15-SEAT-017); the
Flash-Sale Control Center's 10 realtime panels alone contribute 9 of
OPS-FS's 28 tasks. Checkout and Resale additionally carry named,
individually-tracked failure-path tasks (17 for Checkout/Payment, 11 for
Resale) beyond the generic per-route error-handling task, covering every
scenario named in the update request's items 11 and 12 by ID.


## Total counts (live-formula-verified — see `../audit/v1.5-completeness-audit.md`)

- **Total implementation tasks: 1,120**
- P0: 693 · P1: 305 · P2: 98 · P3: 5 · DEFERRED: 19
- **76 routes, 0 without a task**
- **68 components, 0 without a task**
- **92 unique APIs, 0 without a task**
- **60 realtime events, 58 covered + 2 explicitly deferred (gap G-2), 0 with no task and no deferral reason**
- **48 V1 capabilities, 0 unclassified**

## Tasks by phase

| Phase | Total Tasks | P0 | P1 | P2 | P3 | DEFERRED |
|---|---|---|---|---|---|---|
| Contract Audit | 7 | 0 | 0 | 7 | 0 | 0 |
| Frontend Foundation | 32 | 32 | 0 | 0 | 0 | 0 |
| Design System | 117 | 117 | 0 | 0 | 0 | 0 |
| Authentication | 50 | 50 | 0 | 0 | 0 | 0 |
| Discovery | 46 | 35 | 11 | 0 | 0 | 0 |
| Event + Seat Selection | 30 | 30 | 0 | 0 | 0 | 0 |
| Waiting Room | 13 | 13 | 0 | 0 | 0 | 0 |
| Checkout + Payment | 43 | 43 | 0 | 0 | 0 | 0 |
| Tickets + Orders + Wallet | 85 | 23 | 62 | 0 | 0 | 0 |
| Resale | 84 | 84 | 0 | 0 | 0 | 0 |
| Notifications + Chat | 25 | 0 | 25 | 0 | 0 | 0 |
| Organizer | 184 | 0 | 184 | 0 | 0 | 0 |
| Operations | 204 | 169 | 0 | 18 | 0 | 17 |
| Documents + Media + Location | 66 | 0 | 0 | 66 | 0 | 0 |
| Real-Time Integration Hardening | 76 | 60 | 14 | 0 | 0 | 2 |
| Security | 15 | 15 | 0 | 0 | 0 | 0 |
| Observability | 9 | 0 | 9 | 0 | 0 | 0 |
| Performance | 10 | 10 | 0 | 0 | 0 | 0 |
| Accessibility | 12 | 12 | 0 | 0 | 0 | 0 |
| Final Polish | 12 | 0 | 0 | 7 | 5 | 0 |

## Tasks by epic

| Epic | Task Count | Epic | Task Count |
|---|---|---|---|
| A11Y | 12 | AUTH | 50 |
| CHAT | 16 | CHECK | 21 |
| COMP | 107 | CONF | 17 |
| DESIGN-TOKEN | 10 | DISC | 46 |
| EVENT | 14 | GAP | 7 |
| LEAD | 12 | LOC | 12 |
| MEDIA | 22 | NOTIF | 14 |
| OBS | 9 | OPS-ALERT | 15 |
| OPS-DB | 12 | OPS-DEPLOY | 26 |
| OPS-FS | 28 | OPS-INC | 21 |
| OPS-INV | 11 | OPS-KAFKA | 13 |
| OPS-LOG | 11 | OPS-MET | 10 |
| OPS-OV | 12 | OPS-PAY | 12 |
| OPS-REDIS | 12 | OPS-SVC | 12 |
| OPS-TRACE | 21 | OPS-WR | 11 |
| ORD | 19 | ORG-ANA | 9 |
| ORG-ATT | 10 | ORG-CHAT | 10 |
| ORG-DASH | 10 | ORG-DOC | 23 |
| ORG-EVT | 41 | ORG-INV | 16 |
| ORG-MED | 15 | ORG-NOTIF | 10 |
| ORG-ORD | 10 | ORG-RES | 11 |
| ORG-REV | 9 | ORG-SET | 11 |
| ORG-WR | 15 | PAY | 6 |
| PERF | 10 | POLISH | 5 |
| PROF | 49 | RESALE | 94 |
| SEAT | 24 | SEC | 15 |
| SETUP | 18 | SYS | 14 |
| TIX | 25 | WAIT | 17 |
| WAL | 12 | WS | 16 |
