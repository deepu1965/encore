# ADR-0001: Record architecture decisions as ADRs

**Status:** Accepted
**Date:** 2026-08-24
**Deciders:** project author (solo project)

## Context

This is a 36-week, 25-service, multi-cluster project built solo. Without a
record of *why* a decision was made, future-me will re-litigate settled
questions ("why is inventory partitioned by event_id and not seat_id?")
weeks or months later, at cost of real time and risk of silently
contradicting an earlier, load-test-informed decision.

## Decision

Every non-trivial architectural or tradeoff decision gets a short Markdown
ADR in `docs/decisions/`, numbered sequentially, using the template in
`adr-template.md`. "Non-trivial" means: it would take more than one
sentence to justify if a reviewer asked "why did you do it this way?"

## Considered options

1. **No formal record** — rely on memory / commit messages.
2. **A single running `DECISIONS.md`** — one growing file.
3. **One file per ADR, numbered** (this decision).

## Rationale

Option 1 fails specifically because this project spans 36 weeks — commit
messages don't survive being searched for "why," and memory of a Week 3
tradeoff is gone by Week 20. Option 2 becomes unwieldy and hard to link to
from other docs once it passes ~15 entries. Option 3 (one file per
decision) is greppable, linkable from other docs by filename, and mirrors
the format used in the resume/portfolio writeup, so ADRs double as
interview prep material without extra work.

## Consequences

**Positive:**
- Every hard tradeoff has a durable, linkable record.
- ADRs become primary source material for the final benchmark/writeup
  (Week 25, Week 36) and for interview answers.

**Negative / accepted tradeoffs:**
- Small overhead per decision (~10 minutes to write one).

**Follow-up required:**
- None — this is process, not code.

## Related

`docs/decisions/adr-template.md`, `docs/architecture/v1-scope-freeze.md`
