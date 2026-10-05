# Frontend Folder Structure

```text
frontend/
├── app/
│   ├── (customer)/
│   │   ├── layout.tsx                 customer shell: header, footer, cart/hold summary
│   │   ├── page.tsx                   Home
│   │   ├── explore/, search/, near-me/, leaderboard/
│   │   ├── events/[eventId]/
│   │   │   ├── page.tsx, waiting-room/, select-seats/, chat/, live/, replay/
│   │   ├── venues/[venueId]/
│   │   ├── checkout/, orders/, tickets/, wallet/, resale/, notifications/
│   │   ├── profile/, settings/, help/
│   │   ├── login/, signup/, forgot-password/, reset-password/
│   │   ├── unauthorized/, forbidden/
│   │   └── error.tsx, not-found.tsx
│   ├── (organizer)/
│   │   ├── layout.tsx                 organizer shell: sidebar nav, breadcrumbs
│   │   └── organizer/... (see ../routes/route-inventory.md)
│   ├── (ops)/
│   │   ├── layout.tsx                 ops shell: dense sidebar, service-status strip
│   │   └── ops/... (see ../routes/route-inventory.md)
│   ├── api/                           thin BFF — uploads + WS/SSE fallback only
│   ├── layout.tsx                     root layout: fonts, providers (QueryClientProvider, ThemeProvider)
│   └── middleware.ts                  RBAC gate — see auth-rbac.md
│
├── components/
│   ├── ui/                            shadcn/ui primitives, restyled to Encore tokens
│   └── shared/                        cross-persona composites — see ../design/component-inventory.md
│
├── features/                          one folder per domain: auth/, discovery/, seat-selection/,
│                                       waiting-room/, checkout/, payment/, tickets/, orders/, wallet/,
│                                       resale/, notifications/, chat/, location/, leaderboard/,
│                                       organizer-*/ (one per organizer sub-area), ops-*/ (one per ops
│                                       dashboard) — each contains queries.ts, mutations.ts, components/, types.ts
│
├── lib/
│   ├── api-client.ts, websocket-manager.ts, auth.ts, query-client.ts, env.ts, utils.ts
│
├── hooks/                             cross-feature hooks: useDebounce, useMediaQuery,
│                                       useIntersectionObserver, usePermission
│
├── stores/                            Zustand: seat-selection, checkout, ui, ops-dashboard-filters
│
├── types/                             domain types + generated types once gap G-3 (OpenAPI) closes
│
├── config/                            feature flags, route-permission map
│
├── styles/                            Tailwind config = design tokens
│
└── tests/
    ├── unit/, integration/            mirror features/ structure
    └── e2e/                           Playwright specs
```

## Feature-boundary rule

A file inside `features/checkout/` may import from `components/`,
`lib/`, `hooks/`, `stores/ui.ts`, and `stores/checkout.ts` — never
directly from another feature folder (e.g., `checkout` must not import
from `features/resale/`). Cross-feature composition happens only at the
`app/` route level. This mirrors the backend's own
`service-boundaries.md` one-writer-per-table rule, applied to UI modules
instead of database tables.

## Where new work goes

- A new page -> `app/` in the appropriate route group, per
  `../routes/route-inventory.md`.
- A new reusable UI piece -> `components/shared/` if used across
  personas, `components/ui/` if it's a styling variant of a primitive.
- Domain logic (queries, mutations, types) for a feature -> its own
  `features/<name>/` folder — never inline in the page component.
- A new Zustand store -> `stores/`, only for genuinely client-only,
  ephemeral state (see `frontend-data-flow.md`'s state-boundary rule).
