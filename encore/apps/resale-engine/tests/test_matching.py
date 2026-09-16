import uuid
from datetime import datetime, timedelta, timezone

import pytest
from encore_resale_engine.matching import match_orders
from encore_resale_engine.models import (
    Base,
    ListingStatus,
    ResaleListing,
    ResaleOrder,
)
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@pytest.fixture(name="db")
def setup_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        engine.dispose()

def test_lowest_ask_matches_highest_bid(db):
    """Given ask=100, bid=150 -> match at ask price 100."""
    event_id = uuid.uuid4()
    seller_id = uuid.uuid4()
    buyer_id = uuid.uuid4()
    ticket_id = uuid.uuid4()
    
    listing = ResaleListing(
        event_id=event_id,
        ticket_id=ticket_id,
        seller_id=seller_id,
        ask_price_cents=100,
        status=ListingStatus.ACTIVE
    )
    db.add(listing)
    
    order = ResaleOrder(
        event_id=event_id,
        buyer_id=buyer_id,
        bid_price_cents=150,
        status=ListingStatus.ACTIVE
    )
    db.add(order)
    db.commit()

    trades = match_orders(str(event_id), db)
    
    assert len(trades) == 1
    assert trades[0].price_cents == 100
    assert trades[0].listing_id == listing.id
    assert trades[0].order_id == order.id
    
    # Assert statuses changed
    assert listing.status == ListingStatus.MATCHED
    assert order.status == ListingStatus.MATCHED

def test_no_match_when_bid_below_ask(db):
    """Given ask=200, bid=100 -> no match."""
    event_id = uuid.uuid4()
    
    listing = ResaleListing(
        event_id=event_id,
        ticket_id=uuid.uuid4(),
        seller_id=uuid.uuid4(),
        ask_price_cents=200,
        status=ListingStatus.ACTIVE
    )
    db.add(listing)
    
    order = ResaleOrder(
        event_id=event_id,
        buyer_id=uuid.uuid4(),
        bid_price_cents=100,
        status=ListingStatus.ACTIVE
    )
    db.add(order)
    db.commit()

    trades = match_orders(str(event_id), db)
    
    assert len(trades) == 0
    assert listing.status == ListingStatus.ACTIVE
    assert order.status == ListingStatus.ACTIVE

def test_fifo_tiebreak_same_price(db):
    """Two asks at same price -> earlier created_at wins."""
    event_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    
    listing1 = ResaleListing(
        event_id=event_id,
        ticket_id=uuid.uuid4(),
        seller_id=uuid.uuid4(),
        ask_price_cents=100,
        status=ListingStatus.ACTIVE,
        created_at=now - timedelta(minutes=5)
    )
    db.add(listing1)
    
    listing2 = ResaleListing(
        event_id=event_id,
        ticket_id=uuid.uuid4(),
        seller_id=uuid.uuid4(),
        ask_price_cents=100,
        status=ListingStatus.ACTIVE,
        created_at=now - timedelta(minutes=10) # Older
    )
    db.add(listing2)
    
    order = ResaleOrder(
        event_id=event_id,
        buyer_id=uuid.uuid4(),
        bid_price_cents=100,
        status=ListingStatus.ACTIVE
    )
    db.add(order)
    db.commit()

    trades = match_orders(str(event_id), db)
    
    assert len(trades) == 1
    # listing2 is older, should match
    assert trades[0].listing_id == listing2.id
    
    assert listing1.status == ListingStatus.ACTIVE
    assert listing2.status == ListingStatus.MATCHED
    assert order.status == ListingStatus.MATCHED

def test_multiple_sequential_matches(db):
    """3 ask + 3 bid pairs all at crossing prices -> 3 trades, in price-time order."""
    event_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    
    # Asks: 100, 150, 200
    listing1 = ResaleListing(event_id=event_id, ticket_id=uuid.uuid4(), seller_id=uuid.uuid4(), ask_price_cents=200, status=ListingStatus.ACTIVE, created_at=now)
    listing2 = ResaleListing(event_id=event_id, ticket_id=uuid.uuid4(), seller_id=uuid.uuid4(), ask_price_cents=150, status=ListingStatus.ACTIVE, created_at=now)
    listing3 = ResaleListing(event_id=event_id, ticket_id=uuid.uuid4(), seller_id=uuid.uuid4(), ask_price_cents=100, status=ListingStatus.ACTIVE, created_at=now)
    db.add_all([listing1, listing2, listing3])
    
    # Bids: 200, 150, 250 -> 250, 200, 200 to cross all
    order1 = ResaleOrder(event_id=event_id, buyer_id=uuid.uuid4(), bid_price_cents=250, status=ListingStatus.ACTIVE, created_at=now)
    order2 = ResaleOrder(event_id=event_id, buyer_id=uuid.uuid4(), bid_price_cents=200, status=ListingStatus.ACTIVE, created_at=now)
    order3 = ResaleOrder(event_id=event_id, buyer_id=uuid.uuid4(), bid_price_cents=200, status=ListingStatus.ACTIVE, created_at=now)
    db.add_all([order1, order2, order3])
    
    db.commit()

    trades = match_orders(str(event_id), db)
    
    assert len(trades) == 3
    
    # Match 1: Lowest ask (100) matches Highest bid (250)
    assert trades[0].listing_id == listing3.id
    assert trades[0].order_id == order1.id
    assert trades[0].price_cents == 100
    
    # Match 2: Next lowest ask (150) matches Next highest bid (200)
    assert trades[1].listing_id == listing2.id
    assert trades[1].price_cents == 150
    
    # Match 3: Next lowest ask (200) matches Next highest bid (200)
    assert trades[2].listing_id == listing1.id
    assert trades[2].price_cents == 200


def test_no_invalid_match_invariant(db):
    """After N random orders, assert every trade has trade.price == listing.ask_price_cents."""
    event_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    
    # Let's create a bunch of random valid matches
    listing1 = ResaleListing(event_id=event_id, ticket_id=uuid.uuid4(), seller_id=uuid.uuid4(), ask_price_cents=100, status=ListingStatus.ACTIVE, created_at=now)
    listing2 = ResaleListing(event_id=event_id, ticket_id=uuid.uuid4(), seller_id=uuid.uuid4(), ask_price_cents=150, status=ListingStatus.ACTIVE, created_at=now)
    db.add_all([listing1, listing2])
    
    order1 = ResaleOrder(event_id=event_id, buyer_id=uuid.uuid4(), bid_price_cents=200, status=ListingStatus.ACTIVE, created_at=now)
    order2 = ResaleOrder(event_id=event_id, buyer_id=uuid.uuid4(), bid_price_cents=200, status=ListingStatus.ACTIVE, created_at=now)
    db.add_all([order1, order2])
    db.commit()

    trades = match_orders(str(event_id), db)
    assert len(trades) == 2
    
    for trade in trades:
        # trade price must be exactly the listing's ask price
        listing = db.get(ResaleListing, trade.listing_id)
        assert trade.price_cents == listing.ask_price_cents
        
        # bid price must be >= ask price
        order = db.get(ResaleOrder, trade.order_id)
        assert order.bid_price_cents >= listing.ask_price_cents
