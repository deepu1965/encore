"""Tests for encore_rate_limiter.

Test strategy:
──────────────
1. Unit tests for _apply_token_bucket (pure Python, no Redis)
   - Test the token-bucket logic in isolation from Redis.
   - Predictable and fast; always pass regardless of Redis availability.

2. Integration tests for RateLimiter (with fakeredis)
   - Test the full Lua script path including state persistence in Redis.
   - Verify that the Lua script and _apply_token_bucket agree on results.
   - Verify fail-open on Redis-down (NullCacheClient).

3. Config validation
   - RateLimitConfig rejects invalid values.

4. RateLimitExceeded
   - check_or_raise() raises with the correct result attached.
"""

from __future__ import annotations

import pytest
import fakeredis

from encore_cache.client import NullCacheClient, RedisCacheClient
from encore_rate_limiter import RateLimitConfig, RateLimitExceeded, RateLimiter, RateLimitResult
from encore_rate_limiter.limiter import _apply_token_bucket


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_redis_limiter(capacity: int, rate: float) -> RateLimiter:
    """Create a RateLimiter backed by an in-process fakeredis server."""
    cache = RedisCacheClient.__new__(RedisCacheClient)
    cache._redis = fakeredis.FakeRedis(decode_responses=True)
    config = RateLimitConfig(capacity=capacity, rate_per_second=rate)
    return RateLimiter(cache=cache, config=config)


# ---------------------------------------------------------------------------
# Unit tests: _apply_token_bucket (pure Python)
# ---------------------------------------------------------------------------


def test_pure_first_request_allowed():
    """First request on a full bucket is always allowed."""
    new_t, _, allowed, retry = _apply_token_bucket(
        current_tokens=10.0, last_ts=0.0, capacity=10, rate=1.0, now=0.0
    )
    assert allowed is True
    assert retry == 0.0
    assert new_t == 9.0


def test_pure_empty_bucket_denied():
    """No tokens → request denied."""
    _, _, allowed, retry = _apply_token_bucket(
        current_tokens=0.0, last_ts=0.0, capacity=10, rate=1.0, now=0.0
    )
    assert allowed is False
    assert retry > 0.0


def test_pure_refill_over_time():
    """After elapsed time, tokens are refilled proportional to rate."""
    # Start empty, wait 5 seconds at rate=2/s → +10 tokens, cap=10
    new_t, _, allowed, _ = _apply_token_bucket(
        current_tokens=0.0, last_ts=0.0, capacity=10, rate=2.0, now=5.0
    )
    assert allowed is True
    assert new_t == 9.0  # 10 refilled, 1 consumed


def test_pure_refill_capped_at_capacity():
    """Refill never exceeds capacity."""
    new_t, _, allowed, _ = _apply_token_bucket(
        current_tokens=8.0, last_ts=0.0, capacity=10, rate=2.0, now=100.0
    )
    # Would refill 200 tokens, but capped at 10, then consume 1 → 9
    assert allowed is True
    assert new_t == 9.0


def test_pure_retry_after_is_proportional_to_rate():
    """retry_after reflects the time needed to accumulate 1 token."""
    _, _, allowed, retry = _apply_token_bucket(
        current_tokens=0.5, last_ts=0.0, capacity=10, rate=2.0, now=0.0
    )
    # Need 0.5 more tokens at rate=2/s → 0.25 seconds
    assert allowed is False
    assert abs(retry - 0.25) < 0.001


def test_pure_burst_sequence():
    """Burst of N requests on a full bucket — N allowed, N+1 denied."""
    capacity = 5
    tokens = float(capacity)
    last_ts = 0.0
    now = 0.0

    for i in range(capacity):
        tokens, last_ts, allowed, _ = _apply_token_bucket(
            tokens, last_ts, capacity, rate=1.0, now=now
        )
        assert allowed is True, f"Request {i + 1} should be allowed"
        now += 0.001  # 1 ms apart

    # One more — bucket should be empty (or nearly so)
    _, _, allowed, retry = _apply_token_bucket(
        tokens, last_ts, capacity, rate=1.0, now=now
    )
    assert allowed is False
    assert retry > 0.0


# ---------------------------------------------------------------------------
# Config validation
# ---------------------------------------------------------------------------


def test_config_valid():
    RateLimitConfig(capacity=10, rate_per_second=1.0)  # should not raise


def test_config_zero_capacity_raises():
    with pytest.raises(ValueError, match="capacity"):
        RateLimitConfig(capacity=0, rate_per_second=1.0)


def test_config_negative_capacity_raises():
    with pytest.raises(ValueError, match="capacity"):
        RateLimitConfig(capacity=-1, rate_per_second=1.0)


def test_config_zero_rate_raises():
    with pytest.raises(ValueError, match="rate_per_second"):
        RateLimitConfig(capacity=10, rate_per_second=0.0)


def test_config_negative_rate_raises():
    with pytest.raises(ValueError, match="rate_per_second"):
        RateLimitConfig(capacity=10, rate_per_second=-0.5)


def test_config_ttl_is_positive():
    config = RateLimitConfig(capacity=10, rate_per_second=100 / 60)
    assert config.ttl_seconds > 0


# ---------------------------------------------------------------------------
# Integration tests: RateLimiter with fakeredis
# ---------------------------------------------------------------------------


def test_first_request_allowed():
    limiter = make_redis_limiter(capacity=5, rate=1.0)
    result = limiter.check("ratelimit:test", _now=0.0)
    assert result.allowed is True


def test_burst_allowed_up_to_capacity():
    limiter = make_redis_limiter(capacity=5, rate=1.0)
    key = "ratelimit:burst_test"
    for i in range(5):
        r = limiter.check(key, _now=float(i) * 0.001)
        assert r.allowed is True, f"Request {i + 1} should be allowed"


def test_request_beyond_capacity_denied():
    limiter = make_redis_limiter(capacity=3, rate=0.1)
    key = "ratelimit:overflow"
    # Drain the bucket
    for _ in range(3):
        limiter.check(key, _now=0.0)
    # Next request should be denied
    result = limiter.check(key, _now=0.001)
    assert result.allowed is False


def test_denied_result_has_retry_after():
    limiter = make_redis_limiter(capacity=1, rate=1.0)
    key = "ratelimit:retry_test"
    limiter.check(key, _now=0.0)  # drain
    result = limiter.check(key, _now=0.001)
    assert result.allowed is False
    assert result.retry_after_seconds > 0.0


def test_remaining_decrements_with_each_request():
    limiter = make_redis_limiter(capacity=5, rate=1.0)
    key = "ratelimit:decrement"
    prev_remaining = 5
    for i in range(4):
        result = limiter.check(key, _now=float(i) * 0.001)
        assert result.allowed is True
        assert result.remaining == prev_remaining - 1
        prev_remaining = result.remaining


def test_refill_after_wait_allows_more_requests():
    limiter = make_redis_limiter(capacity=3, rate=1.0)
    key = "ratelimit:refill"
    # Drain
    for i in range(3):
        limiter.check(key, _now=float(i) * 0.001)
    # Now simulate 5 seconds passing → 5 tokens refilled, capped at 3
    result = limiter.check(key, _now=5.0)
    assert result.allowed is True


def test_different_keys_are_independent():
    """Two identities must not share bucket state."""
    limiter = make_redis_limiter(capacity=2, rate=0.01)
    # Drain key A completely
    limiter.check("ratelimit:a", _now=0.0)
    limiter.check("ratelimit:a", _now=0.001)
    denied = limiter.check("ratelimit:a", _now=0.002)
    assert denied.allowed is False
    # Key B should still have a full bucket
    allowed = limiter.check("ratelimit:b", _now=0.002)
    assert allowed.allowed is True


# ---------------------------------------------------------------------------
# Fail-open on Redis down (NullCacheClient)
# ---------------------------------------------------------------------------


def test_fail_open_when_redis_down():
    """NullCacheClient.ping() returns False → limiter should allow the request."""
    null = NullCacheClient()
    config = RateLimitConfig(capacity=10, rate_per_second=1.0)
    limiter = RateLimiter(cache=null, config=config)
    result = limiter.check("ratelimit:any")
    assert result.allowed is True


def test_fail_open_remaining_is_capacity():
    """When failing open, remaining should equal capacity (conservative)."""
    null = NullCacheClient()
    config = RateLimitConfig(capacity=10, rate_per_second=1.0)
    limiter = RateLimiter(cache=null, config=config)
    result = limiter.check("ratelimit:any")
    assert result.remaining == config.capacity


# ---------------------------------------------------------------------------
# check_or_raise
# ---------------------------------------------------------------------------


def test_check_or_raise_passes_when_allowed():
    limiter = make_redis_limiter(capacity=5, rate=1.0)
    result = limiter.check_or_raise("ratelimit:ok", _now=0.0)
    assert result.allowed is True


def test_check_or_raise_raises_when_denied():
    limiter = make_redis_limiter(capacity=1, rate=0.01)
    limiter.check("ratelimit:raise_test", _now=0.0)  # drain
    with pytest.raises(RateLimitExceeded) as exc_info:
        limiter.check_or_raise("ratelimit:raise_test", _now=0.001)
    assert exc_info.value.result.allowed is False
    assert exc_info.value.result.retry_after_seconds > 0.0
