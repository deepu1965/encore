"""Snowflake-style 64-bit distributed ID generator.

BIT LAYOUT (64 bits total, always positive):
─────────────────────────────────────────────

  63        22 21     12 11       0
  ┌──────────┬──────────┬──────────┐
  │ timestamp│ worker_id│ sequence │
  │  41 bits │  10 bits │  12 bits │
  └──────────┴──────────┴──────────┘

  timestamp (41 bits)
      Milliseconds since CUSTOM_EPOCH_MS (2024-01-01T00:00:00Z UTC).
      41 bits gives ~69 years before overflow (until ~2093).

  worker_id (10 bits)
      0-1023. Read from env var SNOWFLAKE_WORKER_ID (default: 0).
      In a multi-process deployment each process/pod gets a unique
      worker_id (assigned by the orchestrator or config). Week 4 uses
      worker_id=0 for the single local process.

  sequence (12 bits)
      0-4095 per millisecond per worker. Monotonically incremented and
      reset to 0 when the millisecond advances.

THREAD SAFETY:
──────────────
A threading.Lock protects (last_ms, sequence) state. All public methods
acquire the lock before reading or mutating state.

CLOCK SKEW:
───────────
If `time.time_ns()` returns a value smaller than last_ms (clock moved
backward — NTP step, VM migration, etc.), the generator spin-waits until
the clock catches up. This is the same strategy used by Twitter's original
Snowflake service. A WARNING is logged. In Week 4 this is extremely
unlikely on a single local process; the handling exists so the generator
is correct-by-default and doesn't silently emit duplicate IDs.

CAPACITY:
─────────
Max IDs per ms per worker: 4096.
Max IDs per second per worker: 4,096,000.
This far exceeds Encore's needs in Week 4 and for the foreseeable future.

STORAGE:
────────
`SnowflakeID.as_uuid()` packs the 64-bit integer into a uuid.UUID by
placing it in the lower 64 bits (upper 64 bits = 0). This produces a
valid UUID that sorts correctly (as_uuid().int preserves ordering for IDs
generated within the same millisecond-and-sequence range). The resulting
UUID is always of the form `00000000-0000-0000-xxxx-xxxxxxxxxxxx`, which
is visually distinct from random UUIDs.
"""

from __future__ import annotations

import logging
import os
import threading
import time
import uuid
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Custom epoch: 2024-01-01T00:00:00Z in milliseconds.
# Never change this after IDs have been generated — changing the epoch
# makes all existing IDs uninterpretable.
CUSTOM_EPOCH_MS: int = 1_704_067_200_000

# Bit layout constants
_TIMESTAMP_BITS = 41
_WORKER_ID_BITS = 10
_SEQUENCE_BITS = 12

_MAX_WORKER_ID = (1 << _WORKER_ID_BITS) - 1   # 1023
_MAX_SEQUENCE = (1 << _SEQUENCE_BITS) - 1       # 4095

_WORKER_ID_SHIFT = _SEQUENCE_BITS               # 12
_TIMESTAMP_SHIFT = _SEQUENCE_BITS + _WORKER_ID_BITS  # 22


@dataclass(frozen=True)
class SnowflakeID:
    """Immutable value object representing a single Snowflake ID.

    Attributes:
        value: The raw 64-bit integer.
    """

    value: int

    def as_uuid(self) -> uuid.UUID:
        """Return a uuid.UUID with the Snowflake ID in the lower 64 bits.

        This is the storage representation used with existing UUID columns.
        The upper 64 bits are always 0, making these values visually
        distinct from random UUIDs in logs and the database.

        The integer representation preserves sort order within a single
        worker+millisecond window, which is sufficient for the current
        single-worker deployment.
        """
        return uuid.UUID(int=self.value)

    def timestamp_ms(self) -> int:
        """Extract the embedded millisecond timestamp (absolute UTC ms)."""
        return (self.value >> _TIMESTAMP_SHIFT) + CUSTOM_EPOCH_MS

    def worker_id(self) -> int:
        """Extract the embedded worker ID (0-1023)."""
        return (self.value >> _WORKER_ID_SHIFT) & _MAX_WORKER_ID

    def sequence(self) -> int:
        """Extract the embedded sequence number (0-4095)."""
        return self.value & _MAX_SEQUENCE

    def __str__(self) -> str:
        return str(self.value)

    def __repr__(self) -> str:
        return (
            f"SnowflakeID(value={self.value}, "
            f"ts={self.timestamp_ms()}, "
            f"worker={self.worker_id()}, "
            f"seq={self.sequence()})"
        )


class SnowflakeIDGenerator:
    """Thread-safe Snowflake ID generator.

    Intended to be used as a process-scoped singleton. In the API gateway,
    one instance is created during the lifespan startup and stored on
    app.state.id_generator.

    Args:
        worker_id: 0-1023. Defaults to SNOWFLAKE_WORKER_ID env var, then 0.
        epoch_ms:  Custom epoch in milliseconds UTC. Defaults to CUSTOM_EPOCH_MS.
                   Only override in tests.
    """

    def __init__(
        self,
        worker_id: int | None = None,
        epoch_ms: int = CUSTOM_EPOCH_MS,
    ) -> None:
        if worker_id is None:
            worker_id = int(os.environ.get("SNOWFLAKE_WORKER_ID", "0"))

        if not (0 <= worker_id <= _MAX_WORKER_ID):
            raise ValueError(
                f"worker_id must be 0-{_MAX_WORKER_ID}, got {worker_id}"
            )

        self._worker_id = worker_id
        self._epoch_ms = epoch_ms
        self._lock = threading.Lock()
        self._last_ms: int = -1
        self._sequence: int = 0

    @property
    def worker_id(self) -> int:
        return self._worker_id

    def next_id(self) -> SnowflakeID:
        """Generate the next unique Snowflake ID. Thread-safe."""
        with self._lock:
            return self._generate()

    def _current_ms(self) -> int:
        """Return milliseconds since the custom epoch."""
        return int(time.time() * 1000) - self._epoch_ms

    def _generate(self) -> SnowflakeID:
        """Core generation logic — must be called with lock held."""
        now_ms = self._current_ms()

        if now_ms < self._last_ms:
            # Clock moved backward. Spin-wait until we catch up.
            delta = self._last_ms - now_ms
            logger.warning(
                "Snowflake clock moved backward by %d ms (worker %d). "
                "Spin-waiting until clock catches up.",
                delta,
                self._worker_id,
            )
            while now_ms < self._last_ms:
                now_ms = self._current_ms()

        if now_ms == self._last_ms:
            self._sequence = (self._sequence + 1) & _MAX_SEQUENCE
            if self._sequence == 0:
                # Sequence exhausted for this millisecond — wait for next ms.
                while now_ms <= self._last_ms:
                    now_ms = self._current_ms()
        else:
            self._sequence = 0

        self._last_ms = now_ms

        value = (
            (now_ms << _TIMESTAMP_SHIFT)
            | (self._worker_id << _WORKER_ID_SHIFT)
            | self._sequence
        )
        return SnowflakeID(value=value)
