"""Tests for event contracts."""

import json

from encore_event_contracts import (
    SEAT_HELD_EVENT_TYPE,
    SEAT_HELD_VERSION,
    EventEnvelope,
    SeatHeldPayload,
)


def test_envelope_serialisation():
    payload = SeatHeldPayload(
        event_id="evt_123",
        seat_id="seat_abc",
        inventory_id="inv_456",
        held_by_user_id="usr_789",
        held_at="2026-08-27T18:00:00Z",
        hold_expires_at="2026-08-27T18:15:00Z",
    )
    env = EventEnvelope(
        event_id="snwflk_123",
        event_type=SEAT_HELD_EVENT_TYPE,
        event_version=SEAT_HELD_VERSION,
        occurred_at="2026-08-27T18:00:00Z",
        trace_id="req_xyz",
        producer="api-gateway",
        key="evt_123",
        payload=payload.to_dict(),
    )

    j = env.to_json()
    assert isinstance(j, str)
    
    parsed = json.loads(j)
    assert parsed["event_id"] == "snwflk_123"
    assert parsed["event_type"] == SEAT_HELD_EVENT_TYPE
    assert parsed["event_version"] == 1
    assert parsed["payload"]["seat_id"] == "seat_abc"

    rebuilt = EventEnvelope.from_json(j)
    assert rebuilt == env
