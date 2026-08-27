"""encore-rate-limiter — Redis-backed distributed token-bucket rate limiter.

Public surface:
  RateLimitConfig   — capacity + rate configuration (dataclass)
  RateLimitResult   — allowed / remaining / retry_after result (dataclass)
  RateLimiter       — the limiter, backed by a CacheClient
  RateLimitExceeded — exception raised by check_or_raise()

Algorithm: Token Bucket (see limiter.py for full explanation).
Atomicity: Redis Lua script (see lua.py).
Fallback:  Fail-open when Redis is unavailable (NullCacheClient path).
"""

from .limiter import RateLimitConfig, RateLimitExceeded, RateLimitResult, RateLimiter

__all__ = [
    "RateLimitConfig",
    "RateLimitResult",
    "RateLimiter",
    "RateLimitExceeded",
]
