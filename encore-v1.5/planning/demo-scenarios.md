# Demo Scenarios

Five scripted demos, naming the exact pages/states/components to show.

## Demo 1 — Normal Purchase

Home -> Event details (ON_SALE, non-flash-sale) -> Select seats (click
AVAILABLE, narrate PENDING_SELECTION -> HELD via a real `POST /holds`) ->
Checkout (HoldCountdown, server time not local) -> Submit payment (mocked
SUCCESS, narrate PROCESSING -> SUCCESS) -> Confirmation -> Ticket (QR +
plain-text fallback). **Talking point:** every status shown came from a
real backend response or WebSocket message.

## Demo 2 — Flash Sale

Two browser windows, two users, same flash-sale event -> both join the
waiting room (real Kafka-backed FIFO queue) -> both admitted -> both
click the same seat within a second -> one wins, one loses in real time
via the `inventory.{event_id}` channel, no manual refresh. **Talking
point:** this is the actual seat-contention problem the entire backend
is built to solve correctly.

## Demo 3 — Payment Failure

Reach checkout -> submit a mocked-decline payment -> FAILED with a
specific reason -> hold still active -> Retry -> same Idempotency-Key
(show the network tab) -> mocked SUCCESS. Optional: throttle network to
force TIMEOUT -> UNKNOWN -> auto-resolution -> RETRYING. **Talking
point:** the most failure-path-first flow in the app.

## Demo 4 — Resale

User A lists a ticket -> User B sees it appear live in the order book ->
User B buys -> PENDING_MATCH (narrate: 201 means "accepted into the
book," not "purchased") -> match -> SettlementTimeline (payment charged
-> seller credited -> ownership transferred) -> User A's wallet shows
RESALE_PROCEEDS -> User B's tickets list updates without a reload.
**Talking point:** the explicit absence of a partial-match state, and
why.

## Demo 5 — Operations

`/ops/flash-sale` (ideally during Demo 2) walking through all 9 live
panels and their real backend sources -> `/ops/kafka` (topic table,
DLQ panel, no admin actions) -> `/ops/traces` (pick a trace ID from an
earlier request, show the span waterfall) -> `/ops/deployments`
(CanaryProgress, ADMIN-vs-OPERATIONS rollback distinction if a second
login is available). **Talking point:** this page is designed to make
"why Kafka/Redis/tracing" self-evident without a slide deck.

## States worth triggering deliberately, beyond the 5 scripts

Waiting room active, seat contention, hold countdown warning color, hold
expiration, payment processing/failure/retry, resale match, Kafka lag,
Redis degradation (mocked `X-Service-Degraded` header), database
pressure, service degradation, deployment rollout, trace waterfall. One
state is **not currently demoable**: Incidents — worth saying exactly
that if asked, pointing to `../operations/operations-application.md` §9
and `../api/backend-gaps.md`'s G-2 entry, rather than faking it.
