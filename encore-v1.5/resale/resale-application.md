# Resale Application

Route-level metadata is in `../routes/route-inventory.md`. This document
covers the resale-specific state machines and UX rules.

## 1. Marketplace structure

`/resale` (cross-event browse) and `/resale/events/[eventId]` (one
event's order book) are the two entry points. Every `ListingCard` shows
event name/date, section/row/seat, price, and a status badge — nothing
about the matching engine's internals leaks into this card.

## 2. Sell flow (`/tickets/[ticketId]/sell`)

```text
Owned ticket (status ISSUED)
   | user sets an ask price
   v
POST /api/v1/resale/orders { type: SELL, ticket_id, price }
   |
   |- 201 -> listing created, ticket status flips to LISTED_FOR_RESALE
   `- 409 TICKET_NOT_TRANSFERABLE -> inline error, backend-provided reason shown verbatim
```

A ticket can only be listed once at a time — while `LISTED_FOR_RESALE`,
"Sell" is replaced with "Cancel listing," never offered alongside a
second "Sell" that would imply double-listing is possible.

## 3. Buy flow (`/resale/listings/[listingId]`)

```text
POST /api/v1/resale/orders { type: BUY, listing_id }
   |
   |- 201 -> does NOT mean "you bought the ticket" — means "your buy
   |         order was accepted into the order book." Matching is async;
   |         UI transitions to PENDING_MATCH, not a success state, and
   |         subscribes to the matching-engine WS channel
   `- 409 LISTING_NO_LONGER_AVAILABLE -> the common, expected case for a
            popular listing (multiple buyers can race a single-seat
            listing) — "This ticket was just sold to another buyer,"
            link back to the order book, not a generic error
```

## 4. Resale matching engine UX states

| Backend state | UI state | What the user sees | Real-time source |
|---|---|---|---|
| Listing created | `LISTED` | Visible in the order book immediately | Initial POST response + `resale.{event_id}` WS broadcast |
| Listing pending (being matched) | `MATCHING` | Brief, distinct visual state (subtle pulse) — must not be silently absorbed into LISTED or SOLD | `resale.{event_id}` WS `listing.matching` |
| Order matched | `MATCHED` | Both sides see `TradeStatus` appear, linking to `/resale/trades/[tradeId]` | `resale.trade.{trade_id}` WS channel |
| Partial match | **Not applicable to Encore's design** — each listing is exactly one ticket, not fractional. Stated explicitly rather than silently omitted; a regression test asserts no partial-match UI exists | — | — |
| Trade completed | `COMPLETED` | Full `SettlementTimeline` shown | `trade.completed` |
| Trade failed | `FAILED` | Reason shown; buyer returns to browsing, seller's ticket auto-relists, both notified via toast | `trade.failed` |
| Settlement pending | `SETTLING` | Shown between match and completion — three separate `Timeline` steps (payment charged, seller credited, ownership transferred), not one opaque spinner | Intermediate messages |
| Ownership transferred | Reflected in both parties' `/tickets` without a page reload | `TicketList` subscribes to `orders.{user_id}` | `ownership.transferred`, invalidates both users' `['tickets']` cache |

## 5. Settlement timeline (`/resale/trades/[tradeId]`)

`SettlementTimeline` renders exactly the steps the backend reports —
doesn't assume a fixed 3-step sequence, since a failed trade may stop
after step 1.

## 6. Price-time priority, communicated without exposing implementation complexity

No order-book depth chart, no "your position in the queue" number — this
is a marketplace UX, not a trading-floor one. A seller sees "Similar
seats are listed from ₹X" (from already-fetched order-book data, no new
endpoint). A buyer never sees "3 people are ahead of you" — priority is
enforced entirely server-side, communicated only through the matched/not
result.

## 7. My Listings / My Trades

Read-only list views over the states in §2/§4 — no new states. Active
items surfaced before history, not chronologically.
