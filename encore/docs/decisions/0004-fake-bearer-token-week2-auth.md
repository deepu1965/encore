# ADR-0004: Fake bearer token (raw user ID) as the Week 2 auth stand-in

**Status:** Accepted — temporary, superseded when `packages/auth` is built
**Date:** 2026-08-24
**Deciders:** project author (solo project)

## Context

Week 2's plan item is "auth/RBAC skeleton" — every route needs a real
`get_current_user` / `require_role` dependency shape so routers are
written against their *final* interface. But building real JWT
issuance/verification (signing keys, refresh tokens, expiry) is
meaningfully scoped work that belongs to `packages/auth`, not to the
Week 2 vertical slice, whose entire point (ADR-0003) is to prove the
end-to-end path cheaply.

## Decision

`Authorization: Bearer <token>` is accepted on every protected route, but
`<token>` is literally the requesting user's UUID — `get_current_user`
just looks that ID up in the `users` table. No signature, no expiry, no
real credential ever changes hands.

## Considered options

1. **No auth at all in Week 2** — every route open, current_user hardcoded.
2. **Fake bearer token = raw user ID** (this decision).
3. **Build real JWT auth now**, ahead of `packages/auth`'s scheduled week.

## Rationale

Option 1 would mean rewriting every router's signature later when real
auth lands — `get_current_user`/`require_role` wouldn't exist as
dependencies yet, so Week-2-onward code wouldn't be exercising the shape
it'll actually run in. Option 3 front-loads real security work into a
slice explicitly meant to be thin (ADR-0003) and would block Week 2 on
decisions (token lifetime, refresh strategy, storage) that deserve their
own dedicated week and ADR. Option 2 gets every router writing against the
*real* dependency interface (`Depends(get_current_user)`,
`Depends(require_role(...))`) today, so swapping the body of
`get_current_user` for real JWT verification later touches one file
(`auth.py`), not every router.

## Consequences

**Positive:**
- Every route already has the correct auth dependency shape — zero router
  rewrites needed when real auth lands.
- RBAC (`require_role`) is exercised structurally even though nothing
  uses it yet in Week 2.

**Negative / accepted tradeoffs:**
- **This is not security.** Anyone who knows or guesses another user's
  UUID can act as them. Acceptable only because Week 2 has no real users,
  no deployment, and no data worth protecting yet.
- Must not accidentally ship past Week 2 — tracked here explicitly so it
  isn't forgotten as "good enough."

**Follow-up required:**
- Replace `get_current_user`'s body with real JWT verification when
  `packages/auth` is built (see `docs/architecture/service-boundaries.md`
  for that package's scope). Router code should not need to change.

## Related

`docs/architecture/vertical-slice-plan.md`, `apps/api-gateway/src/encore_gateway/auth.py`
