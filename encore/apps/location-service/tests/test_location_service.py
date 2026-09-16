import uuid
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from encore_location.main import app, get_db, get_redis


class MockRedis:
    def __init__(self):
        self.data = {}
        self.ttl = {}
    def zrem(self, key, member):
        if key in self.data and member in self.data[key]:
            del self.data[key][member]
    def geoadd(self, key, args):
        lon, lat, member = args
        if key not in self.data:
            self.data[key] = {}
        self.data[key][member] = (lon, lat)
    def setex(self, key, ttl, value):
        self.ttl[key] = value
    def exists(self, key):
        return key in self.ttl
    def geosearch(self, key, longitude, latitude, radius, unit, withdist):
        res = []
        if key in self.data:
            for member, (lon, lat) in self.data[key].items():
                # Mock distance calculation
                res.append((member, 5.0)) # mock 5km
        return res

@pytest.fixture
def client():
    mock_redis = MockRedis()
    mock_db = MagicMock()
    
    # mock db.execute().scalars().all() for followed users
    mock_db.execute.return_value.scalars.return_value.all.return_value = [uuid.UUID("11111111-1111-1111-1111-111111111111")]  # noqa: E501
    
    app.dependency_overrides[get_redis] = lambda: mock_redis
    app.dependency_overrides[get_db] = lambda: mock_db
    
    with TestClient(app) as c:
        yield c, mock_redis

def test_update_friend_location(client):
    c, redis = client
    uid = uuid.uuid4()
    
    resp = c.post(
        "/friends/location",
        json={"lat": 40.0, "lon": -73.0, "opt_in": True},
        headers={"x-user-id": str(uid)}
    )
    assert resp.status_code == 200
    assert resp.json() == {"status": "updated"}
    
    assert str(uid) in redis.data["user_locations"]
    assert redis.exists(f"user_loc_ttl:{uid}")

def test_get_nearby_friends(client):
    c, redis = client
    uid = uuid.uuid4()
    friend_uid = uuid.UUID("11111111-1111-1111-1111-111111111111")
    
    redis.geoadd("user_locations", (-73.0, 40.0, str(friend_uid)))
    redis.setex(f"user_loc_ttl:{friend_uid}", 60, "1")
    
    resp = c.get(
        "/friends/nearby?lat=40.0&lon=-73.0&radius_km=10",
        headers={"x-user-id": str(uid)}
    )
    assert resp.status_code == 200
    res = resp.json()
    assert len(res) == 1
    assert res[0]["user_id"] == str(friend_uid)
    assert res[0]["distance_km"] == 5.0
