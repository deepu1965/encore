import os
import uuid
from locust import HttpUser, task, between

class EncoreUser(HttpUser):
    wait_time = between(1, 2)
    
    # We assume NGINX is on localhost:8000
    host = os.environ.get("TARGET_HOST", "http://localhost:8000")
    
    def on_start(self):
        """Set up auth headers to simulate a logged-in user."""
        # A static test JWT or auth token if required.
        # In this minimal benchmark, we'll assume either endpoints are public
        # or we have a test token.
        self.client.headers.update({
            "Authorization": "Bearer test-token-123"
        })

    @task(3)
    def cache_scenario_get_event(self):
        """Scenario 2/Baseline: Fetch events (should hit Redis if Cache is active)."""
        self.client.get("/api/v1/events?limit=10", name="GET /events")

    @task(2)
    def cache_scenario_get_inventory(self):
        """Fetch event seats/inventory status."""
        # Using a dummy event UUID. In a real test, you'd fetch an ID from the events list.
        dummy_event_id = "00000000-0000-0000-0000-000000000001"
        self.client.get(f"/api/v1/events/{dummy_event_id}/seats", name="GET /events/{id}/seats")

    @task(1)
    def async_queue_scenario_create_order(self):
        """Scenario 3: Create an order to hit the Kafka queue."""
        # Place an order for a dummy seat ID
        dummy_seat_id = "00000000-0000-0000-0000-000000000002"
        idempotency_key = str(uuid.uuid4())
        payload = {
            "seat_ids": [dummy_seat_id]
        }
        self.client.post(
            "/api/v1/orders", 
            json=payload, 
            headers={"Idempotency-Key": idempotency_key},
            name="POST /orders"
        )
