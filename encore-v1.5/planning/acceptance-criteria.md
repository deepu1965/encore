# Acceptance Criteria Standard

## The rule

A task's "Acceptance Criteria" cell in `../Encore-V1.5-Exhaustive-Backlog.xlsx`
is never satisfied by "the page renders" or "the component works." Every
task's acceptance criteria are concrete and checkable — bad vs. good,
exactly as the update request specifies:

**Bad:** "Dashboard works."

**Good** (this is `/ops/flash-sale`'s actual standard, applied):
- `/ops/flash-sale` renders active event metrics.
- Queue length is loaded from the backend.
- Metrics update through WebSocket events.
- Connection loss shows reconnecting state.
- Duplicate events do not duplicate metric updates.
- Unauthorized users receive 403 handling.
- Loading/empty/error states are implemented.
- E2E test verifies the primary flow.

Every task in the backlog's `Acceptance Criteria` column follows this
shape: specific, testable, tied to the actual documented behavior (a
component name, an API path, a WebSocket message type, a status code) —
never a restatement of the task title.

## The 13-point checklist every task is checked against

Carried forward from the original plan's Definition of Done, unchanged
because it was already correct — only the backlog it applies to changed:

| # | Item | Applies when |
|---|---|---|
| 1 | UI implemented | Always |
| 2 | API connected | Unless UI-only task |
| 3 | Loading state implemented | Always |
| 4 | Empty state implemented | List/collection views |
| 5 | Error state implemented | Always |
| 6 | Permission state implemented | Role-gated pages/actions |
| 7 | Mobile behavior implemented | Always, except explicitly-P2 ops pages |
| 8 | Accessibility addressed | Always |
| 9 | Tests written AND passing | Always |
| 10 | Telemetry added where appropriate | API calls, transactional actions, new routes |
| 11 | Realtime behavior implemented | Pages with a WebSocket channel |
| 12 | Backend errors handled | Always |
| 13 | Acceptance criteria verified against the running implementation | Always |

## What changed in this update

The checklist itself didn't need to change — the backlog it's applied to
did. Previously, "apply this checklist per task" was aspirational for
most of the surface (only the P0 critical path had tasks fine-grained
enough to check item-by-item). Now every one of the 1,120 tasks in
`../Encore-V1.5-Exhaustive-Backlog.xlsx` is atomic enough that this
checklist applies cleanly — a task like "Implement Seat Selection loading
state" (`V15-SEAT-012`) has one unambiguous acceptance criterion (item 3),
not a checklist's worth of ambiguity about whether "the page" satisfies
all 13 points at once.

## Reviewer usage

Reviewing a PR against a task: open the task's row in the `Backlog`
sheet, read its `Acceptance Criteria` and `Testing Requirement` columns,
and verify both against the actual diff. If a reviewer finds something
this 13-point checklist implies but the task's own acceptance criteria
didn't capture, that's a backlog gap to fix (file it against the task's
epic), not a reason to ship without it.
