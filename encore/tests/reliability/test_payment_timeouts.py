import os
import time
import uuid

import httpx
import pytest

os.environ["JWT_SECRET_KEY"] = "super_secret_week2_key"
from encore_auth.jwt import create_token

API_GATEWAY_URL = "http://localhost:8000"
ADMIN_TOKEN = create_token(uuid.UUID("00000000-0000-0000-0000-000000000000"), "ADMIN")
NORMAL_TOKEN = create_token(uuid.UUID("11111111-1111-1111-1111-111111111111"), "CUSTOMER")

client = httpx.Client(base_url=API_GATEWAY_URL, timeout=5.0)

def test_payment_timeout_scenario():
    # 1. We need an event and a seat to place an order
    # Let's get an event
    resp = client.get("/api/v1/events")
    assert resp.status_code == 200
    events = resp.json().get("data", {}).get("items", [])
    if not events:
        pytest.skip("No events seeded")
    
    event_id = events[0]["id"]
    
    # Let's get a seat
    resp = client.get(f"/api/v1/events/{event_id}/seats")
    assert resp.status_code == 200
    seats = resp.json().get("data", {}).get("items", [])
    if not seats:
        pytest.skip("No seats found for event")
        
    seat_id = seats[0]["seat_id"]
    headers = {"Authorization": f"Bearer {NORMAL_TOKEN}", "Content-Type": "application/json"}
    
    # 2. Hold the seat
    idem_hold = f"hold-{uuid.uuid4().hex}"
    resp = client.post("/api/v1/holds", json={"event_id": event_id, "seat_id": seat_id}, headers={**headers, "Idempotency-Key": idem_hold})
    # Might be 409 if already held by another test, but if 201 we proceed.
    if resp.status_code == 409:
        pytest.skip("Seat already held, skipping test")
    
    assert resp.status_code == 201

    # 3. Create order
    idem_order = f"order-{uuid.uuid4().hex}"
    resp = client.post("/api/v1/orders", json={"event_id": event_id, "seat_id": seat_id}, headers={**headers, "Idempotency-Key": idem_order})
    assert resp.status_code == 201
    order_id = resp.json()["data"]["id"]
    
    # 4. Trigger payment timeout
    # The gateway or checkout service might timeout. Our client timeout is 5s.
    idem_pay = f"timeout_{uuid.uuid4().hex}"
    with pytest.raises((httpx.ReadTimeout, httpx.HTTPStatusError)) as exc:  # noqa: F841
        resp = client.post("/api/v1/payments", json={"order_id": order_id}, headers={**headers, "Idempotency-Key": idem_pay})
        if resp.status_code >= 400:
            resp.raise_for_status()

    # The payment timed out. We should verify that the order does not transition to SUCCESS
    # In a real saga, the timeout would trigger a compensation to release the hold and cancel the order.
    # We just ensure it's not successful.
    
    # Wait for any background compensation to run
    time.sleep(2)
    
    resp = client.get(f"/api/v1/orders/{order_id}", headers=headers)
    assert resp.status_code == 200
    order_status = resp.json()["data"]["status"]
    
    # It should not be SUCCESS. It might be PENDING, CANCELLED, or FAILED.
    assert order_status != "SUCCESS"
