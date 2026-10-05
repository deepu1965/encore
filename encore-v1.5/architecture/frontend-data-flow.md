# Frontend Data Flow

## Three kinds of state, three tools, no overlap

| Kind | Examples | Tool | Lives in |
|---|---|---|---|
| Server state | events, seats, orders, tickets, wallet, notifications, ops metrics | TanStack Query | `features/*/queries.ts` |
| Client state | selected seats mid-flow, filter state, modal open/closed, ops time-range | Zustand | `stores/*.ts` |
| Real-time state | live seat deltas, queue position, payment pushes, live Kafka lag | WebSocketManager -> merged into the matching TanStack Query cache entry via `queryClient.setQueryData` | `lib/websocket-manager.ts` + per-feature sync hooks |

Real-time state is deliberately not a fourth separate store — every
WebSocket event's job is to update the TanStack Query cache that already
represents that resource, so a component never reconciles "the fetched
version" against "the live version" itself. Full cache-policy detail
(staleTime per resource, invalidation mechanisms, optimistic-update
rules) is in `../state/state-management.md`.

## The data-flow diagram

```text
Browser
  |
  |-- REST --> apiClient --> API Gateway --> V1 backend service
  |                                              |
  |                                       (initial fetch/mutation)
  |                                              v
  |<----------------------------------- TanStack Query cache
  |
  |-- WS ----> WebSocketManager --> WebSocket Gateway --> V1 backend service
  |                                                            |
  |                                                   (live event pushed)
  |                                                            v
  |<---------------------------- EventRouter patches/invalidates the SAME
  |                                TanStack Query cache entry as above
  v
Component reads one cache entry, regardless of which path populated it
```

This single-source-of-cache design is the mechanical enforcement of "the
frontend is never the source of truth" — a component asking "is this
seat available" always reads the same place, whether the last update
came from a REST fetch or a WebSocket push.

## Client-state rule

Only ephemeral, resettable-with-no-consequence state belongs in Zustand.
None of these stores are ever the answer to "is this seat available" or
"did this payment succeed" — those questions are always answered from
the TanStack Query cache, never from Zustand.

## Optimistic updates — the test

Allowed only where a wrong optimistic update causes no harm worse than a
brief visual flicker (marking a notification read, acknowledging an ops
alert, an optimistic chat-message-sent bubble). Forbidden anywhere in the
seat/hold/payment/order/resale-trade path — full rule and reasoning in
`../state/state-management.md` §4.
