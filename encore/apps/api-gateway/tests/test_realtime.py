import asyncio
import contextlib
import pytest
from fastapi.testclient import TestClient

from encore_gateway.main import app
from encore_gateway.routers.realtime import manager


@pytest.fixture(autouse=True)
def override_lifespan():
    original_lifespan = app.router.lifespan_context
    @contextlib.asynccontextmanager
    async def mock_lifespan(*args, **kwargs):
        yield {}
    app.router.lifespan_context = mock_lifespan
    yield
    app.router.lifespan_context = original_lifespan


@pytest.fixture(name="client")
def client_fixture():
    with TestClient(app) as test_client:
        yield test_client


def test_websocket_ping_pong(client):
    with client.websocket_connect("/ws") as ws:
        ws.send_json({"messageType": "ping"})
        data = ws.receive_json()
        assert data["messageType"] == "pong"


def test_websocket_subscription_and_broadcast(client):
    channel = "order:test_123"
    with client.websocket_connect("/ws") as ws:
        ws.send_json({"messageType": "subscribe", "channel": channel})
        
        # Broadcast via manager
        asyncio.run(
            manager.broadcast(
                channel=channel,
                message_type="order.updated",
                payload={"status": "PAID", "order_id": "test_123"},
                correlation_id="corr_abc",
            )
        )
        
        envelope = ws.receive_json()
        assert envelope["messageType"] == "order.updated"
        assert envelope["channel"] == channel
        assert envelope["sequence"] >= 1
        assert envelope["correlationId"] == "corr_abc"
        assert envelope["payload"]["status"] == "PAID"

        # Unsubscribe
        ws.send_json({"messageType": "unsubscribe", "channel": channel})
