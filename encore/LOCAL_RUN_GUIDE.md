# Encore V1.5 — Local Run & Verification Guide
## (Full Platform: Backend Microservices + Next.js Frontend)

This guide provides end-to-end instructions to run, verify, and interact with the **Encore V1.5 ticketing platform** locally, covering both the backend microservices mesh and the Next.js 14 frontend application.

---

## 1. Quick Verification (One Automated Command)

To verify all backend microservices, health endpoints, the purchasing pipeline, and the frontend web application in a single automated step:

```bash
./scripts/verify_local.sh
```

This script automatically:
1. Pings health endpoints for all 8 microservices (Gateway, Waiting Room, Checkout, Location, Scheduler, Deployment, Resale, Wallet).
2. Issues a valid JWT Bearer token for the seeded buyer user.
3. Queries active events and locates an available seat from the database.
4. Executes the full purchasing saga (Hold -> Order -> Payment).
5. Queries the double-entry wallet ledger and secondary resale marketplace.
6. Verifies customer frontend pages (`/`, `/explore`, `/events/:id`, `/select-seats`, `/tickets`, `/resale`) and Operations console views (`/ops`, `/ops/database`, `/ops/kafka`, `/ops/wallets`, etc.).

---

## 2. Prerequisites

Ensure you have installed:
- **Docker & Docker Compose** (v2.20+)
- **Python 3.12+** with a virtual environment in `.venv/`
- **Node.js 20+** and `npm`

---

## 3. Starting the Platform Locally

### Step 3.1: Start All Infrastructure & Microservices (Docker Compose)

From the repository root (`/home/deepu/encore/encore`):

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

This launches all 16 platform containers on the `docker_default` network:
- **Primary & Sharded Databases:** `encore-postgres` (5432), `postgres-shard-0..2` (5433..5435), `encore-pgbouncer` (6432)
- **Cache & Pub/Sub:** `encore-redis` (6380)
- **Message Broker:** `encore-kafka` (9092)
- **Domain Microservices:**
  - `encore-api-gateway` (Port 8000 via Nginx reverse proxy)
  - `encore-waiting-room` (Port 8001)
  - `encore-payment-service` (Port 8002)
  - `encore-checkout-service` (Port 8003)
  - `encore-location-service` (Port 8004)
  - `encore-scheduler-service` (Port 8005)
  - `encore-deployment-service` (Port 8006)
  - `encore-resale-engine` (Port 8007)
  - `encore-wallet-service` (Port 8008)
- **Observability Stack:** `encore-grafana` (3000), `encore-prometheus` (9090), `encore-jaeger` (16686), `encore-minio` (9000/9001)

### Step 3.2: Run Database Migrations & Seed Baseline Data

Apply Alembic migrations (including wallet ledger and resale tables) and seed baseline venues, events, seats, and demo users:

```bash
make migrate
make seed
```

*Seeded Test Users:*
- **Buyer User ID:** `11111111-1111-1111-1111-111111111111` (`demo.buyer@example.com`)
- **Admin User ID:** `00000000-0000-0000-0000-000000000000` (`admin@example.com`)

### Step 3.3: Start the Next.js Frontend

The frontend is a Next.js 14 App Router application configured to run on port **3002** (avoiding port conflicts with Grafana on 3000):

```bash
cd frontend
npm install    # first time only
npm run dev -- -p 3002
```

The frontend application will be live at:
👉 **[http://localhost:3002](http://localhost:3002)**

---

## 4. Frontend Route Catalog

You can open and interact with all frontend routes directly in your browser:

### Customer & Ticketing Routes (Port 3002)
- **Home Landing Page:** `http://localhost:3002/`
- **Event Explorer & Search:** `http://localhost:3002/explore`
- **Event Details:** `http://localhost:3002/events/e31fea72-d88a-407b-9e36-19515a01e71e`
- **Interactive Seat Map:** `http://localhost:3002/events/e31fea72-d88a-407b-9e36-19515a01e71e/select-seats`
- **Checkout & Payment:** `http://localhost:3002/checkout`
- **Digital Ticket Wallet & QR:** `http://localhost:3002/tickets`
- **Resale My Listings:** `http://localhost:3002/resale/my-listings`
- **Resale Trade History:** `http://localhost:3002/resale/my-trades`

### Operations Console (17 Routes — Requires Admin Role)
The operations console is RBAC-gated. When accessing via browser, provide `x-mock-role: ADMIN` header or `mock_role=ADMIN` cookie:

- **Ops System Overview:** `http://localhost:3002/ops`
- **Kafka Clusters & Lag:** `http://localhost:3002/ops/kafka`
- **PostgreSQL Pool & TPS:** `http://localhost:3002/ops/database`
- **Redis Memory & Cache:** `http://localhost:3002/ops/redis`
- **Database Shards Topology:** `http://localhost:3002/ops/shards`
- **Scheduler & Cron Jobs:** `http://localhost:3002/ops/scheduler`
- **Virtual Waiting Room Queue:** `http://localhost:3002/ops/waiting-room`
- **Fraud Engine & Bot Detection:** `http://localhost:3002/ops/fraud`
- **Resale Marketplace Operations:** `http://localhost:3002/ops/resale`
- **Wallets & Double-Entry Ledger:** `http://localhost:3002/ops/wallets`
- **Payment Gateway Latency:** `http://localhost:3002/ops/payments`
- **User Directory & RBAC:** `http://localhost:3002/ops/users`
- **Venues & Seating Layouts:** `http://localhost:3002/ops/venues`
- **Event Lifecycle & Overrides:** `http://localhost:3002/ops/events`
- **Compliance & Security Audit Log:** `http://localhost:3002/ops/audit-log`
- **Runtime Feature Flags:** `http://localhost:3002/ops/feature-flags`
- **Flash Sale Orchestrator:** `http://localhost:3002/ops/flash-sale`

---

## 5. Backend Microservices Health Table

Verify backend service availability directly:

| Service | Port | Health Check URL | Expected Response |
| :--- | :---: | :--- | :--- |
| **API Gateway** | `8000` | `http://localhost:8000/health` | `{"status":"ok","service":"api-gateway",...}` |
| **Waiting Room** | `8001` | `http://localhost:8001/health` | `{"status":"ok","service":"waiting-room"}` |
| **Payment Service** | `8002` | `http://localhost:8002/health` | `{"status":"healthy","service":"payment-service"}` |
| **Checkout Service**| `8003` | `http://localhost:8003/health` | `{"status":"ok","service":"checkout-service"}` |
| **Location Service**| `8004` | `http://localhost:8004/health` | `{"status":"ok"}` |
| **Scheduler Service**| `8005`| `http://localhost:8005/health` | `{"status":"ok"}` |
| **Deployment Service**| `8006`| `http://localhost:8006/health` | `{"status":"ok"}` |
| **Resale Engine** | `8007` | `http://localhost:8007/api/v1/resale/health` | `{"status":"healthy","service":"resale-engine"}` |
| **Wallet Service**| `8008` | `http://localhost:8008/health` | `{"status":"healthy","service":"wallet-service"}` |

---

## 6. End-to-End Vertical Slice Walkthrough (cURL)

Execute the full purchasing and ledger workflow via cURL:

### Step 1: Issue JWT Auth Token
```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"user_id": "11111111-1111-1111-1111-111111111111"}' | jq -r .access_token)

echo "Bearer Token: $TOKEN"
```

### Step 2: Browse Events & Select a Seat
```bash
# Query active events
EVENT_ID=$(curl -s http://localhost:8000/api/v1/events | jq -r '.data.items[0].id')
echo "Event ID: $EVENT_ID"

# Query seat inventory and pick first available seat
SEAT_ID=$(curl -s "http://localhost:8000/api/v1/events/$EVENT_ID/seats" | \
  jq -r '.data.items[] | select(.status == "AVAILABLE") | .seat_id' | head -n 1)
echo "Seat ID: $SEAT_ID"
```

### Step 3: Create a 5-Minute Seat Hold
```bash
curl -s -X POST http://localhost:8000/api/v1/holds \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: hold-$RANDOM" \
  -H "Content-Type: application/json" \
  -d "{\"event_id\": \"$EVENT_ID\", \"seat_id\": \"$SEAT_ID\"}" | jq .
```

### Step 4: Convert Hold to an Order
```bash
ORDER_RESP=$(curl -s -X POST http://localhost:8000/api/v1/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: order-$RANDOM" \
  -H "Content-Type: application/json" \
  -d "{\"event_id\": \"$EVENT_ID\", \"seat_id\": \"$SEAT_ID\"}")

ORDER_ID=$(echo "$ORDER_RESP" | jq -r .data.id)
echo "Order ID: $ORDER_ID"
```

### Step 5: Charge Payment
```bash
curl -s -X POST http://localhost:8000/api/v1/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: pay-$RANDOM" \
  -H "Content-Type: application/json" \
  -d "{\"order_id\": \"$ORDER_ID\"}" | jq .
```

### Step 6: Query Customer Wallet Balance & Double-Entry Ledger
```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/wallet | jq .
```

### Step 7: Query Resale Marketplace Listings
```bash
curl -s "http://localhost:8000/api/v1/resale/events/$EVENT_ID/listings" | jq .
```

---

## 7. Realtime WebSocket Gateway Verification

Verify real-time bidirectional communication on `ws://localhost:8000/ws`:

```bash
python3 -c "
import asyncio, websockets, json

async def test_ws():
    uri = 'ws://localhost:8000/ws'
    async with websockets.connect(uri) as ws:
        # Ping
        await ws.send(json.dumps({'type': 'ping'}))
        print('Ping response:', await ws.recv())

        # Subscribe
        await ws.send(json.dumps({'type': 'subscribe', 'channel': 'order:test-123'}))
        print('Subscribe response:', await ws.recv())

asyncio.run(test_ws())
"
```

---

## 8. Running Automated Test Suites

### Backend Unit & Integration Tests (Pytest)
```bash
OTEL_SDK_DISABLED=true .venv/bin/pytest apps/api-gateway/tests/
```
*Result: 26 passed in ~2s.*

### Frontend Unit Tests (Vitest)
```bash
cd frontend
npm run test
```
*Result: 9 passed in ~1.2s.*

### Frontend TypeScript Verification
```bash
cd frontend
npm run typecheck
```
*Result: 0 errors.*

### Full Playwright End-to-End Suite (All 31 Scenarios)
```bash
cd frontend
npx playwright test
```
*Result: 31 passed in ~1m.*

### 30-Route Interactive Browser Walkthrough (With Screenshots)
To run the automated browser walkthrough that visits all 30 routes (Customer, Purchasing, Wallet, Waiting Room, Resale, Organizer, and all 17 Operations Console telemetry views) and outputs full-resolution PNG screenshots:
```bash
node frontend/scripts/browser_walkthrough.js
```
*Result: 30 / 30 routes passed in ~60s; screenshots saved to `screenshots/*.png`.*

---

## 9. Stopping the Platform

To cleanly stop all Docker containers:

```bash
docker compose -f infrastructure/docker/docker-compose.yml down
```
