"""Kafka consumer abstraction.

Base class for at-least-once consumers with exponential-backoff retry and
DLQ routing.
"""

from __future__ import annotations

import logging
import time
from typing import Any

from encore_event_contracts import EventEnvelope
from kafka import KafkaConsumer  # type: ignore[import-untyped]
from kafka.errors import KafkaError  # type: ignore[import-untyped]
from opentelemetry import propagate, trace

from .producer import KafkaEventProducer

logger = logging.getLogger(__name__)


class KafkaEventConsumer:
    """Base class for at-least-once Kafka consumers.

    Subclasses must override `handle_event(envelope)`.
    """

    def __init__(
        self,
        bootstrap_servers: str,
        topic: str,
        group_id: str,
        producer: KafkaEventProducer | None = None,
    ) -> None:
        self.bootstrap_servers = bootstrap_servers
        self.topic = topic
        self.group_id = group_id
        self._running = False
        
        # We need a producer to publish to the DLQ if retries fail.
        self._dlq_producer = producer or KafkaEventProducer(
            bootstrap_servers=bootstrap_servers,
            producer_name=f"{group_id}-dlq-producer",
        )

        try:
            self._consumer = KafkaConsumer(
                topic,
                bootstrap_servers=bootstrap_servers,
                group_id=group_id,
                # At-least-once requires manual offset commits after successful processing
                enable_auto_commit=False,
                auto_offset_reset="earliest",
                value_deserializer=lambda v: v.decode("utf-8"),
            )
        except KafkaError as exc:
            logger.error("Failed to initialize KafkaConsumer: %s", exc)
            raise

    def start(self) -> None:
        """Blocking poll loop."""
        self._running = True
        logger.info("Consumer %s started for topic %s", self.group_id, self.topic)
        
        try:
            while self._running:
                # poll(timeout_ms) returns a dict of {TopicPartition: [ConsumerRecord]}
                records_dict = self._consumer.poll(timeout_ms=1000)
                if not records_dict:
                    continue

                for _tp, messages in records_dict.items():
                    for msg in messages:
                        self._process_message_with_retries(msg)
                        
                        # Commit offset after *each* message (or batch) is successfully
                        # processed or routed to DLQ. This ensures at-least-once semantics.
                        # For high throughput, we'd commit per batch, but per-message
                        # is safer for V1.
                        if self._running:
                            self._consumer.commit()
                            
        except Exception as exc:
            logger.error("Consumer %s poll loop crashed: %s", self.group_id, exc)
            raise
        finally:
            self._consumer.close()
            self._dlq_producer.close()
            logger.info("Consumer %s stopped", self.group_id)

    def _process_message_with_retries(self, msg: Any) -> None:
        raw_value = msg.value
        try:
            envelope = EventEnvelope.from_json(raw_value)
        except Exception as exc:
            logger.error("Malformed message, routing to DLQ directly: %s", exc)
            self._dlq_producer._send_to_dlq(self.topic, "malformed", raw_value, str(exc))
            return

        headers = msg.headers or []
        headers_dict = {k: v.decode("utf-8") for k, v in headers if v is not None}
        ctx = propagate.extract(headers_dict)
        
        tracer = trace.get_tracer(__name__)

        retries = [0.25, 0.5, 1.0]  # seconds
        for attempt, backoff in enumerate(retries + [None]):
            with tracer.start_as_current_span(
                f"{self.topic} process attempt {attempt+1}", 
                context=ctx,
                attributes={"event_id": envelope.event_id}
            ):
                try:
                    self.handle_event(envelope)
                    return  # Success
                except Exception as exc:
                    if backoff is not None:
                        logger.warning(
                        "Error processing event_id=%s (attempt %d). Retrying in %.2fs: %s",
                        envelope.event_id,
                        attempt + 1,
                        backoff,
                        exc,
                    )
                        self._sleep_with_heartbeat(backoff)
                    else:
                        logger.error(
                            "Failed processing event_id=%s after %d attempts. Routing to DLQ: %s",
                            envelope.event_id,
                            len(retries) + 1,
                            exc,
                        )
                        self._dlq_producer._send_to_dlq(self.topic, envelope.key, raw_value, str(exc))  # noqa: E501

    def _sleep_with_heartbeat(self, duration: float) -> None:
        """Sleeps while continuing to send heartbeats by polling with paused partitions."""
        assigned = self._consumer.assignment()
        self._consumer.pause(*assigned)
        
        end_time = time.time() + duration
        try:
            while time.time() < end_time and self._running:
                remaining_ms = int((end_time - time.time()) * 1000)
                if remaining_ms > 0:
                    self._consumer.poll(timeout_ms=min(remaining_ms, 500))
        finally:
            self._consumer.resume(*assigned)

    def handle_event(self, envelope: EventEnvelope) -> None:
        """Process one event. Raise an exception to trigger the retry/DLQ flow.
        
        Must be overridden by subclasses.
        """
        raise NotImplementedError("Subclasses must implement handle_event")

    def stop(self) -> None:
        """Signal the poll loop to stop cleanly."""
        self._running = False
