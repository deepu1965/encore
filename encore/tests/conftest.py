import socket

import pytest


def is_port_open(host, port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.1)
        try:
            s.connect((host, port))
            return True
        except:  # noqa: E722
            return False

def pytest_runtest_setup(item):
    fspath = str(item.fspath)
    if "tests/e2e" in fspath or "test_short_urls.py" in fspath or "tests/reliability" in fspath:  # noqa: SIM102
        if not is_port_open("localhost", 8000):
            pytest.skip("Live infra (port 8000) is required but not running. Skipping E2E test.")
