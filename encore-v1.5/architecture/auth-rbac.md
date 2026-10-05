# Authentication & RBAC

## Auth flow

```text
Login form submits credentials
  -> POST /api/v1/auth/login
  -> backend sets an httpOnly, Secure, SameSite=Strict cookie containing
     the JWT (access token) + returns { user, role } in the response body
  -> apiClient stores { user, role } in a TanStack Query cache entry
     (['auth', 'session']) — NOT Zustand, NOT localStorage, so it's never
     accessible to JS (mitigates XSS token theft — ../security/security.md §2)
  -> middleware.ts reads the same cookie on every subsequent navigation
```

Token refresh: the backend issues a short-lived access token + a
longer-lived refresh token, both httpOnly. `apiClient`'s response
interceptor catches a `401 TOKEN_EXPIRED`, calls
`POST /api/v1/auth/refresh` once, retries the original request once, and
redirects to `/login` if that also fails.

## Middleware / RBAC gate

`middleware.ts` runs before any route group's layout renders:
1. Reads the httpOnly session cookie.
2. If the route requires auth and no valid session exists -> redirect to
   `/login?redirect={original path}`.
3. If the route requires a specific role (checked against
   `config/route-permissions.ts`) and the session's role doesn't match
   -> redirect to `/forbidden`.
4. Otherwise -> allow through.

This is a UX optimization (no flash of protected content, no wasted
round-trip), not the actual security boundary — the backend re-checks
authorization on every request regardless. See `../security/security.md`
§1 and §3 for the full RBAC enforcement model, including the deliberate
hide-vs-disable distinctions (rollback button disabled-not-hidden for
OPERATIONS; alert-acknowledgement open to both OPERATIONS and ADMIN).

## Roles

CUSTOMER, ORGANIZER, SUPPORT, OPERATIONS, ADMIN — exactly the five named
in the V1 spec. **SUPPORT has no defined capability surface anywhere in
the source spec or this plan** — flagged as gap G-7
(`../api/backend-gaps.md`), not silently ignored. No route in
`../routes/route-inventory.md` is reachable by SUPPORT until product
scopes what that role is meant to do.
