import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from encore_wallet_service.main import app
from encore_wallet_service.db import get_db
from encore_wallet_service.models import Base


@pytest.fixture(name="db_session")
def fixture_db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        engine.dispose()


@pytest.fixture(name="client")
def fixture_client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_get_wallet_auto_creates(client):
    user_id = str(uuid.uuid4())
    resp = client.get(f"/api/v1/wallet/{user_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["user_id"] == user_id
    assert data["balance_cents"] == 0
    assert data["escrow_cents"] == 0


def test_credit_and_debit_flow(client):
    user_id = str(uuid.uuid4())

    # 1. Credit 5000 cents
    credit_res = client.post("/api/v1/wallet/transaction", json={
        "user_id": user_id,
        "amount_cents": 5000,
        "transaction_type": "CREDIT",
        "reference_id": f"ref_{uuid.uuid4()}",
        "idempotency_key": f"idem_{uuid.uuid4()}",
    })
    assert credit_res.status_code == 201
    assert credit_res.json()["balance_cents"] == 5000

    # Verify wallet balance
    wallet_res = client.get(f"/api/v1/wallet/{user_id}")
    assert wallet_res.json()["balance_cents"] == 5000

    # 2. Debit 2000 cents
    debit_res = client.post("/api/v1/wallet/transaction", json={
        "user_id": user_id,
        "amount_cents": 2000,
        "transaction_type": "DEBIT",
        "reference_id": f"ref_{uuid.uuid4()}",
        "idempotency_key": f"idem_{uuid.uuid4()}",
    })
    assert debit_res.status_code == 201
    assert debit_res.json()["balance_cents"] == 3000

    # Verify final balance
    wallet_res = client.get(f"/api/v1/wallet/{user_id}")
    assert wallet_res.json()["balance_cents"] == 3000


def test_debit_insufficient_balance(client):
    user_id = str(uuid.uuid4())

    debit_res = client.post("/api/v1/wallet/transaction", json={
        "user_id": user_id,
        "amount_cents": 1000,
        "transaction_type": "DEBIT",
        "reference_id": f"ref_{uuid.uuid4()}",
        "idempotency_key": f"idem_{uuid.uuid4()}",
    })
    assert debit_res.status_code == 400
    assert "Insufficient wallet balance" in debit_res.json()["detail"]


def test_transaction_idempotency(client):
    user_id = str(uuid.uuid4())
    ref_id = f"ref_{uuid.uuid4()}"

    # First credit
    res1 = client.post("/api/v1/wallet/transaction", json={
        "user_id": user_id,
        "amount_cents": 2500,
        "transaction_type": "CREDIT",
        "reference_id": ref_id,
        "idempotency_key": "key1",
    })
    assert res1.status_code == 201
    assert res1.json()["balance_cents"] == 2500

    # Duplicate call with same reference_id
    res2 = client.post("/api/v1/wallet/transaction", json={
        "user_id": user_id,
        "amount_cents": 2500,
        "transaction_type": "CREDIT",
        "reference_id": ref_id,
        "idempotency_key": "key1",
    })
    assert res2.status_code == 201
    assert "idempotent" in res2.json()["message"]

    # Balance remains 2500, not 5000
    wallet_res = client.get(f"/api/v1/wallet/{user_id}")
    assert wallet_res.json()["balance_cents"] == 2500


def test_escrow_hold_and_release_saga(client):
    buyer_id = str(uuid.uuid4())
    seller_id = str(uuid.uuid4())
    trade_id = str(uuid.uuid4())

    # Credit buyer with 4000 cents
    client.post("/api/v1/wallet/transaction", json={
        "user_id": buyer_id,
        "amount_cents": 4000,
        "transaction_type": "CREDIT",
        "reference_id": f"ref_{uuid.uuid4()}",
        "idempotency_key": "k",
    })

    # 1. Escrow hold 3000 cents
    hold_res = client.post("/api/v1/wallet/escrow/hold", json={
        "buyer_id": buyer_id,
        "amount_cents": 3000,
        "trade_id": trade_id,
        "idempotency_key": f"hold_{trade_id}",
    })
    assert hold_res.status_code == 200

    buyer_w = client.get(f"/api/v1/wallet/{buyer_id}").json()
    assert buyer_w["balance_cents"] == 1000
    assert buyer_w["escrow_cents"] == 3000

    # 2. Escrow release to seller
    rel_res = client.post("/api/v1/wallet/escrow/release", json={
        "buyer_id": buyer_id,
        "seller_id": seller_id,
        "amount_cents": 3000,
        "trade_id": trade_id,
        "idempotency_key": f"release_{trade_id}",
    })
    assert rel_res.status_code == 200

    # Buyer has 0 escrow and 1000 balance
    buyer_w = client.get(f"/api/v1/wallet/{buyer_id}").json()
    assert buyer_w["balance_cents"] == 1000
    assert buyer_w["escrow_cents"] == 0

    # Seller has 3000 balance
    seller_w = client.get(f"/api/v1/wallet/{seller_id}").json()
    assert seller_w["balance_cents"] == 3000


def test_escrow_refund_saga(client):
    buyer_id = str(uuid.uuid4())
    trade_id = str(uuid.uuid4())

    # Credit buyer with 3000 cents
    client.post("/api/v1/wallet/transaction", json={
        "user_id": buyer_id,
        "amount_cents": 3000,
        "transaction_type": "CREDIT",
        "reference_id": f"ref_{uuid.uuid4()}",
        "idempotency_key": "k",
    })

    # Hold 2000 cents
    client.post("/api/v1/wallet/escrow/hold", json={
        "buyer_id": buyer_id,
        "amount_cents": 2000,
        "trade_id": trade_id,
        "idempotency_key": "h",
    })

    # Refund 2000 cents
    refund_res = client.post("/api/v1/wallet/escrow/refund", json={
        "buyer_id": buyer_id,
        "amount_cents": 2000,
        "trade_id": trade_id,
        "idempotency_key": "r",
    })
    assert refund_res.status_code == 200

    buyer_w = client.get(f"/api/v1/wallet/{buyer_id}").json()
    assert buyer_w["balance_cents"] == 3000
    assert buyer_w["escrow_cents"] == 0
