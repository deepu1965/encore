import logging
import os
import smtplib
from abc import ABC, abstractmethod
from email.message import EmailMessage
from typing import Any

from encore_kafka_client import KafkaEventConsumer

logger = logging.getLogger(__name__)


class NotificationProvider(ABC):
    @abstractmethod
    def send_email(self, to: str, subject: str, body: str) -> bool: ...
    @abstractmethod
    def send_push(self, device_token: str, title: str, body: str) -> bool: ...


class StubProvider(NotificationProvider):
    """For testing — logs to stdout."""
    def send_email(self, to: str, subject: str, body: str) -> bool:
        logger.info(f"STUB: email to {to}: {subject}")
        return True

    def send_push(self, device_token: str, title: str, body: str) -> bool:
        logger.info(f"STUB: push to {device_token}: {title}")
        return True


class SmtpEmailProvider(NotificationProvider):
    """Production — sends via SMTP (configurable from env)."""
    def send_email(self, to: str, subject: str, body: str) -> bool:
        host = os.environ.get("SMTP_HOST", "")
        if not host:
            logger.warning("SMTP_HOST not configured — email not sent")
            return False
        port = int(os.environ.get("SMTP_PORT", 587))
        user = os.environ.get("SMTP_USER", "")
        password = os.environ.get("SMTP_PASSWORD", "")
        
        msg = EmailMessage()
        msg.set_content(body)
        msg['Subject'] = subject
        msg['From'] = os.environ.get("SMTP_FROM", "noreply@encore.app")
        msg['To'] = to
        
        try:
            with smtplib.SMTP(host, port) as server:
                if user and password:
                    server.starttls()
                    server.login(user, password)
                server.send_message(msg)
            return True
        except Exception as e:
            logger.error(f"Failed to send email via SMTP: {e}")
            return False
            
    def send_push(self, device_token: str, title: str, body: str) -> bool:
        logger.info(f"SmtpEmailProvider: fake push to {device_token}: {title}")
        return True


def get_provider() -> NotificationProvider:
    if os.environ.get("SMTP_HOST"):
        return SmtpEmailProvider()
    return StubProvider()


class NotificationWorker(KafkaEventConsumer):
    """Worker that consumes events and sends notifications."""

    def __init__(self, bootstrap_servers: str, group_id: str = "notification-worker"):
        super().__init__(
            bootstrap_servers=bootstrap_servers,
            topic="dummy_topic",
            group_id=group_id
        )
        self.provider = get_provider()

    def start(self) -> None:
        self._consumer.subscribe(["order.completed", "event.published"])
        super().start()

    def handle_event(self, envelope) -> None:
        payload = envelope.payload
        topic = envelope.type
        
        if topic == "order.completed":
            self._send_email(payload)
        elif topic == "event.published":
            self._prepare_push_notification(payload)
            
    def _send_email(self, payload: dict[str, Any]) -> None:
        order_id = payload.get("order_id", "UNKNOWN")
        user_id = payload.get("user_id", "UNKNOWN")
        # In a real app we would fetch the user's email from the DB using user_id
        dummy_email = f"{user_id}@example.com"
        subject = f"Order {order_id} Confirmation"
        body = f"Thank you for your order! Your ticket is confirmed.\nOrder ID: {order_id}"
        
        self.provider.send_email(dummy_email, subject, body)
        
    def _prepare_push_notification(self, payload: dict[str, Any]) -> None:
        event_id = payload.get("event_id")  # noqa: F841
        organizer_id = payload.get("organizer_id")
        
        title = "New Event Announced!"
        body = f"An organizer you follow ({organizer_id}) just announced a new event."
        
        # In a real app we'd fetch device tokens for followers
        dummy_device_token = "dummy_token_123"
        self.provider.send_push(dummy_device_token, title, body)
