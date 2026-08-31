# Load Testing — Week 8 Hot Inventory

This directory contains the Locust load test harness for Week 8 (Hot Inventory).
Full distributed Locust multi-worker expansion is a Week 17 (Flash-Sale Load Testing) concern.

---

## Prerequisites

1. The main stack must be running:
   ```bash
   make up  # from encore/ directory
   ```
2. A seeded user and test event/seat must exist in the database:
   ```bash
   make seed  # from encore/ directory
   ```
3. Locust must be installed:
   ```bash
   pip install locust
   ```
   Or use Docker (no local install needed).

---

## Configuration

Copy and edit the environment file:

```bash
cp tests/load/.env.locust.example tests/load/.env.locust
# then edit .env.locust with your fixture values
```

Required environment variables:

| Variable | Description |
|---|---|
| `TEST_USER_TOKEN` | Bearer token for a seeded test user |
| `CONTENTION_EVENT_ID` | UUID of the flash-sale event (from seed data) |
| `CONTENTION_SEAT_ID` | UUID of the *single* seat for Scenario A |
| `FLASH_SALE_EVENT_ID` | UUID of the flash-sale event for Scenario B |
| `FLASH_SALE_SEAT_IDS` | Comma-separated seat UUIDs for Scenario B |

---

## Running via Makefile

```bash
# Scenario A — Contention correctness test (50 users, 30s)
make load-test-contention

# Scenario B — Flash-sale throughput test (100 users, 60s)
make load-test-flash-sale
```

---

## Running locally (without Docker)

```bash
cd encore/tests/load

# Scenario A:
locust --headless -u 50 -r 50 --run-time 30s --tags contention \
  -f locustfile.py --host http://localhost:8000

# Scenario B:
locust --headless -u 100 -r 20 --run-time 60s --tags flash-sale \
  -f locustfile.py --host http://localhost:8000
```

---

## Running via Docker Compose

```bash
cd encore

# Set your fixture values first:
export TEST_USER_TOKEN=<your-token>
export CONTENTION_EVENT_ID=<event-uuid>
export CONTENTION_SEAT_ID=<seat-uuid>
export FLASH_SALE_EVENT_ID=<event-uuid>
export FLASH_SALE_SEAT_IDS=<seat-uuid-1>,<seat-uuid-2>,...

docker compose \
  -f infrastructure/docker/docker-compose.yml \
  -f tests/load/docker-compose.locust.yml \
  up --abort-on-container-exit
```

---

## Acceptance Criteria (Week 8)

### Scenario A (Correctness)

```
Contention users       : 50
Run time               : 30s
Successful holds (201) : exactly 1
Double-sells           : 0
```

### Scenario B (Performance — fill in after running)

```
Flash sale users       : 100
Run time               : 60s
POST /holds throughput : ??? req/s
P95 latency            : ??? ms
P99 latency            : ??? ms
Double-sells           : 0
```

Record measured results in `docs/benchmarks/week8-hot-inventory.md`.
