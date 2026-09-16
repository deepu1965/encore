import time
import uuid

import fakeredis
import pytest

from encore_waiting_room.queue import WaitingRoomQueue


@pytest.fixture
def redis_client():
    # Use version 7 for GETDEL support
    return fakeredis.FakeRedis(version=7, decode_responses=True)

@pytest.fixture
def queue(redis_client):
    return WaitingRoomQueue(redis_client, token_ttl_secs=600)

def test_fifo_ordering_preserved(queue):
    """Users admitted in join order."""
    event_id = str(uuid.uuid4())
    user1 = str(uuid.uuid4())
    user2 = str(uuid.uuid4())
    user3 = str(uuid.uuid4())
    
    # Join in order: user1, user2, user3
    queue.join(event_id, user1)
    # fake time doesn't automatically increment in FakeRedis unless we sleep or mock
    # since join uses time.time(), let's just sleep slightly to ensure distinct scores
    time.sleep(0.002)
    queue.join(event_id, user2)
    time.sleep(0.002)
    queue.join(event_id, user3)
    
    assert queue.queue_size(event_id) == 3
    
    # Admit first 2
    admitted = queue.admit_batch(event_id, 2)
    assert len(admitted) == 2
    assert admitted[0] == user1
    assert admitted[1] == user2
    
    # Admit last 1
    admitted = queue.admit_batch(event_id, 2)
    assert len(admitted) == 1
    assert admitted[0] == user3

def test_token_is_single_use(queue):
    """consume_token() returns (user_id, event_id) once; second call returns None."""
    event_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    
    queue.join(event_id, user_id)
    admitted = queue.admit_batch(event_id, 1)
    assert admitted == [user_id]
    
    status = queue.get_status(event_id, user_id)
    assert status.admitted is True
    assert status.token is not None
    
    token = status.token
    
    # First consume succeeds
    consumed = queue.consume_token(token)
    assert consumed is not None
    assert consumed[0] == user_id
    assert consumed[1] == event_id
    
    # Second consume fails (returns None)
    consumed_again = queue.consume_token(token)
    assert consumed_again is None

def test_admit_batch_respects_size(queue):
    """admit_batch(event_id, 3) from a queue of 10 returns exactly 3 users."""
    event_id = str(uuid.uuid4())
    
    # Join 10 users
    for _ in range(10):
        queue.join(event_id, str(uuid.uuid4()))
        time.sleep(0.001)
        
    assert queue.queue_size(event_id) == 10
    
    # Admit 3
    admitted = queue.admit_batch(event_id, 3)
    assert len(admitted) == 3
    assert queue.queue_size(event_id) == 7
    
    # Admit 5
    admitted = queue.admit_batch(event_id, 5)
    assert len(admitted) == 5
    assert queue.queue_size(event_id) == 2
    
    # Admit 10 (only 2 left)
    admitted = queue.admit_batch(event_id, 10)
    assert len(admitted) == 2
    assert queue.queue_size(event_id) == 0
