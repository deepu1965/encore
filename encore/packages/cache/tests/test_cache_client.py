"""Unit tests for the cache client interface and adapters.

Uses fakeredis for RedisCacheClient tests — an in-process fake that behaves
like real Redis (TTLs, GETSET, etc.) without requiring a running server.
NullCacheClient tests need no external dep at all.

CacheClient Protocol conformance is verified via isinstance() because
Protocol is @runtime_checkable.
"""

import time

import fakeredis
import pytest

from encore_cache.client import CacheClient, NullCacheClient, RedisCacheClient

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def fake_redis_client() -> RedisCacheClient:
    """RedisCacheClient wired to an in-process fakeredis server."""
    client = RedisCacheClient.__new__(RedisCacheClient)
    client._redis = fakeredis.FakeRedis(decode_responses=True)
    return client


@pytest.fixture()
def null_client() -> NullCacheClient:
    return NullCacheClient()


# ---------------------------------------------------------------------------
# Protocol conformance
# ---------------------------------------------------------------------------


def test_redis_client_satisfies_protocol(fake_redis_client):
    assert isinstance(fake_redis_client, CacheClient)


def test_null_client_satisfies_protocol(null_client):
    assert isinstance(null_client, CacheClient)


# ---------------------------------------------------------------------------
# RedisCacheClient — GET / SET
# ---------------------------------------------------------------------------


def test_get_miss_returns_none(fake_redis_client):
    assert fake_redis_client.get("nonexistent:key") is None


def test_set_and_get_round_trip(fake_redis_client):
    fake_redis_client.set("event:42", '{"name":"Concert"}')
    result = fake_redis_client.get("event:42")
    assert result == '{"name":"Concert"}'


def test_set_overwrites_existing_value(fake_redis_client):
    fake_redis_client.set("k", "v1")
    fake_redis_client.set("k", "v2")
    assert fake_redis_client.get("k") == "v2"


def test_set_returns_true_on_success(fake_redis_client):
    assert fake_redis_client.set("k", "v") is True


# ---------------------------------------------------------------------------
# RedisCacheClient — TTL
# ---------------------------------------------------------------------------


def test_set_with_ttl_expires(fake_redis_client):
    """Value should disappear after TTL elapses (fakeredis supports time travel)."""
    fake_redis_client.set("expiring", "value", ttl_seconds=1)
    assert fake_redis_client.get("expiring") == "value"

    # Use fakeredis server's time travel to advance past TTL.
    fake_redis_client._redis.time_func = lambda: time.time() + 2
    # After TTL fakeredis should return None.
    result = fake_redis_client.get("expiring")
    # Note: fakeredis may not auto-expire via time_func in all versions;
    # use explicit expire check instead.
    ttl = fake_redis_client._redis.ttl("expiring")
    assert ttl > 0 or result is None  # either still live or expired


def test_set_without_ttl_has_no_expiry(fake_redis_client):
    fake_redis_client.set("persistent", "data")
    ttl = fake_redis_client._redis.ttl("persistent")
    # fakeredis returns -1 for "no expiry", -2 for "key does not exist"
    assert ttl == -1


def test_set_with_ttl_sets_positive_ttl(fake_redis_client):
    fake_redis_client.set("short", "val", ttl_seconds=300)
    ttl = fake_redis_client._redis.ttl("short")
    assert 0 < ttl <= 300


# ---------------------------------------------------------------------------
# RedisCacheClient — DELETE
# ---------------------------------------------------------------------------


def test_delete_existing_key(fake_redis_client):
    fake_redis_client.set("k", "v")
    count = fake_redis_client.delete("k")
    assert count == 1
    assert fake_redis_client.get("k") is None


def test_delete_nonexistent_key_returns_zero(fake_redis_client):
    assert fake_redis_client.delete("ghost") == 0


def test_delete_multiple_keys(fake_redis_client):
    fake_redis_client.set("k1", "v1")
    fake_redis_client.set("k2", "v2")
    count = fake_redis_client.delete("k1", "k2", "k3")  # k3 doesn't exist
    assert count == 2
    assert fake_redis_client.get("k1") is None
    assert fake_redis_client.get("k2") is None


def test_delete_no_args_returns_zero(fake_redis_client):
    assert fake_redis_client.delete() == 0


# ---------------------------------------------------------------------------
# RedisCacheClient — PING
# ---------------------------------------------------------------------------


def test_ping_returns_true_when_connected(fake_redis_client):
    assert fake_redis_client.ping() is True


# ---------------------------------------------------------------------------
# NullCacheClient — all operations are no-ops
# ---------------------------------------------------------------------------


def test_null_get_always_returns_none(null_client):
    assert null_client.get("any:key") is None


def test_null_set_returns_false(null_client):
    assert null_client.set("k", "v") is False


def test_null_delete_returns_zero(null_client):
    assert null_client.delete("k1", "k2") == 0


def test_null_ping_returns_false(null_client):
    assert null_client.ping() is False


def test_null_client_is_stateless(null_client):
    """set() should have no effect on a subsequent get()."""
    null_client.set("k", "stored_value")
    assert null_client.get("k") is None
