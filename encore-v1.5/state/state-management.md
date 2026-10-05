# State Management, Caching, and Error/Retry Strategy

## 1. Cache policy per resource

| Resource | Query key | staleTime | Invalidated by |
|---|---|---|---|
| Event list/detail | `['events',...]` / `['event',id]` | 60s / 30s | `event.{id}.status` WS |
| Seats | `['event',id,'seats']` | **0s** (always stale — see §5) | `inventory.{event_id}` WS (patched, not just invalidated) |
| Hold | `['hold',id]` | 0s | `hold.{hold_id}` WS |
| Search/autocomplete | `['search',q]` / `['autocomplete',q]` | 30s / 120s | time only |
| Orders/tickets | `['order',id]`, `['tickets']` | 30s | `order.{id}` / `orders.{userId}` WS |
| Wallet | `['wallet','balance']` | 15s | any WS event plausibly affecting balance |
| Resale listings/order-book | `['resale',...]` | 15s | `resale.{event_id}` / `resale.listing.{id}` WS |
| Notifications | `['notifications']` | 30s | `notifications.{userId}` WS |
| Ops dashboards | `['ops',dashboard]` | 15s | corresponding `ops.*` WS channel |
| Leaderboard | `['leaderboard']` | 30s | `leaderboard` WS |

**Rule for choosing staleTime:** a resource gets `staleTime: 0` only if a
stale read could cause an **incorrect user action** — the seats/holds
case. Everything else gets a small positive staleTime.

## 2. Client state

Only ephemeral, resettable-with-no-consequence state belongs in a
Zustand store: `useSeatSelectionStore`, `useCheckoutStore` (current
session's Idempotency-Key, current step), `useUiStore`,
`useOpsDashboardFiltersStore`. None of these stores is ever the answer
to "is this seat available" or "did this payment succeed."

## 3. Cache invalidation — priority order

1. **WebSocket patch** (`setQueryData`) — when the WS payload contains
   the full new value.
2. **WebSocket-triggered invalidation** (`invalidateQueries`) — when the
   payload is a signal, not the full state.
3. **Time-based staleness** — the fallback for everything without a
   real-time channel, or as a safety net alongside WS invalidation.

## 4. Optimistic updates — the test

**Allowed:** marking a notification read, acknowledging an ops alert,
chat-message-send (shown `pending` until confirmed). **Forbidden:**
anywhere in the seat/hold/payment/order/resale-trade path. The test:
*would an optimistic update, if wrong, cause the user to believe they
hold/own/paid for something they don't?* If yes, no optimistic update.

## 5. Why seats/holds get `staleTime: 0`

The WebSocket channel is the real-time source of truth; the REST fetch
is mainly a bootstrap/resync mechanism (initial load, and the
reconnect-triggered force-refetch). Treating it as cacheable would
reintroduce exactly the staleness risk the WS channel exists to
eliminate.

## 6. Refetch triggers beyond staleTime

Window refocus: enabled globally except ops dashboards (rely on WS +
their own staleTime, to avoid a refetch storm from alt-tabbing).
Network reconnect: enabled globally.

## 7. Missed-WebSocket-message safety net

Two independent nets: the reconnect-triggered force-refetch on the
seats/holds path, and a conservative background refetch on
staleTime-bearing queries elsewhere.

---

## Global UI states

Every page references these by ID rather than re-deriving generic states.

### Loading
`G-LOAD-SKELETON` (default first paint), `G-LOAD-SPINNER` (button-triggered
actions), `G-LOAD-PROGRESS` (measurable operations — upload, transcode,
deployment rollout).

### Empty
`G-EMPTY-DEFAULT` (icon + message + relevant CTA), `G-EMPTY-FILTERED`
(same component, "no results match your filters" + clear-filters CTA).

### Errors
| ID | HTTP | Treatment |
|---|---|---|
| G-ERR-400 | 400 | Inline field-level (forms) or ErrorState (non-form) |
| G-ERR-401 | 401 | Redirect to `/login?redirect=` |
| G-ERR-403 | 403 | Redirect to `/forbidden` |
| G-ERR-404 | 404 | ErrorState "not found" + link back |
| G-ERR-409 | 409 | Context-specific — see the domain error catalog below |
| G-ERR-429 | 429 | `RateLimitBanner`, non-blocking, `Retry-After`-driven countdown |
| G-ERR-500/502/503 | 5xx | ErrorState "something went wrong" / "temporarily unavailable" |
| G-ERR-NETWORK/TIMEOUT | — | ErrorState "offline" variant |

### Permission
`G-PERM-HIDDEN` (default — role-inappropriate controls not rendered at
all), `G-PERM-DISABLED` (used only where hiding would be actively
confusing, e.g. rollback for OPERATIONS).

### Special
`G-SPECIAL-MAINTENANCE`, `G-SPECIAL-OFFLINE` (persistent banner, not a
takeover), `G-SPECIAL-RECONNECTING` (inline badge near the live element),
`G-SPECIAL-DEGRADED`, `G-SPECIAL-RATE-LIMITED`, `G-SPECIAL-SESSION-EXPIRED`
(modal, not a redirect, on pages with unsaved state — selected seats
survive and get re-validated after re-login; payment form data never
does, since nothing payment-related is ever persisted client-side).

---

## Domain error-code catalog

| Code | Where | UI treatment |
|---|---|---|
| `SEAT_ALREADY_HELD` / `SEAT_ALREADY_SOLD` | Seat selection, checkout | Toast + forced refetch |
| `INVALID_SEAT` | Seat selection | Toast, logged as a likely bug |
| `HOLD_EXPIRED` | Checkout | `HoldExpiredModal`, non-dismissible-by-backdrop |
| `EMAIL_ALREADY_REGISTERED` | Signup | Inline, "log in instead" link |
| `TOKEN_EXPIRED` | Any authenticated request | Handled silently by the interceptor |
| `TICKET_NOT_TRANSFERABLE` | Resale sell | Inline, backend reason shown verbatim |
| `LISTING_NO_LONGER_AVAILABLE` | Resale buy | Inline, link back to order book |
| `ORDER_ALREADY_EXISTS` | Checkout (idempotent replay) | Treated as success — existing order fetched |
| `PAYMENT_DECLINED` | Payment | `FAILED` state, reason shown |

## Retry rules by request type

| Request type | Auto-retry? | Note |
|---|---|---|
| GET (any) | Yes, 3 attempts, 500ms/1s/2s backoff | Naturally safe |
| `POST /holds` | **No** | A retried hold against a now-unavailable seat must not silently succeed on stale intent |
| `POST /orders` | **No** | Same reasoning |
| `POST /payments` | No auto-retry; user-initiated retry reuses the same Idempotency-Key | The entire point of the `RETRYING` state |
| `POST /resale/orders` (buy) | **No** | A buy-order race is expected/common — auto-retry could create an unintended second bid |
| Chat message send | User-driven only | No idempotency key exists for a chat message |
| File upload chunk | Yes, 3 attempts | Each chunk carries its own idempotency key |
| Everything else (PATCH/DELETE, low-consequence) | Yes, 2 attempts | Naturally idempotent |

**The rule underlying this table:** auto-retry is allowed exactly when a
duplicate successful execution is harmless or guarded by a frontend-
controlled idempotency key. Anywhere a duplicate could mean two held
seats, two orders, or two competing bids, retry requires explicit user
action.

Payment-specific timeout: 30s (vs. the 10s default), since payment
providers are inherently slower — a placeholder pending real latency
data from the backend's payment integration.
