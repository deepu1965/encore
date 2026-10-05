"""API Gateway Wallet Router.

Connects frontend customer wallet queries and management to encore_wallet_service.
"""

from __future__ import annotations

import logging
from typing import Literal
import uuid

from encore_common.envelope import error_envelope, success_envelope
from fastapi import APIRouter, Depends, HTTPException, Request, status
import httpx
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..config import settings
from ..db import get_db
from ..models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/wallet", tags=["wallet"])


class WalletTransactionPayload(BaseModel):
    amount_cents: int
    transaction_type: Literal["CREDIT", "DEBIT"]
    reference_id: str | None = None
    idempotency_key: str | None = None


@router.get("")
@router.get("/")
async def get_wallet(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    url = f"{settings.wallet_service_url}/api/v1/wallet/{user.id}"
    balance_cents = 0
    wallet_id = None

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                balance_cents = data.get("balance_cents", 0)
                wallet_id = data.get("id")
    except Exception as exc:
        logger.warning("Failed to reach wallet service, falling back to database: %s", exc)
        row = db.execute(
            text("SELECT id, balance_cents FROM wallets WHERE user_id = :uid"),
            {"uid": user.id},
        ).first()
        if row:
            wallet_id = str(row[0])
            balance_cents = row[1]

    # Fetch recent ledger transactions
    transactions = []
    if wallet_id:
        try:
            w_uuid = uuid.UUID(wallet_id)
            rows = db.execute(
                text(
                    """
                    SELECT id, amount_cents, transaction_type, created_at
                    FROM wallet_ledger
                    WHERE wallet_id = :wid
                    ORDER BY created_at DESC
                    LIMIT 20
                    """
                ),
                {"wid": w_uuid},
            ).mappings().all()
            transactions = [
                {
                    "id": str(r["id"]),
                    "amount_cents": r["amount_cents"],
                    "reason": r["transaction_type"],
                    "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                }
                for r in rows
            ]
        except Exception as e:
            logger.error("Error fetching wallet ledger: %s", e)

    result = {
        "balance_cents": balance_cents,
        "currency": "USD",
        "transactions": transactions,
    }
    return success_envelope(result, request.state.request_id)


@router.post("/transaction", status_code=status.HTTP_201_CREATED)
async def post_transaction(
    body: WalletTransactionPayload,
    request: Request,
    user: User = Depends(get_current_user),
):
    url = f"{settings.wallet_service_url}/api/v1/wallet/transaction"
    req_body = {
        "user_id": str(user.id),
        "amount_cents": body.amount_cents,
        "transaction_type": body.transaction_type,
        "reference_id": body.reference_id or f"ref_{uuid.uuid4().hex}",
        "idempotency_key": body.idempotency_key or f"idem_{uuid.uuid4().hex}",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=req_body)
            if resp.status_code not in (200, 201):
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
            data = resp.json()
    except httpx.RequestError as exc:
        logger.error("Failed to reach wallet service: %s", exc)
        raise HTTPException(status_code=503, detail="Wallet service unavailable")

    return success_envelope(data, request.state.request_id)
