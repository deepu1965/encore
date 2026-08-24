"""Health-check helper.

Every service exposes GET /health per the repo's operational conventions.
This gives a single, testable place for the "am I up" logic rather than
each service inventing its own shape.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class HealthStatus(str, Enum):
    OK = "ok"
    DEGRADED = "degraded"
    DOWN = "down"


@dataclass
class HealthResult:
    status: HealthStatus
    service: str
    checks: dict[str, bool] = field(default_factory=dict)

    def as_dict(self) -> dict:
        return {
            "status": self.status.value,
            "service": self.service,
            "checks": self.checks,
        }


def health_check(service: str, dependency_checks: dict[str, bool] | None = None) -> HealthResult:
    """Aggregate dependency checks into a single health status.

    Args:
        service: Name of the calling service, e.g. "inventory-service".
        dependency_checks: Map of dependency name -> bool (True = healthy).
            Empty/None means "no external dependencies to check" -> OK.
    """
    checks = dependency_checks or {}

    if not checks:
        return HealthResult(status=HealthStatus.OK, service=service, checks=checks)

    if all(checks.values()):
        status = HealthStatus.OK
    elif any(checks.values()):
        status = HealthStatus.DEGRADED
    else:
        status = HealthStatus.DOWN

    return HealthResult(status=status, service=service, checks=checks)
