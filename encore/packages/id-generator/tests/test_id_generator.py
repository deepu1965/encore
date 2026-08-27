"""Tests for SnowflakeIDGenerator.

All tests are framework-free and stdlib-only — no Redis, no FastAPI.
They run in any Python 3.11+ environment without external dependencies.

Test areas:
  - Basic correctness (non-zero, positive, correct type)
  - Monotonic ordering
  - Uniqueness across sequential and concurrent calls
  - Sequence counter increments within the same millisecond
  - Bit-field extraction (worker_id, sequence, timestamp)
  - as_uuid() storage format (always valid UUID, lower-64-bits encoding)
  - Worker ID validation
  - Thread safety (concurrent calls produce unique IDs)
"""

from __future__ import annotations

import threading
import time
import uuid

import pytest

from encore_id_generator import CUSTOM_EPOCH_MS, SnowflakeID, SnowflakeIDGenerator


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def gen() -> SnowflakeIDGenerator:
    """Default generator with worker_id=0."""
    return SnowflakeIDGenerator(worker_id=0)


@pytest.fixture()
def gen_w7() -> SnowflakeIDGenerator:
    """Generator with worker_id=7 for isolation tests."""
    return SnowflakeIDGenerator(worker_id=7)


# ---------------------------------------------------------------------------
# Basic correctness
# ---------------------------------------------------------------------------


def test_next_id_returns_snowflake_id(gen):
    sid = gen.next_id()
    assert isinstance(sid, SnowflakeID)


def test_id_value_is_positive(gen):
    sid = gen.next_id()
    assert sid.value > 0


def test_id_value_fits_in_63_bits(gen):
    """IDs must be positive signed 64-bit integers (top bit must be 0)."""
    for _ in range(100):
        sid = gen.next_id()
        assert sid.value < (1 << 63), f"ID overflowed 63 bits: {sid.value}"


# ---------------------------------------------------------------------------
# Monotonic ordering
# ---------------------------------------------------------------------------


def test_sequential_ids_are_monotonically_increasing(gen):
    ids = [gen.next_id().value for _ in range(100)]
    assert ids == sorted(ids), "IDs must be monotonically increasing"


def test_ids_across_workers_still_unique():
    """Different worker IDs produce non-conflicting IDs even in the same ms."""
    g1 = SnowflakeIDGenerator(worker_id=0)
    g2 = SnowflakeIDGenerator(worker_id=1)
    ids1 = {g1.next_id().value for _ in range(100)}
    ids2 = {g2.next_id().value for _ in range(100)}
    assert ids1.isdisjoint(ids2), "Workers produced overlapping IDs"


# ---------------------------------------------------------------------------
# Uniqueness
# ---------------------------------------------------------------------------


def test_sequential_ids_are_unique(gen):
    ids = [gen.next_id().value for _ in range(500)]
    assert len(set(ids)) == 500


# ---------------------------------------------------------------------------
# Bit-field extraction
# ---------------------------------------------------------------------------


def test_worker_id_is_embedded_correctly(gen_w7):
    sid = gen_w7.next_id()
    assert sid.worker_id() == 7


def test_worker_id_zero_for_default_gen(gen):
    sid = gen.next_id()
    assert sid.worker_id() == 0


def test_sequence_starts_at_zero(gen):
    """The very first ID from a fresh generator should have sequence 0."""
    fresh = SnowflakeIDGenerator(worker_id=0)
    sid = fresh.next_id()
    assert sid.sequence() == 0


def test_sequence_increments_within_same_millisecond(gen):
    """Force multiple IDs in same ms by using a fixed-time subclass."""

    class FixedClockGen(SnowflakeIDGenerator):
        def _current_ms(self) -> int:
            return 1_000  # always the same ms

    fixed_gen = FixedClockGen(worker_id=0)
    ids = [fixed_gen.next_id() for _ in range(5)]
    sequences = [sid.sequence() for sid in ids]
    assert sequences == [0, 1, 2, 3, 4]


def test_timestamp_is_within_acceptable_range(gen):
    """The embedded timestamp should be within ±100ms of now."""
    before_ms = int(time.time() * 1000)
    sid = gen.next_id()
    after_ms = int(time.time() * 1000)
    embedded_absolute = sid.timestamp_ms()
    assert before_ms - 100 <= embedded_absolute <= after_ms + 100


def test_timestamp_uses_custom_epoch(gen):
    """The embedded timestamp is relative to CUSTOM_EPOCH_MS, not Unix epoch."""
    sid = gen.next_id()
    # The relative value (raw timestamp bits) should be much smaller
    # than the full Unix millisecond timestamp.
    raw_relative = sid.value >> 22  # shift away worker+seq bits
    unix_ms_now = int(time.time() * 1000)
    custom_epoch_relative = unix_ms_now - CUSTOM_EPOCH_MS
    # raw_relative should be close to custom_epoch_relative (within 1 second)
    assert abs(raw_relative - custom_epoch_relative) < 1000


# ---------------------------------------------------------------------------
# as_uuid() storage format
# ---------------------------------------------------------------------------


def test_as_uuid_returns_uuid_object(gen):
    sid = gen.next_id()
    result = sid.as_uuid()
    assert isinstance(result, uuid.UUID)


def test_as_uuid_lower_64_bits_match_value(gen):
    """The UUID's integer representation should have the Snowflake value
    in the lower 64 bits and 0s in the upper 64 bits."""
    sid = gen.next_id()
    u = sid.as_uuid()
    lower_64 = u.int & ((1 << 64) - 1)
    upper_64 = u.int >> 64
    assert lower_64 == sid.value
    assert upper_64 == 0


def test_as_uuid_is_valid_uuid_format(gen):
    """UUID string should parse back to the same UUID without error."""
    sid = gen.next_id()
    u = sid.as_uuid()
    reparsed = uuid.UUID(str(u))
    assert reparsed == u


def test_as_uuid_sort_order_matches_value_order():
    """UUIDs produced by sequential IDs should sort the same way as the
    raw integer values (critical for index efficiency claims)."""
    gen = SnowflakeIDGenerator(worker_id=0)
    ids = [gen.next_id() for _ in range(20)]
    raw_order = [sid.value for sid in ids]
    uuid_int_order = [sid.as_uuid().int for sid in ids]
    assert raw_order == sorted(raw_order)
    assert uuid_int_order == sorted(uuid_int_order)


# ---------------------------------------------------------------------------
# Worker ID validation
# ---------------------------------------------------------------------------


def test_worker_id_zero_is_valid():
    SnowflakeIDGenerator(worker_id=0)  # should not raise


def test_worker_id_1023_is_valid():
    SnowflakeIDGenerator(worker_id=1023)  # max valid


def test_worker_id_negative_raises():
    with pytest.raises(ValueError):
        SnowflakeIDGenerator(worker_id=-1)


def test_worker_id_1024_raises():
    with pytest.raises(ValueError):
        SnowflakeIDGenerator(worker_id=1024)


# ---------------------------------------------------------------------------
# Thread safety
# ---------------------------------------------------------------------------


def test_concurrent_calls_produce_unique_ids():
    """1000 concurrent next_id() calls across 10 threads must all be unique."""
    gen = SnowflakeIDGenerator(worker_id=0)
    results: list[int] = []
    lock = threading.Lock()

    def worker():
        for _ in range(100):
            sid = gen.next_id()
            with lock:
                results.append(sid.value)

    threads = [threading.Thread(target=worker) for _ in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(results) == 1000
    assert len(set(results)) == 1000, "Concurrent calls produced duplicate IDs"
