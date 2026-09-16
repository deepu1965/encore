import os
import uuid

import httpx
import pytest

os.environ["JWT_SECRET_KEY"] = "super_secret_week2_key"
from encore_auth.jwt import create_token

API_GATEWAY_URL = "http://localhost:8000"
NORMAL_TOKEN = create_token(uuid.UUID("11111111-1111-1111-1111-111111111111"), "CUSTOMER")
client = httpx.Client(base_url=API_GATEWAY_URL, timeout=30.0)

def test_short_url_lifecycle():
    # 1. Get an event to shorten
    resp = client.get("/api/v1/events")
    assert resp.status_code == 200
    events = resp.json().get("data", {}).get("items", [])
    if not events:
        pytest.skip("No events seeded")
    event_id = events[0]["id"]
    
    # 2. Shorten the event URL
    headers = {"Authorization": f"Bearer {NORMAL_TOKEN}", "Content-Type": "application/json"}
    resp = client.post("/api/v1/shorten", json={"event_id": event_id}, headers=headers)
    assert resp.status_code == 200
    short_url = resp.json().get("short_url")
    assert short_url is not None
    assert short_url.startswith("http://localhost:8000/")
    
    hash_str = short_url.split("/")[-1]
    assert len(hash_str) == 7
    
    # 3. Follow the short URL
    redirect_resp = client.get(f"/{hash_str}", follow_redirects=False)
    assert redirect_resp.status_code == 302
    assert f"/api/v1/events/{event_id}/seats" in redirect_resp.headers["location"]
    
    # 4. Cache hit verify (call again)
    redirect_resp2 = client.get(f"/{hash_str}", follow_redirects=False)
    assert redirect_resp2.status_code == 302
    assert redirect_resp2.headers["location"] == redirect_resp.headers["location"]

