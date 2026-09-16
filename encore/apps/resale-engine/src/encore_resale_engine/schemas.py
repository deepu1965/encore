from uuid import UUID

from pydantic import BaseModel


class ListingCreate(BaseModel):
    event_id: UUID
    ticket_id: UUID
    seller_id: UUID
    ask_price_cents: int

class OrderCreate(BaseModel):
    event_id: UUID
    buyer_id: UUID
    bid_price_cents: int
