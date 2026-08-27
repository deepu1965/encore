"""Token-bucket rate limiter backed by Redis.

TOKEN BUCKET ALGORITHM:
───────────────────────
The bucket starts with `capacity` tokens (the burst allowance). Tokens are
refilled continuously at `rate_per_second` tokens/second, never exceeding
`capacity`. Each request consumes 1 token. When the bucket is empty (< 1
token), the request is denied.

Example: capacity=10, rate=1.67/s (100/min)
  t=0:    bucket=10, request → allowed, bucket=9
  t=1s:   bucket=10.67 (capped at 10), request → allowed, bucket=9
  ... 10 rapid-fire requests ...
  t=1ms:  bucket=0.001, request → denied, retry_after ≈ 600ms

WHY TOKEN BUCKET over alternatives:
  Fixed window counter: easy but allows 2× burst at window boundary.
  Sliding window log:   accurate but O(N) memory per identity.
  Token bucket:         O(1) memory per identity, smooth, burst-tolerant.

FAIL-OPEN BEHAVIOUR:
────────────────────
If `cache.ping()` fails, `check()` returns `RateLimitResult(allowed=True)`.
This is intentional. The rate limiter is a protection layer, not a
correctness gate. If Redis is down, the system is already degraded; blocking
all traffic on top of that would cause a self-inflicted outage. Failing open
means we lose rate-limit protection temporarily — which is logged — but the
system keeps serving legitimate users.

ATOMIC EXECUTION:
─────────────────
The token-bucket state (tokens, last_ts) is stored in Redis. The read-
modify-write cycle is executed as a single atomic Lua script via redis.eval()
so no two concurrent requests can both see the same pre-decrement state.

IDENTITY CONVENTION:
────────────────────
The caller provides the identity string; the limiter just uses it as-is.
Callers should use `encore_cache.helpers.rate_limit_key(identity)` to
produce namespaced Redis keys (e.g. "ratelimit:192.168.1.1").
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass

from encore_cache import CacheClient

from .lua import TOKEN_BUCKET_LUA

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RateLimitConfig:
    """Token-bucket configuration.

    Args:
        capacity:        Maximum burst size (tokens in a full bucket).
        rate_per_second: Token refill rate in tokens per second.
                         Example: 100/60 ≈ 1.6667 for "100 per minute".
    """

    capacity: int
    rate_per_second: float

    def __post_init__(self) -> None:
        if self.capacity <= 0:
            raise ValueError(f"capacity must be > 0, got {self.capacity}")
        if self.rate_per_second <= 0:
            raise ValueError(f"rate_per_second must be > 0, got {self.rate_per_second}")

    @property
    def ttl_seconds(self) -> int:
        """Auto-expire stale bucket keys after 2× the refill window."""
        return max(1, int(2 * self.capacity / self.rate_per_second))


@dataclass(frozen=True)
class RateLimitResult:
    """Result of a single rate-limit check.

    Attributes:
        allowed:             True if the request was allowed.
        remaining:           Integer token count remaining after this request.
        retry_after_seconds: Seconds to wait before the next allowed request.
                             0.0 when allowed=True.
    """

    allowed: bool
    remaining: int
    retry_after_seconds: float


class RateLimitExceeded(Exception):
    """Raised by RateLimiter.check_or_raise() when the limit is exceeded.

    Carries the full RateLimitResult for callers that want to inspect
    retry_after_seconds when building a 429 response.
    """

    def __init__(self, result: RateLimitResult) -> None:
        self.result = result
        super().__init__(
            f"Rate limit exceeded. Retry after {result.retry_after_seconds:.2f}s."
        )


# ---------------------------------------------------------------------------
# Pure-Python token bucket logic (used for unit testing without Redis)
# ---------------------------------------------------------------------------


def _apply_token_bucket(
    current_tokens: float,
    last_ts: float,
    capacity: int,
    rate: float,
    now: float,
) -> tuple[float, float, bool, float]:
    """Pure-Python token-bucket step — no Redis, no side effects.

    Returns: (new_tokens, new_ts, allowed, retry_after_seconds)

    This mirrors the Lua script exactly. Keeping both in sync is a test
    invariant: test_rate_limiter.py runs the same scenarios against both
    this function and the Lua script (via fakeredis) to ensure they agree.
    """
    elapsed = now - last_ts
    tokens = min(float(capacity), current_tokens + elapsed * rate)
    last_ts = now

    if tokens >= 1.0:
        tokens -= 1.0
        return tokens, last_ts, True, 0.0
    else:
        retry_after = (1.0 - tokens) / rate
        return tokens, last_ts, False, retry_after


# ---------------------------------------------------------------------------
# RateLimiter
# ---------------------------------------------------------------------------


class RateLimiter:
    """Redis-backed distributed token-bucket rate limiter.

    Thread-safe: redis-py connection pool handles concurrent callers.

    Usage:
        limiter = RateLimiter(
            cache=get_cache(),
            config=RateLimitConfig(capacity=10, rate_per_second=100/60),
        )
        result = limiter.check("ratelimit:192.168.1.1")
        if not result.allowed:
            raise HTTPException(429, detail=...)
    """

    def __init__(self, cache: CacheClient, config: RateLimitConfig) -> None:
        self._cache = cache
        self._config = config

    @property
    def config(self) -> RateLimitConfig:
        return self._config

    def check(self, key: str, _now: float | None = None) -> RateLimitResult:
        """Run a token-bucket check for the given Redis key.

        Args:
            key:  Full Redis key (e.g. "ratelimit:192.168.1.1").
                  Use encore_cache.helpers.rate_limit_key() to build it.
            _now: Override current time (seconds). Only used in tests.

        Returns:
            RateLimitResult with allowed, remaining, retry_after_seconds.

        Fail-open: if Redis is unreachable, returns allowed=True.
        """
        now = _now if _now is not None else time.time()

        # Fast path: NullCacheClient.ping() always returns False.
        # Fail-open: allow the request and log.
        if not self._cache.ping():
            logger.warning(
                "Rate limiter: Redis unreachable, failing open for key %s", key
            )
            return RateLimitResult(
                allowed=True,
                remaining=self._config.capacity,
                retry_after_seconds=0.0,
            )

        try:
            result = self._cache._redis.eval(  # type: ignore[attr-defined]
                TOKEN_BUCKET_LUA,
                1,  # number of keys
                key,
                self._config.capacity,
                self._config.rate_per_second,
                now,
                self._config.ttl_seconds,
            )
            allowed_flag, remaining, retry_after_ms = result
            return RateLimitResult(
                allowed=bool(allowed_flag),
                remaining=int(remaining),
                retry_after_seconds=int(retry_after_ms) / 1000.0,
            )
        except Exception as exc:
            logger.warning(
                "Rate limiter: Redis eval failed for key %s (%s), failing open", key, exc
            )
            return RateLimitResult(
                allowed=True,
                remaining=self._config.capacity,
                retry_after_seconds=0.0,
            )

    def check_or_raise(self, key: str, _now: float | None = None) -> RateLimitResult:
        """Like check(), but raises RateLimitExceeded when denied.

        Convenience for dependency functions that want exception-based flow.
        """
        result = self.check(key, _now=_now)
        if not result.allowed:
            raise RateLimitExceeded(result)
        return result
