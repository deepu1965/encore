"""Locust load test harness for Week 8 — Hot Inventory.

Two scenarios:

  Scenario A — HoldContentionUser:
    All users attempt to hold the *exact same* seat simultaneously.
    Success criteria: exactly 1 user gets 201, all others get 409.
    Proves zero double-sells under concurrent contention.

  Scenario B — FlashSaleUser:
    Users are distributed across a pool of different seats.
    Measures hold throughput (req/s), P95 and P99 latency.

Environment variables required (set in .env.locust or via docker-compose):
  API_BASE_URL        API Gateway base URL (default: http://localhost:8000)
  TEST_USER_TOKEN     Bearer token for a seeded test user
  CONTENTION_EVENT_ID UUID of the flash-sale event (must exist in DB)
  CONTENTION_SEAT_ID  UUID of the single seat all contention users target
  FLASH_SALE_EVENT_ID UUID of the flash-sale event for Scenario B
  FLASH_SALE_SEAT_IDS Comma-separated list of seat UUIDs for Scenario B
  IDEMPOTENCY_PREFIX  Prefix for idempotency keys (default: locust-test)

Usage:
  # Headless, 50 users, 30s run (Scenario A):
  locust --headless -u 50 -r 50 --run-time 30s --tags contention

  # Headless, 100 users, 60s run (Scenario B):
  locust --headless -u 100 -r 20 --run-time 60s --tags flash-sale

  # Or via Makefile:
  make load-test-contention
  make load-test-flash-sale
"""

from __future__ import annotations

import os
import uuid
from itertools import cycle

from locust import HttpUser, between, events, tag, task
from locust.exception import StopUser

# ─── Configuration ───────────────────────────────────────────────────────────

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
TEST_USER_TOKEN = os.getenv("TEST_USER_TOKEN", "")
CONTENTION_EVENT_ID = os.getenv("CONTENTION_EVENT_ID", "")
CONTENTION_SEAT_ID = os.getenv("CONTENTION_SEAT_ID", "")
FLASH_SALE_EVENT_ID = os.getenv("FLASH_SALE_EVENT_ID", "")
_seat_ids_raw = os.getenv("FLASH_SALE_SEAT_IDS", "")
FLASH_SALE_SEAT_IDS: list[str] = [s.strip() for s in _seat_ids_raw.split(",") if s.strip()]
IDEMPOTENCY_PREFIX = os.getenv("IDEMPOTENCY_PREFIX", "locust-test")

_seat_cycle = cycle(FLASH_SALE_SEAT_IDS) if FLASH_SALE_SEAT_IDS else cycle([""])

# Tracking for Scenario A correctness check
_contention_results: dict[str, int] = {"201": 0, "409": 0, "other": 0}


@events.request.add_listener
def on_request(response_time, response_length, exception, context, **kwargs):
    pass  # Extend here for custom metric exporters (Prometheus, etc.)


# ─── Scenario A: Hold Contention ─────────────────────────────────────────────

class HoldContentionUser(HttpUser):
    """All users race to hold the exact same seat.

    Acceptance: exactly 1 request returns 201; all others return 409.
    """

    host = API_BASE_URL
    wait_time = between(0, 0)  # no wait — max contention

    @tag("contention")
    @task
    def try_hold_contended_seat(self) -> None:
        if not (CONTENTION_EVENT_ID and CONTENTION_SEAT_ID and TEST_USER_TOKEN):
            self.environment.runner.quit()
            raise ValueError(
                "CONTENTION_EVENT_ID, CONTENTION_SEAT_ID, and TEST_USER_TOKEN must be set."
            )

        idem_key = f"{IDEMPOTENCY_PREFIX}-contention-{uuid.uuid4().hex}"
        with self.client.post(
            "/api/v1/holds",
            json={"event_id": CONTENTION_EVENT_ID, "seat_id": CONTENTION_SEAT_ID},
            headers={
                "Authorization": f"Bearer {TEST_USER_TOKEN}",
                "Idempotency-Key": idem_key,
                "Content-Type": "application/json",
            },
            catch_response=True,
            name="POST /holds [contention]",
        ) as resp:
            if resp.status_code == 201:
                _contention_results["201"] += 1
                resp.success()
            elif resp.status_code == 409:
                _contention_results["409"] += 1
                resp.success()  # 409 is expected — not a Locust failure
            else:
                _contention_results["other"] += 1
                resp.failure(f"Unexpected status {resp.status_code}: {resp.text[:200]}")

        # Stop after one attempt (this is a contention test, not a throughput test)
        raise StopUser()


# ─── Scenario B: Flash Sale Throughput ───────────────────────────────────────

class FlashSaleUser(HttpUser):
    """Users are distributed across a pool of seats, simulating a flash sale.

    Measures: throughput (req/s), P95/P99 latency.
    """

    host = API_BASE_URL
    wait_time = between(0.1, 0.5)

    @tag("flash-sale")
    @task
    def hold_seat(self) -> None:
        if not (FLASH_SALE_EVENT_ID and FLASH_SALE_SEAT_IDS and TEST_USER_TOKEN):
            self.environment.runner.quit()
            raise ValueError(
                "FLASH_SALE_EVENT_ID, FLASH_SALE_SEAT_IDS, and TEST_USER_TOKEN must be set."
            )

        seat_id = next(_seat_cycle)
        idem_key = f"{IDEMPOTENCY_PREFIX}-flash-{uuid.uuid4().hex}"

        with self.client.post(
            "/api/v1/holds",
            json={"event_id": FLASH_SALE_EVENT_ID, "seat_id": seat_id},
            headers={
                "Authorization": f"Bearer {TEST_USER_TOKEN}",
                "Idempotency-Key": idem_key,
                "Content-Type": "application/json",
            },
            catch_response=True,
            name="POST /holds [flash-sale]",
        ) as resp:
            if resp.status_code in (201, 409):
                resp.success()
            else:
                resp.failure(f"Unexpected status {resp.status_code}: {resp.text[:200]}")

    @tag("flash-sale")
    @task(weight=3)
    def read_seat_status(self) -> None:
        """Read-heavy workload: seat status checks dominate flash-sale traffic."""
        if not FLASH_SALE_SEAT_IDS:
            return
        # For simplicity we use a fixed seat ID for status reads
        seat_id = FLASH_SALE_SEAT_IDS[0]
        with self.client.get(
            f"/api/v1/inventory/{seat_id}",
            headers={"Authorization": f"Bearer {TEST_USER_TOKEN}"},
            catch_response=True,
            name="GET /inventory/{id} [flash-sale]",
        ) as resp:
            if resp.status_code in (200, 404):
                resp.success()
            else:
                resp.failure(f"Unexpected status {resp.status_code}")


# ─── Scenario C: Full Checkout Saga ──────────────────────────────────────────

class CheckoutSagaUser(HttpUser):
    """Users attempt to buy seats end-to-end: hold -> order -> pay."""

    host = API_BASE_URL
    wait_time = between(0.5, 2.0)

    @tag("checkout")
    @task
    def complete_checkout(self) -> None:
        if not (FLASH_SALE_EVENT_ID and FLASH_SALE_SEAT_IDS and TEST_USER_TOKEN):
            self.environment.runner.quit()
            raise ValueError(
                "FLASH_SALE_EVENT_ID, FLASH_SALE_SEAT_IDS, and TEST_USER_TOKEN must be set."
            )

        seat_id = next(_seat_cycle)
        headers = {
            "Authorization": f"Bearer {TEST_USER_TOKEN}",
            "Content-Type": "application/json",
        }

        # 1. Hold Seat
        hold_idem = f"{IDEMPOTENCY_PREFIX}-hold-{uuid.uuid4().hex}"
        with self.client.post(
            "/api/v1/holds",
            json={"event_id": FLASH_SALE_EVENT_ID, "seat_id": seat_id},
            headers={**headers, "Idempotency-Key": hold_idem},
            name="POST /holds [checkout]",
            catch_response=True,
        ) as resp:
            if resp.status_code == 409:
                resp.success()
                return
            elif resp.status_code != 201:
                resp.failure(f"Hold failed {resp.status_code}: {resp.text[:100]}")
                return
            resp.success()

        # 2. Create Order
        order_idem = f"{IDEMPOTENCY_PREFIX}-order-{uuid.uuid4().hex}"
        with self.client.post(
            "/api/v1/orders",
            json={"event_id": FLASH_SALE_EVENT_ID, "seat_id": seat_id},
            headers={**headers, "Idempotency-Key": order_idem},
            name="POST /orders [checkout]",
            catch_response=True,
        ) as resp:
            if resp.status_code != 201:
                resp.failure(f"Order failed {resp.status_code}: {resp.text[:100]}")
                return
            
            resp.success()
            order_id = resp.json()["data"]["id"]

        # 3. Pay
        pay_idem = f"{IDEMPOTENCY_PREFIX}-pay-{uuid.uuid4().hex}"
        with self.client.post(
            "/api/v1/payments",
            json={"order_id": order_id},
            headers={**headers, "Idempotency-Key": pay_idem},
            name="POST /payments [checkout]",
            catch_response=True,
        ) as resp:
            if resp.status_code != 201:
                resp.failure(f"Payment failed {resp.status_code}: {resp.text[:100]}")
                return
            resp.success()


# ─── Summary at end ──────────────────────────────────────────────────────────

@events.quitting.add_listener
def on_quitting(environment, **kwargs):
    total = sum(_contention_results.values())
    if total > 0:
        successes = _contention_results["201"]
        rejections = _contention_results["409"]
        print("\n=== Contention Test Summary ===")
        print(f"  Total hold attempts : {total}")
        print(f"  Successful holds    : {successes}  (must be exactly 1)")
        print(f"  Rejected (409)      : {rejections}")
        print(f"  Unexpected          : {_contention_results['other']}")
        print(f"  Double-sells        : {'NONE (PASS)' if successes <= 1 else f'DETECTED: {successes} (FAIL)'}")
        print("================================\n")
