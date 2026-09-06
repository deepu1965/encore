import json
import logging
from datetime import datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Engine
from redis import Redis

from encore_kafka_client import KafkaEventConsumer

logger = logging.getLogger(__name__)

class FeedWorker(KafkaEventConsumer):
    """Worker that consumes event.published and fans out to user feeds."""

    def __init__(
        self,
        bootstrap_servers: str,
        primary_engine: Engine,
        redis_client: Redis,
        group_id: str = "feed-worker"
    ) -> None:
        super().__init__(
            bootstrap_servers=bootstrap_servers,
            topic="event.published",
            group_id=group_id
        )
        self.primary_engine = primary_engine
        self.redis_client = redis_client

    def handle_event(self, envelope) -> None:
        if envelope.type != "EVENT_PUBLISHED":
            return
            
        payload = envelope.payload

        event_id = payload.get("event_id")
        organizer_id = payload.get("organizer_id")
        published_at_ts = payload.get("published_at_ts", datetime.now().timestamp())
        
        if not event_id or not organizer_id:
            logger.warning("Invalid event.published payload")
            return
            
        with self.primary_engine.connect() as conn:
            # Check if organizer is mega organizer
            res = conn.execute(
                text("SELECT is_mega_organizer FROM users WHERE id = :org_id"),
                {"org_id": organizer_id}
            ).fetchone()
            
            is_mega = False
            if res and res[0]:
                is_mega = True
                
            if is_mega:
                # Fan-out-on-read: Just push to their outbox
                outbox_key = f"outbox:{organizer_id}"
                self.redis_client.zadd(outbox_key, {str(event_id): published_at_ts})
                logger.info(f"Pushed event {event_id} to mega-organizer outbox {organizer_id}")
            else:
                # Fan-out-on-write: Push to all followers
                followers = conn.execute(
                    text("SELECT follower_id FROM user_follows WHERE organizer_id = :org_id"),
                    {"org_id": organizer_id}
                ).fetchall()
                
                pipeline = self.redis_client.pipeline()
                for (follower_id,) in followers:
                    feed_key = f"feed:{follower_id}"
                    pipeline.zadd(feed_key, {str(event_id): published_at_ts})
                
                pipeline.execute()
                logger.info(f"Fanned out event {event_id} to {len(followers)} followers of {organizer_id}")
