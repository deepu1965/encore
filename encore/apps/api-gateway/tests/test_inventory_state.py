import uuid

from encore_gateway.domain.inventory_state import (
    InventoryStatus,
    can_hold,
    can_purchase,
    can_release,
    generate_ticket_code,
)

USER_A = uuid.uuid4()
USER_B = uuid.uuid4()


def test_can_hold_available_seat():
    result = can_hold(InventoryStatus.AVAILABLE)
    assert result.allowed is True
    assert result.reason is None


def test_cannot_hold_already_held_seat():
    result = can_hold(InventoryStatus.HELD)
    assert result.allowed is False
    assert result.reason == "SEAT_ALREADY_HELD"


def test_cannot_hold_sold_seat():
    result = can_hold(InventoryStatus.SOLD)
    assert result.allowed is False
    assert result.reason == "SEAT_ALREADY_SOLD"


def test_can_release_own_hold():
    result = can_release(InventoryStatus.HELD, held_by_user_id=USER_A, requesting_user_id=USER_A)
    assert result.allowed is True


def test_cannot_release_someone_elses_hold():
    result = can_release(InventoryStatus.HELD, held_by_user_id=USER_A, requesting_user_id=USER_B)
    assert result.allowed is False
    assert result.reason == "HOLD_NOT_OWNED_BY_USER"


def test_cannot_release_seat_that_is_not_held():
    result = can_release(InventoryStatus.AVAILABLE, held_by_user_id=None, requesting_user_id=USER_A)
    assert result.allowed is False
    assert result.reason == "SEAT_NOT_HELD"


def test_can_purchase_own_held_seat():
    result = can_purchase(InventoryStatus.HELD, held_by_user_id=USER_A, requesting_user_id=USER_A)
    assert result.allowed is True


def test_cannot_purchase_available_seat_without_a_hold_first():
    result = can_purchase(InventoryStatus.AVAILABLE, held_by_user_id=None, requesting_user_id=USER_A)
    assert result.allowed is False
    assert result.reason == "SEAT_NOT_HELD"


def test_cannot_purchase_someone_elses_held_seat():
    result = can_purchase(InventoryStatus.HELD, held_by_user_id=USER_A, requesting_user_id=USER_B)
    assert result.allowed is False
    assert result.reason == "HOLD_NOT_OWNED_BY_USER"


def test_cannot_purchase_already_sold_seat():
    result = can_purchase(InventoryStatus.SOLD, held_by_user_id=USER_A, requesting_user_id=USER_A)
    assert result.allowed is False
    assert result.reason == "SEAT_ALREADY_SOLD"


def test_generate_ticket_code_is_deterministic_and_formatted():
    order_id = "9f8a1c2e-aaaa-bbbb-cccc-1234567890ab"
    code = generate_ticket_code(order_id, sequence=0)
    assert code == "TIX-9F8A1C2E-00"
    # same input -> same output (determinism matters: idempotent retries
    # must not mint a different ticket code for the same order+sequence)
    assert generate_ticket_code(order_id, sequence=0) == code


def test_generate_ticket_code_sequence_increments_for_multi_seat_orders():
    order_id = "9f8a1c2e-aaaa-bbbb-cccc-1234567890ab"
    first = generate_ticket_code(order_id, sequence=0)
    second = generate_ticket_code(order_id, sequence=1)
    assert first != second
    assert first.endswith("-00")
    assert second.endswith("-01")
