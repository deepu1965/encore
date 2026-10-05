import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import (
    AuditEvent,
    AuditEventType,
    Inventory,
    InventoryStatus,
    Order,
    OrderStatus,
    Ticket,
)


class OrderRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_by_idempotency_key(self, idempotency_key: str) -> Order | None:
        return self.session.scalar(
            select(Order).where(Order.idempotency_key == idempotency_key)
        )

    def mark_completed(self, order: Order) -> None:
        order.status = OrderStatus.COMPLETED

    def mark_failed(self, order: Order) -> None:
        order.status = OrderStatus.FAILED

class InventoryRepository:
    def __init__(self, session: Session):
        self.session = session
        
    def get_by_id(self, inventory_id: uuid.UUID) -> Inventory | None:
        return self.session.get(Inventory, inventory_id)

    def get_by_event_and_seat(self, event_id: uuid.UUID, seat_id: uuid.UUID) -> Inventory | None:
        return self.session.scalar(
            select(Inventory).where(
                Inventory.event_id == event_id,
                Inventory.seat_id == seat_id
            )
        )

    def mark_sold(self, inventory: Inventory) -> None:
        inventory.status = InventoryStatus.SOLD
        
    def release_hold(self, inventory: Inventory) -> None:
        inventory.status = InventoryStatus.AVAILABLE
        inventory.held_by_user_id = None
        inventory.held_at = None
        inventory.hold_expires_at = None

class TicketRepository:
    def __init__(self, session: Session):
        self.session = session

    def create_ticket(self, order_id: uuid.UUID, inventory_id: uuid.UUID, ticket_code: str, user_id: uuid.UUID | None = None) -> Ticket:  # noqa: E501
        ticket = Ticket(
            order_id=order_id,
            inventory_id=inventory_id,
            ticket_code=ticket_code,
            user_id=user_id,
        )
        self.session.add(ticket)
        return ticket

class AuditEventRepository:
    def __init__(self, session: Session):
        self.session = session

    def log_issuance(self, ticket_id: uuid.UUID, user_id: uuid.UUID) -> None:
        event = AuditEvent(
            ticket_id=ticket_id,
            event_type=AuditEventType.ISSUED,
            user_id=user_id,
            new_owner_id=user_id
        )
        self.session.add(event)
