"""Pure inventory state-transition logic — no FastAPI, no SQLAlchemy import.

This module exists specifically so the core correctness rules (can this
seat be held? can this hold be converted to a sale?) are expressed as
plain functions over plain values, independent of the web framework or
ORM. Two benefits:

1. It's the one piece of Week 2 logic that's actually unit-tested in this
   sandbox (see tests/test_inventory_state.py) — everything else needs
   fastapi/sqlalchemy installed, which wasn't possible in the build
   sandbox (see Week 2 completion report). This module has zero
   dependencies beyond the stdlib, so it runs anywhere.
2. When Week 7-8 replace the naive UPDATE-based hold/sell path with
   `SELECT ... FOR UPDATE` / Redis SETNX, this is the logic that gets
   reused unchanged — only the persistence mechanism around it changes.

The router modules (routers/holds.py, routers/orders.py) call these
functions to decide *whether* a transition is allowed, then perform the
actual (currently unsynchronized) UPDATE themselves.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class InventoryStatus(str, Enum):  # noqa: UP042
    AVAILABLE = "AVAILABLE"
    HELD = "HELD"
    SOLD = "SOLD"


@dataclass(frozen=True)
class TransitionResult:
    allowed: bool
    reason: str | None = None  # error code, matches api-conventions.md error envelope


def can_hold(current_status: InventoryStatus) -> TransitionResult:
    """A seat can only move AVAILABLE -> HELD."""
    if current_status == InventoryStatus.AVAILABLE:
        return TransitionResult(allowed=True)
    if current_status == InventoryStatus.HELD:
        return TransitionResult(allowed=False, reason="SEAT_ALREADY_HELD")
    return TransitionResult(allowed=False, reason="SEAT_ALREADY_SOLD")


def can_release(current_status: InventoryStatus, held_by_user_id, requesting_user_id) -> TransitionResult:  # noqa: E501
    """A hold can only be released by the user who holds it, and only from HELD."""
    if current_status != InventoryStatus.HELD:
        return TransitionResult(allowed=False, reason="SEAT_NOT_HELD")
    if held_by_user_id != requesting_user_id:
        return TransitionResult(allowed=False, reason="HOLD_NOT_OWNED_BY_USER")
    return TransitionResult(allowed=True)


def can_purchase(current_status: InventoryStatus, held_by_user_id, requesting_user_id) -> TransitionResult:  # noqa: E501
    """A HELD seat can only be purchased by the user who holds it.

    Week 2 does not allow buying an AVAILABLE seat directly without a
    prior hold — the flow is always browse -> hold -> order, matching
    docs/architecture/vertical-slice-plan.md. This also means the
    hold-then-buy race the real system cares about (Weeks 7-8) is
    exercised structurally from day one, even though it isn't yet made
    airtight.
    """
    if current_status == InventoryStatus.SOLD:
        return TransitionResult(allowed=False, reason="SEAT_ALREADY_SOLD")
    if current_status == InventoryStatus.AVAILABLE:
        return TransitionResult(allowed=False, reason="SEAT_NOT_HELD")
    if held_by_user_id != requesting_user_id:
        return TransitionResult(allowed=False, reason="HOLD_NOT_OWNED_BY_USER")
    return TransitionResult(allowed=True)


def generate_ticket_code(order_id_hex: str, sequence: int = 0) -> str:
    """Deterministic, human-shareable ticket code from an order ID.

    Not cryptographically unguessable and not the final ticketing/QR
    format — good enough for a Week 2 mock ticket. Revisit if/when
    tickets need to be scan-verifiable.
    """
    prefix = order_id_hex.replace("-", "")[:8].upper()
    return f"TIX-{prefix}-{sequence:02d}"
