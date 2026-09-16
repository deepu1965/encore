#!/usr/bin/env bash
# Kafka Chaos Testing Script
# Usage: ./test_chaos_kafka.sh <duration_seconds>

set -e

DURATION=${1:-30}

echo "Starting Kafka Chaos Test..."
echo "Stopping Kafka container..."
docker-compose -f infrastructure/docker/docker-compose.yml stop kafka

echo "Kafka stopped. Waiting for $DURATION seconds..."
sleep $DURATION

echo "Restarting Kafka container..."
docker-compose -f infrastructure/docker/docker-compose.yml start kafka
echo "Kafka restarted."
echo "Chaos test completed."
