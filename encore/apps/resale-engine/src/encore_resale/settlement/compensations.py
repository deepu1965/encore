import logging
from typing import Any

import requests

logger = logging.getLogger(__name__)

import os

WALLET_SERVICE_URL = os.environ.get("WALLET_SERVICE_URL", "http://wallet-service:8000/api/v1/wallet")

def handle_compensation(event: dict[str, Any], producer):
    """
    Rollback logic if settlement fails.
    Refunds the buyer and emits a failure event.
    """
    trade_id = event["trade_id"]
    buyer_id = event["buyer_id"]
    amount_cents = event["amount_cents"]
    
    logger.info(f"Starting compensation for trade {trade_id}")
    
    try:
        # Step 1: Refund buyer from escrow back to balance
        refund_req = {
            "buyer_id": buyer_id,
            "amount_cents": amount_cents,
            "trade_id": trade_id,
            "idempotency_key": f"refund_{trade_id}"
        }
        resp = requests.post(f"{WALLET_SERVICE_URL}/escrow/refund", json=refund_req)
        # Note: In a real system, we must retry this until success (or manual intervention).
        # We don't raise_for_status() immediately because we need to emit the failure event.
        if resp.status_code == 200:
            logger.info(f"Compensation: Escrow refunded for trade {trade_id}")
        else:
            logger.error(f"Compensation: Failed to refund escrow for trade {trade_id}: {resp.text}")
            
    except Exception as e:  # noqa: BLE001
        logger.error(f"Compensation error for trade {trade_id}: {e}")
        
    finally:
        # Step 2: Emit failure event to re-open sell order
        producer.send(
            "resale.trade.failed",
            value={"trade_id": trade_id, "status": "FAILED", "reason": "Settlement saga error"}
        )
        logger.info(f"Compensation completed, emitted resale.trade.failed for {trade_id}")
