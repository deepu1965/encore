import uuid
import logging
from collections import Counter
from sqlalchemy import create_engine, select
from encore_gateway.config import settings
from encore_gateway.models import Order, Ticket, Inventory, InventoryStatus, OrderStatus

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def verify():
    # Primary DB
    primary_engine = create_engine(settings.database_url)
    
    # Shard DBs
    shard_engines = [create_engine(url) for url in settings.shard_urls]

    invariants_violated = 0

    with primary_engine.connect() as primary_conn:
        # Check tickets
        tickets = primary_conn.execute(select(Ticket)).fetchall()
        inventory_counts = Counter([t.inventory_id for t in tickets])
        
        duplicates = {inv_id: count for inv_id, count in inventory_counts.items() if count > 1}
        if duplicates:
            logger.error(f"Invariant Violated: Duplicate tickets found for inventory IDs: {duplicates}")
            invariants_violated += 1
        else:
            logger.info("Invariant Passed: No duplicate tickets (double-sells) found.")

        # Check orders
        completed_orders = primary_conn.execute(select(Order).where(Order.status == OrderStatus.COMPLETED)).fetchall()
        
        # Every completed order must have exactly one ticket
        order_ticket_counts = Counter([t.order_id for t in tickets])
        missing_tickets = [o.id for o in completed_orders if order_ticket_counts.get(o.id, 0) != 1]
        
        if missing_tickets:
            logger.error(f"Invariant Violated: Completed orders without exactly 1 ticket: {missing_tickets}")
            invariants_violated += 1
        else:
            logger.info(f"Invariant Passed: All {len(completed_orders)} completed orders have exactly 1 ticket.")

        # Check Inventory statuses across shards
        total_sold = 0
        total_available = 0
        for i, shard_engine in enumerate(shard_engines):
            with shard_engine.connect() as shard_conn:
                sold = shard_conn.execute(select(Inventory).where(Inventory.status == InventoryStatus.SOLD)).fetchall()
                avail = shard_conn.execute(select(Inventory).where(Inventory.status == InventoryStatus.AVAILABLE)).fetchall()
                total_sold += len(sold)
                total_available += len(avail)

        logger.info(f"Inventory status across all shards: {total_sold} SOLD, {total_available} AVAILABLE")
        
        if total_sold != len(tickets):
            logger.error(f"Invariant Violated: Total SOLD inventory ({total_sold}) does not match number of tickets ({len(tickets)})")
            # Wait, this might be violated because we seed 20 seats but don't buy them all, but the SOLD count should match tickets!
            invariants_violated += 1
        else:
            logger.info("Invariant Passed: Total SOLD inventory matches total tickets issued.")

    if invariants_violated == 0:
        logger.info("ALL INVARIANTS PASSED! \U0001f389")
    else:
        logger.error(f"{invariants_violated} invariants were violated.")

if __name__ == "__main__":
    verify()
