import os
import uuid

import httpx

os.environ["JWT_SECRET_KEY"] = "super_secret_week2_key"
from encore_auth.jwt import create_token

API_GATEWAY_URL = "http://localhost:8000"
ADMIN_TOKEN = create_token(uuid.UUID("00000000-0000-0000-0000-000000000000"), "ADMIN")
NORMAL_TOKEN = create_token(uuid.UUID("11111111-1111-1111-1111-111111111111"), "CUSTOMER")

client = httpx.Client(base_url=API_GATEWAY_URL, timeout=10.0)

def test_public_endpoint():
    # Health checks should be public
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json().get("status") == "ok"

def test_protected_endpoint_no_token():
    # User feed is protected
    resp = client.get("/api/v1/feed?user_id=11111111-1111-1111-1111-111111111111")
    assert resp.status_code == 401

def test_protected_endpoint_with_valid_token():
    # User feed is protected
    resp = client.get("/api/v1/feed?user_id=11111111-1111-1111-1111-111111111111", headers={"Authorization": f"Bearer {NORMAL_TOKEN}"})
    assert resp.status_code == 200

def test_admin_endpoint_no_token():
    resp = client.post("/api/v1/jobs", json={"job_id": "test"})
    assert resp.status_code == 401

def test_admin_endpoint_normal_user():
    resp = client.post("/api/v1/jobs", json={"job_id": "test"}, headers={"Authorization": f"Bearer {NORMAL_TOKEN}"})
    assert resp.status_code in [401, 403]

def test_admin_endpoint_admin_user():
    resp = client.post("/api/v1/jobs", json={"job_id": "test"}, headers={"Authorization": f"Bearer {ADMIN_TOKEN}"})
    # Might be 400 or 422 if it's an invalid job, but the RBAC allowed it through (i.e. not 401/403)
    assert resp.status_code not in [401, 403]
