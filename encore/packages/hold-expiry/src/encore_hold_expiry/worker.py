"""Background worker for expiring stale seat holds.

Runs as a daemon thread. Polling every `interval_secs`, it executes an
UPDATE ... RETURNING to find and release any holds where
`hold_expires_at < NOW()`.

PostgreSQL Advisory Lock:
    To support running multiple API Gateway instances (horizontal scaling),
    this worker uses `pg_try_advisory_lock`. Only the instance that acquires
    the lock will actually execute the expiry query. This prevents lock
    contention and duplicate Kafka events.
"""

from __future__ import annotations

import logging
import threading
from datetime import datetime, timezone

from encore_event_contracts import (
    SEAT_HOLD_EXPIRED_EVENT_TYPE,
    SEAT_HOLD_EXPIRED_TOPIC,
    SEAT_HOLD_EXPIRED_VERSION,
    SeatHoldExpiredPayload,
)
from encore_id_generator import SnowflakeIDGenerator
from encore_kafka_client import KafkaEventProducer, build_envelope
from sqlalchemy import text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)


class HoldExpiryWorker:
    """Daemon thread that polls for expired holds and releases them."""

    def __init__(
        self,
        engine: Engine,
        producer: KafkaEventProducer | None,
        poll_interval_secs: int,
        advisory_lock_id: int = 1001,
    ) -> None:
        self._engine = engine
        self._producer = producer
        self._poll_interval_secs = poll_interval_secs
        self._advisory_lock_id = advisory_lock_id
        self._id_gen = SnowflakeIDGenerator()
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        """Start the daemon thread."""
        self._thread = threading.Thread(
            target=self._run,
            name="hold-expiry-worker",
            daemon=True,
        )
        self._thread.start()
        logger.info(
            "Hold expiry worker started — polling every %ds (lock_id=%d)",
            self._poll_interval_secs,
            self._advisory_lock_id,
        )

    def stop(self, timeout: float = 5.0) -> None:
        """Signal thread to stop and wait."""
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=timeout)

    def _run(self) -> None:
        """Loop until stopped."""
        while not self._stop_event.is_set():
            self._stop_event.wait(timeout=self._poll_interval_secs)
            if self._stop_event.is_set():
                break
            try:
                self._tick()
            except Exception as exc:
                logger.error("Hold expiry worker tick failed: %s", exc)

    def _tick(self) -> int:
        """Attempt to run the expiry update, returning the number of expired rows.

        Uses a transaction-level advisory lock (`pg_try_advisory_xact_lock`).
        If the lock is acquired, runs the UPDATE and emits events.
        If the lock is held by another worker instance, does nothing.
        """
        expired_count = 0

        # Note: We use a transaction-level lock so it is automatically released
        # when the transaction commits or rolls back.
        with self._engine.begin() as conn:
            # 1. Try to acquire the advisory lock
            lock_res = conn.execute(
                text("SELECT pg_try_advisory_xact_lock(:lock_id)"),
                {"lock_id": self._advisory_lock_id}
            ).scalar()

            if not lock_res:
                # Another instance is holding the lock, skip this tick
                return 0

            # 2. Execute the expiry query
            # We use string matching to avoid depending on ORM models here.
            query = text(
                """
                UPDATE inventory
                SET status = 'AVAILABLE',
                    held_by_user_id = NULL,
                    held_at = NULL,
                    hold_expires_at = NULL,
                    updated_at = NOW()
                WHERE status = 'HELD'
                  AND hold_expires_at IS NOT NULL
                  AND hold_expires_at < NOW()
                RETURNING id, event_id, seat_id, held_by_user_id
                """
            )
            result = conn.execute(query)
            rows = result.fetchall()
            expired_count = len(rows)

            # 3. Emit Kafka events
            now = datetime.now(timezone.utc).isoformat(timespec="milliseconds")
            if now.endswith("+00:00"):
                now = now[:-6] + "Z"

            for row in rows:
                inventory_id, event_id, seat_id, was_held_by_user_id = row
                logger.info(
                    "Hold expired for inventory %s (event %s, seat %s)",
                    inventory_id, event_id, seat_id
                )
                self._emit_expired_event(
                    event_id=str(event_id),
                    seat_id=str(seat_id),
                    inventory_id=str(inventory_id),
                    was_held_by_user_id=str(was_held_by_user_id),
                    expired_at=now,
                )

        return expired_count

    def _emit_expired_event(
        self,
        event_id: str,
        seat_id: str,
        inventory_id: str,
        was_held_by_user_id: str,
        expired_at: str,
    ) -> None:
        """Emit the inventory.seat.hold_expired Kafka event."""
        if self._producer is None:
            return
        try:
            envelope = build_envelope(
                event_type=SEAT_HOLD_EXPIRED_EVENT_TYPE,
                event_version=SEAT_HOLD_EXPIRED_VERSION,
                key=event_id,
                payload=SeatHoldExpiredPayload(
                    event_id=event_id,
                    seat_id=seat_id,
                    inventory_id=inventory_id,
                    was_held_by_user_id=was_held_by_user_id,
                    expired_at=expired_at,
                ).to_dict(),
                producer_name="hold-expiry-worker",
                trace_id="",  # Background task, no HTTP trace context
                id_generator=self._id_gen,
            )
            self._producer.publish(SEAT_HOLD_EXPIRED_TOPIC, envelope)
        except Exception as exc:
            logger.warning(
                "Failed to emit hold_expired event for inventory %s: %s",
                inventory_id, exc
            )
