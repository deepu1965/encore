"""Cursor-based pagination helper.

docs/api/api-conventions.md section 6 specifies cursor pagination
everywhere, chosen specifically because offset pagination breaks under
concurrent writes — which this system has a lot of. This is the one
shared implementation every paginated endpoint (events today; search,
feed, resale order-book in later weeks) should reuse rather than
reinventing.

Cursor encodes (created_at, id) of the last item on the previous page,
base64'd so it's opaque to the client per convention (clients treat it as
a token, not something to parse or construct).
"""

from __future__ import annotations

import base64
import uuid
from datetime import datetime


def encode_cursor(created_at: datetime, item_id: uuid.UUID) -> str:
    raw = f"{created_at.isoformat()}|{item_id}"
    return base64.urlsafe_b64encode(raw.encode()).decode()


def decode_cursor(cursor: str) -> tuple[datetime, uuid.UUID]:
    raw = base64.urlsafe_b64decode(cursor.encode()).decode()
    created_at_str, id_str = raw.split("|", 1)
    return datetime.fromisoformat(created_at_str), uuid.UUID(id_str)
