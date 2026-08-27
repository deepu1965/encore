# ADR-0006: Token-Bucket Rate Limiter via Redis Lua Script

**Status:** Accepted
**Date:** 2026-08-27
**Deciders:** project author (solo project)

## Context

Week 4 introduces a distributed rate limiter at the API edge. The limiter
must be:
1. **Accurate** — two concurrent requests should not both slip through when
   only one token remains.
2. **Low-latency** — the check must not add significant overhead per request.
3. **Resilient** — if Redis is unavailable, the API should not go down.

## Decision

### Algorithm: Token Bucket

Chosen over alternatives:

| Algorithm | Pros | Cons |
|---|---|---|
| Fixed window counter | Simple O(1) | Allows 2× burst at window boundary |
| Sliding window log | Accurate | O(N) memory per identity |
| **Token bucket** | O(1) memory, smooth, burst-tolerant | Slightly more complex |
| Sliding window counter | Good accuracy, O(1) | Approximate at window edges |

The token bucket correctly handles **bursty legitimate traffic** (e.g., a
user quickly browsing 10 events) while still enforcing sustained rate
limits. Its O(1) memory usage per identity means we can support millions
of concurrent users without Redis memory pressure.

### Atomicity: Lua Script via `redis.eval()`

The token-bucket requires a read-modify-write cycle. Two concurrent callers
sharing the same key could both read "1 token remaining", both decide they
are allowed, both decrement — resulting in a double-spend.

Options considered:
- **WATCH / MULTI / EXEC (optimistic locking):** Requires client-side retry
  loops, which spike latency under contention.
- **Lua script via `redis.eval()`:** Executes atomically on the Redis server.
  No interleaving possible. No retry needed. This is the approach used by
  Stripe, Cloudflare, and other high-traffic systems.

We choose Lua for predictable latency under load.

### Fail-Open on Redis Down

If Redis is unavailable, all rate-limit checks return `allowed=True`. The
system logs a WARNING and continues serving requests.

**Why fail-open, not fail-closed?**
The rate limiter is a *protection* layer, not a *correctness* gate. If Redis
is down, blocking all traffic would cause a self-inflicted outage on top of
an infrastructure incident. Legitimate users should not be blocked because
a protection system is temporarily unavailable. We accept the risk of
temporarily losing rate-limit protection in exchange for availability.

This matches the Week 3 `NullCacheClient` design philosophy.

### Identity Scheme

- Global middleware: keyed by **client IP address** (from `X-Forwarded-For`
  or socket address). Works for both anonymous and authenticated routes.
- Checkout endpoint: keyed by **authenticated User ID**. Prevents a single
  user from churning through checkout attempts regardless of IP.

## Consequences

**Positive:**
- O(1) memory per identity in Redis.
- Atomic, no race conditions under concurrent load.
- Fail-open means no availability impact during Redis outages.
- `X-RateLimit-Remaining` header helps clients implement adaptive throttling.

**Negative / accepted tradeoffs:**
- Lua script complexity: if the script has a bug, it fails silently under
  load. Mitigated by unit tests that shadow the Lua logic in pure Python.
- IP-based limiting is bypassable by VPN / IP rotation. This is a known
  limitation — a proper WAF / bot fingerprinting layer is a future concern,
  not a Week 4 one.
- The rate limiter lives inside the API Gateway process, not a separate edge
  service. In a multi-replica deployment, each replica has independent
  middleware, but they all share the same Redis — so the effective limit
  is correctly distributed. The middleware will be extracted to a dedicated
  edge service when service decomposition begins (post-Week 9).

## Related

`packages/rate-limiter/`, ADR-0005 (Redis foundation), `docs/architecture/v1-scope-freeze.md`
