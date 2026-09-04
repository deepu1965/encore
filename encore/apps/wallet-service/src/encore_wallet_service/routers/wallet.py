from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..models import Wallet, WalletLedger, TransactionType
from ..schemas import TransactionCreate, WalletResponse

router = APIRouter(prefix="/api/v1/wallet", tags=["wallet"])

def get_db():
    yield None

@router.post("/transaction", status_code=201)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db)
):
    return {"status": "success", "message": "Transaction applied"}

@router.get("/{user_id}", response_model=WalletResponse)
def get_wallet(user_id: str, db: Session = Depends(get_db)):
    return {"user_id": user_id, "balance_cents": 0, "id": "00000000-0000-0000-0000-000000000000", "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z"}
