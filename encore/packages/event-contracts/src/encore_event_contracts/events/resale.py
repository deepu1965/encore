from dataclasses import dataclass
from typing import Any

RESALE_LISTING_CREATED_EVENT_TYPE = "resale.listing.created"
RESALE_LISTING_CREATED_TOPIC = "resale.listing"
RESALE_LISTING_CREATED_VERSION = 1

RESALE_ORDER_CREATED_EVENT_TYPE = "resale.order.created"
RESALE_ORDER_CREATED_TOPIC = "resale.order"
RESALE_ORDER_CREATED_VERSION = 1

RESALE_TRADE_MATCHED_EVENT_TYPE = "resale.trade.matched"
RESALE_TRADE_MATCHED_TOPIC = "resale.trade"
RESALE_TRADE_MATCHED_VERSION = 1

@dataclass
class ResaleListingCreatedPayload:
    listing_id: str
    event_id: str
    ticket_id: str
    seller_id: str
    ask_price_cents: int
    created_at: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "listing_id": self.listing_id,
            "event_id": self.event_id,
            "ticket_id": self.ticket_id,
            "seller_id": self.seller_id,
            "ask_price_cents": self.ask_price_cents,
            "created_at": self.created_at,
        }

@dataclass
class ResaleOrderCreatedPayload:
    order_id: str
    event_id: str
    buyer_id: str
    bid_price_cents: int
    created_at: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "order_id": self.order_id,
            "event_id": self.event_id,
            "buyer_id": self.buyer_id,
            "bid_price_cents": self.bid_price_cents,
            "created_at": self.created_at,
        }

@dataclass
class ResaleTradeMatchedPayload:
    trade_id: str
    event_id: str
    listing_id: str
    order_id: str
    price_cents: int
    seller_id: str
    buyer_id: str
    matched_at: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "trade_id": self.trade_id,
            "event_id": self.event_id,
            "listing_id": self.listing_id,
            "order_id": self.order_id,
            "price_cents": self.price_cents,
            "seller_id": self.seller_id,
            "buyer_id": self.buyer_id,
            "matched_at": self.matched_at,
        }
