import pytest
from unittest.mock import MagicMock
import uuid
from datetime import datetime, timezone
from encore_resale_engine.models import ResaleListing, ResaleOrder, ListingStatus
from encore_resale_engine.matching import match_orders

def test_match_orders_no_match():
    # Setup mock DB session
    db_mock = MagicMock()
    
    # Return a listing but no matching order (bid too low)
    mock_listing = ResaleListing(
        id=uuid.uuid4(),
        event_id=uuid.uuid4(),
        ask_price_cents=5000,
        status=ListingStatus.ACTIVE,
        created_at=datetime.now(timezone.utc)
    )
    
    # DB execute mock setup
    # 1st call: listing query -> returns mock_listing
    # 2nd call: order query -> returns None
    # 3rd call: loop breaks
    
    mock_result_1 = MagicMock()
    mock_result_1.scalar_one_or_none.return_value = mock_listing
    
    mock_result_2 = MagicMock()
    mock_result_2.scalar_one_or_none.return_value = None
    
    db_mock.execute.side_effect = [mock_result_1, mock_result_2, mock_result_1, mock_result_2]

    trades = match_orders(str(uuid.uuid4()), db_mock)
    
    assert len(trades) == 0
    assert mock_listing.status == ListingStatus.ACTIVE

def test_match_orders_successful_match():
    db_mock = MagicMock()
    event_id = uuid.uuid4()
    
    mock_listing = ResaleListing(
        id=uuid.uuid4(),
        event_id=event_id,
        ask_price_cents=4500,
        status=ListingStatus.ACTIVE,
        created_at=datetime.now(timezone.utc)
    )
    
    mock_order = ResaleOrder(
        id=uuid.uuid4(),
        event_id=event_id,
        bid_price_cents=5000,
        status=ListingStatus.ACTIVE,
        created_at=datetime.now(timezone.utc)
    )
    
    # 1st loop: listing found, order found -> match -> trade
    # 2nd loop: listing None -> break
    
    mock_result_list = MagicMock()
    mock_result_list.scalar_one_or_none.side_effect = [mock_listing, None]
    
    mock_result_order = MagicMock()
    mock_result_order.scalar_one_or_none.return_value = mock_order
    
    db_mock.execute.side_effect = [mock_result_list, mock_result_order, mock_result_list]
    
    trades = match_orders(str(event_id), db_mock)
    
    assert len(trades) == 1
    assert trades[0].price_cents == 4500
    assert trades[0].listing_id == mock_listing.id
    assert trades[0].order_id == mock_order.id
    
    assert mock_listing.status == ListingStatus.MATCHED
    assert mock_order.status == ListingStatus.MATCHED
    
    assert db_mock.add.called
    assert db_mock.flush.called
