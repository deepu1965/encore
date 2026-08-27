"""Atomic Lua script for the token-bucket rate limiter.

WHY LUA?
────────
A token-bucket requires a read-modify-write cycle:
  1. Read current (tokens, last_ts) from Redis
  2. Compute refill based on elapsed time
  3. Decide allow/deny
  4. Write updated state back

Without atomicity, two concurrent requests can both read the same state,
both see sufficient tokens, both allow themselves, and both decrement —
resulting in double-spend (more requests allowed than the configured limit).

Options for atomicity in Redis:
  A. WATCH / MULTI / EXEC (optimistic locking) — requires retry loops on
     conflict, which adds latency spikes under load.
  B. Lua script via EVAL — the entire script runs atomically on the Redis
     server without interleaving from other clients. No retry needed.
     This is the approach used by high-traffic systems (Stripe, Cloudflare).

We choose Lua (option B) for simplicity and predictable latency.

SCRIPT CONTRACT:
────────────────
  KEYS[1]   rate limit key (e.g. "ratelimit:192.168.1.1")
  ARGV[1]   capacity:      integer   (max tokens / burst size)
  ARGV[2]   rate:          float     (tokens refilled per second)
  ARGV[3]   now:           float     (current Unix time in seconds, ms precision)
  ARGV[4]   ttl:           integer   (key TTL in whole seconds; auto-expires stale buckets)

  Returns:  {allowed, remaining, retry_after_ms}
    allowed         1 if allowed, 0 if denied
    remaining       integer tokens remaining AFTER this request
    retry_after_ms  ms to wait before the next request would be allowed
                    (0 if allowed)

STATE FORMAT: stored as Redis string "tokens:last_ts"
  Example: "9.33333:1724786400.123"
  Chosen over a Redis hash to keep GET/SET simple and avoid hash field overhead.
"""

TOKEN_BUCKET_LUA = """
local key     = KEYS[1]
local capacity  = tonumber(ARGV[1])
local rate      = tonumber(ARGV[2])
local now       = tonumber(ARGV[3])
local ttl       = tonumber(ARGV[4])

-- Load existing state or bootstrap a full bucket
local raw = redis.call('GET', key)
local tokens, last_ts

if not raw then
    tokens  = capacity
    last_ts = now
else
    local sep = string.find(raw, ':')
    tokens  = tonumber(string.sub(raw, 1, sep - 1))
    last_ts = tonumber(string.sub(raw, sep + 1))
end

-- Refill: add tokens proportional to elapsed time, capped at capacity
local elapsed = now - last_ts
if elapsed > 0 then
    tokens  = math.min(capacity, tokens + elapsed * rate)
    last_ts = now
end

-- Consume one token if available
local allowed, retry_after_ms
if tokens >= 1.0 then
    tokens        = tokens - 1.0
    allowed       = 1
    retry_after_ms = 0
else
    allowed        = 0
    -- Time until 1 token is available, in milliseconds
    local wait_s   = (1.0 - tokens) / rate
    retry_after_ms = math.ceil(wait_s * 1000)
end

-- Persist updated state with TTL so stale keys auto-expire
redis.call('SET', key, tostring(tokens) .. ':' .. tostring(last_ts), 'EX', ttl)

return {allowed, math.floor(tokens), retry_after_ms}
"""
