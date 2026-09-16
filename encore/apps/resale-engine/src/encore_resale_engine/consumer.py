import json
import logging
import threading

from encore_event_contracts.events.resale import (
    RESALE_LISTING_CREATED_EVENT_TYPE,
    RESALE_LISTING_CREATED_TOPIC,
    RESALE_ORDER_CREATED_EVENT_TYPE,
    RESALE_ORDER_CREATED_TOPIC,
    RESALE_TRADE_MATCHED_EVENT_TYPE,
    RESALE_TRADE_MATCHED_TOPIC,
    RESALE_TRADE_MATCHED_VERSION,
    ResaleTradeMatchedPayload,
)
from encore_id_generator import SnowflakeIDGenerator
from encore_kafka_client import KafkaEventProducer, build_envelope
from kafka import KafkaConsumer
from sqlalchemy.orm import sessionmaker

from .matching import match_orders
from .models import ResaleListing, ResaleOrder

logger = logging.getLogger(__name__)

class MatchingEngineConsumer(threading.Thread):
    def __init__(self, engine, bootstrap_servers: str, producer: KafkaEventProducer | None = None):
        super().__init__(daemon=True)
        self.engine = engine
        self.bootstrap_servers = bootstrap_servers
        self.producer = producer
        self.SessionLocal = sessionmaker(bind=self.engine)
        self._stop_event = threading.Event()
        self._id_gen = SnowflakeIDGenerator()

    def run(self) -> None:
        logger.info("Starting MatchingEngineConsumer...")
        try:
            consumer = KafkaConsumer(
                RESALE_LISTING_CREATED_TOPIC,
                RESALE_ORDER_CREATED_TOPIC,
                bootstrap_servers=self.bootstrap_servers,
                group_id="resale-matching-group",
                auto_offset_reset="earliest",
                enable_auto_commit=False,
                value_deserializer=lambda m: json.loads(m.decode("utf-8")),
            )
        except Exception as exc:  # noqa: BLE001
            logger.error(f"Failed to connect to Kafka in MatchingEngineConsumer: {exc}")
            return

        while not self._stop_event.is_set():
            messages = consumer.poll(timeout_ms=1000)
            for tp, records in messages.items():  # noqa: PERF102
                for record in records:
                    envelope = record.value
                    event_type = envelope.get("event_type")
                    if event_type in (RESALE_LISTING_CREATED_EVENT_TYPE, RESALE_ORDER_CREATED_EVENT_TYPE):
                        payload = envelope.get("payload", {})
                        event_id_str = payload.get("event_id")
                        if event_id_str:
                            self.trigger_match(event_id_str, envelope.get("trace_id", ""))
                consumer.commit()
        consumer.close()

    def trigger_match(self, event_id_str: str, trace_id: str) -> None:
        with self.SessionLocal() as db:
            try:
                trades = match_orders(event_id_str, db)
                db.commit()
                
                for trade in trades:
                    listing = db.query(ResaleListing).get(trade.listing_id)
                    order = db.query(ResaleOrder).get(trade.order_id)
                    if self.producer and listing and order:
                        out_env = build_envelope(
                            event_type=RESALE_TRADE_MATCHED_EVENT_TYPE,
                            event_version=RESALE_TRADE_MATCHED_VERSION,
                            key=str(trade.event_id),
                            payload=ResaleTradeMatchedPayload(
                                trade_id=str(trade.id),
                                event_id=str(trade.event_id),
                                listing_id=str(trade.listing_id),
                                order_id=str(trade.order_id),
                                price_cents=trade.price_cents,
                                seller_id=str(listing.seller_id),
                                buyer_id=str(order.buyer_id),
                                matched_at=trade.created_at.isoformat()
                            ).to_dict(),
                            producer_name="resale-engine",
                            trace_id=trace_id,
                            id_generator=self._id_gen
                        )
                        self.producer.publish(RESALE_TRADE_MATCHED_TOPIC, out_env)
            except Exception as e:  # noqa: BLE001
                db.rollback()
                logger.error(f"Error during matching for event {event_id_str}: {e}")

    def stop(self) -> None:
        self._stop_event.set()
        self.join(timeout=5)
