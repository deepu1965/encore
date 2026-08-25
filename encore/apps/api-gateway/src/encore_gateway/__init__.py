"""Encore API Gateway — Week 2 monolith.

This is the whole system today: browse -> hold -> order -> ticket, all in
one FastAPI process against one Postgres database. That's deliberate — see
docs/decisions/0003-thin-vertical-slice-before-depth.md and the
Architecture Evolution table in the original design doc (V1 Monolith is
stage 1 of 8; service decomposition is stage 6, around Week 6).

Do not add business logic here that belongs in a specific future service
(inventory, checkout, payment, wallet, resale) without a comment noting
which apps/<service> it should move to at decomposition time — see
docs/architecture/service-boundaries.md.
"""
