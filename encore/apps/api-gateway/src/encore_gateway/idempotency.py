"""Idempotency-Key handling for mutating endpoints.

Implements docs/api/api-conventions.md section 3/7: any endpoint that
spends money, holds a seat, or issues a ticket must accept
`Idempotency-Key` and be safe to call twice with it.

Usage in a router:

    record = get_idempotent_response(db, key, endpoint="POST /api/v1/holds")
    if record is not None:
        return JSONResponse(status_code=record.status_code, content=json.loads(record.response_json))
    ... do the real work ...
    save_idempotent_response(db, key, endpoint="POST /api/v1/holds", status_code=201, response_body=body)
"""  # noqa: E501

from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from .models import IdempotencyRecord


def get_idempotent_response(db: Session, key: str, endpoint: str) -> IdempotencyRecord | None:
    return db.get(IdempotencyRecord, {"key": key, "endpoint": endpoint})


def save_idempotent_response(
    db: Session, key: str, endpoint: str, status_code: int, response_body: dict[str, Any]
) -> None:
    record = IdempotencyRecord(
        key=key,
        endpoint=endpoint,
        status_code=status_code,
        response_json=json.dumps(response_body, default=str),
    )
    db.add(record)
    # Deliberately not committed here — caller commits as part of the same
    # transaction as the actual mutation, so the idempotency record and the
    # effect it guards can never diverge (one succeeds, both do; one
    # rolls back, both do).
