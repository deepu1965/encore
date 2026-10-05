# Real-Time Architecture

Per-channel, per-event contract details (payload shape, dedup, ordering,
reconnect, fallback, task ID) are in `../realtime/websocket-contracts.md`
— 60 events, 0 without an implementation task. This document is the
manager design those contracts run on top of.

## 1. WebSocketManager composition

```text
WebSocketManager
├── ConnectionManager      owns the single underlying WebSocket connection
├── SubscriptionManager    ref-counted channel subscribe/unsubscribe
├── EventRouter            dispatches incoming messages to registered handlers by message type
├── ReconnectStrategy      exponential backoff + jitter
└── Heartbeat              ping/pong keepalive + dead-connection detection
```

One `WebSocketManager` singleton per browser tab, instantiated in the
root layout's client-side provider tree, shared across all three route
groups. Every feature-level hook calls
`subscriptionManager.subscribe(channel, handler)` and gets back an
unsubscribe function — it never touches the raw socket.

## 2. Connection lifecycle

```text
mount (root layout)
  -> ConnectionManager.connect(wsBaseUrl, authToken)
  -> on 'open': Heartbeat starts (25s ping, 5s pong timeout)
  -> on 'close'/'error': ReconnectStrategy takes over
  -> on successful reconnect: SubscriptionManager re-subscribes every
     previously-active channel, in original subscribe order
```

Only one physical connection exists per tab regardless of how many
channels are subscribed — multiplexing is the SubscriptionManager's job,
not a reason to open multiple sockets.

## 3. Message envelope (identical shape for every channel)

```json
{
  "message_type": "seat.held",
  "channel": "inventory.evt_9f8a1c2e",
  "sequence": 1042,
  "correlation_id": "req_01HZY9XYZ",
  "occurred_at": "2026-08-24T10:15:00Z",
  "payload": { "...": "..." }
}
```

`sequence` is per-channel, monotonically increasing — this is what
deduplication (§7) and out-of-order handling (chat) rely on.
`correlation_id` matches the originating HTTP request's `X-Request-Id`
(null for server-initiated events like TTL expiry), enabling the
cross-request tracing described in `../observability/frontend-observability.md`.
This envelope is a REQUIRED FRONTEND CONTRACT — the backend spec
describes WebSocket usage narratively but doesn't specify a wire
envelope; this is the proposed contract for the backend team to confirm.

## 4. How a message updates application state

Every channel's EventRouter handler does exactly one of two things:
1. **Cache patch** — `queryClient.setQueryData(...)` when the message
   payload contains the full new value.
2. **Cache invalidation** — `queryClient.invalidateQueries(...)` when
   the payload is a signal ("something changed") rather than the full
   new state.

Real-time-only, non-cached UI state (chat typing indicators, presence)
updates a Zustand store instead, since there's no REST resource backing
it.

## 5. Reconnect, heartbeat, backoff

Backoff: 1s, 2s, 4s, 8s, capped at 8s with +/-20% jitter (avoids a
thundering-herd reconnect storm). Heartbeat: 25s ping, 5s pong timeout —
shorter than typical load-balancer idle-connection timeouts so the
connection is proactively kept alive. Every consumer can render a
reconnecting indicator by subscribing to `connectionManager.status`
(`'connected' | 'reconnecting' | 'disconnected'`).

## 6. Deduplication

A ring buffer of the last 200 sequence numbers per channel. A message
whose sequence has already been processed for that channel is dropped
silently.

## 7. Fallback: WebSocket -> SSE -> polling

3 failed WebSocket connection attempts trigger the SSE bridge
(`app/api/events/[eventId]/stream`) for event-scoped channels; 3 failed
SSE attempts trigger plain polling at a 10s interval. These are three
independent, sequential retry budgets, not one shared counter — each
transport's failure mode is different enough that conflating them would
hide which layer actually failed.

## Full realtime failure-mode task coverage

Every failure scenario this section implies has a corresponding backlog
task under the `WS` epic in `../Encore-V1.5-Exhaustive-Backlog.xlsx`:
initial connection, auth failure, authorization failure, connection
drop, backoff, heartbeat, stale/idle detection, duplicate events,
out-of-order events, missed-event recovery, SSE fallback, polling
fallback, full-transport-failure handling, tab suspension, and network
transition — 16 tasks total, not left as prose-only.
