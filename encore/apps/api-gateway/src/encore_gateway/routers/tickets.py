from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from pydantic import BaseModel

from ..db import get_db
from ..models import Ticket, TicketOwnershipHistory, AuditEvent, AuditEventType

router = APIRouter(prefix="/internal/tickets", tags=["tickets-internal"])

class TicketTransferRequest(BaseModel):
    ticket_id: UUID
    new_user_id: UUID
    trade_id: UUID | None = None

@router.post("/transfer", status_code=status.HTTP_200_OK)
def transfer_ticket(
    payload: TicketTransferRequest,
    db: Session = Depends(get_db)
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
        trade_id=payload.trade_id
    )
    db.add(history)
    
    # Create audit event
    audit = AuditEvent(
        ticket_id=ticket.id,
        event_type=AuditEventType.TRANSFERRED,
        user_id=payload.new_user_id,
        previous_owner_id=previous_owner_id,
        new_owner_id=payload.new_user_id
    )
    db.add(audit)
    
    # In a real app we'd emit Kafka `ticket.transferred` here.
    
    db.commit()
    
    return {"status": "success", "message": "Ticket ownership transferred"}
