# Implementation Phases

**Dependency correction applied in this update:** Checkout no longer
lists Waiting Room as a dependency — see `dependency-graph.md` for the
full explanation and corrected graph. This document covers each phase's
goal and exit criteria; `dependency-graph.md` is the authoritative source
for what depends on what.

| Phase | Name | Exit criteria |
|---|---|---|
| 0 | Contract Audit | Every gap in `../api/backend-gaps.md` reviewed with the backend team; each scheduled, deferred-with-sign-off, or resolved before the affected surface starts |
| 1 | Frontend Foundation | App scaffolded per `../architecture/frontend-folder-structure.md`; CI running lint/typecheck/unit-test/bundle-budget on every PR |
| 2 | Design System | Every component in `../design/component-inventory.md` exists in a catalog, themed both light and dark, automated accessibility check passing |
| 3 | Authentication | Login/signup/reset fully working; RBAC gating live for all 5 roles; mid-flow session-expiry handling working |
| 4 | Discovery | Home, Explore, Search (autocomplete included), Venue Details functional against real data |
| 5 | Event + Seat Selection | Full synchronization state machine working; E2E scenarios 6, 7, 19, 20 passing |
| 6 | Waiting Room | Reconnect/refresh behavior working; E2E scenarios 4, 5 passing — **does not block Phase 7**, see `dependency-graph.md` |
| 7 | Checkout + Payment | Complete 8-state payment machine; E2E scenarios 8-11 passing; highest-scrutiny phase given payment's failure sensitivity |
| 8 | Tickets + Orders + Wallet | E2E scenarios 12, 13 passing |
| 9 | Resale | Full marketplace; E2E scenarios 14, 15 passing |
| 10 | Notifications + Chat | Reconnect/offline handling working |
| 11 | Organizer | E2E scenarios 16, 17 passing — parallel-buildable with 4-10 (only needs Phase 2/3) |
| 12 | Operations | Excludes Incidents (blocked on gap G-2); E2E scenario 18 passing — parallel-buildable with 4-11 |
| 13 | Documents + Media + Location | Functional against real/mocked data per gap G-4's interim assumption |
| 14 | Real-Time Integration Hardening | Every channel in `../realtime/websocket-contracts.md` verified end-to-end; SSE/polling fallback tested by deliberately blocking WebSocket upgrades |
| 15 | Testing | All 20 E2E scenarios passing together in one CI run; failure-mode suite fully green |
| 16 | Performance | Core Web Vitals targets met on staging under realistic data volume |
| 17 | Security | Every item in `../security/security.md` verified in production config |
| 18 | Final Polish | `../planning/acceptance-criteria.md`'s checklist passes for every P0 feature; `demo-scenarios.md`'s 5 demos run cleanly |

## Parallelization

Phases 11 (Organizer) and 12 (Operations) are independent of the
customer purchase-flow phases beyond needing auth and the design system
— a multi-engineer team would run 4->10 and 11/12 as parallel tracks.
Full graph, critical path, and the corrected normal-vs-high-demand
purchase-path dependency are in `dependency-graph.md`.
