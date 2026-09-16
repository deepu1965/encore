"""Admission ticker: background thread that periodically admits users from the queue.

DESIGN:
    AdmissionTicker runs in a daemon thread, sleeping `interval_secs` between
    each tick. On every tick it iterates over the configured flash-sale event IDs,
    calls WaitingRoomQueue.admit_batch(event_id, batch_size) for each, and emits
    a `waitingroom.user.admitted` Kafka event for every user admitted.

    It is a daemon thread — it dies automatically when the main process exits.
    On graceful shutdown (SIGTERM → lifespan teardown), `stop()` is called which
    sets the stop event and joins the thread with a short timeout.

FAIL-OPEN:
    If Kafka is unavailable during a tick, the admission still happens (users are
    granted tokens) and the Kafka emit is silently dropped (the producer logs a
    WARNING and routes to DLQ). Admission correctness does not depend on Kafka.
"""

from __future__ import annotations

import logging
import threading
from datetime import UTC, datetime

from encore_event_contracts import (
    WAITING_ROOM_ADMITTED_EVENT_TYPE,
    WAITING_ROOM_ADMITTED_TOPIC,
    WAITING_ROOM_ADMITTED_VERSION,
    WaitingRoomAdmittedPayload,
)
from encore_id_generator import SnowflakeIDGenerator
from encore_kafka_client import KafkaEventProducer, build_envelope

from .queue import WaitingRoomQueue

logger = logging.getLogger(__name__)

_id_gen = SnowflakeIDGenerator()


class AdmissionTicker:
    """Periodically admits users from all flash-sale waiting queues."""

    def __init__(
        self,
        queue: WaitingRoomQueue,
        event_ids: list[str],
        batch_size: int,
        interval_secs: int,
        producer: KafkaEventProducer | None = None,
    ) -> None:
        self._queue = queue
        self._event_ids = event_ids
        self._batch_size = batch_size
        self._interval_secs = interval_secs
        self._producer = producer
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        """Start the background admission ticker thread."""
        if not self._event_ids:
            logger.info("No flash-sale events configured; admission ticker not started.")
            return
        self._thread = threading.Thread(
            target=self._run,
            name="admission-ticker",
            daemon=True,
        )
        self._thread.start()
        logger.info(
            "Admission ticker started — %d event(s), batch=%d, interval=%ds",
            len(self._event_ids),
            self._batch_size,
            self._interval_secs,
        )

    def stop(self, timeout: float = 5.0) -> None:
        """Signal the ticker to stop and wait for the thread to exit."""
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=timeout)

    def _run(self) -> None:
        """Main loop: sleep interval_secs, then tick, repeat until stopped."""
        while not self._stop_event.is_set():
            self._stop_event.wait(timeout=self._interval_secs)
            if self._stop_event.is_set():
                break
            self._tick()

    def _tick(self) -> None:
        """Admit a batch of users from each flash-sale event queue."""
        for event_id in self._event_ids:
            try:
                admitted = self._queue.admit_batch(event_id, self._batch_size)
                if not admitted:
                    continue
                logger.info("Admitted %d users for event %s", len(admitted), event_id)
                for user_id in admitted:
                    self._emit_admitted_event(event_id, user_id)
            except Exception as exc:
                logger.error(
                    "Admission ticker tick failed for event %s: %s", event_id, exc
                )

    def _emit_admitted_event(self, event_id: str, user_id: str) -> None:
        """Emit waitingroom.user.admitted — best-effort, non-blocking."""
        if self._producer is None:
            return
        now = datetime.now(UTC).isoformat(timespec="milliseconds")
        if now.endswith("+00:00"):
            now = now[:-6] + "Z"
        try:
            envelope = build_envelope(
                event_type=WAITING_ROOM_ADMITTED_EVENT_TYPE,
                event_version=WAITING_ROOM_ADMITTED_VERSION,
                key=event_id,  # partition by event_id
                payload=WaitingRoomAdmittedPayload(
                    event_id=event_id,
                    user_id=user_id,
                    admitted_at=now,
                ).to_dict(),
                producer_name="waiting-room",
                trace_id="",  # no HTTP trace context in background thread
                id_generator=_id_gen,
            )
            self._producer.publish(WAITING_ROOM_ADMITTED_TOPIC, envelope)
        except Exception as exc:
            logger.warning(
                "Failed to emit waitingroom.user.admitted for user %s: %s", user_id, exc
            )
