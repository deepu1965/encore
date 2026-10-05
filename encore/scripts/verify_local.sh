#!/usr/bin/env bash
set -e

# Colors for terminal output
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${CYAN}======================================================${NC}"
echo -e "${CYAN}   ENCORE PLATFORM — FULL LOCAL RUNTIME VERIFICATION  ${NC}"
echo -e "${CYAN}        (Backend Microservices + Next.js Frontend)    ${NC}"
echo -e "${CYAN}======================================================${NC}"

# Helper function
check_endpoint() {
    local name="$1"
    local url="$2"
    local headers="${3:-}"
    local status
    if [ -n "$headers" ]; then
        status=$(curl -s -H "$headers" -o /dev/null -w "%{http_code}" "$url" || echo "FAILED")
    else
        status=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "FAILED")
    fi

    if [ "$status" = "200" ] || [ "$status" = "201" ]; then
        echo -e "  ✓ $name ($url) -> ${GREEN}HTTP $status OK${NC}"
    else
        echo -e "  ✗ $name ($url) -> ${RED}HTTP $status FAILED${NC}"
        return 1
    fi
}

# 1. Health Checks
echo -e "\n${CYAN}[1/6] Verifying Backend Microservices Health...${NC}"
check_endpoint "API Gateway" "http://localhost:8000/health"
check_endpoint "Waiting Room" "http://localhost:8001/health"
check_endpoint "Checkout Service" "http://localhost:8003/health"
check_endpoint "Location Service" "http://localhost:8004/health"
check_endpoint "Scheduler Service" "http://localhost:8005/health"
check_endpoint "Deployment Service" "http://localhost:8006/health"
check_endpoint "Resale Engine" "http://localhost:8007/api/v1/resale/health"
check_endpoint "Wallet Service" "http://localhost:8008/health"

# 2. Authentication Token Issuance
echo -e "\n${CYAN}[2/6] Issuing JWT Auth Token...${NC}"
BUYER_ID="11111111-1111-1111-1111-111111111111"
AUTH_RESP=$(curl -s -X POST http://localhost:8000/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d "{\"user_id\": \"$BUYER_ID\"}")

TOKEN=$(echo "$AUTH_RESP" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))")
if [ -z "$TOKEN" ]; then
    echo -e "  ${RED}Failed to issue JWT token: $AUTH_RESP${NC}"
    exit 1
fi
echo -e "  ✓ JWT Token issued: ${GREEN}${TOKEN:0:20}...${NC}"

# 3. Discovery & Inventory Query
echo -e "\n${CYAN}[3/6] Querying Events and Available Seats...${NC}"
EVENTS_RESP=$(curl -s http://localhost:8000/api/v1/events)
EVENT_ID=$(echo "$EVENTS_RESP" | python3 -c "import sys, json; items = json.load(sys.stdin).get('data', {}).get('items', []); print(items[0]['id'] if items else '')")

if [ -z "$EVENT_ID" ]; then
    echo -e "  ${RED}No events found in database! Run make seed first.${NC}"
    exit 1
fi
echo -e "  ✓ Active Event ID: ${GREEN}$EVENT_ID${NC}"

SEATS_RESP=$(curl -s "http://localhost:8000/api/v1/events/$EVENT_ID/seats")
AVAILABLE_SEAT=$(echo "$SEATS_RESP" | python3 -c "import sys, json; items = json.load(sys.stdin).get('data', {}).get('items', []); avail = [s for s in items if s['status'] == 'AVAILABLE']; print(avail[0]['seat_id'] if avail else '')")

if [ -z "$AVAILABLE_SEAT" ]; then
    echo -e "  ${RED}No available seats found for event $EVENT_ID${NC}"
    exit 1
fi
echo -e "  ✓ Selected Available Seat ID: ${GREEN}$AVAILABLE_SEAT${NC}"

# 4. End-to-End Hold, Order, and Payment Pipeline
echo -e "\n${CYAN}[4/6] Executing Purchasing Flow (Hold -> Order -> Payment)...${NC}"

# Hold
HOLD_RESP=$(curl -s -X POST http://localhost:8000/api/v1/holds \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: verify-hold-$RANDOM" \
  -H "Content-Type: application/json" \
  -d "{\"event_id\": \"$EVENT_ID\", \"seat_id\": \"$AVAILABLE_SEAT\"}")

HOLD_STATUS=$(echo "$HOLD_RESP" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('status', ''))")
if [ "$HOLD_STATUS" != "HELD" ]; then
    echo -e "  ${RED}Hold creation failed: $HOLD_RESP${NC}"
    exit 1
fi
echo -e "  ✓ Seat Hold Created: ${GREEN}$HOLD_STATUS${NC}"

# Order
ORDER_RESP=$(curl -s -X POST http://localhost:8000/api/v1/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: verify-order-$RANDOM" \
  -H "Content-Type: application/json" \
  -d "{\"event_id\": \"$EVENT_ID\", \"seat_id\": \"$AVAILABLE_SEAT\"}")

ORDER_ID=$(echo "$ORDER_RESP" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('id', ''))")
if [ -z "$ORDER_ID" ]; then
    echo -e "  ${RED}Order creation failed: $ORDER_RESP${NC}"
    exit 1
fi
echo -e "  ✓ Order Created: ${GREEN}$ORDER_ID${NC}"

# Payment
PAY_RESP=$(curl -s -X POST http://localhost:8000/api/v1/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: verify-pay-$RANDOM" \
  -H "Content-Type: application/json" \
  -d "{\"order_id\": \"$ORDER_ID\"}")

PAY_STATUS=$(echo "$PAY_RESP" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('status', ''))")
if [ "$PAY_STATUS" != "SUCCESS" ]; then
    echo -e "  ${RED}Payment failed: $PAY_RESP${NC}"
    exit 1
fi
echo -e "  ✓ Payment Processed: ${GREEN}$PAY_STATUS${NC}"

# 5. Reverse Proxies & Auxiliary Domains (Wallet & Resale)
echo -e "\n${CYAN}[5/6] Verifying Reverse Proxy Domains (Wallet & Resale)...${NC}"

WALLET_RESP=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/wallet)
WALLET_BALANCE=$(echo "$WALLET_RESP" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('balance_cents', ''))")
echo -e "  ✓ Wallet Balance: ${GREEN}\$$(echo "scale=2; $WALLET_BALANCE / 100" | bc)${NC}"

RESALE_RESP=$(curl -s "http://localhost:8000/api/v1/resale/events/$EVENT_ID/listings")
RESALE_ITEMS=$(echo "$RESALE_RESP" | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('data', {}).get('items', [])))")
echo -e "  ✓ Resale Marketplace Listings: ${GREEN}$RESALE_ITEMS active${NC}"

# 6. Frontend Application Verification
echo -e "\n${CYAN}[6/6] Verifying Frontend Application (Port 3002)...${NC}"

# Check if frontend dev server is running on 3002
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/ || echo "OFFLINE")

if [ "$FRONTEND_STATUS" = "OFFLINE" ]; then
    echo -e "  ${YELLOW}Notice: Frontend dev server is not currently running on port 3002.${NC}"
    echo -e "  Starting frontend dev server in background on port 3002..."
    (cd frontend && npm run dev -- -p 3002 > /tmp/frontend_dev.log 2>&1 &)
    echo -e "  Waiting 5 seconds for Next.js to bind to port 3002..."
    sleep 5
fi

# Verify Customer UI Routes
check_endpoint "Frontend Home Page" "http://localhost:3002/"
check_endpoint "Frontend Event Explorer" "http://localhost:3002/explore"
check_endpoint "Frontend Event Details" "http://localhost:3002/events/$EVENT_ID"
check_endpoint "Frontend Seat Selection Map" "http://localhost:3002/events/$EVENT_ID/select-seats"
check_endpoint "Frontend Customer Tickets" "http://localhost:3002/tickets" "x-mock-role: BUYER"
check_endpoint "Frontend Resale Listings" "http://localhost:3002/resale/my-listings" "x-mock-role: BUYER"

# Verify Operations Console (Admin RBAC)
check_endpoint "Ops Console: System Overview" "http://localhost:3002/ops" "x-mock-role: ADMIN"
check_endpoint "Ops Console: Kafka Clusters" "http://localhost:3002/ops/kafka" "x-mock-role: ADMIN"
check_endpoint "Ops Console: Database Telemetry" "http://localhost:3002/ops/database" "x-mock-role: ADMIN"
check_endpoint "Ops Console: Redis Cluster" "http://localhost:3002/ops/redis" "x-mock-role: ADMIN"
check_endpoint "Ops Console: Database Shards" "http://localhost:3002/ops/shards" "x-mock-role: ADMIN"
check_endpoint "Ops Console: Wallets Ledger Audit" "http://localhost:3002/ops/wallets" "x-mock-role: ADMIN"
check_endpoint "Ops Console: Resale Marketplace" "http://localhost:3002/ops/resale" "x-mock-role: ADMIN"
check_endpoint "Ops Console: Waiting Room Control" "http://localhost:3002/ops/waiting-room" "x-mock-role: ADMIN"

echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN}   ALL LOCAL SYSTEMS (BACKEND + FRONTEND) VERIFIED!   ${NC}"
echo -e "${GREEN}======================================================${NC}"
