import os
import uuid
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "postgresql://localhost/test"
os.environ["KAFKA_BOOTSTRAP_SERVERS"] = "localhost:9092"
from encore_scheduler.main import app, get_db


@pytest.fixture
def client():
    mock_db = MagicMock()
    app.dependency_overrides[get_db] = lambda: mock_db
    with TestClient(app) as c:
        yield c, mock_db

def test_create_job(client):
    c, db = client
    
    resp = c.post("/jobs", json={
        "job_type": "send_email",
        "payload": {"to": "test@example.com"}
    })
    
    assert resp.status_code == 200
    res = resp.json()
    assert res["job_type"] == "send_email"
    assert res["status"] == "pending"
    assert "id" in res
    
    db.execute.assert_called_once()
    assert "INSERT INTO jobs" in db.execute.call_args[0][0].text

def test_get_job(client):
    c, db = client
    job_id = uuid.uuid4()
    
    class Row:
        def __init__(self):
            self.id = job_id
            self.job_type = "test_job"
            self.status = "pending"
            self.scheduled_for = "2026-01-01T00:00:00Z"
            self.recurring_interval = None
    
    db.execute.return_value.fetchone.return_value = Row()
    
    resp = c.get(f"/jobs/{job_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == str(job_id)

def test_delete_job(client):
    c, db = client
    job_id = uuid.uuid4()
    
    db.execute.return_value.rowcount = 1
    
    resp = c.delete(f"/jobs/{job_id}")
    assert resp.status_code == 200
    assert resp.json() == {"message": "Job deleted"}
