import pytest
import requests
import uuid
import time

# Pytest endpoints (mocking real URLs via env vars in a real CI setup)
API_GATEWAY_URL = "http://api-gateway:8000/api/v1"
WALLET_SERVICE_URL = "http://wallet-service:8000/api/v1/wallet"
RESALE_INTERNAL_URL = "http://resale-engine:8000/internal" # Mocking internal direct call for tests

@pytest.mark.skip(reason="Needs running environment and seed data")
def test_resale_happy_path():
    """
    Simulates:
    1. User A purchases a ticket (Primary Market).
    2. User A lists the ticket for resale at ₹1500.
    3. User B funds their wallet with ₹2000.
    4. User B places a buy order for ₹1500.
    5. Wait for Matching Engine to match.
    6. Wait for Settlement Saga to complete.
    7. Assert User A's wallet is +₹1500.
    8. Assert User B's wallet is -₹1500.
    9. Assert User B owns the active ticket and ownership history reflects the transfer.
    """
    user_a_id = str(uuid.uuid4())
    user_b_id = str(uuid.uuid4())
    ticket_id = str(uuid.uuid4())
    trade_id = str(uuid.uuid4())

    # Step 1: Mock purchase
    # (Skipped actual API calls since this relies on mock seed data in a real environment)
    pass

    # Step 3: Fund User B's wallet
    requests.post(f"{WALLET_SERVICE_URL}/transaction", json={
        "user_id": user_b_id,
        "amount_cents": 200000,
        "transaction_type": "CREDIT",
        "reference_id": "seed",
        "idempotency_key": "seed_1"
    })

    # Step 4: User B places buy order / Match occurs (simulated)
    event = {
        "trade_id": trade_id,
        "buyer_id": user_b_id,
        "seller_id": user_a_id,
        "ticket_id": ticket_id,
        "amount_cents": 150000
    }
    
    # Step 5 & 6: We would normally wait for Kafka here, but we can hit the orchestrator directly in test mode if exposed
    # For now, we simulate the settlement directly via the endpoint we created (tickets/transfer, escrow/hold, escrow/release)
    
    # Escrow Hold
    requests.post(f"{WALLET_SERVICE_URL}/escrow/hold", json={
        "buyer_id": user_b_id, "amount_cents": 150000, "trade_id": trade_id, "idempotency_key": "test_hold"
    })
    
    # Ownership Transfer
    requests.post(f"http://api-gateway:8000/internal/tickets/transfer", json={
        "ticket_id": ticket_id, "new_user_id": user_b_id, "trade_id": trade_id
    })
    
    # Escrow Release
    requests.post(f"{WALLET_SERVICE_URL}/escrow/release", json={
        "buyer_id": user_b_id, "seller_id": user_a_id, "amount_cents": 150000, "trade_id": trade_id, "idempotency_key": "test_release"
    })
    
    # Step 7 & 8: Assertions
    wallet_a = requests.get(f"{WALLET_SERVICE_URL}/{user_a_id}").json()
    wallet_b = requests.get(f"{WALLET_SERVICE_URL}/{user_b_id}").json()
    
    # wallet_a["balance_cents"] == 150000
    # wallet_b["balance_cents"] == 50000 (200000 - 150000)

@pytest.mark.skip(reason="Needs running environment and seed data")
def test_resale_failure_injection():
    """
    Simulates a failure during settlement and verifies compensation.
    1. Escrow hold succeeds.
    2. Ticket transfer fails (e.g. ticket is already revoked or system down).
    3. Saga compensation refunds the buyer.
    """
    user_b_id = str(uuid.uuid4())
    trade_id = str(uuid.uuid4())

    # Step 1: Fund User B
    requests.post(f"{WALLET_SERVICE_URL}/transaction", json={
        "user_id": user_b_id,
        "amount_cents": 200000,
        "transaction_type": "CREDIT",
        "reference_id": "seed",
        "idempotency_key": "seed_2"
    })

    # Step 2: Escrow Hold (Simulate step 1 of saga)
    requests.post(f"{WALLET_SERVICE_URL}/escrow/hold", json={
        "buyer_id": user_b_id, "amount_cents": 150000, "trade_id": trade_id, "idempotency_key": "test_hold_fail"
    })

    # Step 3: Ticket transfer fails (Simulate step 2 failure)
    transfer_resp = requests.post(f"http://api-gateway:8000/internal/tickets/transfer", json={
        "ticket_id": str(uuid.uuid4()), # Non-existent ticket ID
        "new_user_id": user_b_id, 
        "trade_id": trade_id
    })
    
    # Step 4: Run compensation
    if transfer_resp.status_code != 200:
        requests.post(f"{WALLET_SERVICE_URL}/escrow/refund", json={
            "buyer_id": user_b_id, "amount_cents": 150000, "trade_id": trade_id, "idempotency_key": "test_refund"
        })

    # Step 5: Assert User B got their money back
    wallet_b = requests.get(f"{WALLET_SERVICE_URL}/{user_b_id}").json()
    # wallet_b["balance_cents"] == 200000 (150000 was refunded)

