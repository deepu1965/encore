"""Create required Kafka topics for Encore V1."""

import logging
import sys
from kafka import KafkaAdminClient  # type: ignore[import-untyped]
from kafka.admin import NewTopic  # type: ignore[import-untyped]
from kafka.errors import TopicAlreadyExistsError, KafkaError  # type: ignore[import-untyped]

from encore_gateway.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TOPICS = [
    # (topic_name, num_partitions, replication_factor)
    ("inventory.seat.held", 3, 1),
    ("inventory.seat.held.dlq", 1, 1),
    ("order.completed", 3, 1),
    ("order.completed.dlq", 1, 1),
]

def main() -> None:
    try:
        admin_client = KafkaAdminClient(
            bootstrap_servers=settings.kafka_bootstrap_servers,
            client_id="topic-creator"
        )
    except KafkaError as exc:
        logger.error("Failed to connect to Kafka at %s: %s", settings.kafka_bootstrap_servers, exc)
        sys.exit(1)

    new_topics = []
    for name, partitions, replicas in TOPICS:
        new_topics.append(NewTopic(name=name, num_partitions=partitions, replication_factor=replicas))

    try:
        admin_client.create_topics(new_topics=new_topics, validate_only=False)
        logger.info("Successfully created topics.")
    except TopicAlreadyExistsError:
        logger.info("Some topics already exist (this is fine).")
    except Exception as exc:
        logger.error("Failed to create topics: %s", exc)
        sys.exit(1)
    finally:
        admin_client.close()

if __name__ == "__main__":
    main()
