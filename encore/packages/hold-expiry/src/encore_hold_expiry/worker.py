"""Background worker for expiring stale seat holds.

Runs as a daemon thread. Polling every `interval_secs`, it executes an
UPDATE ... RETURNING to find and release any holds where
`hold_expires_at < NOW()`.

PostgreSQL Advisory Lock:
    To support running multiple API Gateway instances (horizontal scaling),
    this worker uses `pg_try_advisory_xact_lock`. Only the instance that
    acquires the lock will execute the expiry query. This prevents duplicate
    Kafka events.

Redis cleanup (Week 8):
    When a hold is expired in Postgres, the matching Redis SETNX lock key
    (hold:{event_id}:{seat_id}) and the per-seat status cache key
    (inventory:{inventory_id}:status) are also deleted so subsequent hold
    requests are not spuriously rejected by a stale Redis lock.
    If redis_client is None, Redis cleanup is skipped (backward-compatible).
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
        primary_engine: Engine,
        shard_engines: list[Engine],
        producer: KafkaEventProducer | None,
        poll_interval_secs: int,
        advisory_lock_id: int = 1001,
        redis_client: object | None = None,
    ) -> None:
        self._primary_engine = primary_engine
        self._shard_engines = shard_engines
        self._producer = producer
        self._poll_interval_secs = poll_interval_secs
        self._advisory_lock_id = advisory_lock_id
        self._redis = redis_client  # optional — for Week 8 Redis key cleanup
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
        with self._primary_engine.begin() as primary_conn:
            # 1. Try to acquire the advisory lock on primary
            lock_res = primary_conn.execute(
                text("SELECT pg_try_advisory_xact_lock(:lock_id)"),
                {"lock_id": self._advisory_lock_id}
            ).scalar()

            if not lock_res:
                # Another instance is holding the lock, skip this tick
                return 0

            for shard_engine in self._shard_engines:
                with shard_engine.begin() as shard_conn:
                    # 2. Find expired holds
                    select_query = text(
                        """
                        SELECT id, event_id, seat_id, held_by_user_id
                        FROM inventory
                        WHERE status = 'HELD'
                          AND hold_expires_at IS NOT NULL
                          AND hold_expires_at < NOW()
                        """
                    )
                    result = shard_conn.execute(select_query)
                    rows = result.fetchall()
                    if not rows:
                        continue

                    expired_count += len(rows)
                    expired_ids = [row[0] for row in rows]
                    placeholders = ", ".join(f":id_{i}" for i in range(len(expired_ids)))

                    # 3. Update them to AVAILABLE
                    update_query = text(
                        f"""
                        UPDATE inventory
                        SET status = 'AVAILABLE',
                            held_by_user_id = NULL,
                            held_at = NULL,
                            hold_expires_at = NULL,
                            updated_at = NOW()
                        WHERE id IN ({placeholders})
                        """
                    )
                    params = {f"id_{i}": val for i, val in enumerate(expired_ids)}
                    shard_conn.execute(update_query, params)

                    # 2b. Expire any PENDING orders tied to these holds
                    for row in rows:
                        _, event_id, _, was_held_by_user_id = row
                        if was_held_by_user_id:
                            primary_conn.execute(
                                text("""
                                UPDATE orders
                                SET status = 'EXPIRED'
                                WHERE event_id = :event_id
                                  AND user_id = :user_id
                                  AND status = 'PENDING'
                                """),
                                {"event_id": event_id, "user_id": was_held_by_user_id}
                            )

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
                        # 4. Delete stale Redis keys (Week 8)
                        self._delete_redis_keys(
                            event_id=str(event_id),
                            seat_id=str(seat_id),
                            inventory_id=str(inventory_id),
                        )




        return expired_count

    def _delete_redis_keys(self, event_id: str, seat_id: str, inventory_id: str) -> None:
        """Delete the Redis SETNX hold lock and status cache on hold expiry.

        Silently skipped if no Redis client was provided (backward-compat).
        Errors are caught and logged — Redis failure must never block expiry.
        """
        if self._redis is None:
            return
        try:
            hold_k = f"hold:{event_id}:{seat_id}"
            status_k = f"inventory:{inventory_id}:status"
            self._redis.delete(hold_k, status_k)
            logger.debug("Deleted Redis keys on hold expiry: %s, %s", hold_k, status_k)
        except Exception as exc:
            logger.warning("Failed to delete Redis keys on hold expiry: %s", exc)

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
