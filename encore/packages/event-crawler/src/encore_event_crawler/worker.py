import hashlib
import json
import logging
import time
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Engine

from encore_kafka_client import KafkaEventProducer

logger = logging.getLogger(__name__)

class EventCrawlerWorker:
    """Worker that crawls external partner feeds and produces events to Kafka."""

    def __init__(
        self,
        primary_engine: Engine,
        producer: KafkaEventProducer | None,
        poll_interval_secs: int = 60,
    ) -> None:
        self.primary_engine = primary_engine
        self.producer = producer
        self.poll_interval_secs = poll_interval_secs
        self._running = False

    def run(self) -> None:
        logger.info("Starting EventCrawlerWorker")
        self._running = True
        while self._running:
            self._tick()
            time.sleep(self.poll_interval_secs)

    def stop(self) -> None:
        self._running = False

    def _tick(self) -> int:
        """Fetch mock events and ingest them. Returns the number of events processed."""
        # We simulate fetching from a partner API
        mock_partner_events = [
            {
                "partner_id": "PARTNER-1",
                "title": "Coldplay - Music of the Spheres",
                "date": "2027-08-14T19:00:00Z",
                "venue_name": "Wembley Stadium",
                "description": "Coldplay returns to London.",
            },
            {
                "partner_id": "PARTNER-2",
                "title": "Taylor Swift - The Eras Tour",
                "date": "2027-09-01T19:30:00Z",
                "venue_name": "Lumen Field",
                "description": "Taylor Swift live in Seattle.",
            }
        ]

        count = 0
        with self.primary_engine.begin() as conn:
            # We take an advisory lock to ensure only one crawler instance processes this
            res = conn.execute(
                text("SELECT pg_try_advisory_xact_lock(333444555)")
            ).scalar()
            if not res:
                return 0

            for event in mock_partner_events:
                # Deduplication logic: hash(title + date + venue)
                canonical_str = f"{event['title']}|{event['date']}|{event['venue_name']}".encode("utf-8")
                event_hash = hashlib.sha256(canonical_str).hexdigest()

                # Check if this hash exists in our processed table
                # (For V1 we can just check if an event with this hash exists, or use a dedicated crawler_state table)
                # Let's assume we create a crawler_events table or just check the Kafka topic.
                # Since we don't have a crawler_events table, we can just use the hash as an idempotency key.
                # We'll just emit it to Kafka. The consumer will handle deduplication using the hash.
                
                # We will emit a 'crawler.events' topic
                if self.producer:
                    envelope = {
                        "type": "CRAWLER_EVENT_DISCOVERED",
                        "data": {
                            "event_hash": event_hash,
                            **event
                        }
                    }
                    self.producer.produce("crawler.events", event_hash, json.dumps(envelope).encode("utf-8"))
                
                count += 1
                
        return count
