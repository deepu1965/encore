# Frontend Architecture

## 0. Stack decision (was a separate document; folded in here as the
   opening section since every architectural choice below follows from it)

**Decision:** Next.js 14 (App Router) + React 18 + TypeScript (strict) +
Tailwind CSS + shadcn/ui + TanStack Query + Zustand + React Hook Form +
Zod + a custom WebSocket manager + Tremor (ops charts) / Recharts
(elsewhere) + MapLibre GL JS + Vitest/React Testing Library + Playwright.
One Next.js application, three route groups (`(customer)`, `(organizer)`,
`(ops)`), not three separate deployables. Recorded formally as ADR-0005
in the backend repo's `docs/decisions/`.

Two of Encore's actual requirements decided this, not generic framework
preference: public event pages need to be shareable (the URL shortener
capability exists *because* events get shared) with correct previews,
favoring SSR; and RBAC-gated routes across three personas need to be
gated before render, favoring edge middleware. Splitting into three apps
was rejected because it would triple the auth/WebSocket/design-system
integration work to solve a scaling problem this project's traffic
profile doesn't have — mirroring the backend's own ADR-0003 reasoning
(thin-slice-first, don't decompose before there's a reason to).

Full per-concern evaluation table (framework, language, styling,
component library, server/client state, forms, realtime, charts, maps,
testing, auth, API client, error handling — each with rejected
alternatives and the one-line reason):

| Concern | Chosen | Rejected alternatives | Why |
|---|---|---|---|
| Framework | Next.js 14, App Router | Vite+React SPA, Remix | SSR for shareable public pages + middleware RBAC |
| Language | TypeScript (strict) | — | Non-negotiable for this type surface |
| Styling | Tailwind CSS | CSS Modules, styled-components | Config file = design-token system |
| Component library | shadcn/ui | MUI, Ant Design, Chakra | Full visual control, no fighting defaults |
| Server state | TanStack Query | SWR, RTK Query | Cache invalidation model matches real-time needs |
| Client state | Zustand | Redux, Context-only | No time-travel needed; cross-tree access needed |
| Forms/validation | React Hook Form + Zod | Formik | One schema language for forms + API + WS |
| Real-time | Custom WebSocket manager | Socket.IO, Pusher, Ably | Backend is plain WS, not a proprietary protocol |
| Charts | Tremor (ops), Recharts (rest) | Chart.js, Victory | Purpose-built for each surface's density |
| Maps | MapLibre GL JS | Mapbox GL JS, Google Maps | No paid API key required |
| Testing | Vitest + RTL, Playwright | Jest, Cypress | Faster + native to the toolchain |
| Auth | Custom JWT/httpOnly-cookie | NextAuth.js | Custom RBAC backend, not an OAuth provider |
| API client | Hand-written typed wrapper | Generated SDK (now) | Backend contract not finalized (gap G-3) |

**Explicit follow-up:** once the backend publishes an OpenAPI spec (gap
G-3, `../api/backend-gaps.md`), regenerate `lib/api-client.ts` with
`openapi-typescript` instead of maintaining it by hand.

## 1. Layered request flow

```text
Browser
  -> Next.js Application (React Server + Client Components)
  -> Frontend API Layer (lib/api-client.ts)
  -> API Gateway (Encore V1, /api/v1/*)
  -> Encore V1 backend services

Parallel real-time path:
Browser -> WebSocketManager -> Encore V1 WebSocket Gateway
```

Next.js Route Handlers (`app/api/*`) are used only as a thin BFF in two
cases: (1) file-upload streaming for organizer documents/media, avoiding
exposing object-storage credentials to the browser, and (2) the
WebSocket-to-SSE fallback bridge. Every other request goes browser ->
`apiClient` -> API Gateway directly, with no Next.js server hop, to
avoid adding latency to the hot checkout path.

## 2. Error boundaries

- **Root-level** (`app/error.tsx`): catches anything not caught below.
- **Per route-group**: an ops-dashboard crash never takes down customer
  checkout, and vice versa.
- **Checkout-specific** (`app/(customer)/checkout/error.tsx`): renders a
  dedicated `PaymentUnknownState` rather than a generic error, since a
  crash mid-payment must never look like "just try again" without first
  checking whether the charge went through.

## 3. Environment configuration

`lib/env.ts` validates `process.env` against a Zod schema at build time:

```
NEXT_PUBLIC_API_BASE_URL, NEXT_PUBLIC_WS_BASE_URL, NEXT_PUBLIC_MAPTILE_URL,
NEXT_PUBLIC_ENVIRONMENT, NEXT_PUBLIC_SENTRY_DSN
```

Nothing genuinely secret ever lives in a `NEXT_PUBLIC_*` variable — see
`../security/security.md` §7.

## 4. Feature flags

A single `config/feature-flags.ts`, statically defined per environment.
Used for exactly two purposes: gating P2/P3 features per
`../planning/exhaustive-task-backlog.md`'s priority tiers, and gating the
backend-gap-blocked surfaces (`../api/backend-gaps.md`) so they render an
explicit "not yet available" state instead of a broken page.

## 5. Telemetry — architectural placement

Full design in `../observability/frontend-observability.md`.
Architecturally: one `lib/telemetry.ts` wrapping Sentry, called from
`apiClient`'s interceptors and `WebSocketManager`'s lifecycle hooks so
instrumentation happens in one place, not scattered per-component.

## See also

- `frontend-folder-structure.md` — the actual directory layout
- `frontend-data-flow.md` — server/client/realtime state boundaries
- `realtime-architecture.md` — WebSocketManager internals
- `auth-rbac.md` — auth flow and RBAC gating
