"""Tests for WaitingRoomQueue (fakeredis, no real Redis required)."""

from __future__ import annotations

import time

import fakeredis
import pytest

from encore_waiting_room.queue import WaitingRoomQueue


@pytest.fixture
def redis_client():
    return fakeredis.FakeRedis(decode_responses=True)


@pytest.fixture
def queue(redis_client):
    return WaitingRoomQueue(redis_client=redis_client, token_ttl_secs=300)


EVENT = "event_abc"
USER_A = "user_001"
USER_B = "user_002"
USER_C = "user_003"


# ─── join ────────────────────────────────────────────────────────────────────


def test_join_new_user_returns_queued(queue):
    status = queue.join(EVENT, USER_A)
    assert status.admitted is False
    assert status.position == 0
    assert status.queue_size == 1
    assert status.token is None


def test_join_assigns_fifo_positions(queue):
    queue.join(EVENT, USER_A)
    time.sleep(0.005)  # ensure different ms score
    queue.join(EVENT, USER_B)
    time.sleep(0.005)
    queue.join(EVENT, USER_C)

    status_b = queue.get_status(EVENT, USER_B)
    status_c = queue.get_status(EVENT, USER_C)

    # A=0, B=1, C=2
    assert status_b.position == 1
    assert status_c.position == 2
    assert status_c.queue_size == 3


def test_join_is_idempotent(queue):
    queue.join(EVENT, USER_A)
    # Same user joins again
    status2 = queue.join(EVENT, USER_A)
    assert status2.queue_size == 1  # still only one entry


def test_join_admitted_user_returns_token(queue):
    queue.join(EVENT, USER_A)
    queue.admit_batch(EVENT, batch_size=10)
    # Re-join after admission should return admitted=True with token
    status = queue.join(EVENT, USER_A)
    assert status.admitted is True
    assert status.token is not None
    assert len(status.token) == 64  # 32 bytes hex


# ─── get_status ──────────────────────────────────────────────────────────────


def test_status_unknown_user_returns_minus_one(queue):
    status = queue.get_status(EVENT, "unknown_user")
    assert status.admitted is False
    assert status.position == -1


def test_status_queued_user_returns_position(queue):
    queue.join(EVENT, USER_A)
    queue.join(EVENT, USER_B)
    status = queue.get_status(EVENT, USER_B)
    assert status.admitted is False
    assert status.position == 1


# ─── admit_batch ─────────────────────────────────────────────────────────────


def test_admit_batch_admits_correct_count(queue):
    for i in range(5):
        queue.join(EVENT, f"user_{i:03d}")
    admitted = queue.admit_batch(EVENT, batch_size=3)
    assert len(admitted) == 3
    assert queue.queue_size(EVENT) == 2


def test_admit_batch_admits_fifo_order(queue):
    queue.join(EVENT, USER_A)
    time.sleep(0.005)
    queue.join(EVENT, USER_B)
    time.sleep(0.005)
    queue.join(EVENT, USER_C)

    admitted = queue.admit_batch(EVENT, batch_size=2)
    # A joined first → should be admitted first
    assert USER_A in admitted
    assert USER_B in admitted
    assert USER_C not in admitted


def test_admitted_user_status_is_admitted(queue):
    queue.join(EVENT, USER_A)
    queue.admit_batch(EVENT, batch_size=10)
    status = queue.get_status(EVENT, USER_A)
    assert status.admitted is True
    assert status.token is not None


def test_admit_empty_queue_returns_empty_list(queue):
    result = queue.admit_batch(EVENT, batch_size=10)
    assert result == []


# ─── consume_token (single-use GETDEL) ───────────────────────────────────────


def test_consume_token_returns_user_event(queue):
    queue.join(EVENT, USER_A)
    queue.admit_batch(EVENT, batch_size=10)
    status = queue.get_status(EVENT, USER_A)
    token = status.token
    assert token is not None

    result = queue.consume_token(token)
    assert result is not None
    user_id, event_id = result
    assert user_id == USER_A
    assert event_id == EVENT


def test_consume_token_is_single_use(queue):
    queue.join(EVENT, USER_A)
    queue.admit_batch(EVENT, batch_size=10)
    status = queue.get_status(EVENT, USER_A)
    token = status.token

    queue.consume_token(token)  # First call
    result2 = queue.consume_token(token)  # Second call
    assert result2 is None


def test_consume_invalid_token_returns_none(queue):
    result = queue.consume_token("not_a_real_token")
    assert result is None


# ─── queue_size ──────────────────────────────────────────────────────────────


def test_queue_size_empty(queue):
    assert queue.queue_size(EVENT) == 0


def test_queue_size_decreases_after_admit(queue):
    queue.join(EVENT, USER_A)
    queue.join(EVENT, USER_B)
    assert queue.queue_size(EVENT) == 2
    queue.admit_batch(EVENT, batch_size=1)
    assert queue.queue_size(EVENT) == 1


# ─── independent events ──────────────────────────────────────────────────────


def test_different_events_are_independent(queue):
    queue.join("event_1", USER_A)
    queue.join("event_2", USER_A)
    # Admitting from event_1 should not affect event_2's queue
    queue.admit_batch("event_1", batch_size=10)
    status_e2 = queue.get_status("event_2", USER_A)
    assert status_e2.admitted is False
    assert status_e2.position == 0
