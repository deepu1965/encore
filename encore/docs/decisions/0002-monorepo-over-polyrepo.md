# ADR-0002: Use a monorepo for all Encore V1 services

**Status:** Accepted
**Date:** 2026-08-24
**Deciders:** project author (solo project)

## Context

Encore V1 will eventually contain ~12 services (`apps/`) and 6 shared
packages (`packages/`). Week 1 has to pick a repo topology before CI,
Docker Compose, and service scaffolding can be built, because it changes
how imports, versioning, and CI triggers work.

## Decision

Use a single monorepo (`encore/`) containing all services, shared packages,
infrastructure config, tests, and docs, rather than one repo per service.

## Considered options

1. **Polyrepo** — one Git repo per service (12+ repos).
2. **Monorepo with shared packages** (this decision).
3. **Monorepo with a single deployable** (no service separation at all).

## Rationale

This is a solo project, not a multi-team org — polyrepo's main benefit
(independent team ownership boundaries) doesn't apply, and its costs
(cross-repo versioning of `event-contracts` and `id-generator`, N separate
CI configs, N separate clone/setup steps) are pure overhead here. A
monorepo lets `packages/event-contracts` be imported directly by every
service without a private package registry, and lets one CI workflow lint
the whole system. Option 3 (single deployable) is rejected because it
defeats the purpose of the project — Encore exists specifically to
demonstrate service decomposition, not to *avoid* it.

## Consequences

**Positive:**
- One `docker-compose.yml` can boot the whole system for local dev.
- `event-contracts` changes are atomic — no cross-repo version-pinning
  drift between a producer and consumer.
- One CI pipeline, one place to look for "did the build pass."

**Negative / accepted tradeoffs:**
- CI must be scoped (path filters) as the repo grows, or every commit
  re-lints every service — acceptable now, revisit in an ADR if CI time
  becomes a real bottleneck.
- No enforced network boundary between services at the code level (a
  service *could* accidentally import another service's internals) —
  mitigated by convention (§3 of `service-boundaries.md`) rather than
  tooling for now.

**Follow-up required:**
- Add CI path-filtering once the repo has enough services that full-repo
  CI runs are slow (tracked as a future task, not blocking Week 1).

## Related

`docs/architecture/service-boundaries.md`, `.github/workflows/ci.yml`
