import argparse

from kafka import KafkaConsumer


def monitor_dlq(bootstrap_servers: str, topic: str):
    dlq_topic = f"{topic}.dlq"
    print(f"Monitoring DLQ topic: {dlq_topic} at {bootstrap_servers}...")
    
    consumer = KafkaConsumer(
        dlq_topic,
        bootstrap_servers=bootstrap_servers,
        group_id="dlq-monitor-script",
        auto_offset_reset="earliest",
        enable_auto_commit=False,
    )
    
    try:
        for msg in consumer:
            print("\n--- DLQ Message ---")
            print(f"Key: {msg.key.decode('utf-8') if msg.key else None}")
            print(f"Value: {msg.value.decode('utf-8') if msg.value else None}")
            print(f"Headers: {msg.headers}")
    except KeyboardInterrupt:
        print("Stopping DLQ monitor.")
    finally:
        consumer.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Monitor a DLQ Kafka topic.")
    parser.add_argument("--servers", default="localhost:9092", help="Kafka bootstrap servers")
    parser.add_argument("--topic", required=True, help="The original topic name (e.g. order.completed). The script will append .dlq automatically.")  # noqa: E501
    
    args = parser.parse_args()
    monitor_dlq(args.servers, args.topic)
