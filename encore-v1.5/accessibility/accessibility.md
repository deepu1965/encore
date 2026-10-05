# Accessibility

Target: WCAG 2.1 AA across customer and organizer (P0); ops targets the
same standard but is desktop-primary, affecting viewport/zoom testing
scope, not the bar itself.

## §1 — Keyboard navigation baseline

Every interactive element is reachable and operable via keyboard alone,
with a visible focus ring. No `tabindex` greater than 0 anywhere.

## §2 — Focus management

Modals/Drawers: focus moves in on open, trapped while open, returns to
trigger on close. Route transitions: focus moves to the new page's `h1`.
Toasts: don't steal focus, announced via `aria-live` instead.

## §3 — Seat map accessibility — the hardest case

`SeatMap` gets a fully separate, parallel operation mode, not a
compromise on the visual one: every `Seat` is a real `<button>` with
`aria-label` stating "Section {section}, Row {row}, Seat {number},
{price}, {status}" in plain words — status never conveyed by color
alone. Arrow-key navigation between adjacent seats, Tab between
sections, Enter/Space to select. A **list-view toggle** presents
identical seat/price/status data as a sortable/filterable table — a
screen-reader user is not expected to interpret the spatial layout at
all if they prefer the list; both views read/write the same underlying
data and selection state.

## §4 — Color contrast

Every token pairing meets WCAG AA (4.5:1 body text, 3:1 large
text/UI components) in both light and dark modes — verified against the
actual background context, not the token in isolation.

## §5 — Chart accessibility

Every `Chart`, `ServiceMap`, and `TraceWaterfall` ships a toggleable
paired data table — same underlying data, tabular form.

## §6 — Error and status announcements

Toast/RateLimitBanner: `aria-live="polite"` for info, `"assertive"` for
errors needing immediate attention. Countdown/live-metric values are
**not** wrapped in per-second `aria-live` updates (actively hostile to
screen readers) — only threshold-crossing events are announced. Form
validation errors: `aria-describedby` + first-error-gets-focus on failed
submission.

## §7 — Reduced motion

`prefers-reduced-motion: reduce` disables the seat-map zoom/pan
animation, the countdown warning-color transition, and toast animations
— content is never hidden, only the animation/transition layer.

## §8 — Semantic HTML baseline

Landmarks in every route-group layout; real `<table>`/`<caption>`/
`<th scope>`; real `<ul>`/`<ol>`, not styled `<div>`s.
