#!/bin/bash
USER_TOKEN="11111111-1111-1111-1111-111111111111"

# Get first event ID
EVENT_ID=$(curl -s http://localhost:8000/api/v1/events | jq -r '.data.items[0].id')
if [ "$EVENT_ID" == "null" ]; then
    echo "No event found!"
    exit 1
fi

# Get all seat IDs
SEAT_IDS=$(curl -s http://localhost:8000/api/v1/events/${EVENT_ID}/seats | jq -r '.data.items[].seat_id' | paste -sd, -)
FIRST_SEAT=$(echo $SEAT_IDS | cut -d, -f1)

export API_BASE_URL=http://localhost:8000
export TEST_USER_TOKEN=${USER_TOKEN}
export CONTENTION_EVENT_ID=${EVENT_ID}
export CONTENTION_SEAT_ID=${FIRST_SEAT}
export FLASH_SALE_EVENT_ID=${EVENT_ID}
export FLASH_SALE_SEAT_IDS=${SEAT_IDS}

# Let's run a 30s benchmark with 50 users
export LOCUST_USERS=50
export LOCUST_SPAWN_RATE=10
export LOCUST_RUN_TIME=30s

locust -f tests/load/locustfile.py --headless -u 50 -r 10 --run-time 30s --host http://localhost:8000
