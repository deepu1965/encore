# Performance

## §1 — Core Web Vitals targets (customer surface)

| Metric | Target | Why |
|---|---|---|
| LCP | < 2.0s on `/`, `/events/[id]` | Cold-landing pages from shared links |
| INP | < 200ms on seat selection | Responsiveness matters most exactly during flash-sale stress |
| CLS | < 0.1 everywhere | Shape-matched skeletons prevent layout shift |

Organizer/ops surfaces get the same instrumentation, not the same hard
targets — internal, lower-traffic, desktop-primary tools.

## §2 — Bundle size and code splitting

Route-group-level splitting is automatic. MapLibre and chart libraries
(Tremor/Recharts) are dynamically imported (`next/dynamic`, `ssr:false`)
only on the routes that render them. Budget: 200KB gzip for customer
routes, 350KB for organizer/ops — enforced in CI.

## §3 — Rendering performance for the two hardest components

**SeatMap:** a single `<canvas>` above ~500 seats; real DOM `<button>`s
below that threshold (simpler, more naturally accessible). WebSocket
seat-status updates patch only the affected seat's canvas region.

**Ops charts:** buffered and batched to at most one update per 250ms
(`requestAnimationFrame`-aligned), rather than re-rendering on every
individual WebSocket message — a metric updating 10x/second at the
network layer is visually smoothed to ~4 updates/second on screen.

## §4 — Image optimization

`next/image` for every raster image — responsive sizing, lazy loading,
modern format negotiation.

## §5 — Map tile budget

The chosen free tile provider has a fair-use rate limit shared across
all its users. `/near-me` and venue routing throttle to only the visible
viewport, cached client-side per session — flagged as a scaling
consideration if usage ever approaches the limit, at which point a paid
tile provider is the correct fix.

## §6 — Virtualization

Any list exceeding ~100 rendered items (`/ops/logs`, notifications,
power-user ticket lists) uses windowed rendering
(`@tanstack/react-virtual`).

## §7 — WebSocket message efficiency

One physical connection carries all of a tab's channel traffic — a
performance decision as much as an architectural one, avoiding N
separate handshakes and N heartbeat schedules.
