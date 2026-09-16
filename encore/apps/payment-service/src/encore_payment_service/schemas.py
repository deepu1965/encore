import uuid
from datetime import datetime

from pydantic import BaseModel

from .models import PaymentStatus


class PaymentCreate(BaseModel):
    order_id: uuid.UUID
    user_id: uuid.UUID
    amount_cents: int

class PaymentOut(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID
    user_id: uuid.UUID
    amount_cents: int
    status: PaymentStatus
    created_at: datetime

    model_config = {"from_attributes": True}
