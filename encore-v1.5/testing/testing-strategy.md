# Testing Strategy

Tooling: Vitest + React Testing Library (unit/integration), Playwright
(E2E) — see `../architecture/frontend-architecture.md` §0 for the
rationale. Per-feature test-category applicability is in
`test-matrix.md`, generated from the same route inventory as the
backlog.

## 1. Unit tests — representative high-value targets

| Target | What's asserted |
|---|---|
| `Seat` component | Correct visual variant per `InventoryStatus`; `aria-label` includes section/row/number/price/status |
| `useSeatSelectionStore` | Selecting a seat doesn't touch the shared TanStack Query cache |
| `HoldCountdown` | Correct remaining time from a fixed `expires_at`; warning color at 60s; "confirming..." at zero, not immediate expiry |
| Payment state-machine reducer | Every transition individually tested, including all three `UNKNOWN` branches |
| `usePermission` hook | Correct boolean for representative role/route combinations |
| `RateLimitBanner` | Counts down, re-enables the action at exactly zero |
| Cursor pagination utility | Round-trips correctly; malformed cursor doesn't throw |

## 2. Integration tests

| Target | What's asserted |
|---|---|
| `apiClient` + MSW | Envelope unwrapping; maintenance-mode header handling; exactly one refresh call on 401, then one retry, then redirect on second failure |
| Auth flow | Login sets a session that unlocks a previously-blocked route; logout clears the session cache |
| Checkout flow | Hold -> checkout -> payment SUCCESS -> confirmation, same Idempotency-Key on retry as on the initial attempt |
| WebSocket manager + mock WS server | Two subscribers to one channel = one underlying subscription (ref-counting); disconnect exposes reconnecting state; reconnect re-subscribes every previously-active channel |
| Cache invalidation | A simulated `inventory.{event_id}` message patches the seats cache without a full refetch |

## 3. End-to-end tests (Playwright) — all 20 scenarios, concrete assertions

| # | Scenario | Assertions |
|---|---|---|
| 1 | Signup/login | Account created, session cookie present, protected route reachable |
| 2 | Browse event | Explore -> EventCard click -> correct event page |
| 3 | Search | Autocomplete within 500ms, selecting a result navigates correctly |
| 4 | Join waiting room | Real `entry_id` in URL, position number renders |
| 5 | Admission | Simulated `entry.admitted` -> redirect within 2s |
| 6 | Select seat | AVAILABLE -> PENDING_SELECTION -> HELD with visible countdown |
| 7 | Hold persistence | Refresh mid-hold -> still HELD, countdown continuing correctly |
| 8 | Checkout | Held seat -> order summary shows correct price |
| 9 | Payment success | SUCCESS -> issuance progress -> confirmation with a visible ticket |
| 10 | Payment failure | Decline -> specific reason shown, hold still active |
| 11 | Retry | Same Idempotency-Key sent (asserted via intercepted headers) |
| 12 | Ticket issuance | WS message flips confirmation page without a reload |
| 13 | View ticket | QR + plain-text code + correct seat/event info |
| 14 | Resale listing | Owned ticket -> price set -> status flips to LISTED_FOR_RESALE |
| 15 | Buy resale ticket | Two contexts: buy -> PENDING_MATCH -> simulated trade.completed -> both ticket lists update without reload |
| 16 | Organizer creates event | New event appears in the list |
| 17 | Organizer views inventory | Correct available/held/sold counts match seeded data |
| 18 | Operations dashboard | Service health strip renders; Kafka dashboard shows topic table |
| 19 | Real-time updates | Two contexts, one holds a seat, the other's map updates within 2s with no manual refresh |
| 20 | Reconnect | Simulated WS drop mid-session -> reconnecting badge -> restore -> force-refetch -> badge clears |

## 4. Dedicated failure-mode tests

| Failure | Assertion |
|---|---|
| Expired hold | `HoldExpiredModal` appears, form immediately disabled |
| Concurrent seat selection | Two contexts race one seat; winner sees HELD, loser sees the corrected map, never a stuck AVAILABLE |
| API timeout | Retries per the table in `../state/state-management.md`, then surfaces the timeout error state |
| Payment timeout | TIMEOUT -> auto status-check -> UNKNOWN handling, never a stuck spinner |
| Duplicate request | Exactly one request reaches the mock server on a deliberate double-click |
| Stale data | The seats page's `staleTime:0` policy triggers a fresh fetch regardless of a manually-aged cache entry |
| 429 | `RateLimitBanner` with a live countdown; action stays disabled until exactly zero |
| Backend unavailable | Offline treatment; previously-loaded content remains visible, not wiped |

## 5. Explicitly out of scope for P0 automated testing

Visual regression testing is not P0 — see `../planning/exhaustive-task-backlog.md`'s P3 tier, where it's now an explicit, named task rather than an implicit gap.
