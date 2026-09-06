import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from encore_gateway.main import app
from encore_gateway.db import get_db_read
from encore_gateway.cache import get_cache

client = TestClient(app)

def test_get_user_feed_empty():
    mock_db = MagicMock()
    mock_db.execute.return_value.scalars.return_value.all.return_value = []
    
    mock_redis = MagicMock()
    mock_redis.zrevrange.return_value = []
    
    mock_cache = MagicMock()
    mock_cache._redis = mock_redis
    
    app.dependency_overrides[get_db_read] = lambda: mock_db
    app.dependency_overrides[get_cache] = lambda: mock_cache
    
    response = client.get("/api/v1/feed?user_id=123e4567-e89b-12d3-a456-426614174000")
    
    assert response.status_code == 200
    assert response.json() == {"items": []}
    
    app.dependency_overrides.clear()

def test_get_user_feed_merging():
    mock_db = MagicMock()
    # Mock following one mega organizer
    mock_db.execute.return_value.scalars.return_value.all.return_value = ["mega-org-id"]
    
    mock_redis = MagicMock()
    # direct feed has one event at time 100
    # mega org outbox has one event at time 200
    
    def mock_zrevrange(key, start, end, withscores):
        if key.startswith("feed:"):
            return [(b"event-11111111-1111-1111-1111-111111111111", 100.0)]
        elif key.startswith("outbox:"):
            return [(b"event-22222222-2222-2222-2222-222222222222", 200.0)]
        return []
        
    mock_redis.zrevrange.side_effect = mock_zrevrange
    
    mock_cache = MagicMock()
    mock_cache._redis = mock_redis
    
    app.dependency_overrides[get_db_read] = lambda: mock_db
    app.dependency_overrides[get_cache] = lambda: mock_cache
    
    response = client.get("/api/v1/feed?user_id=123e4567-e89b-12d3-a456-426614174000")
    
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 2
    # Should be sorted by timestamp descending
    assert items[0]["event_id"] == "event-22222222-2222-2222-2222-222222222222"
    assert items[0]["published_at_ts"] == 200.0
    
    assert items[1]["event_id"] == "event-11111111-1111-1111-1111-111111111111"
    assert items[1]["published_at_ts"] == 100.0
    
    app.dependency_overrides.clear()
