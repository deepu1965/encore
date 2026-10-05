from uuid import UUID
import uuid

from encore_common import error_envelope, success_envelope
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..db import get_db
from ..models import (
    AuditEvent,
    AuditEventType,
    Event,
    Inventory,
    Order,
    Seat,
    Ticket,
    TicketOwnershipHistory,
    User,
    Venue,
)

router = APIRouter(tags=["tickets"])


class TicketTransferRequest(BaseModel):
    ticket_id: UUID
    new_user_id: UUID
    trade_id: UUID | None = None


@router.get("/api/v1/tickets")
def list_user_tickets(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = (
        select(Ticket, Order, Event, Venue, Inventory, Seat)
        .join(Order, Ticket.order_id == Order.id)
        .join(Event, Order.event_id == Event.id)
        .join(Venue, Event.venue_id == Venue.id)
        .join(Inventory, Ticket.inventory_id == Inventory.id)
        .join(Seat, Inventory.seat_id == Seat.id)
        .where(Ticket.user_id == user.id)
        .order_by(Ticket.created_at.desc())
    )
    rows = db.execute(stmt).all()

    items = [
        {
            "ticket_id": str(ticket.id),
            "order_id": str(ticket.order_id),
            "event_id": str(event.id),
            "seat_id": str(seat.id),
            "section": seat.section,
            "row": seat.row_label,
            "number": seat.seat_number,
            "status": ticket.status,
            "event_name": event.name,
            "event_date": event.starts_at.isoformat() if event.starts_at else None,
            "venue_name": venue.name,
            "ticket_code": ticket.ticket_code,
            "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
        }
        for ticket, order, event, venue, inv, seat in rows
    ]
    request_id = getattr(request.state, "request_id", "")
    return success_envelope({"items": items}, request_id=request_id)


@router.get("/api/v1/tickets/{ticket_id}")
def get_ticket(
    ticket_id: UUID,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = (
        select(Ticket, Order, Event, Venue, Inventory, Seat)
        .join(Order, Ticket.order_id == Order.id)
        .join(Event, Order.event_id == Event.id)
        .join(Venue, Event.venue_id == Venue.id)
        .join(Inventory, Ticket.inventory_id == Inventory.id)
        .join(Seat, Inventory.seat_id == Seat.id)
        .where(Ticket.id == ticket_id)
    )
    row = db.execute(stmt).first()
    if not row:
        raise HTTPException(
            status_code=404,
            detail=error_envelope("NOT_FOUND", "Ticket not found", getattr(request.state, "request_id", "")),
        )
    ticket, order, event, venue, inv, seat = row
    item = {
        "ticket_id": str(ticket.id),
        "order_id": str(ticket.order_id),
        "event_id": str(event.id),
        "seat_id": str(seat.id),
        "section": seat.section,
        "row": seat.row_label,
        "number": seat.seat_number,
        "status": ticket.status,
        "event_name": event.name,
        "event_date": event.starts_at.isoformat() if event.starts_at else None,
        "venue_name": venue.name,
        "ticket_code": ticket.ticket_code,
        "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
    }
    request_id = getattr(request.state, "request_id", "")
    return success_envelope(item, request_id=request_id)


@router.post("/internal/tickets/transfer", status_code=status.HTTP_200_OK)
def transfer_ticket(
    payload: TicketTransferRequest,
    db: Session = Depends(get_db),
):
    ticket = db.query(Ticket).filter(Ticket.id == payload.ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    previous_owner_id = ticket.user_id

    # Update current owner
    ticket.user_id = payload.new_user_id

    # Create ownership history
    history = TicketOwnershipHistory(
        ticket_id=ticket.id,
        previous_user_id=previous_owner_id,
        new_user_id=payload.new_user_id,
        trade_id=payload.trade_id,
    )
    db.add(history)

    # Create audit event
    audit = AuditEvent(
        ticket_id=ticket.id,
        event_type=AuditEventType.TRANSFERRED,
        user_id=payload.new_user_id,
        previous_owner_id=previous_owner_id,
        new_owner_id=payload.new_user_id,
    )
    db.add(audit)

    db.commit()

    return {"status": "success", "message": "Ticket ownership transferred"}
