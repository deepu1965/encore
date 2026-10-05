# WebSocket Contracts

Every real-time channel and message type used anywhere in V1.5, at the full field granularity the update request requires. Architectural design (ConnectionManager/SubscriptionManager/EventRouter/ReconnectStrategy/Heartbeat/MessageDeduplication) is in `../architecture/realtime-architecture.md` — this document is the per-event contract table that sits on top of that architecture. Every row has a Task ID from `../Encore-V1.5-Exhaustive-Backlog.xlsx` (sheet: WebSocket Contracts / Backlog), so no realtime event ships without an explicit implementation task.

## `event.{event_id}.status` :: `status.changed`

| Field | Value |
|---|---|
| Event Name | `status.changed` |
| Channel | `event.{event_id}.status` |
| Payload | `{ event_id, status }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Event Details page |
| Frontend Handler | `EventRouter` handler registered for `status.changed` on `event.{event_id}.status` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['event', eventId]` |
| UI Updated | Event Details page re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-EVENT-014 |

## `inventory.{event_id}` :: `seat.held`

| Field | Value |
|---|---|
| Event Name | `seat.held` |
| Channel | `inventory.{event_id}` |
| Payload | `{ event_id, seat_id, inventory_id, held_by_user_id, held_at }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Seat Selection page |
| Frontend Handler | `EventRouter` handler registered for `seat.held` on `inventory.{event_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['event', eventId, 'seats']` |
| UI Updated | Seat Selection page re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-SEAT-018 |

## `inventory.{event_id}` :: `seat.released`

| Field | Value |
|---|---|
| Event Name | `seat.released` |
| Channel | `inventory.{event_id}` |
| Payload | `{ event_id, seat_id, inventory_id }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Seat Selection page |
| Frontend Handler | `EventRouter` handler registered for `seat.released` on `inventory.{event_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['event', eventId, 'seats']` |
| UI Updated | Seat Selection page re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-SEAT-019 |

## `inventory.{event_id}` :: `seat.sold`

| Field | Value |
|---|---|
| Event Name | `seat.sold` |
| Channel | `inventory.{event_id}` |
| Payload | `{ event_id, seat_id, inventory_id, order_id }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Seat Selection page |
| Frontend Handler | `EventRouter` handler registered for `seat.sold` on `inventory.{event_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['event', eventId, 'seats']` |
| UI Updated | Seat Selection page re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-SEAT-020 |

## `hold.{hold_id}` :: `hold.extended`

| Field | Value |
|---|---|
| Event Name | `hold.extended` |
| Channel | `hold.{hold_id}` |
| Payload | `{ hold_id, expires_at }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Seat Selection / Checkout |
| Frontend Handler | `EventRouter` handler registered for `hold.extended` on `hold.{hold_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['hold', holdId]` |
| UI Updated | Seat Selection / Checkout re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-SEAT-021 |

## `hold.{hold_id}` :: `hold.expired`

| Field | Value |
|---|---|
| Event Name | `hold.expired` |
| Channel | `hold.{hold_id}` |
| Payload | `{ hold_id, event_id, seat_id }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Checkout page |
| Frontend Handler | `EventRouter` handler registered for `hold.expired` on `hold.{hold_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['hold', holdId]` |
| UI Updated | Checkout page re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-CHECK-015 |

## `waiting-room.{entry_id}` :: `position.updated`

| Field | Value |
|---|---|
| Event Name | `position.updated` |
| Channel | `waiting-room.{entry_id}` |
| Payload | `{ entry_id, position, estimated_wait_seconds }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Waiting Room page |
| Frontend Handler | `EventRouter` handler registered for `position.updated` on `waiting-room.{entry_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['waiting-room', entryId]` |
| UI Updated | Waiting Room page re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-WAIT-014 |

## `waiting-room.{entry_id}` :: `entry.admitted`

| Field | Value |
|---|---|
| Event Name | `entry.admitted` |
| Channel | `waiting-room.{entry_id}` |
| Payload | `{ entry_id, event_id }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Waiting Room page |
| Frontend Handler | `EventRouter` handler registered for `entry.admitted` on `waiting-room.{entry_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['waiting-room', entryId]` |
| UI Updated | Waiting Room page re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-WAIT-015 |

## `waiting-room.{entry_id}` :: `entry.expired`

| Field | Value |
|---|---|
| Event Name | `entry.expired` |
| Channel | `waiting-room.{entry_id}` |
| Payload | `{ entry_id }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Waiting Room page |
| Frontend Handler | `EventRouter` handler registered for `entry.expired` on `waiting-room.{entry_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['waiting-room', entryId]` |
| UI Updated | Waiting Room page re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-WAIT-016 |

## `waiting-room.{entry_id}` :: `event.closed`

| Field | Value |
|---|---|
| Event Name | `event.closed` |
| Channel | `waiting-room.{entry_id}` |
| Payload | `{ event_id }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Waiting Room page |
| Frontend Handler | `EventRouter` handler registered for `event.closed` on `waiting-room.{entry_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['waiting-room', entryId]` |
| UI Updated | Waiting Room page re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-WAIT-017 |

## `waiting-room.{event_id}.ops` :: `queue.metrics`

| Field | Value |
|---|---|
| Event Name | `queue.metrics` |
| Channel | `waiting-room.{event_id}.ops` |
| Payload | `{ event_id, queue_length, admitted, waiting, admission_rate }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Organizer Waiting Room Control |
| Frontend Handler | `EventRouter` handler registered for `queue.metrics` on `waiting-room.{event_id}.ops` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['organizer','waiting-room',eventId]` |
| UI Updated | Organizer Waiting Room Control re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-ORG-WR-015 |

## `order.{order_id}` :: `order.updated`

| Field | Value |
|---|---|
| Event Name | `order.updated` |
| Channel | `order.{order_id}` |
| Payload | `{ order_id, status }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Order Confirmation / Order Detail |
| Frontend Handler | `EventRouter` handler registered for `order.updated` on `order.{order_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['order', orderId]` |
| UI Updated | Order Confirmation / Order Detail re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-CONF-013 |

## `order.{order_id}` :: `ticket.issued`

| Field | Value |
|---|---|
| Event Name | `ticket.issued` |
| Channel | `order.{order_id}` |
| Payload | `{ order_id, ticket_id, ticket_code }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Order Confirmation page |
| Frontend Handler | `EventRouter` handler registered for `ticket.issued` on `order.{order_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['order', orderId]` |
| UI Updated | Order Confirmation page re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-CONF-014 |

## `order.{order_id}` :: `order.failed`

| Field | Value |
|---|---|
| Event Name | `order.failed` |
| Channel | `order.{order_id}` |
| Payload | `{ order_id, reason_code }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Order Confirmation page |
| Frontend Handler | `EventRouter` handler registered for `order.failed` on `order.{order_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['order', orderId]` |
| UI Updated | Order Confirmation page re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-CONF-015 |

## `orders.{user_id}` :: `ticket.added`

| Field | Value |
|---|---|
| Event Name | `ticket.added` |
| Channel | `orders.{user_id}` |
| Payload | `{ user_id, ticket_id }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | My Tickets list |
| Frontend Handler | `EventRouter` handler registered for `ticket.added` on `orders.{user_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['tickets']` |
| UI Updated | My Tickets list re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-TIX-024 |

## `orders.{user_id}` :: `ticket.removed`

| Field | Value |
|---|---|
| Event Name | `ticket.removed` |
| Channel | `orders.{user_id}` |
| Payload | `{ user_id, ticket_id }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | My Tickets list |
| Frontend Handler | `EventRouter` handler registered for `ticket.removed` on `orders.{user_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['tickets']` |
| UI Updated | My Tickets list re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-TIX-025 |

## `resale.{event_id}` :: `listing.created`

| Field | Value |
|---|---|
| Event Name | `listing.created` |
| Channel | `resale.{event_id}` |
| Payload | `{ event_id, listing_id, price_cents, seat_id }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Resale Order Book |
| Frontend Handler | `EventRouter` handler registered for `listing.created` on `resale.{event_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['resale','order-book',eventId]` |
| UI Updated | Resale Order Book re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-RESALE-074 |

## `resale.{event_id}` :: `listing.matching`

| Field | Value |
|---|---|
| Event Name | `listing.matching` |
| Channel | `resale.{event_id}` |
| Payload | `{ event_id, listing_id }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Resale Order Book |
| Frontend Handler | `EventRouter` handler registered for `listing.matching` on `resale.{event_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['resale','order-book',eventId]` |
| UI Updated | Resale Order Book re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-RESALE-075 |

## `resale.{event_id}` :: `listing.cancelled`

| Field | Value |
|---|---|
| Event Name | `listing.cancelled` |
| Channel | `resale.{event_id}` |
| Payload | `{ event_id, listing_id }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Resale Order Book |
| Frontend Handler | `EventRouter` handler registered for `listing.cancelled` on `resale.{event_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['resale','order-book',eventId]` |
| UI Updated | Resale Order Book re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-RESALE-076 |

## `resale.listing.{listing_id}` :: `listing.matched`

| Field | Value |
|---|---|
| Event Name | `listing.matched` |
| Channel | `resale.listing.{listing_id}` |
| Payload | `{ listing_id, trade_id }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Listing Details page |
| Frontend Handler | `EventRouter` handler registered for `listing.matched` on `resale.listing.{listing_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['resale','listing',listingId]` |
| UI Updated | Listing Details page re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-RESALE-077 |

## `resale.listing.{listing_id}` :: `listing.sold`

| Field | Value |
|---|---|
| Event Name | `listing.sold` |
| Channel | `resale.listing.{listing_id}` |
| Payload | `{ listing_id, trade_id }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Listing Details page |
| Frontend Handler | `EventRouter` handler registered for `listing.sold` on `resale.listing.{listing_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['resale','listing',listingId]` |
| UI Updated | Listing Details page re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-RESALE-078 |

## `resale.trade.{trade_id}` :: `trade.created`

| Field | Value |
|---|---|
| Event Name | `trade.created` |
| Channel | `resale.trade.{trade_id}` |
| Payload | `{ trade_id, listing_id, buyer_id, seller_id, price_cents }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Trade Details page |
| Frontend Handler | `EventRouter` handler registered for `trade.created` on `resale.trade.{trade_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['resale','trade',tradeId]` |
| UI Updated | Trade Details page re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-RESALE-079 |

## `resale.trade.{trade_id}` :: `trade.settling`

| Field | Value |
|---|---|
| Event Name | `trade.settling` |
| Channel | `resale.trade.{trade_id}` |
| Payload | `{ trade_id, step }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Trade Details page |
| Frontend Handler | `EventRouter` handler registered for `trade.settling` on `resale.trade.{trade_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['resale','trade',tradeId]` |
| UI Updated | Trade Details page re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-RESALE-080 |

## `resale.trade.{trade_id}` :: `trade.completed`

| Field | Value |
|---|---|
| Event Name | `trade.completed` |
| Channel | `resale.trade.{trade_id}` |
| Payload | `{ trade_id }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Trade Details page |
| Frontend Handler | `EventRouter` handler registered for `trade.completed` on `resale.trade.{trade_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['resale','trade',tradeId], ['tickets']` |
| UI Updated | Trade Details page re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-RESALE-081 |

## `resale.trade.{trade_id}` :: `trade.failed`

| Field | Value |
|---|---|
| Event Name | `trade.failed` |
| Channel | `resale.trade.{trade_id}` |
| Payload | `{ trade_id, reason_code }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Trade Details page |
| Frontend Handler | `EventRouter` handler registered for `trade.failed` on `resale.trade.{trade_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['resale','trade',tradeId]` |
| UI Updated | Trade Details page re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-RESALE-082 |

## `resale.trade.{trade_id}` :: `ownership.transferred`

| Field | Value |
|---|---|
| Event Name | `ownership.transferred` |
| Channel | `resale.trade.{trade_id}` |
| Payload | `{ trade_id, ticket_id, new_owner_id }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Trade Details / My Tickets (both parties) |
| Frontend Handler | `EventRouter` handler registered for `ownership.transferred` on `resale.trade.{trade_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['tickets'] (both users)` |
| UI Updated | Trade Details / My Tickets (both parties) re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-RESALE-083 |

## `notifications.{user_id}` :: `notification.created`

| Field | Value |
|---|---|
| Event Name | `notification.created` |
| Channel | `notifications.{user_id}` |
| Payload | `{ user_id, notification_id, type, title, body }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Notification Center + header bell |
| Frontend Handler | `EventRouter` handler registered for `notification.created` on `notifications.{user_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['notifications']` |
| UI Updated | Notification Center + header bell re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-NOTIF-014 |

## `chat.{event_id}` :: `message.sent`

| Field | Value |
|---|---|
| Event Name | `message.sent` |
| Channel | `chat.{event_id}` |
| Payload | `{ event_id, message_id, user_id, display_name, body, sequence }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Chat Room |
| Frontend Handler | `EventRouter` handler registered for `message.sent` on `chat.{event_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `chat message list (sequence-ordered insert)` |
| UI Updated | Chat Room re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-CHAT-013 |

## `chat.{event_id}` :: `message.removed`

| Field | Value |
|---|---|
| Event Name | `message.removed` |
| Channel | `chat.{event_id}` |
| Payload | `{ event_id, message_id }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Chat Room |
| Frontend Handler | `EventRouter` handler registered for `message.removed` on `chat.{event_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `chat message list` |
| UI Updated | Chat Room re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-CHAT-014 |

## `chat.{event_id}` :: `presence.updated`

| Field | Value |
|---|---|
| Event Name | `presence.updated` |
| Channel | `chat.{event_id}` |
| Payload | `{ event_id, online_user_ids }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Chat Room presence indicator |
| Frontend Handler | `EventRouter` handler registered for `presence.updated` on `chat.{event_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `Zustand chat presence store` |
| UI Updated | Chat Room presence indicator re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-CHAT-015 |

## `chat.{event_id}` :: `typing.updated`

| Field | Value |
|---|---|
| Event Name | `typing.updated` |
| Channel | `chat.{event_id}` |
| Payload | `{ event_id, typing_user_ids }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Chat Room typing indicator |
| Frontend Handler | `EventRouter` handler registered for `typing.updated` on `chat.{event_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `Zustand chat presence store` |
| UI Updated | Chat Room typing indicator re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-CHAT-016 |

## `leaderboard` :: `rankings.updated`

| Field | Value |
|---|---|
| Event Name | `rankings.updated` |
| Channel | `leaderboard` |
| Payload | `{ entries: [{ event_id, rank, metric_value }] }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Leaderboard page |
| Frontend Handler | `EventRouter` handler registered for `rankings.updated` on `leaderboard` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['leaderboard']` |
| UI Updated | Leaderboard page re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-LEAD-012 |

## `stream.{event_id}` :: `stream.started`

| Field | Value |
|---|---|
| Event Name | `stream.started` |
| Channel | `stream.{event_id}` |
| Payload | `{ event_id, manifest_url }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Live Stream Viewer |
| Frontend Handler | `EventRouter` handler registered for `stream.started` on `stream.{event_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['event',eventId,'stream']` |
| UI Updated | Live Stream Viewer re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-MEDIA-021 |

## `stream.{event_id}` :: `stream.ended`

| Field | Value |
|---|---|
| Event Name | `stream.ended` |
| Channel | `stream.{event_id}` |
| Payload | `{ event_id }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Live Stream Viewer |
| Frontend Handler | `EventRouter` handler registered for `stream.ended` on `stream.{event_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['event',eventId,'stream']` |
| UI Updated | Live Stream Viewer re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-MEDIA-022 |

## `stream.{event_id}.transcode` :: `transcode.progress`

| Field | Value |
|---|---|
| Event Name | `transcode.progress` |
| Channel | `stream.{event_id}.transcode` |
| Payload | `{ event_id, media_id, percent }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Organizer Media Management |
| Frontend Handler | `EventRouter` handler registered for `transcode.progress` on `stream.{event_id}.transcode` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['organizer','media',eventId]` |
| UI Updated | Organizer Media Management re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-ORG-MED-013 |

## `stream.{event_id}.transcode` :: `transcode.ready`

| Field | Value |
|---|---|
| Event Name | `transcode.ready` |
| Channel | `stream.{event_id}.transcode` |
| Payload | `{ event_id, media_id, resolutions }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Organizer Media Management |
| Frontend Handler | `EventRouter` handler registered for `transcode.ready` on `stream.{event_id}.transcode` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['organizer','media',eventId]` |
| UI Updated | Organizer Media Management re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-ORG-MED-014 |

## `stream.{event_id}.transcode` :: `transcode.failed`

| Field | Value |
|---|---|
| Event Name | `transcode.failed` |
| Channel | `stream.{event_id}.transcode` |
| Payload | `{ event_id, media_id, reason }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Organizer Media Management |
| Frontend Handler | `EventRouter` handler registered for `transcode.failed` on `stream.{event_id}.transcode` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['organizer','media',eventId]` |
| UI Updated | Organizer Media Management re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-ORG-MED-015 |

## `ops.overview` :: `health.updated`

| Field | Value |
|---|---|
| Event Name | `health.updated` |
| Channel | `ops.overview` |
| Payload | `{ services: [{ name, status }] }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Ops Overview |
| Frontend Handler | `EventRouter` handler registered for `health.updated` on `ops.overview` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['ops','overview']` |
| UI Updated | Ops Overview re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-OPS-OV-012 |

## `ops.flash-sale.{event_id}` :: `traffic`

| Field | Value |
|---|---|
| Event Name | `traffic` |
| Channel | `ops.flash-sale.{event_id}` |
| Payload | `{ event_id, requests_per_sec }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Flash-Sale Control Center — Traffic panel |
| Frontend Handler | `EventRouter` handler registered for `traffic` on `ops.flash-sale.{event_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['ops','flash-sale',eventId]` |
| UI Updated | Flash-Sale Control Center — Traffic panel re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-OPS-FS-020 |

## `ops.flash-sale.{event_id}` :: `waiting_room`

| Field | Value |
|---|---|
| Event Name | `waiting_room` |
| Channel | `ops.flash-sale.{event_id}` |
| Payload | `{ event_id, queue_size, admission_rate }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Flash-Sale Control Center — Waiting Room panel |
| Frontend Handler | `EventRouter` handler registered for `waiting_room` on `ops.flash-sale.{event_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['ops','flash-sale',eventId]` |
| UI Updated | Flash-Sale Control Center — Waiting Room panel re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-OPS-FS-021 |

## `ops.flash-sale.{event_id}` :: `inventory`

| Field | Value |
|---|---|
| Event Name | `inventory` |
| Channel | `ops.flash-sale.{event_id}` |
| Payload | `{ event_id, available, held, sold }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Flash-Sale Control Center — Inventory panel |
| Frontend Handler | `EventRouter` handler registered for `inventory` on `ops.flash-sale.{event_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['ops','flash-sale',eventId]` |
| UI Updated | Flash-Sale Control Center — Inventory panel re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-OPS-FS-022 |

## `ops.flash-sale.{event_id}` :: `payments`

| Field | Value |
|---|---|
| Event Name | `payments` |
| Channel | `ops.flash-sale.{event_id}` |
| Payload | `{ event_id, throughput_per_sec, failure_rate }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Flash-Sale Control Center — Payments panel |
| Frontend Handler | `EventRouter` handler registered for `payments` on `ops.flash-sale.{event_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['ops','flash-sale',eventId]` |
| UI Updated | Flash-Sale Control Center — Payments panel re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-OPS-FS-023 |

## `ops.flash-sale.{event_id}` :: `kafka_lag`

| Field | Value |
|---|---|
| Event Name | `kafka_lag` |
| Channel | `ops.flash-sale.{event_id}` |
| Payload | `{ event_id, topics: [{ name, lag }] }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Flash-Sale Control Center — Kafka panel |
| Frontend Handler | `EventRouter` handler registered for `kafka_lag` on `ops.flash-sale.{event_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['ops','flash-sale',eventId]` |
| UI Updated | Flash-Sale Control Center — Kafka panel re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-OPS-FS-024 |

## `ops.flash-sale.{event_id}` :: `redis`

| Field | Value |
|---|---|
| Event Name | `redis` |
| Channel | `ops.flash-sale.{event_id}` |
| Payload | `{ event_id, hit_rate }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Flash-Sale Control Center — Redis panel |
| Frontend Handler | `EventRouter` handler registered for `redis` on `ops.flash-sale.{event_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['ops','flash-sale',eventId]` |
| UI Updated | Flash-Sale Control Center — Redis panel re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-OPS-FS-025 |

## `ops.flash-sale.{event_id}` :: `db_latency`

| Field | Value |
|---|---|
| Event Name | `db_latency` |
| Channel | `ops.flash-sale.{event_id}` |
| Payload | `{ event_id, p50_ms, p95_ms, p99_ms }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Flash-Sale Control Center — Database panel |
| Frontend Handler | `EventRouter` handler registered for `db_latency` on `ops.flash-sale.{event_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['ops','flash-sale',eventId]` |
| UI Updated | Flash-Sale Control Center — Database panel re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-OPS-FS-026 |

## `ops.flash-sale.{event_id}` :: `api_latency`

| Field | Value |
|---|---|
| Event Name | `api_latency` |
| Channel | `ops.flash-sale.{event_id}` |
| Payload | `{ event_id, p50_ms, p95_ms, p99_ms, error_rate }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Flash-Sale Control Center — API Latency panel |
| Frontend Handler | `EventRouter` handler registered for `api_latency` on `ops.flash-sale.{event_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['ops','flash-sale',eventId]` |
| UI Updated | Flash-Sale Control Center — API Latency panel re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-OPS-FS-027 |

## `ops.flash-sale.{event_id}` :: `active_users`

| Field | Value |
|---|---|
| Event Name | `active_users` |
| Channel | `ops.flash-sale.{event_id}` |
| Payload | `{ event_id, count }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Flash-Sale Control Center — Active Users panel |
| Frontend Handler | `EventRouter` handler registered for `active_users` on `ops.flash-sale.{event_id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['ops','flash-sale',eventId]` |
| UI Updated | Flash-Sale Control Center — Active Users panel re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-OPS-FS-028 |

## `ops.waiting-room` :: `metrics.updated`

| Field | Value |
|---|---|
| Event Name | `metrics.updated` |
| Channel | `ops.waiting-room` |
| Payload | `{ metric_name, value, timestamp } (shape varies per dashboard, see 12-api-contract-inventory.md's matching GET endpoint response)` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Ops Waiting Room Monitor |
| Frontend Handler | `EventRouter` handler registered for `metrics.updated` on `ops.waiting-room` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['ops','waiting-room']` |
| UI Updated | Ops Waiting Room Monitor re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-OPS-WR-011 |

## `ops.inventory` :: `metrics.updated`

| Field | Value |
|---|---|
| Event Name | `metrics.updated` |
| Channel | `ops.inventory` |
| Payload | `{ metric_name, value, timestamp } (shape varies per dashboard, see 12-api-contract-inventory.md's matching GET endpoint response)` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Ops Inventory Monitor |
| Frontend Handler | `EventRouter` handler registered for `metrics.updated` on `ops.inventory` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['ops','inventory']` |
| UI Updated | Ops Inventory Monitor re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-OPS-INV-011 |

## `ops.kafka` :: `metrics.updated`

| Field | Value |
|---|---|
| Event Name | `metrics.updated` |
| Channel | `ops.kafka` |
| Payload | `{ metric_name, value, timestamp } (shape varies per dashboard, see 12-api-contract-inventory.md's matching GET endpoint response)` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Kafka Dashboard |
| Frontend Handler | `EventRouter` handler registered for `metrics.updated` on `ops.kafka` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['ops','kafka']` |
| UI Updated | Kafka Dashboard re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-OPS-KAFKA-013 |

## `ops.redis` :: `metrics.updated`

| Field | Value |
|---|---|
| Event Name | `metrics.updated` |
| Channel | `ops.redis` |
| Payload | `{ metric_name, value, timestamp } (shape varies per dashboard, see 12-api-contract-inventory.md's matching GET endpoint response)` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Redis Dashboard |
| Frontend Handler | `EventRouter` handler registered for `metrics.updated` on `ops.redis` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['ops','redis']` |
| UI Updated | Redis Dashboard re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-OPS-REDIS-012 |

## `ops.database` :: `metrics.updated`

| Field | Value |
|---|---|
| Event Name | `metrics.updated` |
| Channel | `ops.database` |
| Payload | `{ metric_name, value, timestamp } (shape varies per dashboard, see 12-api-contract-inventory.md's matching GET endpoint response)` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Database Dashboard |
| Frontend Handler | `EventRouter` handler registered for `metrics.updated` on `ops.database` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['ops','database']` |
| UI Updated | Database Dashboard re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-OPS-DB-012 |

## `ops.payments` :: `metrics.updated`

| Field | Value |
|---|---|
| Event Name | `metrics.updated` |
| Channel | `ops.payments` |
| Payload | `{ metric_name, value, timestamp } (shape varies per dashboard, see 12-api-contract-inventory.md's matching GET endpoint response)` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Payment Operations Dashboard |
| Frontend Handler | `EventRouter` handler registered for `metrics.updated` on `ops.payments` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['ops','payments']` |
| UI Updated | Payment Operations Dashboard re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-OPS-PAY-012 |

## `ops.services` :: `metrics.updated`

| Field | Value |
|---|---|
| Event Name | `metrics.updated` |
| Channel | `ops.services` |
| Payload | `{ metric_name, value, timestamp } (shape varies per dashboard, see 12-api-contract-inventory.md's matching GET endpoint response)` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Service Map |
| Frontend Handler | `EventRouter` handler registered for `metrics.updated` on `ops.services` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['ops','services']` |
| UI Updated | Service Map re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-OPS-SVC-012 |

## `ops.deployments` :: `deployment.updated`

| Field | Value |
|---|---|
| Event Name | `deployment.updated` |
| Channel | `ops.deployments` |
| Payload | `{ deployment_id, status, rollout_percent }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Deployment List |
| Frontend Handler | `EventRouter` handler registered for `deployment.updated` on `ops.deployments` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['ops','deployments']` |
| UI Updated | Deployment List re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-OPS-DEPLOY-025 |

## `ops.deployment.{id}` :: `rollout.progress`

| Field | Value |
|---|---|
| Event Name | `rollout.progress` |
| Channel | `ops.deployment.{id}` |
| Payload | `{ deployment_id, rollout_percent }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Deployment Detail |
| Frontend Handler | `EventRouter` handler registered for `rollout.progress` on `ops.deployment.{id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['ops','deployment',id]` |
| UI Updated | Deployment Detail re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-OPS-DEPLOY-026 |

## `ops.incidents` :: `incident.created`
> **DEFERRED** — Blocked on backend gap G-2 — channel is proposed, not confirmed

| Field | Value |
|---|---|
| Event Name | `incident.created` |
| Channel | `ops.incidents` |
| Payload | `{ incident_id, severity, affected_services } — PROPOSED, gap G-2` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Incident List |
| Frontend Handler | `EventRouter` handler registered for `incident.created` on `ops.incidents` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['ops','incidents']` |
| UI Updated | Incident List re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-OPS-INC-020 |

## `ops.incident.{id}` :: `incident.updated`
> **DEFERRED** — Blocked on backend gap G-2 — channel is proposed, not confirmed

| Field | Value |
|---|---|
| Event Name | `incident.updated` |
| Channel | `ops.incident.{id}` |
| Payload | `{ incident_id, status, timeline_entry } — PROPOSED, gap G-2` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Incident Detail |
| Frontend Handler | `EventRouter` handler registered for `incident.updated` on `ops.incident.{id}` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['ops','incident',id]` |
| UI Updated | Incident Detail re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-OPS-INC-021 |

## `ops.alerts` :: `alert.fired`

| Field | Value |
|---|---|
| Event Name | `alert.fired` |
| Channel | `ops.alerts` |
| Payload | `{ alert_id, severity, service, threshold }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Alerts page |
| Frontend Handler | `EventRouter` handler registered for `alert.fired` on `ops.alerts` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['ops','alerts']` |
| UI Updated | Alerts page re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-OPS-ALERT-014 |

## `ops.alerts` :: `alert.acknowledged`

| Field | Value |
|---|---|
| Event Name | `alert.acknowledged` |
| Channel | `ops.alerts` |
| Payload | `{ alert_id, acknowledged_by }` |
| Producer | Backend (V1 service owning this domain — see `../architecture/realtime-architecture.md`) |
| Consumer | Alerts page |
| Frontend Handler | `EventRouter` handler registered for `alert.acknowledged` on `ops.alerts` (see `../architecture/realtime-architecture.md` §4) |
| State Updated | `['ops','alerts']` |
| UI Updated | Alerts page re-renders from the patched/invalidated query above — no direct DOM manipulation |
| Deduplication | Sequence-number ring buffer, 200-message window per channel |
| Ordering | Per-channel sequence order; out-of-order insert for chat specifically |
| Reconnect | Full resubscribe; force-refetch for staleTime:0 resources, backfill via after_sequence for chat |
| Fallback | SSE bridge, then 10s polling, per `../architecture/realtime-architecture.md` §8 |
| Task ID | V15-OPS-ALERT-015 |
