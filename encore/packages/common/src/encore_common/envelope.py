"""Response envelope helpers.

Implements the success/error shape defined in docs/api/api-conventions.md
section 4. Every service's HTTP layer should build responses through these
helpers rather than hand-rolling dicts, so the envelope can't drift between
services.
"""

from __future__ import annotations

from typing import Any


def success_envelope(data: Any, request_id: str) -> dict[str, Any]:
    """Build a success response envelope.

    Args:
        data: The payload to return to the caller.
        request_id: The X-Request-Id for this request (see
            api-conventions.md section 3), used for client-side log
            correlation.
    """
    return {"data": data, "request_id": request_id}


def error_envelope(
    code: str,
    message: str,
    request_id: str,
    retryable: bool = False,
) -> dict[str, Any]:
    """Build an error response envelope.

    Args:
        code: Stable, machine-readable SCREAMING_SNAKE_CASE error code.
            Client code branches on this, never on `message`.
        message: Human-readable explanation, for logs/debugging only.
        request_id: The X-Request-Id for this request.
        retryable: Whether the client can safely retry the exact same
            request (with the same Idempotency-Key, if applicable).
    """
    return {
        "error": {
            "code": code,
            "message": message,
            "retryable": retryable,
        },
        "request_id": request_id,
    }
