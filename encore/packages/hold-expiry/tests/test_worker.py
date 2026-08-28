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
        dbapi_connection.create_function("NOW", 0, lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())

from sqlalchemy.engine import Engine

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
    return eng


@pytest.fixture
def worker(engine: Engine) -> HoldExpiryWorker:
    return HoldExpiryWorker(
        engine=engine,
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
        future = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=10)).isoformat()
        conn.execute(
            text(
                "INSERT INTO inventory (id, event_id, seat_id, status, held_by_user_id, hold_expires_at) "
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
        past = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=10)).isoformat()
        conn.execute(
            text(
                "INSERT INTO inventory (id, event_id, seat_id, status, held_by_user_id, held_at, hold_expires_at) "
                f"VALUES ('3', 'e1', 's3', 'HELD', 'u1', '2020-01-01', '{past}')"
            )
        )
        
    count = worker._tick()
    assert count == 1
    
    # Verify row was reset
    with engine.begin() as conn:
        row = conn.execute(text("SELECT status, held_by_user_id, held_at, hold_expires_at FROM inventory WHERE id = '3'")).fetchone()
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
