import os
import uuid
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "postgresql://localhost/test"
from encore_deployment.main import app, get_db


@pytest.fixture
def client():
    mock_db = MagicMock()
    app.dependency_overrides[get_db] = lambda: mock_db
    with TestClient(app) as c:
        yield c, mock_db

@patch("encore_deployment.main.process_deployment")
def test_trigger_deployment(mock_process, client):
    c, db = client
    
    resp = c.post("/deployments", json={
        "service_name": "api-gateway",
        "version": "v1.2.3",
        "strategy": "rolling"
    })
    
    assert resp.status_code == 200
    res = resp.json()
    assert res["service_name"] == "api-gateway"
    assert res["status"] == "PENDING"
    assert "id" in res
    
    db.execute.assert_called_once()
    assert "INSERT INTO deployments" in db.execute.call_args[0][0].text

def test_get_deployment(client):
    c, db = client
    deploy_id = uuid.uuid4()
    
    class Row:
        def __init__(self):
            self.id = deploy_id
            self.service_name = "api-gateway"
            self.version = "v1.2.3"
            self.status = "SUCCESS"
            self.strategy = "rolling"
            self.created_at = "2026-01-01T00:00:00Z"
            
    db.execute.return_value.fetchone.return_value = Row()
    
    resp = c.get(f"/deployments/{deploy_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == str(deploy_id)

def test_cancel_deployment(client):
    c, db = client
    deploy_id = uuid.uuid4()
    
    class Row:
        def __init__(self):
            self.status = "PENDING"
            
    db.execute.return_value.fetchone.return_value = Row()
    
    resp = c.post(f"/deployments/{deploy_id}/cancel")
    assert resp.status_code == 200
    assert resp.json() == {"status": "CANCELLED"}
