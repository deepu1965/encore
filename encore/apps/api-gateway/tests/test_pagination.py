import uuid
from datetime import UTC, datetime

from encore_gateway.pagination import decode_cursor, encode_cursor


def test_cursor_round_trips():
    created_at = datetime(2026, 8, 24, 10, 15, 0, tzinfo=UTC)
    item_id = uuid.uuid4()

    cursor = encode_cursor(created_at, item_id)
    decoded_created_at, decoded_id = decode_cursor(cursor)

    assert decoded_created_at == created_at
    assert decoded_id == item_id


def test_cursor_is_opaque_base64_not_readable_plaintext():
    created_at = datetime(2026, 8, 24, 10, 15, 0, tzinfo=UTC)
    item_id = uuid.uuid4()
    cursor = encode_cursor(created_at, item_id)

    assert str(item_id) not in cursor
    assert "2026-08-24" not in cursor


def test_different_items_produce_different_cursors():
    created_at = datetime(2026, 8, 24, 10, 15, 0, tzinfo=UTC)
    cursor_a = encode_cursor(created_at, uuid.uuid4())
    cursor_b = encode_cursor(created_at, uuid.uuid4())
    assert cursor_a != cursor_b
