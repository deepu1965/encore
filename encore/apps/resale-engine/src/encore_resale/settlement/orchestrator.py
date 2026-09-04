import logging
import uuid
import requests
from typing import Dict, Any

logger = logging.getLogger(__name__)

WALLET_SERVICE_URL = "http://wallet-service:8000/api/v1/wallet"
API_GATEWAY_URL = "http://api-gateway:8000/internal"

class ResaleSettlementOrchestrator:
    def __init__(self, kafka_producer):
        self.producer = kafka_producer

    def handle_trade_matched(self, event: Dict[str, Any]):
        """
        Saga execution for resale settlement.
        Expected event format:
        {
            "trade_id": "...",
            "buyer_id": "...",
            "seller_id": "...",
            "ticket_id": "...",
            "amount_cents": 1500
        }
        """
        trade_id = event["trade_id"]
        buyer_id = event["buyer_id"]
        seller_id = event["seller_id"]
        ticket_id = event["ticket_id"]
        amount_cents = event["amount_cents"]
        
        logger.info(f"Starting settlement saga for trade {trade_id}")
        
        try:
            # Step 1: Buyer Wallet Escrow Hold
            hold_req = {
                "buyer_id": buyer_id,
                "amount_cents": amount_cents,
                "trade_id": trade_id,
                "idempotency_key": f"hold_{trade_id}"
            }
            resp = requests.post(f"{WALLET_SERVICE_URL}/escrow/hold", json=hold_req)
            resp.raise_for_status()
            logger.info(f"Step 1: Escrow hold successful for trade {trade_id}")
            
            # Step 2: Ticket Ownership Transfer
            transfer_req = {
                "ticket_id": ticket_id,
                "new_user_id": buyer_id,
                "trade_id": trade_id
            }
            resp = requests.post(f"{API_GATEWAY_URL}/tickets/transfer", json=transfer_req)
            resp.raise_for_status()
            logger.info(f"Step 2: Ticket ownership transferred for trade {trade_id}")
            
            # Step 3 & 4: Seller Wallet Escrow Release (Settlement)
            release_req = {
                "buyer_id": buyer_id,
                "seller_id": seller_id,
                "amount_cents": amount_cents,
                "trade_id": trade_id,
                "idempotency_key": f"release_{trade_id}"
            }
            resp = requests.post(f"{WALLET_SERVICE_URL}/escrow/release", json=release_req)
            resp.raise_for_status()
            logger.info(f"Step 3/4: Escrow released to seller for trade {trade_id}")
            
            # Step 5: Emit Success
            self.producer.send(
                "resale.trade.settled",
                value={"trade_id": trade_id, "status": "COMPLETED"}
            )
            logger.info(f"Saga completed successfully for trade {trade_id}")
            
        except Exception as e:
            logger.error(f"Saga failed for trade {trade_id}: {e}")
            from .compensations import handle_compensation
            handle_compensation(event, self.producer)
