from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class WalletBase(BaseModel):
    user_id: UUID
    balance_cents: int
    escrow_cents: int

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

class EscrowHoldRequest(BaseModel):
    buyer_id: UUID
    amount_cents: int
    trade_id: UUID
    idempotency_key: str

class EscrowReleaseRequest(BaseModel):
    buyer_id: UUID
    seller_id: UUID
    amount_cents: int
    trade_id: UUID
    idempotency_key: str

class EscrowRefundRequest(BaseModel):
    buyer_id: UUID
    amount_cents: int
    trade_id: UUID
    idempotency_key: str
