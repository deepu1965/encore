import uuid
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import LedgerStatus, TransactionType, Wallet, WalletLedger
from ..schemas import (
    EscrowHoldRequest,
    EscrowRefundRequest,
    EscrowReleaseRequest,
    TransactionCreate,
    WalletResponse,
)

router = APIRouter(prefix="/api/v1/wallet", tags=["wallet"])


def _get_or_create_wallet(user_id: UUID, db: Session, for_update: bool = False) -> Wallet:
    stmt = select(Wallet).where(Wallet.user_id == user_id)
    if for_update:
        stmt = stmt.with_for_update()
    wallet = db.execute(stmt).scalar_one_or_none()
    if not wallet:
        wallet = Wallet(
            id=uuid.uuid4(),
            user_id=user_id,
            balance_cents=0,
            escrow_cents=0,
            version=1,
        )
        db.add(wallet)
        db.flush()
        if for_update:
            # Re-fetch with lock
            wallet = db.execute(
                select(Wallet).where(Wallet.id == wallet.id).with_for_update()
            ).scalar_one()
    return wallet


@router.get("/{user_id}", response_model=WalletResponse)
def get_wallet(user_id: str, db: Session = Depends(get_db)):
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user UUID")

    wallet = _get_or_create_wallet(user_uuid, db)
    db.commit()
    return {
        "id": wallet.id,
        "user_id": wallet.user_id,
        "balance_cents": wallet.balance_cents,
        "escrow_cents": wallet.escrow_cents,
        "created_at": wallet.created_at,
        "updated_at": wallet.updated_at,
    }


@router.post("/transaction", status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
):
    # Check idempotency
    existing = db.execute(
        select(WalletLedger).where(WalletLedger.reference_id == payload.reference_id)
    ).scalar_one_or_none()
    if existing:
        return {
            "status": "success",
            "message": "Transaction already applied (idempotent)",
            "ledger_id": str(existing.id),
        }

    wallet = _get_or_create_wallet(payload.user_id, db, for_update=True)

    if payload.transaction_type == "CREDIT":
        wallet.balance_cents += payload.amount_cents
    elif payload.transaction_type == "DEBIT":
        if wallet.balance_cents < payload.amount_cents:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient wallet balance. Required: {payload.amount_cents}, Available: {wallet.balance_cents}",
            )
        wallet.balance_cents -= payload.amount_cents
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported transaction type: {payload.transaction_type}")

    wallet.version += 1

    ledger = WalletLedger(
        id=uuid.uuid4(),
        wallet_id=wallet.id,
        amount_cents=payload.amount_cents,
        transaction_type=TransactionType(payload.transaction_type),
        status=LedgerStatus.COMPLETED,
        reference_id=payload.reference_id,
    )
    db.add(ledger)
    db.commit()

    return {
        "status": "success",
        "message": "Transaction applied",
        "balance_cents": wallet.balance_cents,
        "ledger_id": str(ledger.id),
    }


@router.post("/escrow/hold", status_code=status.HTTP_200_OK)
def escrow_hold(
    payload: EscrowHoldRequest,
    db: Session = Depends(get_db),
):
    ref_id = f"hold_{payload.trade_id}"
    existing = db.execute(
        select(WalletLedger).where(WalletLedger.reference_id == ref_id)
    ).scalar_one_or_none()
    if existing:
        return {"status": "success", "message": "Funds held in escrow (idempotent)"}

    buyer_wallet = _get_or_create_wallet(payload.buyer_id, db, for_update=True)
    if buyer_wallet.balance_cents < payload.amount_cents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient funds for escrow hold. Required: {payload.amount_cents}, Available: {buyer_wallet.balance_cents}",
        )

    buyer_wallet.balance_cents -= payload.amount_cents
    buyer_wallet.escrow_cents += payload.amount_cents
    buyer_wallet.version += 1

    ledger = WalletLedger(
        id=uuid.uuid4(),
        wallet_id=buyer_wallet.id,
        amount_cents=payload.amount_cents,
        transaction_type=TransactionType.ESCROW_HOLD,
        status=LedgerStatus.COMPLETED,
        reference_id=ref_id,
    )
    db.add(ledger)
    db.commit()

    return {"status": "success", "message": "Funds held in escrow"}


@router.post("/escrow/release", status_code=status.HTTP_200_OK)
def escrow_release(
    payload: EscrowReleaseRequest,
    db: Session = Depends(get_db),
):
    ref_id = f"release_{payload.trade_id}"
    existing = db.execute(
        select(WalletLedger).where(WalletLedger.reference_id == ref_id)
    ).scalar_one_or_none()
    if existing:
        return {"status": "success", "message": "Funds released to seller (idempotent)"}

    # Lock buyer then seller in consistent order to prevent deadlock
    first_id, second_id = sorted([payload.buyer_id, payload.seller_id])
    first_wallet = _get_or_create_wallet(first_id, db, for_update=True)
    second_wallet = _get_or_create_wallet(second_id, db, for_update=True)

    buyer_wallet = first_wallet if first_wallet.user_id == payload.buyer_id else second_wallet
    seller_wallet = second_wallet if second_wallet.user_id == payload.seller_id else first_wallet

    if buyer_wallet.escrow_cents < payload.amount_cents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient escrow balance to release. Required: {payload.amount_cents}, Held: {buyer_wallet.escrow_cents}",
        )

    buyer_wallet.escrow_cents -= payload.amount_cents
    buyer_wallet.version += 1

    seller_wallet.balance_cents += payload.amount_cents
    seller_wallet.version += 1

    # Ledger entries for buyer and seller
    ledger_buyer = WalletLedger(
        id=uuid.uuid4(),
        wallet_id=buyer_wallet.id,
        amount_cents=payload.amount_cents,
        transaction_type=TransactionType.ESCROW_RELEASE,
        status=LedgerStatus.COMPLETED,
        reference_id=ref_id,
    )
    ledger_seller = WalletLedger(
        id=uuid.uuid4(),
        wallet_id=seller_wallet.id,
        amount_cents=payload.amount_cents,
        transaction_type=TransactionType.CREDIT,
        status=LedgerStatus.COMPLETED,
        reference_id=f"seller_{ref_id}",
    )
    db.add(ledger_buyer)
    db.add(ledger_seller)
    db.commit()

    return {"status": "success", "message": "Funds released to seller"}


@router.post("/escrow/refund", status_code=status.HTTP_200_OK)
def escrow_refund(
    payload: EscrowRefundRequest,
    db: Session = Depends(get_db),
):
    ref_id = f"refund_{payload.trade_id}"
    existing = db.execute(
        select(WalletLedger).where(WalletLedger.reference_id == ref_id)
    ).scalar_one_or_none()
    if existing:
        return {"status": "success", "message": "Funds refunded to buyer (idempotent)"}

    buyer_wallet = _get_or_create_wallet(payload.buyer_id, db, for_update=True)
    if buyer_wallet.escrow_cents < payload.amount_cents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient escrow balance to refund. Required: {payload.amount_cents}, Held: {buyer_wallet.escrow_cents}",
        )

    buyer_wallet.escrow_cents -= payload.amount_cents
    buyer_wallet.balance_cents += payload.amount_cents
    buyer_wallet.version += 1

    ledger = WalletLedger(
        id=uuid.uuid4(),
        wallet_id=buyer_wallet.id,
        amount_cents=payload.amount_cents,
        transaction_type=TransactionType.ESCROW_REFUND,
        status=LedgerStatus.COMPLETED,
        reference_id=ref_id,
    )
    db.add(ledger)
    db.commit()

    return {"status": "success", "message": "Funds refunded to buyer"}
