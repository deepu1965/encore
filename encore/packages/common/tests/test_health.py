from encore_common import HealthStatus, health_check


def test_health_ok_with_no_dependencies():
    result = health_check("api-gateway")
    assert result.status == HealthStatus.OK
    assert result.dependencies == {}


def test_health_ok_when_all_dependencies_healthy():
    result = health_check("inventory-service", {"postgres": True, "redis": True})
    assert result.status == HealthStatus.OK


def test_health_degraded_when_some_dependencies_down():
    result = health_check("inventory-service", non_critical_deps={"postgres": True, "redis": False})
    assert result.status == HealthStatus.DEGRADED


def test_health_down_when_all_dependencies_down():
    result = health_check("inventory-service", {"postgres": False, "redis": False})
    assert result.status == HealthStatus.DOWN


def test_as_dict_serializes_status_value_not_enum():
    result = health_check("chat-service")
    d = result.as_dict()
    assert d["status"] == "ok"
    assert d["service"] == "chat-service"
