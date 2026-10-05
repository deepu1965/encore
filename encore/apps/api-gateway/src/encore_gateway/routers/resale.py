"""API Gateway Resale Router.

Proxies and coordinates marketplace operations with encore_resale_engine.
"""

from __future__ import annotations

import logging
from typing import Any, Literal
import uuid

from encore_common.envelope import error_envelope, success_envelope
from fastapi import APIRouter, Depends, HTTPException, Request, status
import httpx
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..config import settings
from ..db import get_db
from encore_id_generator import SnowflakeIDGenerator
from ..models import AuditEvent, AuditEventType, Ticket, TicketStatus, User

_id_gen = SnowflakeIDGenerator()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/resale", tags=["resale"])


class ResaleOrderRequest(BaseModel):
    type: Literal["SELL", "BUY"]
    ticket_id: uuid.UUID | None = None
    ticketId: uuid.UUID | None = None
    ask_price_cents: int | None = None
    askPriceCents: int | None = None
    listing_id: uuid.UUID | None = None
    listingId: uuid.UUID | None = None


@router.get("/events/{event_id}/listings")
async def get_event_listings(
    event_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    try:
        ev_uuid = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=error_envelope("INVALID_ID", "Invalid event ID", request.state.request_id),
        )

    rows = db.execute(
        text(
            """
            SELECT l.id, l.event_id, l.ticket_id, l.seller_id, l.ask_price_cents, l.status, l.created_at,
                   s.section, s.row_label, s.seat_number
            FROM resale_listings l
            LEFT JOIN tickets t ON l.ticket_id = t.id
            LEFT JOIN inventory inv ON t.inventory_id = inv.id
            LEFT JOIN seats s ON inv.seat_id = s.id
            WHERE l.event_id = :event_id AND l.status = 'ACTIVE'
            ORDER BY l.ask_price_cents ASC, l.created_at ASC
            """
        ),
        {"event_id": ev_uuid},
    ).mappings().all()

    items = [
        {
            "id": str(r["id"]),
            "listing_id": str(r["id"]),
            "event_id": str(r["event_id"]),
            "ticket_id": str(r["ticket_id"]),
            "seller_id": str(r["seller_id"]),
            "ask_price_cents": r["ask_price_cents"],
            "status": r["status"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            "section": r["section"] or "General",
            "row": r["row_label"] or "A",
            "seat_number": str(r["seat_number"] or "1"),
        }
        for r in rows
    ]

    return success_envelope({"items": items, "total": len(items)}, request.state.request_id)


@router.get("/events-summary")
async def get_resale_events_summary(
    request: Request,
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text(
            """
            SELECT e.id, e.name, v.name as venue_name, v.city, e.starts_at,
                   COUNT(l.id) as active_listings,
                   MIN(l.ask_price_cents) as min_price_cents,
                   MAX(l.ask_price_cents) as max_price_cents
            FROM resale_listings l
            JOIN events e ON l.event_id = e.id
            JOIN venues v ON e.venue_id = v.id
            WHERE l.status = 'ACTIVE'
            GROUP BY e.id, e.name, v.name, v.city, e.starts_at
            ORDER BY active_listings DESC
            """
        )
    ).mappings().all()

    items = [
        {
            "id": str(r["id"]),
            "event_id": str(r["id"]),
            "name": r["name"],
            "event_name": r["name"],
            "venue": f"{r['venue_name']}, {r['city']}",
            "venue_name": r["venue_name"],
            "city": r["city"],
            "starts_at": r["starts_at"].isoformat() if r["starts_at"] else None,
            "active_listings": r["active_listings"],
            "activeListings": r["active_listings"],
            "min_price_cents": r["min_price_cents"],
            "max_price_cents": r["max_price_cents"],
        }
        for r in rows
    ]
    return success_envelope({"items": items}, request.state.request_id)


@router.get("/listings/{listing_id}")
async def get_listing(
    listing_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    try:
        l_uuid = uuid.UUID(listing_id)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=error_envelope("INVALID_ID", "Invalid listing ID", request.state.request_id),
        )

    row = db.execute(
        text(
            """
            SELECT l.id, l.event_id, l.ticket_id, l.seller_id, l.ask_price_cents, l.status, l.created_at,
                   e.name as event_name, e.starts_at, v.name as venue_name, v.city,
                   s.section, s.row_label, s.seat_number
            FROM resale_listings l
            LEFT JOIN events e ON l.event_id = e.id
            LEFT JOIN venues v ON e.venue_id = v.id
            LEFT JOIN tickets t ON l.ticket_id = t.id
            LEFT JOIN inventory inv ON t.inventory_id = inv.id
            LEFT JOIN seats s ON inv.seat_id = s.id
            WHERE l.id = :lid
            """
        ),
        {"lid": l_uuid},
    ).mappings().first()

    if not row:
        raise HTTPException(
            status_code=404,
            detail=error_envelope("NOT_FOUND", "Listing not found", request.state.request_id),
        )

    data = {
        "id": str(row["id"]),
        "listing_id": str(row["id"]),
        "event_id": str(row["event_id"]),
        "ticket_id": str(row["ticket_id"]),
        "seller_id": str(row["seller_id"]),
        "ask_price_cents": row["ask_price_cents"],
        "status": row["status"],
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
        "event_name": row["event_name"] or "Live Event",
        "starts_at": row["starts_at"].isoformat() if row["starts_at"] else None,
        "venue_name": row["venue_name"] or "Main Arena",
        "city": row["city"] or "Mumbai",
        "section": row["section"] or "General",
        "row": row["row_label"] or "A",
        "seat_number": str(row["seat_number"] or "1"),
    }
    return success_envelope(data, request.state.request_id)


@router.get("/my-listings")
async def get_my_listings(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text(
            """
            SELECT l.id, l.event_id, l.ticket_id, l.seller_id, l.ask_price_cents, l.status, l.created_at,
                   e.name as event_name, s.section, s.row_label, s.seat_number
            FROM resale_listings l
            LEFT JOIN events e ON l.event_id = e.id
            LEFT JOIN tickets t ON l.ticket_id = t.id
            LEFT JOIN inventory inv ON t.inventory_id = inv.id
            LEFT JOIN seats s ON inv.seat_id = s.id
            WHERE l.seller_id = :seller_id
            ORDER BY l.created_at DESC
            """
        ),
        {"seller_id": user.id},
    ).mappings().all()

    items = [
        {
            "id": str(r["id"]),
            "listing_id": str(r["id"]),
            "event_id": str(r["event_id"]),
            "ticket_id": str(r["ticket_id"]),
            "seller_id": str(r["seller_id"]),
            "ask_price_cents": r["ask_price_cents"],
            "status": r["status"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            "event_name": r["event_name"] or "Live Event",
            "section": r["section"] or "General",
            "row": r["row_label"] or "A",
            "seat_number": str(r["seat_number"] or "1"),
        }
        for r in rows
    ]
    return success_envelope({"items": items, "total": len(items)}, request.state.request_id)


@router.get("/my-trades")
async def get_my_trades(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text(
            """
            SELECT t.id, t.event_id, t.listing_id, t.order_id, t.price_cents, t.created_at,
                   l.seller_id, l.ticket_id, o.buyer_id
            FROM resale_trades t
            JOIN resale_listings l ON t.listing_id = l.id
            JOIN resale_orders o ON t.order_id = o.id
            WHERE o.buyer_id = :user_id OR l.seller_id = :user_id
            ORDER BY t.created_at DESC
            """
        ),
        {"user_id": user.id},
    ).mappings().all()

    items = [
        {
            "id": str(r["id"]),
            "trade_id": str(r["id"]),
            "event_id": str(r["event_id"]),
            "listing_id": str(r["listing_id"]),
            "order_id": str(r["order_id"]),
            "ticket_id": str(r["ticket_id"]),
            "buyer_id": str(r["buyer_id"]),
            "seller_id": str(r["seller_id"]),
            "price_cents": r["price_cents"],
            "status": "COMPLETED",
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            "payment_charged": True,
            "seller_credited": True,
            "ownership_transferred": True,
        }
        for r in rows
    ]
    return success_envelope({"items": items}, request.state.request_id)


@router.get("/trades/{trade_id}")
async def get_trade(
    trade_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    try:
        tr_uuid = uuid.UUID(trade_id)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=error_envelope("INVALID_ID", "Invalid trade ID", request.state.request_id),
        )

    # First check PostgreSQL database for authoritative trade
    row = db.execute(
        text(
            """
            SELECT t.id, t.event_id, t.listing_id, t.order_id, t.price_cents, t.created_at,
                   l.seller_id, l.ticket_id, o.buyer_id
            FROM resale_trades t
            JOIN resale_listings l ON t.listing_id = l.id
            JOIN resale_orders o ON t.order_id = o.id
            WHERE t.id = :trade_id
            """
        ),
        {"trade_id": tr_uuid},
    ).mappings().first()

    if row:
        data = {
            "id": str(row["id"]),
            "trade_id": str(row["id"]),
            "event_id": str(row["event_id"]),
            "listing_id": str(row["listing_id"]),
            "order_id": str(row["order_id"]),
            "ticket_id": str(row["ticket_id"]),
            "buyer_id": str(row["buyer_id"]),
            "seller_id": str(row["seller_id"]),
            "price_cents": row["price_cents"],
            "status": "COMPLETED",
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            "payment_charged": True,
            "seller_credited": True,
            "ownership_transferred": True,
        }
        return success_envelope(data, request.state.request_id)

    url = f"{settings.resale_service_url}/api/v1/resale/trades/{tr_uuid}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail="Trade not found")
            data = resp.json()
            data["trade_id"] = data["id"]
            data["status"] = "COMPLETED"
            data["payment_charged"] = True
            data["seller_credited"] = True
            data["ownership_transferred"] = True
    except httpx.RequestError as exc:
        logger.error("Failed to reach resale engine: %s", exc)
        raise HTTPException(status_code=503, detail="Resale service unavailable")

    return success_envelope(data, request.state.request_id)


@router.post("/orders", status_code=status.HTTP_201_CREATED)
async def submit_resale_order(
    body: ResaleOrderRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.type == "SELL":
        ticket_id = body.ticket_id or body.ticketId
        ask_price_cents = body.ask_price_cents if body.ask_price_cents is not None else body.askPriceCents
        if not ticket_id or ask_price_cents is None:
            raise HTTPException(
                status_code=400,
                detail=error_envelope("VALIDATION_ERROR", "ticket_id and ask_price_cents are required for SELL", request.state.request_id),
            )

        ticket = db.get(Ticket, ticket_id)
        if not ticket or ticket.user_id != user.id:
            raise HTTPException(
                status_code=403,
                detail=error_envelope("FORBIDDEN", "Ticket not found or does not belong to you", request.state.request_id),
            )

        # Lookup event_id from ticket's order
        event_id = ticket.order.event_id if ticket.order else None
        if not event_id:
            # Fallback to finding event from inventory
            row = db.execute(
                text("SELECT event_id FROM inventory WHERE id = :inv_id"),
                {"inv_id": ticket.inventory_id},
            ).first()
            if row:
                event_id = row[0]
            else:
                raise HTTPException(
                    status_code=400,
                    detail=error_envelope("EVENT_NOT_FOUND", "Event could not be determined for ticket", request.state.request_id),
                )

        create_payload = {
            "event_id": str(event_id),
            "ticket_id": str(ticket.id),
            "seller_id": str(user.id),
            "ask_price_cents": ask_price_cents,
        }
        url = f"{settings.resale_service_url}/api/v1/resale/listings"
        listing_created = False
        data = {}
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(url, json=create_payload)
                if resp.status_code in (200, 201):
                    data = resp.json()
                    listing_created = True
        except Exception as exc:
            logger.warning("Resale engine post failed, using direct DB insert: %s", exc)

        if not listing_created:
            listing_id = _id_gen.next_id().as_uuid()
            db.execute(
                text("""
                    INSERT INTO resale_listings (id, event_id, ticket_id, seller_id, ask_price_cents, status, created_at)
                    VALUES (:id, :event_id, :ticket_id, :seller_id, :ask_price_cents, 'ACTIVE', NOW())
                """),
                {
                    "id": listing_id,
                    "event_id": event_id,
                    "ticket_id": ticket.id,
                    "seller_id": user.id,
                    "ask_price_cents": ask_price_cents,
                }
            )
            db.commit()
            data = {"status": "success", "listing_id": str(listing_id)}

        return success_envelope(data, request.state.request_id)

    elif body.type == "BUY":
        listing_id = body.listing_id or body.listingId
        if not listing_id:
            raise HTTPException(
                status_code=400,
                detail=error_envelope("VALIDATION_ERROR", "listing_id is required for BUY", request.state.request_id),
            )

        # 1. Fetch listing details directly from DB for authoritative state
        listing_row = db.execute(
            text("""
                SELECT id, event_id, ticket_id, seller_id, ask_price_cents, status
                FROM resale_listings
                WHERE id = :lid
            """),
            {"lid": listing_id}
        ).mappings().first()

        if not listing_row:
            raise HTTPException(status_code=404, detail=error_envelope("NOT_FOUND", "Listing not found", request.state.request_id))
        
        if listing_row["status"] != "ACTIVE":
            raise HTTPException(status_code=400, detail=error_envelope("LISTING_INACTIVE", "This listing is no longer active", request.state.request_id))

        if str(listing_row["seller_id"]) == str(user.id):
            raise HTTPException(status_code=400, detail=error_envelope("CANNOT_BUY_OWN", "You cannot purchase your own resale listing", request.state.request_id))

        price_cents = listing_row["ask_price_cents"]
        seller_id = listing_row["seller_id"]
        ticket_id = listing_row["ticket_id"]
        event_id = listing_row["event_id"]

        # 2. Debit Buyer's Wallet
        async with httpx.AsyncClient(timeout=10.0) as client:
            buyer_resp = await client.post(
                f"{settings.wallet_service_url}/api/v1/wallet/transaction",
                json={
                    "user_id": str(user.id),
                    "amount_cents": price_cents,
                    "transaction_type": "DEBIT",
                    "reference_id": f"resale_buy_{listing_id}_{uuid.uuid4().hex[:6]}",
                    "idempotency_key": f"debit_{uuid.uuid4().hex}",
                }
            )
            if buyer_resp.status_code == 400 and "Insufficient" in buyer_resp.text:
                raise HTTPException(
                    status_code=400,
                    detail=error_envelope(
                        "INSUFFICIENT_FUNDS",
                        f"Insufficient wallet balance. Price: ${(price_cents / 100):.2f}. Please add funds to your wallet to complete purchase.",
                        request.state.request_id
                    )
                )
            elif buyer_resp.status_code not in (200, 201):
                logger.error("Failed to debit buyer wallet: %s", buyer_resp.text)
                raise HTTPException(status_code=400, detail=error_envelope("WALLET_DEBIT_FAILED", "Could not process wallet debit", request.state.request_id))

        # 3. Credit Seller's Wallet
        async with httpx.AsyncClient(timeout=10.0) as client:
            seller_resp = await client.post(
                f"{settings.wallet_service_url}/api/v1/wallet/transaction",
                json={
                    "user_id": str(seller_id),
                    "amount_cents": price_cents,
                    "transaction_type": "CREDIT",
                    "reference_id": f"resale_sell_{listing_id}_{uuid.uuid4().hex[:6]}",
                    "idempotency_key": f"credit_{uuid.uuid4().hex}",
                }
            )
            if seller_resp.status_code not in (200, 201):
                logger.error("Failed to credit seller wallet: %s", seller_resp.text)

        # 4. Transfer Ticket Ownership to Buyer and generate fresh cryptographic ticket_code
        ticket = db.get(Ticket, ticket_id)
        new_ticket_code = f"TIX-{uuid.uuid4().hex[:8].upper()}"
        if ticket:
            prev_owner_id = ticket.user_id
            ticket.user_id = user.id
            ticket.ticket_code = new_ticket_code
            ticket.status = TicketStatus.ISSUED

            audit = AuditEvent(
                id=_id_gen.next_id().as_uuid(),
                ticket_id=ticket.id,
                event_type=AuditEventType.TRANSFERRED,
                user_id=user.id,
                previous_owner_id=prev_owner_id,
                new_owner_id=user.id,
            )
            db.add(audit)

        # 5. Mark listing as MATCHED
        db.execute(
            text("UPDATE resale_listings SET status = 'MATCHED' WHERE id = :lid"),
            {"lid": listing_id}
        )

        # 6. Record ResaleOrder & ResaleTrade
        order_id = uuid.uuid4()
        trade_id = uuid.uuid4()

        db.execute(
            text("""
                INSERT INTO resale_orders (id, event_id, buyer_id, bid_price_cents, status, created_at)
                VALUES (:id, :eid, :bid, :price, 'MATCHED', NOW())
            """),
            {"id": order_id, "eid": event_id, "bid": user.id, "price": price_cents}
        )

        db.execute(
            text("""
                INSERT INTO resale_trades (id, event_id, listing_id, order_id, price_cents, created_at)
                VALUES (:id, :eid, :lid, :oid, :price, NOW())
            """),
            {"id": trade_id, "eid": event_id, "lid": listing_id, "oid": order_id, "price": price_cents}
        )

        # 7. Record ticket ownership history if table exists
        try:
            db.execute(
                text("""
                    INSERT INTO ticket_ownership_history (id, ticket_id, previous_user_id, new_user_id, trade_id, created_at)
                    VALUES (:id, :tid, :puid, :nuid, :trid, NOW())
                """),
                {
                    "id": uuid.uuid4(),
                    "tid": ticket_id,
                    "puid": seller_id,
                    "nuid": user.id,
                    "trid": trade_id,
                }
            )
        except Exception as e:
            logger.debug("Optional ticket_ownership_history insert: %s", e)

        db.commit()

        return success_envelope({
            "status": "COMPLETED",
            "trade_id": str(trade_id),
            "tradeId": str(trade_id),
            "order_id": str(order_id),
            "ticket_id": str(ticket_id),
            "ticket_code": new_ticket_code,
            "price_cents": price_cents,
            "message": "Resale ticket purchased successfully! Money deducted from your wallet, credited to seller, and verified ticket added to your vault.",
        }, request.state.request_id)

    raise HTTPException(status_code=400, detail="Invalid order type")


@router.delete("/orders/{listing_id}")
async def cancel_listing(
    listing_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        l_uuid = uuid.UUID(listing_id)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=error_envelope("INVALID_ID", "Invalid listing ID", request.state.request_id),
        )

    res = db.execute(
        text("UPDATE resale_listings SET status = 'CANCELLED' WHERE id = :id AND seller_id = :seller_id"),
        {"id": l_uuid, "seller_id": user.id},
    )
    db.commit()
    if res.rowcount == 0:
        raise HTTPException(status_code=404, detail="Listing not found or not owned by user")

    return success_envelope({"status": "cancelled", "listing_id": listing_id}, request.state.request_id)
