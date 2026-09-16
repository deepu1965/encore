import json
import logging
import os
import time
from collections import defaultdict
from datetime import UTC, datetime

from kafka import KafkaConsumer
from sqlalchemy import create_engine, text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://encore:encore_dev_only@localhost:5432/encore")
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")

engine = create_engine(DATABASE_URL)

def flush_batch(batch: dict):
    if not batch:
        return
        
    logger.info(f"Flushing {len(batch)} ad aggregations to DB...")
    now = datetime.now(UTC).replace(second=0, microsecond=0) # 1 min tumbling window align
    
    with engine.begin() as conn:
        for ad_id, count in batch.items():
            conn.execute(
                text("""
                INSERT INTO ad_click_aggregations (ad_id, window_timestamp, click_count)
                VALUES (:ad_id, :window, :count)
                ON CONFLICT (ad_id, window_timestamp) 
                DO UPDATE SET click_count = ad_click_aggregations.click_count + EXCLUDED.click_count
                """),
                {"ad_id": ad_id, "window": now, "count": count}
            )
    logger.info("Batch flushed successfully.")

def main():
    logger.info("Starting analytics-worker for ad.clicks...")
    
    # Simple wait for Kafka
    time.sleep(10)
    
    consumer = KafkaConsumer(
        "ad.clicks",
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        group_id="analytics-worker-group",
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        auto_offset_reset="latest"
    )
    
    batch = defaultdict(int)
    last_flush = time.time()
    
    # We use a non-blocking approach to ensure we flush even if no new messages arrive
    consumer.poll(timeout_ms=1000) 
    
    while True:
        records = consumer.poll(timeout_ms=1000)
        for tp, messages in records.items():  # noqa: PERF102
            for msg in messages:
                val = msg.value
                if val.get("event_type") == "ad.clicked":
                    ad_id = val["data"]["ad_id"]
                    batch[ad_id] += 1
        
        # 60s tumbling window
        if time.time() - last_flush >= 60:
            if batch:
                try:
                    flush_batch(batch)
                    batch.clear()
                except Exception as e:  # noqa: BLE001
                    logger.error(f"Error flushing batch: {e}")
            last_flush = time.time()

if __name__ == "__main__":
    main()
