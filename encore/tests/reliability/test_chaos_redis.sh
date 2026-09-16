#!/usr/bin/env bash
# Redis Chaos Testing Script
# Usage: ./test_chaos_redis.sh <duration_seconds>

set -e

DURATION=${1:-30}

echo "Starting Redis Chaos Test..."
echo "Stopping Redis container..."
docker-compose -f infrastructure/docker/docker-compose.yml stop redis

echo "Redis stopped. Waiting for $DURATION seconds..."
sleep $DURATION

echo "Restarting Redis container..."
docker-compose -f infrastructure/docker/docker-compose.yml start redis
echo "Redis restarted."
echo "Chaos test completed."
