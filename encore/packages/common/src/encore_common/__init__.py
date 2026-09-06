"""Shared primitives used by every Encore service.

Kept intentionally minimal in Week 1: just the response envelope and a
health-check helper, both required by every service from the moment it
exists. Anything domain-specific (ids, event contracts, auth, rate
limiting, observability) lives in its own sibling package, not here —
see docs/architecture/service-boundaries.md.
"""

from .envelope import error_envelope, success_envelope
from .health import HealthResult, HealthStatus, health_check
from .observability import setup_observability

__all__ = [
    "HealthResult",
    "HealthStatus",
    "error_envelope",
    "health_check",
    "success_envelope",
    "setup_observability",
]
