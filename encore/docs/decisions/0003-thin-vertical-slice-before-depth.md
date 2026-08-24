# ADR-0003: Build a thin end-to-end vertical slice before deepening any one layer

**Status:** Accepted
**Date:** 2026-08-24
**Deciders:** project author (solo project)

## Context

The 36-week plan front-loads infrastructure (Redis in Week 3, edge controls
in Week 4, Kafka in Week 5) before the first real feature ships in Week 9.
There's a known risk in solo infra-heavy projects: weeks of scaffolding
with nothing runnable to show, which makes it hard to catch integration
mistakes early and easy to lose momentum.

## Decision

Before deepening any single layer, stand up the thinnest possible
end-to-end path — `browse events → select seat → mock order → mock
ticket` — using the plainest implementation at every step (no Redis, no
Kafka, no real payment provider, in-process mocks/stubs everywhere). This
lands in Week 2, immediately after Week 1's scaffolding, per the plan
already in `Encore_v1_v2_Updated_36_Week_Plan.xlsx`. Every subsequent
foundation week (Redis, edge controls, Kafka, waiting room, inventory
hardening) plugs into this same slice rather than building in isolation.

## Considered options

1. **Infra-first, feature-last** — build Redis/Kafka/rate-limiter fully
   before any endpoint exists, feature arrives ~Week 9.
2. **Thin vertical slice first, then deepen each layer into it** (this
   decision).
3. **Feature-complete-first, retrofit distributed-systems patterns later.**

## Rationale

Option 1 risks discovering integration problems (schema mismatches, wrong
API conventions, a Kafka event nobody actually consumes correctly) only
once everything is assembled, when they're expensive to fix. Option 3
would mean building on top of ad hoc, unscalable patterns and having to
tear them out — directly contradicts the project's purpose, which is to
demonstrate *proper* distributed-systems design, not retrofit it. Option 2
gets a runnable, demo-able system in Week 2, and every later foundation
week (Redis in Week 3, Kafka in Week 5, etc.) has a concrete existing path
to slot into and validate against, rather than building infrastructure with
nothing yet depending on it.

## Consequences

**Positive:**
- Something demoable exists from Week 2 onward — useful for motivation and
  for catching integration issues early.
- Later infra weeks have a real consumer to validate against immediately.

**Negative / accepted tradeoffs:**
- The Week 2 slice is intentionally unscalable/incorrect under load (no
  locking, no idempotency) — this is fine *only* because it's explicitly
  temporary and gets replaced layer by layer starting Week 3. This must
  not be mistaken for "done."

**Follow-up required:**
- `docs/architecture/vertical-slice-plan.md` defines exactly what's mocked
  and the acceptance criteria for calling the slice complete.

## Related

`docs/architecture/vertical-slice-plan.md`, Week 2 row in the 36-week plan
