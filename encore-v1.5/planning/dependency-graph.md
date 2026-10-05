# Dependency Graph

## The correction this document exists to make

The previous plan's phase table implied Checkout depended on both Seat
Selection *and* Waiting Room. That's wrong for most of Encore's traffic:
**most events are never a flash sale.** Forcing the normal purchase path
to wait on waiting-room implementation would block the majority of the
product on a feature only a minority of events ever trigger. Corrected:

```text
NORMAL PURCHASE (most events)
Event Details → Seat Selection → Hold → Checkout → Payment → Ticket
(Waiting Room is NOT in this critical path)

HIGH-DEMAND PURCHASE (flash-sale events only)
Event Details → Waiting Room → Admission → Seat Selection → Hold → Checkout → Payment → Ticket
(Waiting Room sits BEFORE Seat Selection, as an admission gate — it does
 not sit between Seat Selection and Checkout, and Checkout's own
 implementation has no dependency on it)
```

**What Checkout (Phase: Checkout + Payment) actually depends on:**
Seat Selection (a hold must exist to reach checkout) — full stop.
Waiting Room is a separate, parallel-buildable phase.

**What "high-demand demo complete" depends on:** Seat Selection AND
Waiting Room both complete AND wired together (the admission→redirect
handoff, `V15-WAIT-*` tasks 6-9). This is a distinct milestone from
"Checkout is done," tracked separately below.

## Full phase dependency graph

```text
Phase 0  Contract Audit                    depends on: nothing
Phase 1  Frontend Foundation               depends on: Phase 0 (acknowledged, not resolved)
Phase 2  Design System                     depends on: Phase 1
Phase 3  Authentication                    depends on: Phase 1, 2
Phase 4  Discovery                         depends on: Phase 2, 3
Phase 5  Event + Seat Selection            depends on: Phase 4
Phase 6  Waiting Room                      depends on: Phase 3       <-- NOT Phase 5
Phase 7  Checkout + Payment                depends on: Phase 5       <-- NOT Phase 6 (the fix)
Phase 8  Tickets + Orders + Wallet         depends on: Phase 7
Phase 9  Resale                            depends on: Phase 8
Phase 10 Notifications + Chat              depends on: Phase 3, 5
Phase 11 Organizer                         depends on: Phase 2, 3    (parallel-buildable with 4-10)
Phase 12 Operations                        depends on: Phase 2, 3    (parallel-buildable with 4-11)
Phase 13 Documents + Media + Location      depends on: Phase 11 (docs/media), Phase 4 (location)
Phase 14 Real-Time Integration Hardening   depends on: Phase 5-13 (every WS-using feature must exist)
Phase 15 Testing                           runs continuously; closes gaps here
Phase 16 Performance                       depends on: Phase 14
Phase 17 Security                          runs continuously; hardened here
Phase 18 Final Polish                      depends on: all above

MILESTONE: "High-demand purchase demo-ready"  depends on: Phase 6 AND Phase 7
           (this is the ONLY point where Waiting Room and Checkout
           dependencies actually intersect — at the demo/milestone level,
           not the implementation level)
```

## Parallelizable work (for a team larger than one)

- **Track A (customer core):** Phases 4 → 5 → 6/7 (6 and 7 in parallel) → 8 → 9 → 10
- **Track B (organizer):** Phase 11, startable as soon as Phase 2/3 land
- **Track C (operations):** Phase 12, startable as soon as Phase 2/3 land
- Tracks A/B/C converge at Phase 14 (Real-Time Integration Hardening),
  since every track produces WebSocket-consuming features that need
  hardening together, not independently.

## Critical path

The single longest dependency chain, in phases:
`0 → 1 → 2 → 3 → 4 → 5 → 7 → 8 → 9 → 14 → 16 → 18` — Organizer (11) and
Operations (12) are explicitly **not** on the critical path; a solo
implementer following this graph literally would still benefit from
knowing that 11/12 can be picked up whenever, not just "later."

## Backlog reference

Every phase name above matches a `Phase` column value in
`../Encore-V1.5-Exhaustive-Backlog.xlsx`'s `Backlog` sheet exactly —
filtering that column reproduces this graph's task grouping directly.
