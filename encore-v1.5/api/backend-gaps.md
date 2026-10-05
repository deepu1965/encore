# Backend Gap Matrix

Every capability the V1.5 frontend needs that the V1 backend (`Encore_v1_Final.md`) does not fully support yet. This is the definitive version of what was previously `13-backend-gap-list.md` — same 7 gaps, reformatted into the matrix the update requires, plus a live link to the exact backlog task that mitigates each one (never permanent fake/mock data for anything meant to demonstrate V1 — every mitigation below is either a feature flag that hides the surface cleanly, or a stated safer-default assumption pending confirmation, never a fabricated success path).

| Gap ID | Frontend Requirement | Backend Capability | Required API/Event | Blocking? | V1.5 Priority | Resolution | Mitigation Task |
|---|---|---|---|---|---|---|---|
| G-1 | Artist search results, artist pages, 'artists you follow' feed rail | Artist entity + follow relationship + Event.artist_id FK | GET /artists/{id}, GET /artists/{id}/events, POST/DELETE /artists/{id}/follow | **NON-BLOCKING** | P2 | Feature-flagged off; artist results excluded from /search, feed 'artists you follow' rail hidden | V15-GAP-001 |
| G-2 | /ops/incidents, /ops/incidents/[id], incident cross-links from alerts/deployments | Incident entity (severity, status, timeline, affected services, resolution) | GET/POST /ops/incidents, GET /ops/incidents/{id}, ops.incidents / ops.incident.{id} WS channels | **NON-BLOCKING** | P2 | Feature-flagged off; fully designed and typed (14-type-system.md) so implementation becomes P0 immediately once the entity exists — the flagging task itself is P2 effort, tracked separately from the ~21 already-designed route/WS tasks that unblock at that point | V15-GAP-002 |
| G-3 | Typed API client generation, automated contract testing | Published OpenAPI 3.x spec at a stable URL | N/A — tooling/process requirement, not a new endpoint | **NON-BLOCKING** | P2 | Hand-written lib/api-client.ts is a complete functional substitute for V1.5; regenerate once available | V15-GAP-003 |
| G-4 | /events/[id]/live, /events/[id]/replay access gating | Event.media_access_policy field + enforcement | Existing stream-manifest/vod-manifest endpoints, extended with a 403 + reason code | **CAN MOCK TEMPORARILY** | P2 | Built assuming TICKET_HOLDERS_ONLY as the safer default until confirmed; revisit on confirmation | V15-GAP-004 |
| G-5 | Organizer 'reserve seats for comps/press' action | RESERVED as a 4th InventoryStatus value | POST /organizer/events/{id}/inventory/reserve | **NON-BLOCKING** | P2 | Action hidden (G-PERM-HIDDEN) on the inventory page until the state machine change lands | V15-GAP-005 |
| G-6 | Direct ticket transfer (gift to another user), distinct from resale | Ticket ownership transfer without a trade/payment record | POST /tickets/{id}/transfer | **NON-BLOCKING** | P2 | 'Transfer' action hidden on ticket detail page; resale remains the only ownership-change path until this lands | V15-GAP-006 |
| G-7 | Any frontend surface for the SUPPORT role | SUPPORT role capability scope (spec names the role, defines no capabilities for it) | Unknown until product/backend defines SUPPORT's intended scope | **NON-BLOCKING** | Needs product clarification | No route in this plan is reachable by SUPPORT, and no P0-P3 task in this backlog depends on it — does not block CUSTOMER/ORGANIZER/OPERATIONS/ADMIN scope. Flagged for product clarification, not an engineering blocker. | V15-GAP-007 |

## Classification key

- **BLOCKING** — no route/feature in this backlog can ship without this gap closing first. None of the 7 gaps found are this severe.
- **NON-BLOCKING** — the affected surface is feature-flagged off or built against a stated safer-default assumption; everything else ships normally.
- **CAN MOCK TEMPORARILY** — used for exactly one gap (G-4, media access policy) where building against a conservative assumption (`TICKET_HOLDERS_ONLY`) is safe and cheap to correct later; this is *not* the same as faking a success path for something meant to demonstrate V1's actual behavior.
- **DEFERRED** — not used as a Blocking? value in this pass; all 7 gaps are non-blocking or mockable, not deferred-without-a-plan.

## Rule enforced throughout this backlog
No task anywhere in `../Encore-V1.5-Exhaustive-Backlog.xlsx` implements a gapped capability by inventing backend behavior. Every GAP-epic task (V15-GAP-001 through V15-GAP-007) implements only the interim mitigation — a feature flag, a hidden action, or a stated conservative default — never a fabricated version of the real feature.

---

## Phase 0 Contract Audit — additional gaps (G-8..G-17)

Added 2026-09-28 by the Phase 0 Contract Audit (`../../docs/Encore-V1.5-Phase0-Contract-Audit-Report.md`). These were found by verifying the plan's contracts against the **running** V1 backend in `../../encore/apps/*`, not against the spec prose. Unlike G-1..G-7 (all non-blocking), several of these reshape or gate specific feature phases and must be respected as those phases open.

| Gap ID | Frontend Requirement | Backend Reality (verified) | Blocking? | Affected Phase | Resolution direction |
|---|---|---|---|---|---|
| G-8 | Cookie-based login + signup/refresh/password-reset | Only `POST /api/v1/auth/token` (body `{user_id}`, returns bearer token, no cookie); no signup/refresh/reset | **BLOCKS Phase 3 (partial)** | 3 | BFF wraps `/auth/token` → httpOnly cookie; signup/refresh/reset pages flag-gated until backend lands |
| G-9 | Single origin `/api/v1/*` | api-gateway does not proxy resale/waiting-room/wallet/notification (separate FastAPI apps/ports) | **Cross-cutting** | 1 | Gateway proxy/BFF (preferred) OR per-service base URLs in `lib/env.ts` |
| G-10 | Rich per-channel WS (named events, `sequence`, `after_sequence` backfill, dedup) for all realtime | Only chat has a WS surface; flat message shape, integer-id backfill; all other realtime is Kafka-only (no browser WS bridge) | **Reshapes realtime** | 5, 9, 10, 12 | Re-derive WS contract from backend emissions; build Kafka→WS/SSE bridge before non-chat live updates; poll-fallback until then |
| G-11 | 5 roles incl. OPERATIONS, SUPPORT | `UserRole` = BUYER/ORGANIZER/ADMIN only | Medium | 3, 12 | Map `BUYER→CUSTOMER`, `ADMIN→ADMIN` and `ADMIN→OPERATIONS`; SUPPORT unreachable (G-7) |
| G-12 | `resale/orders {type}`, DELETE listing, GET listings/order-book/trades | Separate `POST /resale/listings` + `POST /resale/orders` (no `type`); no read/DELETE endpoints; bare `{status}` not envelope; DB stubbed | **Blocks Phase 9 reads** | 9 | Reclassify resale "E"→"partial+gapped reads"; schedule GET endpoints or flag routes |
| G-13 | `POST /waiting-room/join` (body) + `GET /{entry_id}` | `POST /waiting-room/{event_id}/join` (path) + `GET /{event_id}/status`; admission via single-use `X-Waiting-Room-Token` consumed at hold creation | Medium | 6 | Correct client path/identifier; add `X-Waiting-Room-Token` to api-client + hold call |
| G-14 | `GET /wallet` + `/wallet/transactions` (balance + ledger) | `GET /wallet/{user_id}` returns hardcoded zeros; no ledger endpoint; not enveloped | Medium | 8 | Ledger gapped; flag or build against stub (read-only display, per no-fabrication rule) |
| G-15 | `GET /notifications` + `POST /{id}/read` | notification-service has no HTTP router (Kafka consumer only) | **Blocks Phase 10 notifications** | 10 | Flag-gate notification center until backend HTTP + WS/SSE bridge exist |
| G-16 | `GET /holds?user=me&event=`, `GET /payments?idempotency_key=`, `GET /orders` (list) | None exist; `DELETE /holds/{id}` keys on inventory_id; payments POST-only; orders GET-by-id only | Medium | 5, 7, 8 | Schedule backend or interim: client-persist idempotency key + POST-replay for UNKNOWN recovery |
| G-17 | `/location/nearby-events`, `/nearby-friends`, `GET /leaderboard` | `/location/events-near-me`, `/location/friends/nearby`, `/location/routing/eta`; `GET /leaderboard/trending` | Low | 4 | Correct paths in api-client hooks; no backend work |

**Verified clean:** response envelope (gateway routers), `Idempotency-Key` on POST holds/orders/payments, `X-Request-Id` propagation, `401 TOKEN_EXPIRED` on expiry, and the `AVAILABLE→HELD→SOLD` seat state machine with `FOR UPDATE` + Redis SETNX and `409` on races.
