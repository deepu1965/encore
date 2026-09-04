import logging
from sqlalchemy import select
from sqlalchemy.orm import Session
from .models import ResaleListing, ResaleOrder, ListingStatus, ResaleTrade

logger = logging.getLogger(__name__)

def match_orders(event_id_str: str, db: Session) -> list[ResaleTrade]:
    trades = []
    
    while True:
        listing = db.execute(
            select(ResaleListing)
            .where(ResaleListing.event_id == event_id_str, ResaleListing.status == ListingStatus.ACTIVE)
            .order_by(ResaleListing.ask_price_cents.asc(), ResaleListing.created_at.asc())
            .with_for_update(skip_locked=True)
            .limit(1)
        ).scalar_one_or_none()

        if not listing:
            break

        order = db.execute(
            select(ResaleOrder)
            .where(
                ResaleOrder.event_id == event_id_str, 
                ResaleOrder.status == ListingStatus.ACTIVE,
                ResaleOrder.bid_price_cents >= listing.ask_price_cents
            )
            .order_by(ResaleOrder.bid_price_cents.desc(), ResaleOrder.created_at.asc())
            .with_for_update(skip_locked=True)
            .limit(1)
        ).scalar_one_or_none()

        if not order:
            break

        match_price = listing.ask_price_cents
        
        listing.status = ListingStatus.MATCHED
        order.status = ListingStatus.MATCHED
        
        trade = ResaleTrade(
            event_id=event_id_str,
            listing_id=listing.id,
            order_id=order.id,
            price_cents=match_price
        )
        db.add(trade)
        db.flush()
        
        trades.append(trade)
        
    return trades
