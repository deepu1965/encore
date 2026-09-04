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
    dependencies: dict[str, str] = field(default_factory=dict)
    http_code: int = 200

    def as_dict(self) -> dict:
        return {
            "status": self.status.value,
            "service": self.service,
            "dependencies": self.dependencies,
        }


def health_check(
    service: str, 
    critical_deps: dict[str, bool] | None = None,
    non_critical_deps: dict[str, bool] | None = None
) -> HealthResult:
    """Aggregate dependency checks into a single health status.

    Args:
        service: Name of the calling service, e.g. "inventory-service".
        critical_deps: Map of critical dependency name -> bool (True = healthy). If any is False, status=DOWN, code=503.
        non_critical_deps: Map of non-critical dependency name -> bool. If any is False, status=DEGRADED, code=200.
    """
    critical_deps = critical_deps or {}
    non_critical_deps = non_critical_deps or {}
    
    dependencies = {}
    for name, is_ok in critical_deps.items():
        dependencies[name] = "ok" if is_ok else "down"
    for name, is_ok in non_critical_deps.items():
        dependencies[name] = "ok" if is_ok else "degraded"

    if not critical_deps and not non_critical_deps:
        return HealthResult(status=HealthStatus.OK, service=service, dependencies=dependencies, http_code=200)

    # Check critical first
    if any(not is_ok for is_ok in critical_deps.values()):
        return HealthResult(status=HealthStatus.DOWN, service=service, dependencies=dependencies, http_code=503)

    # Check non-critical
    if any(not is_ok for is_ok in non_critical_deps.values()):
        return HealthResult(status=HealthStatus.DEGRADED, service=service, dependencies=dependencies, http_code=200)

    return HealthResult(status=HealthStatus.OK, service=service, dependencies=dependencies, http_code=200)
