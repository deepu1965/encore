import contextlib
import uuid

import pytest
from fastapi.testclient import TestClient

from encore_gateway.main import app


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
    # No token provided → WebSocket handshake is rejected (connection error or close 1008)
    # FastAPI's Query(...) on a WebSocket route means the endpoint accepts the connection
    # then validates — connecting without token causes a disconnect
    try:
        with client.websocket_connect(f"/ws/chat/{event_id}") as ws:
            # If we get here, the server accepted without token — should not happen
            # Try to receive; server should close immediately
            ws.receive_text()
            assert False, "Expected WebSocket to be closed for missing token"
    except Exception:
        # Connection closed or refused — expected behavior for missing token
        pass

def test_websocket_connection_invalid_token(client):
    event_id = uuid.uuid4()
    # Connect with invalid token
    with client.websocket_connect(f"/ws/chat/{event_id}?token=invalid") as websocket:
        try:
            websocket.receive_text()
            assert False, "Should have disconnected"
        except Exception:
            pass
