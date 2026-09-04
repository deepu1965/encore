from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Literal

class WalletBase(BaseModel):
    user_id: UUID
    balance_cents: int

class TransactionCreate(BaseModel):
    user_id: UUID
    amount_cents: int
    transaction_type: Literal["CREDIT", "DEBIT"]
    reference_id: str
    idempotency_key: str

class WalletResponse(WalletBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
