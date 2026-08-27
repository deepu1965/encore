"""Kafka producer lifecycle management."""

from __future__ import annotations

import logging

from encore_kafka_client import KafkaEventProducer
from fastapi import FastAPI

from .config import settings

logger = logging.getLogger(__name__)


def init_producer(app: FastAPI) -> None:
    """Initialize the global Kafka producer and store it on app.state."""
    logger.info("Initializing Kafka producer against %s", settings.kafka_bootstrap_servers)
    try:
        producer = KafkaEventProducer(
            bootstrap_servers=settings.kafka_bootstrap_servers,
            producer_name=settings.kafka_producer_name,
        )
        app.state.kafka_producer = producer
        logger.info("Kafka producer initialized successfully.")
    except Exception as exc:
        # We catch all exceptions here. If Kafka is down at startup, we do not
        # want to crash the API Gateway. The API should still serve requests,
        # and event emissions will gracefully no-op (or be logged).
        logger.warning(
            "Failed to initialize Kafka producer. Events will not be published. Error: %s",
            exc,
        )
        app.state.kafka_producer = None


def close_producer(app: FastAPI) -> None:
    """Close the global Kafka producer."""
    producer: KafkaEventProducer | None = getattr(app.state, "kafka_producer", None)
    if producer is not None:
        logger.info("Closing Kafka producer...")
        producer.close()
        app.state.kafka_producer = None
