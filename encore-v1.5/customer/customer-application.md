# Customer Application

Route-level metadata (API/WS/components/states/mobile) for every customer
route is in `../routes/route-inventory.md`. This document covers the
flows that need behavior beyond a route table — state machines,
synchronization rules, and failure handling.

---

## Waiting Room (`/events/[eventId]/waiting-room`)

### States

```text
JOINING -> QUEUED -> ADMITTED -> (redirect to select-seats)
                   -> EXPIRED
                   -> EVENT_CLOSED
```

| State | UI | Source of truth |
|---|---|---|
| `JOINING` | Skeleton while `POST /api/v1/waiting-room/join` resolves | API response |
| `QUEUED` | `QueuePosition` (large number) + `EstimatedWait` + `AdmissionProgress` | WebSocket `waiting-room.{entry_id}` channel — never client-computed by counting down locally |
| `ADMITTED` | Brief "You're in!" transition, then auto-redirect to select-seats | Server push |
| `EXPIRED` | Dedicated modal: "Your place in line expired" + "Rejoin queue" — not a generic error | Server push (`entry.expired`) |
| `EVENT_CLOSED` | Dedicated modal: "This sale has ended" + link back to the event page | Server push (`event.closed`) |
| Rate-limited on join | `RateLimitBanner`, not a modal | 429 response |

### Reconnect behavior

If the WebSocket drops mid-queue: exponential backoff reconnect (see
`../architecture/realtime-architecture.md` §5) while showing a
reconnecting badge next to the position number — **the position number
itself does not change or gray out during reconnect**. On successful
reconnect, the server immediately pushes the current authoritative
position; if it changed while disconnected, the UI updates without
animation (a jump, not a smooth count).

### Browser refresh behavior

`entry_id` is persisted in the URL and `sessionStorage`. On refresh, the
page calls `GET /api/v1/waiting-room/{entry_id}` to fetch current state
before rendering anything — no optimistic "still queued" assumption.

---

## Seat Selection (`/events/[eventId]/select-seats`)

### The core rule

**The frontend is never the source of truth for seat status.** Every
`Seat` component's visual state is derived from one place:
`queryClient.getQueryData(['event', eventId, 'seats'])`, updated by
exactly two mechanisms: the initial fetch, and WebSocket messages on
`inventory.{event_id}` applied via `queryClient.setQueryData`.

A user clicking a seat does **not** optimistically mark it `HELD` in
this shared cache — it moves to a client-only "pending selection"
Zustand store until `POST /api/v1/holds` confirms it.

### Full synchronization state machine

```text
AVAILABLE (from GET, or a WS "seat.released" message)
   | user clicks
   v
PENDING_SELECTION (client-only, not written to the shared cache)
   | user confirms
   v
POST /api/v1/holds
   |
   |- 201 Created -----------------------> HELD (written into the shared
   |                                        cache; HoldCountdown mounts,
   |                                        server-authoritative expires_at
   |                                        drives it)
   |
   `- 409 SEAT_ALREADY_HELD / SOLD -------> Selection cleared; toast:
                                             "That seat was just taken —
                                             pick another"; shared cache
                                             immediately refetched (not
                                             just trusted from the error)
```

### Concurrent user selection

Both users' UIs show the seat as `AVAILABLE` until one gets a 201. The
instant that happens, the backend publishes `seat.held` on
`inventory.{event_id}`, received by every other connected client —
including the losing user, if their hold attempt hasn't resolved yet.
The 409 handler and the WS handler both converge on the same result (a
refetch-backed `HELD` state) regardless of ordering.

### Hold expiration (someone else's, not yours)

When a different user's hold expires, the backend publishes
`seat.released` and the seat flips back to `AVAILABLE` in every viewer's
map in real time — the same mechanism, opposite direction.

### API rejection beyond 409

| Error | UI |
|---|---|
| `400 INVALID_SEAT` | Toast, selection cleared — should not normally happen from the UI, logged as a likely bug if seen |
| `404 EVENT_NOT_FOUND` | Full-page error state, not a toast |
| `429` | `RateLimitBanner`, hold attempt not auto-retried (see `../state/state-management.md`'s retry table — hold creation is never auto-retried) |

### Stale seat state / reconnect

If the WebSocket drops for more than 5 seconds, on reconnect the page
**force-refetches** the full seat list rather than trusting buffered WS
messages alone — cheap for this endpoint, eliminates a whole class of
"missed one message" bugs.

### Browser refresh

An unclicked `PENDING_SELECTION` is lost on refresh, by design — it was
never sent to the server. An existing confirmed `HELD` seat **is**
restored: the page's initial load checks `GET /api/v1/holds?user=me&event=`
before rendering, and if an active hold exists, jumps straight to
showing it with its real remaining TTL.

---

## Hold Countdown

Used on both Seat Selection (once a hold exists) and Checkout.

**The frontend timer is a visual representation only. The backend TTL is
authoritative.**

- `HoldCountdown` receives `expires_at` (an ISO timestamp), not a
  duration — a duration drifts against server time, a timestamp doesn't.
- Re-syncs against `expires_at` on every `hold.{hold_id}` WS message.
- When the client-side timer reaches zero, it does **not** unilaterally
  treat the hold as expired — it shows a "confirming..." micro-state and
  makes one `GET /api/v1/holds/{hold_id}` call for the authoritative
  status, since clock drift means visual-zero and actual-expiry aren't
  guaranteed to be the same instant. Only the server's answer flips the
  UI to `HoldExpiredModal`.
- Warning state (amber, visual only) triggers at 60 seconds remaining.
- `HoldExpiredModal` is non-dismissible-by-backdrop-click — the only
  exit clears all selection state and navigates back.

---

## Checkout (`/checkout`)

### Flow

```text
Seat Held (entering /checkout requires an active, non-expired hold,
           enforced by middleware, not just a client redirect)
   -> Order review (line items, price, wallet credit applied)
   -> Payment (see state machine below)
   -> POST /api/v1/orders -> order_id returned
   -> Ticket issuance (async, saga-orchestrated — frontend polls/waits on WS)
   -> Redirect to /orders/{order_id}/confirmation
```

### Failure paths — designed failure-path-first

| Scenario | UI behavior |
|---|---|
| Hold expires while filling out payment | `HoldExpiredModal` interrupts immediately (same `hold.{hold_id}` channel); payment form disabled instantly, even mid-keystroke |
| Order creation fails (non-payment, e.g. 409 race, 400 validation) | Inline error above the payment form, form remains editable, no navigation away |
| Payment declines | See state machine — does NOT release the hold immediately; a grace window allows retry with the same hold |
| Duplicate submission (double-click, or a retry after a network blip) | Submit button disabled during the request; `apiClient` attaches the **same** `Idempotency-Key` (generated once per checkout session) to every payment request in that session |
| Ticket issuance delayed | Confirmation page shows a progress state "Issuing your ticket...", subscribes to the order's WS channel, updates on completion — never presented as failure |
| Partial failure (payment succeeded, issuance failed) | A backend compensating-transaction case — the frontend reflects whatever state the backend settles into (e.g. a `FAILED` order with a wallet-credit compensation) in plain language sourced from backend fields, never invented copy |
| Unknown payment state (network died after submission) | See `UNKNOWN` state below — the single most important failure state in the app |

---

## Payment UX — complete state machine

| State | Trigger | UI | Allowed transitions |
|---|---|---|---|
| `INITIAL` | Page loaded, no submission | Form enabled | -> `PROCESSING` |
| `PROCESSING` | Submit clicked | Form disabled, loading button, back-button intercepted with confirm dialog | -> `SUCCESS`, `FAILED`, `TIMEOUT`, `UNKNOWN` |
| `SUCCESS` | 2xx with `COMPLETED` status | Redirect toward ticket-issuance progress | terminal |
| `FAILED` | Non-2xx with a definitive decline reason | Inline error with the specific reason, form re-enabled, hold still active | -> `PROCESSING` (retry) |
| `TIMEOUT` | Client-side timeout (longer than default, payment providers are slower) with no response at all | "This is taking longer than expected — checking status..." then auto-transitions | -> `UNKNOWN` (auto) |
| `UNKNOWN` | From `TIMEOUT`, or a hard network error after submission | **Never a generic error.** Calls `GET /api/v1/payments?idempotency_key=` to ask the backend what actually happened | -> `SUCCESS` / `FAILED` / `RETRYING` depending on lookup result |
| `RETRYING` | User retry from `FAILED`, or auto-continuation from `UNKNOWN` finding nothing | Same as `PROCESSING`, labeled "Retrying...", **same** Idempotency-Key reused | -> `SUCCESS`, `FAILED`, `TIMEOUT`, `UNKNOWN` |
| `CANCELLED` | User cancels before submitting (only from `INITIAL`) | Returns to seat selection; hold explicitly released via `DELETE /holds/{id}` | terminal |

**Idempotency messaging:** every retry includes "You won't be charged
twice" beneath the retry button — a deliberate copy decision, since
leaving a user afraid to click retry is a real, observed payment-UX
failure mode.

**Refresh/background during payment:** on return, the page checks for an
in-flight Idempotency-Key in `useCheckoutStore`; if one exists, it goes
straight to `UNKNOWN`-state resolution before rendering any form.

**Order recovery:** a payment resolving to `SUCCESS` via the `UNKNOWN`
path proceeds exactly like a normal `SUCCESS` — no separate "recovered
order" code path, since the order already exists server-side.

---

## Tickets (`/tickets`, `/tickets/[ticketId]`)

`TicketStatusBadge` maps exactly to backend enum values — `ISSUED`,
`USED`, `CANCELLED`, `REFUNDED`, `LISTED_FOR_RESALE`, `TRANSFERRED` —
never an invented intermediate status. `TicketQR` renders the code as
both a QR image and plain text beneath it, so a scan failure has a
manual fallback.

## Orders (`/orders`, `/orders/[orderId]`)

`OrderDetail` composes payment status, issued tickets, wallet credit
involved (linked, not duplicated), and resale info if applicable —
always linking into those other pages rather than re-rendering their
content.

## Wallet (`/wallet`)

`WalletBalance` shows one number prominently. `LedgerTable` lists
transactions in plain language generated from the `reason` field
(`CANCELLATION_CREDIT`, `RESALE_PROCEEDS`, `PURCHASE_DEBIT`, `REFUND`),
never raw enum values, each with amount, running balance, timestamp —
explicitly read-only, no edit/delete affordance anywhere near it.

---

## Live Event Chat (`/events/[eventId]/chat`)

| Concern | Behavior |
|---|---|
| Room membership | Auto-subscribe on mount, unsubscribe on route change/tab close |
| Message ordering | By server-assigned sequence number, not client receipt order — an out-of-order message inserts at its correct position |
| Typing indicator | Debounced (max once/3s while focused), auto-clears after 5s of no keystroke |
| Presence | From the channel's server-pushed roster, never client-computed |
| Reconnect | Same backoff as waiting room; backfills via `after_sequence`, deduplicated |
| Offline | Input disabled with a tooltip rather than allowing composition that would just fail |
| Message failures | Shown inline with a `failed` state and a manual "retry" — never silently dropped, never silently auto-retried (no idempotency key on a chat message) |
| Rate limiting | Input briefly disabled with a countdown, not a toast that could be missed mid-conversation |
| Moderation | A removed message disappears from the sender's own view too, via the same WS channel, not just other viewers' |
