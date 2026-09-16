"""Concurrency correctness test for the two-layer hold path (Redis SETNX + Postgres FOR UPDATE).

Uses threading to simulate N concurrent hold attempts on the same seat.
Asserts that exactly ONE succeeds (status 201) and all others fail (status 409).
Runs against in-memory SQLite + fakeredis — no live infra required.
"""

import threading
import uuid
from sqlite3 import Connection as SQLite3Connection
from unittest.mock import MagicMock

import fakeredis
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.engine import Engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from encore_gateway.auth import get_current_user
from encore_gateway.cache import get_cache
from encore_gateway.main import app
from encore_gateway.models import Event, Inventory, InventoryStatus, Order, Ticket


@compiles(TSVECTOR, 'sqlite')
def compile_tsvector(element, compiler, **kw):
    return "TEXT"

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if isinstance(dbapi_connection, SQLite3Connection):
        # We need a dummy pg_try_advisory_xact_lock for tests that might call it
        dbapi_connection.create_function("pg_try_advisory_xact_lock", 1, lambda lock_id: True)
        dbapi_connection.create_function("NOW", 0, lambda: "2020-01-01T00:00:00Z")
        dbapi_connection.create_function("GeomFromEWKT", 1, lambda geom: geom)

def test_hold_seat_concurrency():
    # 1. Setup SQLite
    import os
    db_path = "sqlite:///test_concurrency.db"
    if os.path.exists("test_concurrency.db"):
        os.remove("test_concurrency.db")
    engine = create_engine(
        db_path,
        connect_args={"check_same_thread": False, "timeout": 30},
        poolclass=StaticPool,
    )
    # Patch geoalchemy2 to prevent RecoverGeometryColumn on sqlite
    import geoalchemy2.admin.dialects.sqlite
    geoalchemy2.admin.dialects.sqlite.after_create = lambda *args, **kwargs: None

    # Only create tables we need to avoid PostGIS/GeoAlchemy issues
    from encore_gateway.models import IdempotencyRecord, Seat, Venue
    Venue.__table__.create(bind=engine)
    Seat.__table__.create(bind=engine)
    Event.__table__.create(bind=engine)
    Inventory.__table__.create(bind=engine)
    Order.__table__.create(bind=engine)
    Ticket.__table__.create(bind=engine)
    IdempotencyRecord.__table__.create(bind=engine)
    
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # 2. Setup initial data
    db = TestingSessionLocal()
    venue_id = uuid.uuid4()
    event_id = uuid.uuid4()
    seat_id = "A1"  # noqa: F841
    
    import datetime

    from encore_gateway.models import Seat, Venue
    
    venue = Venue(id=venue_id, name="Test Venue", city="Test City", timezone="UTC")
    db.add(venue)
    db.commit()
    
    seat = Seat(id=uuid.uuid4(), venue_id=venue_id, section="A", row_label="1", seat_number="A1")
    db.add(seat)
    db.commit()
    
    seat_id_str = str(seat.id)
    
    evt = Event(id=event_id, venue_id=venue_id, name="Test Event", starts_at=datetime.datetime.now(datetime.UTC))  # noqa: E501
    inv = Inventory(id=uuid.uuid4(), event_id=event_id, seat_id=seat.id, status=InventoryStatus.AVAILABLE, price_cents=1000)  # noqa: E501
    db.add(evt)
    db.add(inv)
    db.commit()
    db.close()
    
    def override_get_shard_db_for_hold():
        try:
            db = TestingSessionLocal()
            yield db
        finally:
            db.close()
            
    # 3. Setup FakeRedis
    fake_redis_client = fakeredis.FakeRedis(decode_responses=False)
    mock_cache = MagicMock()
    mock_cache._redis = fake_redis_client
    mock_cache.redis_client = fake_redis_client
    
    def override_get_cache():
        return mock_cache
        
    def override_get_current_user():
        user = MagicMock()
        user.id = uuid.uuid4()
        return user
        
    # Patch save_idempotent_response to avoid SQLite lock contention on inserts
    from unittest.mock import patch
    patcher1 = patch("encore_gateway.routers.holds.save_idempotent_response")
    patcher1.start()
    patcher2 = patch("encore_gateway.routers.holds.get_idempotent_response", return_value=None)
    patcher2.start()
        
    from encore_gateway.routers.holds import get_shard_db_for_hold
    app.dependency_overrides[get_shard_db_for_hold] = override_get_shard_db_for_hold
    app.dependency_overrides[get_cache] = override_get_cache
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    client = TestClient(app)
    
    # 4. Run concurrent requests
    CONCURRENT_REQUESTS = 10
    results = []
    
    def hold_seat_request(i):
        try:
            response = client.post(
                "/api/v1/holds",
                json={
                    "event_id": str(event_id),
                    "seat_id": seat_id_str
                },
                headers={
                    "Idempotency-Key": f"test-idemp-{i}"
                }
            )
            results.append(response.status_code)
        except Exception as e:
            print("Error in thread:", e)
            
    threads = []
    for i in range(CONCURRENT_REQUESTS):
        t = threading.Thread(target=hold_seat_request, args=(i,))
        threads.append(t)
        
    for t in threads:
        t.start()
        
    for t in threads:
        t.join()
        
    app.dependency_overrides.clear()
    
    # 5. Verify exactly 1 success (201) and all others fail (409)
    successes = [r for r in results if r == 201]
    conflicts = [r for r in results if r == 409]
    
    assert len(successes) == 1, f"Expected exactly 1 success, got {len(successes)}. Results: {results}"  # noqa: E501
    assert len(conflicts) == CONCURRENT_REQUESTS - 1, f"Expected {CONCURRENT_REQUESTS - 1} conflicts, got {len(conflicts)}"  # noqa: E501
