"""Tests for KafkaEventProducer."""

import json
from unittest.mock import MagicMock, patch

from encore_event_contracts import EventEnvelope
from encore_kafka_client import KafkaEventProducer

_DUMMY_ENVELOPE = EventEnvelope(
    event_id="evt_123",
    event_type="test.event",
    event_version=1,
    occurred_at="2026-08-27T18:00:00Z",
    trace_id="req_xyz",
    producer="test",
    key="key_123",
    payload={"foo": "bar"},
)


@patch("encore_kafka_client.producer.KafkaProducer")
def test_publish_success(mock_kafka_class):
    mock_producer = MagicMock()
    mock_future = MagicMock()
    mock_producer.send.return_value = mock_future
    mock_kafka_class.return_value = mock_producer

    producer = KafkaEventProducer("localhost:9092", "test_producer")
    result = producer.publish("test.topic", _DUMMY_ENVELOPE)

    assert result is True
    mock_producer.send.assert_called_once_with(
        "test.topic",
        key="key_123",
        value=_DUMMY_ENVELOPE.to_json(),
    )
    # Callbacks attached
    mock_future.add_callback.assert_called_once()
    mock_future.add_errback.assert_called_once()


@patch("encore_kafka_client.producer.KafkaProducer")
def test_publish_buffer_error_routes_to_dlq(mock_kafka_class):
    mock_producer = MagicMock()
    # Simulate an immediate failure (e.g. payload too large) before callbacks
    mock_producer.send.side_effect = Exception("Buffer full")
    mock_kafka_class.return_value = mock_producer

    producer = KafkaEventProducer("localhost:9092", "test_producer")
    result = producer.publish("test.topic", _DUMMY_ENVELOPE)

    assert result is False
    # send was called twice: once for original, once for DLQ
    assert mock_producer.send.call_count == 2
    
    # Check DLQ call args
    dlq_call = mock_producer.send.call_args_list[1]
    assert dlq_call.args[0] == "test.topic.dlq"
    assert dlq_call.kwargs["key"] == "key_123"
    assert dlq_call.kwargs["headers"][0][0] == "dlq_error"
    assert b"Buffer full" in dlq_call.kwargs["headers"][0][1]


@patch("encore_kafka_client.producer.KafkaProducer")
def test_delivery_error_routes_to_dlq(mock_kafka_class):
    mock_producer = MagicMock()
    mock_future = MagicMock()
    mock_producer.send.return_value = mock_future
    mock_kafka_class.return_value = mock_producer

    producer = KafkaEventProducer("localhost:9092", "test_producer")
    
    def simulate_errback(*args, **kwargs):
        # We grab the errback and run it manually
        errback = mock_future.add_errback.call_args[0][0]
        errback(Exception("Delivery failed"))

    mock_future.add_errback.side_effect = simulate_errback
    
    # It returns True because buffering succeeded, but the background
    # delivery will fail and trigger DLQ.
    result = producer.publish("test.topic", _DUMMY_ENVELOPE)
    assert result is True

    # First send is the original, second is DLQ
    assert mock_producer.send.call_count == 2
    dlq_call = mock_producer.send.call_args_list[1]
    assert dlq_call.args[0] == "test.topic.dlq"


@patch("encore_kafka_client.producer.KafkaProducer")
def test_close_flushes(mock_kafka_class):
    mock_producer = MagicMock()
    mock_kafka_class.return_value = mock_producer

    producer = KafkaEventProducer("localhost:9092", "test_producer")
    producer.close()

    mock_producer.flush.assert_called_once()
    mock_producer.close.assert_called_once()
