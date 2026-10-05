import uuid
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from encore_resale_engine.main import app
from encore_resale_engine.db import get_db
from encore_resale_engine.models import (
    Base,
    ListingStatus,
    ResaleListing,
    ResaleOrder,
    ResaleTrade,
)


@pytest.fixture(name="db_session")
def setup_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture(name="client")
def setup_client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_health_check(client):
    res = client.get("/api/v1/resale/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["service"] == "resale-engine"


def test_get_listings_by_event(client, db_session):
    event_id = uuid.uuid4()
    seller_id = uuid.uuid4()
    ticket_id = uuid.uuid4()

    listing = ResaleListing(
        id=uuid.uuid4(),
        event_id=event_id,
        ticket_id=ticket_id,
        seller_id=seller_id,
        ask_price_cents=2500,
        status=ListingStatus.ACTIVE,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(listing)
    db_session.commit()

    res = client.get(f"/api/v1/resale/listings/by-event/{event_id}")
    assert res.status_code == 200
    data = res.json()
    items = data["items"]
    assert len(items) == 1
    assert items[0]["id"] == str(listing.id)
    assert items[0]["ask_price_cents"] == 2500
    assert items[0]["status"] == "ACTIVE"


def test_get_listing_by_id(client, db_session):
    listing_id = uuid.uuid4()
    listing = ResaleListing(
        id=listing_id,
        event_id=uuid.uuid4(),
        ticket_id=uuid.uuid4(),
        seller_id=uuid.uuid4(),
        ask_price_cents=4500,
        status=ListingStatus.ACTIVE,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(listing)
    db_session.commit()

    res = client.get(f"/api/v1/resale/listings/{listing_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == str(listing_id)
    assert data["ask_price_cents"] == 4500


def test_get_trade_by_id(client, db_session):
    trade_id = uuid.uuid4()
    event_id = uuid.uuid4()
    listing_id = uuid.uuid4()
    order_id = uuid.uuid4()

    trade = ResaleTrade(
        id=trade_id,
        event_id=event_id,
        listing_id=listing_id,
        order_id=order_id,
        price_cents=3000,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(trade)
    db_session.commit()

    res = client.get(f"/api/v1/resale/trades/{trade_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == str(trade_id)
    assert data["price_cents"] == 3000
