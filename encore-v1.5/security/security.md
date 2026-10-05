# Security

## §1 — Frontend RBAC is not the security boundary

Route gating and every hide/disable decision are UX optimizations only.
The backend re-authorizes every request independently of what the
frontend allowed the user to navigate to.

## §2 — XSS and token storage

JWT tokens live only in httpOnly, Secure, `SameSite=Strict` cookies —
JavaScript cannot read them, so a successful XSS cannot exfiltrate a
session token. React's default JSX escaping handles standard XSS
prevention; no `dangerouslySetInnerHTML` use exists anywhere without
DOMPurify sanitization first.

## §3 — CSRF and RBAC enforcement details

`SameSite=Strict` prevents the cookie from being sent cross-site at all;
as defense in depth, every mutating request requires the custom
`X-Request-Id` header (a plain cross-site form POST cannot set it).

RBAC: deployment rollback is the one action gated to ADMIN specifically,
with OPERATIONS seeing a disabled control (not hidden) — a deliberate,
explicitly-noted exception to the general default, since knowing a
rollback capability exists is legitimate situational awareness during an
incident even for a role that can't trigger it. Everywhere else, a
control the current role can't use is not rendered at all.

## §4 — Enumeration protection

`/forgot-password` always returns the same success message regardless of
whether the email exists. Signup's `EMAIL_ALREADY_REGISTERED` is the one
deliberate exception — a signup flow inherently needs to tell the user
their email is taken.

## §5 — PII visibility rules

| Data | Visible to | Not visible to |
|---|---|---|
| Attendee email/name | That event's own organizer | Any other organizer |
| Log `user_id` filter | ADMIN | OPERATIONS |
| Chat sender identity | All chat participants (inherent to chat) | — |
| Wallet ledger, order history | The account owner only | Everyone else, including organizers |
| Resale trade participant identities | The two participants | Other marketplace browsers |

## §6 — Payment data handling

No payment method details are ever stored in any frontend state — not
Zustand, not TanStack cache, not sessionStorage. Payment forms hand off
directly to a provider-hosted tokenization mechanism. This is also why
the session-expired modal does not attempt to preserve a partially-
entered payment form across re-login — there is nothing safe to
preserve.

## §7 — No secrets in the frontend bundle

Every `NEXT_PUBLIC_*` variable is documented and non-secret (API base
URL, WS base URL, map tile URL, environment name, Sentry DSN). Anything
genuinely sensitive lives server-side only, inside Route Handlers.

## §8 — WebSocket authorization

The WebSocket connection authenticates using the same httpOnly cookie as
REST — no separate WS-specific token exposed to client JS. Channel-level
authorization (e.g., ticket-gated chat) is enforced server-side at
subscribe-time; a rejected subscription surfaces as a normal page error,
not a silently-empty channel.

## §9 — File upload security

Document/media uploads proxy through a Route Handler so: the browser
never receives direct object-storage credentials, file-type/size
validation is enforced server-side (not just client-side, trivially
bypassed), and upload session tokens are scoped to one upload with a
bounded expiry.

## §10 — Client-side trust, generally

Nothing the frontend computes, stores, or displays is treated as
authoritative by the backend, and nothing the backend sends is trusted
beyond what the current session's role legitimately permits — the
security-layer expression of the same "frontend is never the source of
truth" principle the data-consistency layer establishes.
