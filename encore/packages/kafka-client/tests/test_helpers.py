"""Tests for Kafka client helpers."""

from encore_id_generator import SnowflakeIDGenerator

from encore_kafka_client import build_envelope


def test_build_envelope_populates_required_fields():
    gen = SnowflakeIDGenerator()
    
    envelope = build_envelope(
        event_type="test.event",
        event_version=2,
        key="key_abc",
        payload={"msg": "hello"},
        producer_name="test-service",
        trace_id="req_123",
        id_generator=gen,
    )
    
    assert envelope.event_type == "test.event"
    assert envelope.event_version == 2
    assert envelope.key == "key_abc"
    assert envelope.payload == {"msg": "hello"}
    assert envelope.producer == "test-service"
    assert envelope.trace_id == "req_123"
    
    # Generated fields
    assert envelope.event_id != ""
    assert isinstance(envelope.event_id, str)
    
    # occurred_at must be ISO 8601 UTC
    assert "T" in envelope.occurred_at
    assert envelope.occurred_at.endswith("Z")
