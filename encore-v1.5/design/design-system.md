# Encore Design System

One token set, two theme modes, applied differently by default per
persona — the concrete mechanism behind "the UI should feel like ONE
coherent product" while still signaling which mode the user is in. The
full component-by-component build backlog is in `component-inventory.md`.

## 1. Typography

| Token | Font | Use |
|---|---|---|
| `--font-sans` | Inter | All UI text |
| `--font-mono` | JetBrains Mono | Trace IDs, request IDs, ticket codes |

Scale: `text-display` (36/44), `text-h1`-`text-h4` (28/24/20/16),
`text-body` (15/24), `text-label` (13/16, medium), `text-caption`
(12/16), `text-data` (15/20, mono, tabular-nums — prices, seat counts,
metric values, so numbers align vertically in columns).

## 2. Color system

Semantic tokens only — no component references a raw hex value.

| Token | Customer/Organizer (light default) | Ops (dark default) |
|---|---|---|
| `--color-primary` | `#4F46E5` | `#818CF8` |
| `--color-secondary` | `#0EA5A4` | `#2DD4BF` |
| `--color-background` | `#FFFFFF` | `#0B0F14` |
| `--color-surface` | `#F8FAFC` | `#151B23` |
| `--color-border` | `#E2E8F0` | `#243040` |
| `--color-success` | `#16A34A` | `#4ADE80` |
| `--color-warning` | `#D97706` | `#FBBF24` |
| `--color-error` | `#DC2626` | `#F87171` |
| `--color-info` | `#2563EB` | `#60A5FA` |

Every persona can switch theme mode manually (persisted client-side
only); the table states only the default per persona.

## 3. Spacing & radius

4px base unit (Tailwind default, not overridden). Radius:
`--radius-sm` (4px, inputs/badges), `--radius-md` (8px, cards),
`--radius-lg` (16px, modals).

## 4. Elevation

Three shadow levels only: `sm` (card hover), `md` (dropdown/popover),
`lg` (modal). A design needing a fourth should use borders/spacing
instead.

## 5. Design direction per persona

| Persona | Density | Imagery | Primary action emphasis |
|---|---|---|---|
| Customer | Low-medium, generous whitespace | Image-driven, full-bleed posters | One obvious primary CTA per screen |
| Organizer | Medium-high, table/chart-heavy | Minimal decorative imagery | Actions in a consistent toolbar position |
| Ops | High, `MetricCard` grids, dense tables, dark-default | None | Read-only by default; authorized actions visually distinct (never blended into the metric display) |

## Contrast and accessibility

Every color pairing meets WCAG AA contrast in both themes — see
`../accessibility/accessibility.md` §4 for the verification requirement.

## Component build backlog

See `component-inventory.md` — 68 components, every one with a real
implementation task, and every accessibility-critical component
(`Modal`, `Seat`, `SeatMap`, `Chart`, etc.) with a dedicated a11y task
beyond the generic baseline.
