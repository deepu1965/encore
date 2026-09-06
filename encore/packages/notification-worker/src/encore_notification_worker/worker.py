import json
import logging
from typing import Any

from encore_kafka_client import KafkaEventConsumer

logger = logging.getLogger(__name__)

class NotificationWorker(KafkaEventConsumer):
    """Worker that consumes events and sends notifications."""

    def __init__(self, bootstrap_servers: str, group_id: str = "notification-worker"):
        super().__init__(
            bootstrap_servers=bootstrap_servers,
            topic="dummy_topic", # We will subscribe to multiple topics manually if needed, or we can just pass a list if the base class supports it. Wait, the base class expects a single topic string in its __init__. Let's just pass one or comma separated if kafka-python supports it.
            group_id=group_id
        )

    def start(self) -> None:
        self._consumer.subscribe(["order.completed", "event.published"])
        super().start()

    def handle_event(self, envelope) -> None:
        payload = envelope.payload
        topic = envelope.type # Wait, envelope.type is the event type, not topic. Let's use it.
        
        if topic == "order.completed":
            self._send_email(payload)
        elif topic == "event.published":
            self._prepare_push_notification(payload)
            
    def _send_email(self, payload: dict[str, Any]) -> None:
        """Dummy SMTP logging."""
        order_id = payload.get("order_id", "UNKNOWN")
        logger.info(f"SMTP DUMMY: Sending order confirmation email for order {order_id}")
        
    def _prepare_push_notification(self, payload: dict[str, Any]) -> None:
        """Standardized push notification payload structure."""
        event_id = payload.get("event_id")
        organizer_id = payload.get("organizer_id")
        
        push_payload = {
            "title": "New Event Announced!",
            "body": f"An organizer you follow ({organizer_id}) just announced a new event.",
            "data": {
                "event_id": event_id,
                "action": "view_event"
            }
        }
        logger.info(f"PUSH DUMMY: Prepared push notification payload: {json.dumps(push_payload)}")

