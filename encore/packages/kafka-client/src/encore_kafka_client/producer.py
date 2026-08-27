"""Kafka producer abstraction.

Wraps kafka-python's KafkaProducer to enforce the Encore event envelope and
handle DLQ routing on delivery failure.
"""

from __future__ import annotations

import logging
from typing import Any

from encore_event_contracts import EventEnvelope
from kafka import KafkaProducer  # type: ignore[import-untyped]
from kafka.errors import KafkaError  # type: ignore[import-untyped]

logger = logging.getLogger(__name__)


class KafkaEventProducer:
    """Produces EventEnvelopes to Kafka topics."""

    def __init__(self, bootstrap_servers: str, producer_name: str) -> None:
        self.bootstrap_servers = bootstrap_servers
        self.producer_name = producer_name

        try:
            # We use acks='all' per Week 5 ADR-0008, ensuring leader and all
            # in-sync replicas acknowledge the message before success.
            # retries=3 with retry_backoff_ms=250 gives ~750ms of blocking
            # resilience to transient broker issues.
            self._producer = KafkaProducer(
                bootstrap_servers=self.bootstrap_servers,
                client_id=self.producer_name,
                acks="all",
                retries=3,
                retry_backoff_ms=250,
                key_serializer=lambda k: k.encode("utf-8") if k else None,
                value_serializer=lambda v: v.encode("utf-8"),
            )
            logger.info("KafkaEventProducer initialized against %s", bootstrap_servers)
        except KafkaError as exc:
            # If we fail to connect at startup, raise. It's the caller's job
            # (e.g. init_producer) to catch this and degrade gracefully.
            logger.error("Failed to initialize KafkaProducer: %s", exc)
            raise

    def publish(
        self,
        topic: str,
        envelope: EventEnvelope,
        *,
        partition_key: str | None = None,
    ) -> bool:
        """Publish one event. Returns True on success, False on failure.

        This is async under the hood (KafkaProducer buffers and sends in
        a background thread). We attach a callback. If the background send
        fails after all retries, the callback routes it to the DLQ.

        Callers do not need to try/except this. If it returns False, the
        caller can trust the event is logged and handled (DLQ).
        """
        key = partition_key or envelope.key
        value_json = envelope.to_json()

        def on_success(_metadata: Any) -> None:
            # metadata contains topic, partition, offset. We don't strictly
            # need it for anything in V1 other than debug tracing if enabled.
            pass

        def on_error(exc: Exception) -> None:
            logger.error(
                "Kafka delivery failed for event_id=%s topic=%s: %s. Routing to DLQ.",
                envelope.event_id,
                topic,
                exc,
            )
            self._send_to_dlq(topic, key, value_json, str(exc))

        try:
            future = self._producer.send(topic, key=key, value=value_json)
            future.add_callback(on_success)
            future.add_errback(on_error)
            return True
        except Exception as exc:
            # This catches immediate buffering errors (e.g. payload too large),
            # not network delivery errors (which hit the errback).
            logger.error(
                "Kafka buffering failed for event_id=%s topic=%s: %s. Routing to DLQ.",
                envelope.event_id,
                topic,
                exc,
            )
            self._send_to_dlq(topic, key, value_json, str(exc))
            return False

    def _send_to_dlq(self, original_topic: str, key: str, value_json: str, error_msg: str) -> None:
        """Attempt to write the failed message to the DLQ topic."""
        dlq_topic = f"{original_topic}.dlq"
        # We inject a small header with the error reason if we can, but since
        # value_json is already serialized, we just send it as-is for now.
        # A more robust DLQ might wrap the envelope in a DLQEnvelope, but
        # keeping it exactly the same shape means consumers can replay it directly.
        try:
            self._producer.send(
                dlq_topic,
                key=key,
                value=value_json,
                headers=[("dlq_error", error_msg.encode("utf-8"))],
            )
        except Exception as exc:
            # If the DLQ publish *also* fails, we have no choice but to drop it.
            # This usually means the entire Kafka cluster is unreachable.
            logger.critical(
                "DLQ delivery ALSO failed for topic=%s. Message lost. %s",
                dlq_topic,
                exc,
            )

    def flush(self, timeout: float = 10.0) -> None:
        """Block until all buffered messages are delivered or timeout expires."""
        self._producer.flush(timeout=timeout)

    def close(self) -> None:
        """Flush and close the producer cleanly."""
        self.flush()
        self._producer.close()
