"""Helpers for Kafka clients."""

from __future__ import annotations

from datetime import datetime, timezone

from encore_event_contracts import EventEnvelope
from encore_id_generator import SnowflakeIDGenerator


def build_envelope(
    event_type: str,
    event_version: int,
    key: str,
    payload: dict,
    producer_name: str,
    trace_id: str,
    id_generator: SnowflakeIDGenerator,
) -> EventEnvelope:
    """Construct a fully-populated EventEnvelope from parts."""
    now = datetime.now(timezone.utc).isoformat(timespec="milliseconds")
    # Replace +00:00 with Z for stricter ISO 8601 formatting commonly expected
    if now.endswith("+00:00"):
        now = now[:-6] + "Z"

    return EventEnvelope(
        event_id=str(id_generator.next_id()),
        event_type=event_type,
        event_version=event_version,
        occurred_at=now,
        trace_id=trace_id,
        producer=producer_name,
        key=key,
        payload=payload,
    )
