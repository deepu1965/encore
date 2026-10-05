# Encore V1.5 — Phase 0 Contract Audit Report

> **Phase:** 0 — Contract Audit
> **Date:** 2026-09-28
> **Auditor:** Kiro
> **Method:** Every V1.5 API/WS contract in `encore-v1.5/api/*` and
> `encore-v1.5/realtime/*` verified against the actual V1 backend source in
> `encore/apps/*` (not against `Encore_v1_Final.md` prose alone).
> **Verdict:** Phase 1 is **clear to start**, but with **material corrections**.
> The plan's API/WS contract layer is significantly more optimistic than the
> running backend. None of the corrections block scaffolding (Phase 1) or the
> design system (Phase 2); several block or reshape later phases (3, 5, 7, 8, 9,
> 10) and must be treated as confirmed backend gaps, not assumptions.

---

## Exit criteria check

Phase 0 exit criteria (from the tracker): *"Every gap in `api/backend-gaps.md`
reviewed; each scheduled, deferred-with-sign-off, or resolved."*

- All 7 documented gaps (G-1..G-7) reviewed against live code — see §1. **Met.**
- Additional gaps discovered during verification — see §2. Documented and
  classified with a mitigation direction each. **Met.**
- Sign-off recorded — see §4. **Met.**

---

## 1. The 7 documented gaps (G-1..G-7) — verification against V1 code

| Gap | Documented as | Verified against V1 code | Status |
|---|---|---|---|
| G-1 Artist entity/follow | Non-blocking, flagged off | No `Artist` table in `models.py`. `UserFollow` exists but models a **user→organizer** follow, not artist follow. Confirmed absent. | **CONFIRMED** — mitigation (flag off) stands |
| G-2 Incident entity | Non-blocking, flagged off | No incident entity/router. `deployment.py` exists; no incidents. Confirmed absent. | **CONFIRMED** — flag off stands |
| G-3 OpenAPI spec | Non-blocking, tooling | Gateway is FastAPI (auto-generates OpenAPI at runtime), but no published stable spec artifact. Hand-written client stands. | **CONFIRMED** |
| G-4 Media access policy | Can mock (`TICKET_HOLDERS_ONLY`) | `MediaVisibility` enum = `PUBLIC` / `ORGANIZER_ONLY` only (`models.py`). There is **no `TICKET_HOLDERS_ONLY`** value and no per-event `media_access_policy` field on `Event`. The assumed default does not exist in the enum. | **CONFIRMED + sharper**: the conservative default the plan names isn't representable yet. Keep flagged; note enum divergence. |
| G-5 `RESERVED` inventory status | Non-blocking, action hidden | `InventoryStatus` enum = `AVAILABLE` / `HELD` / `SOLD` only. No `RESERVED`. Confirmed absent. | **CONFIRMED** — hide action stands |
| G-6 Direct ticket transfer | Non-blocking, action hidden | Transfer logic **exists** but as an internal service-to-service route `POST /internal/tickets/transfer` (`tickets.py`), not a customer-facing `POST /tickets/{id}/transfer`. No auth-as-owner customer path. | **CONFIRMED** — customer surface absent; hide action stands |
| G-7 SUPPORT role scope | Non-blocking, needs product | `UserRole` enum = `BUYER` / `ORGANIZER` / `ADMIN` only. SUPPORT **and OPERATIONS** are both absent from the backend enum. | **CONFIRMED + broader** (see G-11) |

All 7 documented gaps are real and correctly classified. G-4, G-6, G-7 needed
sharpening (recorded above and in §2).

---

## 2. Additional gaps found (NEW — not in the original 7)

These were discovered by reading the running services. They are the reason
Phase 0 exists. Each is given a proposed ID continuing the `G-` sequence.

### G-8 — Auth contract mismatch (login endpoint) — **HIGH, blocks Phase 3**
- **Plan** (`api-contracts.md`, `auth-rbac.md`): `POST /api/v1/auth/login`
  validates credentials, sets an httpOnly/Secure/SameSite cookie, returns
  `{ user, role }`. Plus `/auth/signup`, `/auth/refresh`,
  `/auth/password-reset-request`, `/auth/password-reset-confirm`.
- **Actual** (`auth_router.py`): only `POST /api/v1/auth/token`. It takes
  `{ user_id: <UUID> }` (no email, no password), returns
  `{ access_token, token_type: "bearer" }` as a **bearer token, not a cookie**.
  `get_current_user` (`auth.py`) reads `Authorization: Bearer <JWT>`. Token
  expiry returns `401 TOKEN_EXPIRED` — which does match the plan's refresh
  interceptor trigger.
- **Missing endpoints:** signup, refresh, both password-reset endpoints — none
  exist.
- **Resolution:** The plan's own Phase 1/3 design already calls for a Next.js
  BFF route (`/api/auth/login`) that wraps the backend token endpoint and sets
  the httpOnly cookie — so the cookie model is achievable in the BFF without a
  backend change. But: (a) the BFF must call `/auth/token` with a `user_id`, so
  a real credential check does not exist server-side; (b) signup, refresh, and
  password reset have **no backend** and their auth pages (Phase 3) can only be
  built against stubs/flags until the backend lands. Treat as scheduled backend
  work; Phase 3 pages depending on signup/reset should be flag-gated like a gap.

### G-9 — Multi-service topology, not a single gateway origin — **HIGH, cross-cutting**
- **Plan** assumes every endpoint is reachable under one origin at
  `/api/v1/*` and the frontend uses a single `NEXT_PUBLIC_API_BASE_URL`.
- **Actual** (`main.py`): the api-gateway mounts only health, events, holds,
  inventory, orders, payments, internal-tickets, search, short_urls, feed, chat,
  media, location, ads, leaderboard, scheduler, deployment, auth. **resale,
  waiting-room, wallet, and notification are separate FastAPI apps on their own
  ports** and are not proxied by the gateway.
- **Resolution:** decide one of — (a) add a gateway proxy/BFF layer that fronts
  those services under `/api/v1/*` (preferred; keeps the plan's single-origin
  assumption true and centralizes the response-envelope normalization), or
  (b) introduce per-service base URLs in `lib/env.ts`. This is a **Phase 1
  architecture decision** (api-client/env config) and should be resolved before
  building resale/waiting-room/wallet/notification features.

### G-10 — WebSocket contract mismatch (chat + the whole realtime model) — **HIGH, reshapes Phase 5/9/10/12 realtime**
- **Plan** (`websocket-contracts.md`): rich per-channel model — named channels
  (`inventory.{event_id}`, `chat.{event_id}`, `resale.trade.{id}`, …), named
  events (`seat.held`, `message.sent`, `presence.updated`, `typing.updated`, …),
  every message carrying a `sequence` number, reconnect backfill via
  `after_sequence`, 200-message dedup ring buffer.
- **Actual** (`chat.py`): one WS endpoint, `/ws/chat/{event_id}?token=<JWT>
  &last_message_id=<int>`. Messages are flat JSON:
  `{ type: "chat"|"presence"|"error", id, event_id, user_id, content, created_at }`.
  No response/error envelope, no `sequence` field (ordering/backfill uses the
  autoincrement integer `id` + `last_message_id`, not `after_sequence`), no
  `display_name`, no per-event-name routing. Presence is join/leave only — **no
  typing indicator**; moderation silently drops blocked messages (**no removal
  broadcast** back to the sender).
- **Only chat has a real WS surface.** The plan's inventory/hold/order/resale/
  waiting-room/notification/ops WS channels have **no verified WS endpoint** in
  the gateway — those domains emit **Kafka** events (e.g. `holds.py` publishes
  `seat.held`/`seat.released`; `orders.py` publishes `order.cancelled`;
  resale-engine consumes/produces resale Kafka events). There is no
  browser-facing WS bridge for them yet.
- **Resolution:** the `WebSocketManager` skeleton (Phase 1) can be built to the
  plan's interface, but the realtime **contract** must be re-derived from what
  the backend actually emits. Two sub-decisions: (1) chat client must speak the
  flat message shape + integer-id backfill, not the envelope/sequence model;
  (2) all non-chat realtime needs a Kafka→WS/SSE bridge to exist before those
  live-update features (seat map live updates, resale order book, ops flash-sale
  panels) can work as specified. Until the bridge exists, those surfaces fall
  back to polling (the plan's own §8 fallback).

### G-11 — Role enum divergence (OPERATIONS + SUPPORT both absent) — **MEDIUM, affects Phase 3 RBAC**
- **Plan:** 5 roles `CUSTOMER | ORGANIZER | SUPPORT | OPERATIONS | ADMIN`.
- **Actual** (`models.py`): 3 roles `BUYER | ORGANIZER | ADMIN`. JWT carries the
  role claim via `create_token(uid, user.role.value)`.
- **Mapping to adopt (frontend-side, single place):**
  `BUYER → CUSTOMER`, `ORGANIZER → ORGANIZER`, `ADMIN → ADMIN` **and**
  `ADMIN → OPERATIONS` (ops surfaces gate on ADMIN until a real OPERATIONS role
  exists). `SUPPORT` remains unreachable (G-7). **OPERATIONS has no backend
  identity** — every ops route (all of Phase 12) is effectively ADMIN-gated
  until the backend adds the role. Record this explicitly so ops RBAC isn't
  built against a role the token can never carry.

### G-12 — Resale contract mismatch — **HIGH, blocks/ reshapes Phase 9**
- **Plan:** `POST /api/v1/resale/orders {type: BUY|SELL}`,
  `DELETE /resale/orders/{listing_id}`, `GET /resale/listings`,
  `GET /resale/order-book/{event_id}`, `GET /resale/trades`. Marked **E**xisting.
- **Actual** (`resale-engine/routers/resale.py`): `POST /api/v1/resale/listings`
  (body `event_id, ticket_id, seller_id, ask_price_cents`) and
  `POST /api/v1/resale/orders` (body `event_id, buyer_id, bid_price_cents`) — no
  `type` field; listing and buy-order are **separate endpoints**. There is **no**
  DELETE, no `GET /listings`, no `GET /order-book/{event_id}`, no `GET /trades`.
  Both handlers stub the DB (`get_db` yields `None`) and only publish a Kafka
  event; matching is async in the consumer. Responses are bare
  `{status:"success", listing_id|order_id}` — **not** the `data`/`error`
  envelope.
- **Resolution:** Phase 9 read surfaces (order book, my-listings, my-trades,
  trade detail) have **no backend GET endpoints** — they are gaps, not "E". The
  write endpoints exist but with a different shape and no envelope. Reclassify
  resale from "Existing" to "Partial + gapped reads"; schedule backend read
  endpoints or flag those routes.

### G-13 — Waiting-room contract mismatch — **MEDIUM, reshapes Phase 6**
- **Plan:** `POST /api/v1/waiting-room/join` (event_id in body) +
  `GET /api/v1/waiting-room/{entry_id}` (by entry). Marked **E**.
- **Actual** (`queue_router.py`): `POST /api/v1/waiting-room/{event_id}/join`
  (event_id in **path**) + `GET /api/v1/waiting-room/{event_id}/status` (keyed by
  **event_id, not entry_id**). Admission is enforced downstream via a single-use
  `X-Waiting-Room-Token` consumed by `holds.py` (GETDEL on shared Redis).
- **Resolution:** correct the Phase 6 client to the path/identifier that exists,
  and wire the admission token into the hold-creation call (the plan doesn't
  currently mention `X-Waiting-Room-Token`, which is **required** for flash-sale
  events). Add that header to the api-client contract.

### G-14 — Wallet is a stub, no ledger endpoint — **MEDIUM, affects Phase 8**
- **Plan:** `GET /api/v1/wallet` + `GET /api/v1/wallet/transactions` (read-only
  balance + ledger). Marked **R**.
- **Actual** (`wallet-service/routers/wallet.py`): `GET /api/v1/wallet/{user_id}`
  returns **hardcoded** `balance_cents: 0, escrow_cents: 0`; `/transaction` and
  `/escrow/{hold,release,refund}` return `{status:"success"}`. No transactions/
  ledger endpoint. Not persisted, not enveloped.
- **Resolution:** wallet balance + ledger are effectively gapped. Flag the
  `/wallet` route's ledger, or build against the stub knowing values are fake
  (this is a "can mock temporarily" per the plan's own rule, since it's a
  read-only display, not a fabricated success path in a purchase flow).

### G-15 — Notifications have no HTTP surface — **MEDIUM, blocks Phase 10 notifications**
- **Plan:** `GET /api/v1/notifications` + `POST /api/v1/notifications/{id}/read`.
  Marked **R**.
- **Actual:** `notification-service` has **no** `APIRouter`/`FastAPI`
  app/route — it is a Kafka consumer only. Neither endpoint exists.
- **Resolution:** notification list/read are gaps. The header-bell + notification
  center (Phase 10) must be flag-gated until the backend exposes HTTP read/ack
  endpoints (and, per G-10, a WS/SSE bridge for `notification.created`).

### G-16 — Purchase-flow helper endpoints missing — **MEDIUM, affects Phase 5/7**
- `GET /api/v1/holds?user=me&event=` (hold restoration on page load) — **absent**.
  There is also no `GET /holds/{hold_id}`; `DELETE /holds/{id}` keys on
  **inventory_id**, not hold_id (`holds.py`).
- `GET /api/v1/payments?idempotency_key=` (recover the UNKNOWN payment state) —
  **absent**. Payments only expose `POST /api/v1/payments`.
- `GET /api/v1/orders` (list) — **absent**; only `GET /orders/{order_id}` and
  `POST /orders/{order_id}/cancel` exist.
- **Resolution:** these are the endpoints the plan marks **R** ("required
  frontend contract") — confirmed they do not exist yet. The seat-restoration
  (Phase 5) and payment-UNKNOWN recovery (Phase 7) flows depend on them;
  schedule as backend work or design an interim (e.g. persist the in-flight
  idempotency key client-side and rely on `POST` idempotency replay for the
  UNKNOWN case, which `payments.py`/`orders.py` do support).

### G-17 — Discovery path/name mismatches — **LOW, easy fix in api-client**
- Location: plan `GET /location/nearby-events` + `/nearby-friends`; actual
  `GET /api/v1/location/events-near-me`, `/location/friends/nearby`,
  `/location/routing/eta`, `POST /location/friends/location`.
- Leaderboard: plan `GET /api/v1/leaderboard`; actual
  `GET /api/v1/leaderboard/trending`.
- Confirmed matching as documented: `GET /api/v1/events`,
  `GET /api/v1/events/{id}`, `GET /api/v1/events/{id}/seats`,
  `GET /api/v1/search`, `GET /api/v1/search/autocomplete`, `GET /api/v1/feed`.
- **Resolution:** correct the paths in the api-client hooks; no backend work.

---

## 3. What verified clean (no change needed)

- Response-envelope convention (`data`/`error` + `request_id`) is real and
  consistent across the **gateway** routers (`success_envelope`/`error_envelope`
  in `main.py`'s exception handler). Note the exceptions: chat WS, resale-engine,
  and wallet-service do **not** use it (G-10, G-12, G-14).
- `Idempotency-Key` is enforced on `POST /holds`, `POST /orders`, `POST /payments`
  (400 `MISSING_IDEMPOTENCY_KEY` when absent; replay returns the stored response).
  Matches the plan's idempotency model.
- `X-Request-Id` generated/propagated at the gateway (`request_id_middleware`).
- `401 TOKEN_EXPIRED` on expiry — matches the refresh-interceptor design.
- Seat inventory state machine `AVAILABLE → HELD → SOLD` enforced with
  `SELECT ... FOR UPDATE` + Redis SETNX fast-path (`holds.py`, `orders.py`), and
  `409` on races — matches the plan's seat-sync assumptions.

---

## 4. Sign-off

**Signed off to proceed to Phase 1** with the following binding conditions:

1. **Phase 1 must resolve G-9** (single-origin gateway/proxy vs. per-service base
   URLs) as part of `lib/env.ts` + `lib/api-client.ts`, and **G-8's BFF**
   (`/api/auth/login` wrapping `/api/v1/auth/token` → httpOnly cookie).
2. **The api-client contract must be corrected** for G-12, G-13, G-14, G-16, G-17
   before the corresponding feature phases (5, 6, 7, 8, 9) start — not silently
   built against the plan's optimistic paths.
3. **The realtime contract (G-10) must be re-derived** from actual backend
   emissions before Phase 5's live seat updates; only chat has a real WS today,
   and it uses a flat message shape, not the envelope/sequence model. Non-chat
   realtime needs a Kafka→WS/SSE bridge decision.
4. **Gaps that become flag-gated routes** (per the plan's own no-fabrication
   rule): signup/reset pages (G-8), resale reads (G-12), wallet ledger (G-14),
   notifications (G-15), plus the already-flagged G-1/G-2/G-4/G-5/G-6/G-7.
5. **RBAC (G-11):** implement the role-mapping layer with `ADMIN → OPERATIONS`
   until a real OPERATIONS role exists; SUPPORT stays unreachable.

None of these block Phase 1 (scaffold) or Phase 2 (design system). They must be
respected as each feature phase opens.

### New gap IDs to fold into `api/backend-gaps.md`
G-8 (auth), G-9 (topology), G-10 (WS contract), G-11 (role enum),
G-12 (resale), G-13 (waiting-room), G-14 (wallet), G-15 (notifications),
G-16 (purchase helpers), G-17 (discovery paths).
