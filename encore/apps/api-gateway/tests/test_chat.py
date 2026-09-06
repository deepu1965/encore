import pytest
import contextlib
from fastapi.testclient import TestClient
from encore_gateway.main import app
import uuid

# Override lifespan to avoid connecting to real Kafka/Redis
@pytest.fixture(autouse=True)
def override_lifespan():
    original_lifespan = app.router.lifespan_context
    @contextlib.asynccontextmanager
    async def mock_lifespan(*args, **kwargs):
        yield {}
    app.router.lifespan_context = mock_lifespan
    yield
    app.router.lifespan_context = original_lifespan

@pytest.fixture
def client():
    # Setup test client
    with TestClient(app) as c:
        yield c

def test_websocket_connection_unauthorized(client):
    event_id = uuid.uuid4()
    # No token provided -> HTTP 422 Unprocessable Entity for missing query param
    response = client.get(f"/ws/chat/{event_id}")
    assert response.status_code == 422

def test_websocket_connection_invalid_token(client):
    event_id = uuid.uuid4()
    # Connect with invalid token
    with client.websocket_connect(f"/ws/chat/{event_id}?token=invalid") as websocket:
        try:
            websocket.receive_text()
            assert False, "Should have disconnected"
        except Exception as e:
            pass
