from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..models import Wallet, WalletLedger, TransactionType
from ..schemas import TransactionCreate, WalletResponse, EscrowHoldRequest, EscrowReleaseRequest, EscrowRefundRequest

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
    return {"user_id": user_id, "balance_cents": 0, "escrow_cents": 0, "id": "00000000-0000-0000-0000-000000000000", "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z"}

@router.post("/escrow/hold", status_code=200)
def escrow_hold(
    payload: EscrowHoldRequest,
    db: Session = Depends(get_db)
):
    # Lock funds for buyer
    # In a real implementation: find wallet, check balance >= amount_cents
    # decrement balance_cents, increment escrow_cents
    # write WalletLedger entry TransactionType.ESCROW_HOLD
    return {"status": "success", "message": "Funds held in escrow"}

@router.post("/escrow/release", status_code=200)
def escrow_release(
    payload: EscrowReleaseRequest,
    db: Session = Depends(get_db)
):
    # Credit seller and decrement buyer's escrow
    # In a real implementation: decrement buyer escrow_cents
    # increment seller balance_cents
    # write WalletLedger entry TransactionType.ESCROW_RELEASE
    return {"status": "success", "message": "Funds released to seller"}

@router.post("/escrow/refund", status_code=200)
def escrow_refund(
    payload: EscrowRefundRequest,
    db: Session = Depends(get_db)
):
    # Refund buyer from escrow back to balance
    # In a real implementation: decrement buyer escrow_cents
    # increment buyer balance_cents
    # write WalletLedger entry TransactionType.ESCROW_REFUND
    return {"status": "success", "message": "Funds refunded to buyer"}
