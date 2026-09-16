"""Tests for HoldExpiryWorker.

Since the worker uses PostgreSQL's pg_try_advisory_xact_lock, we need to test
it against an engine that supports or mocks that function. For these unit tests,
we use an in-memory SQLite database and inject a Python function to mock the
Postgres lock function.
"""

from __future__ import annotations

import datetime
from sqlite3 import Connection as SQLite3Connection
from typing import Any

import pytest
from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.pool import StaticPool

from encore_hold_expiry.worker import HoldExpiryWorker

# ─── SQLite setup ────────────────────────────────────────────────────────────

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection: Any, connection_record: Any) -> None:
    if isinstance(dbapi_connection, SQLite3Connection):
        # Create a mock for pg_try_advisory_xact_lock that always returns True
        dbapi_connection.create_function("pg_try_advisory_xact_lock", 1, lambda lock_id: True)
        # Mock NOW() -> CURRENT_TIMESTAMP for SQLite
        dbapi_connection.create_function("NOW", 0, lambda: datetime.datetime.now(datetime.UTC).isoformat())  # noqa: E501

from sqlalchemy.engine import Engine  # noqa: E402


@pytest.fixture
def engine() -> Engine:
    """Create an in-memory SQLite engine with the mocked PG functions."""
    eng = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    
    # Ensure the event listener above is active
    
    # Create the inventory table
    with eng.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE inventory (
                    id TEXT PRIMARY KEY,
                    event_id TEXT,
                    seat_id TEXT,
                    status TEXT,
                    price_cents INTEGER,
                    held_by_user_id TEXT,
                    held_at TEXT,
                    hold_expires_at TEXT,
                    updated_at TEXT
                )
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE orders (
                    id TEXT PRIMARY KEY,
                    event_id TEXT,
                    user_id TEXT,
                    status TEXT,
                    total_cents INTEGER,
                    idempotency_key TEXT,
                    created_at TEXT
                )
                """
            )
        )
    return eng


@pytest.fixture
def worker(engine: Engine) -> HoldExpiryWorker:
    return HoldExpiryWorker(
        primary_engine=engine,
        shard_engines=[engine],
        producer=None,
        poll_interval_secs=10,
    )


# ─── Tests ───────────────────────────────────────────────────────────────────

def test_tick_no_expired_holds(engine: Engine, worker: HoldExpiryWorker) -> None:
    with engine.begin() as conn:
        # Insert an AVAILABLE seat
        conn.execute(
            text(
                "INSERT INTO inventory (id, event_id, seat_id, status) "
                "VALUES ('1', 'e1', 's1', 'AVAILABLE')"
            )
        )
        # Insert a HELD seat expiring in the future
        future = (datetime.datetime.now(datetime.UTC) + datetime.timedelta(minutes=10)).isoformat()
        conn.execute(
            text(
                "INSERT INTO inventory (id, event_id, seat_id, status, held_by_user_id, hold_expires_at) "  # noqa: E501
                f"VALUES ('2', 'e1', 's2', 'HELD', 'u1', '{future}')"
            )
        )
        
    count = worker._tick()
    assert count == 0
    
    # Verify status unchanged
    with engine.begin() as conn:
        res = conn.execute(text("SELECT status FROM inventory WHERE id = '2'")).scalar()
        assert res == "HELD"


def test_tick_expires_past_holds(engine: Engine, worker: HoldExpiryWorker) -> None:
    with engine.begin() as conn:
        # Insert a HELD seat that has expired
        past = (datetime.datetime.now(datetime.UTC) - datetime.timedelta(minutes=10)).isoformat()
        conn.execute(
            text(
                "INSERT INTO inventory (id, event_id, seat_id, status, held_by_user_id, held_at, hold_expires_at) "  # noqa: E501
                f"VALUES ('3', 'e1', 's3', 'HELD', 'u1', '2020-01-01', '{past}')"
            )
        )
        
    count = worker._tick()
    assert count == 1
    
    # Verify row was reset
    with engine.begin() as conn:
        row = conn.execute(text("SELECT status, held_by_user_id, held_at, hold_expires_at FROM inventory WHERE id = '3'")).fetchone()  # noqa: E501
        assert row is not None
        assert row[0] == "AVAILABLE"
        assert row[1] is None  # held_by_user_id
        assert row[2] is None  # held_at
        assert row[3] is None  # hold_expires_at


def test_tick_ignores_null_expires_at(engine: Engine, worker: HoldExpiryWorker) -> None:
    with engine.begin() as conn:
        # Insert a HELD seat with NO expiry (from Week 2 code)
        conn.execute(
            text(
                "INSERT INTO inventory (id, event_id, seat_id, status, held_by_user_id) "
                "VALUES ('4', 'e1', 's4', 'HELD', 'u1')"
            )
        )
        
    count = worker._tick()
    assert count == 0
    
    with engine.begin() as conn:
        res = conn.execute(text("SELECT status FROM inventory WHERE id = '4'")).scalar()
        assert res == "HELD"


class _FakeRedis:
    """Minimal Redis stand-in for testing key deletion."""

    def __init__(self) -> None:
        self.deleted: list[str] = []

    def delete(self, *keys: str) -> int:
        self.deleted.extend(keys)
        return len(keys)


def test_tick_deletes_redis_keys_on_expiry(engine: Engine) -> None:
    """When a hold expires, the worker deletes both the hold lock and status cache keys."""
    fake_redis = _FakeRedis()
    worker_with_redis = HoldExpiryWorker(
        primary_engine=engine,
        shard_engines=[engine],
        producer=None,
        poll_interval_secs=10,
        redis_client=fake_redis,
    )

    with engine.begin() as conn:
        past = (datetime.datetime.now(datetime.UTC) - datetime.timedelta(minutes=5)).isoformat()
        conn.execute(
            text(
                "INSERT INTO inventory (id, event_id, seat_id, status, held_by_user_id, held_at, hold_expires_at) "  # noqa: E501
                f"VALUES ('5', 'event-X', 'seat-Y', 'HELD', 'u2', '2020-01-01', '{past}')"
            )
        )

    count = worker_with_redis._tick()
    assert count == 1

    # Both hold lock key and status key must have been deleted
    assert "hold:event-X:seat-Y" in fake_redis.deleted
    assert "inventory:5:status" in fake_redis.deleted


def test_tick_no_redis_keys_deleted_when_no_expiry(engine: Engine) -> None:
    """Worker does not call redis.delete when there are no expired holds."""
    fake_redis = _FakeRedis()
    worker_with_redis = HoldExpiryWorker(
        primary_engine=engine,
        shard_engines=[engine],
        producer=None,
        poll_interval_secs=10,
        redis_client=fake_redis,
    )

    with engine.begin() as conn:
        future = (datetime.datetime.now(datetime.UTC) + datetime.timedelta(minutes=10)).isoformat()
        conn.execute(
            text(
                "INSERT INTO inventory (id, event_id, seat_id, status, held_by_user_id, hold_expires_at) "  # noqa: E501
                f"VALUES ('6', 'event-Z', 'seat-W', 'HELD', 'u3', '{future}')"
            )
        )

    count = worker_with_redis._tick()
    assert count == 0
    assert fake_redis.deleted == []

def test_tick_expires_pending_orders_tied_to_expired_holds(engine: Engine, worker: HoldExpiryWorker) -> None:  # noqa: E501
    """When a hold expires, any PENDING orders for that event/user are marked EXPIRED."""
    with engine.begin() as conn:
        past = (datetime.datetime.now(datetime.UTC) - datetime.timedelta(minutes=5)).isoformat()
        conn.execute(
            text(
                "INSERT INTO inventory (id, event_id, seat_id, status, held_by_user_id, hold_expires_at) "  # noqa: E501
                f"VALUES ('7', 'event-ORD', 'seat-ORD', 'HELD', 'u-ord', '{past}')"
            )
        )
        conn.execute(
            text(
                "INSERT INTO orders (id, event_id, user_id, status, total_cents, idempotency_key) "
                "VALUES ('order-1', 'event-ORD', 'u-ord', 'PENDING', 1000, 'idem-1')"
            )
        )

    count = worker._tick()
    assert count == 1

    with engine.connect() as conn:
        row = conn.execute(text("SELECT status FROM orders WHERE id = 'order-1'")).fetchone()
        assert row is not None
        assert row[0] == "EXPIRED"

