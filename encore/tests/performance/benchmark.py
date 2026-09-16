import os
import uuid

from locust import HttpUser, between, task


class EncoreUser(HttpUser):
    wait_time = between(1, 2)
    
    # We assume NGINX is on localhost:8000
    host = os.environ.get("TARGET_HOST", "http://localhost:8000")
    
    def on_start(self):
        """Set up auth headers to simulate a logged-in user."""
        from encore_auth.jwt import create_token
        import uuid
        os.environ.setdefault("JWT_SECRET_KEY", "super_secret_week2_key")
        user_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
        token = create_token(user_id, "CUSTOMER")
        self.client.headers.update({
            "Authorization": f"Bearer {token}"
        })
        
        # Fetch actual event and seat IDs dynamically
        self.dummy_event_id = None
        self.dummy_seat_id = None
        
        resp = self.client.get("/api/v1/events?limit=1", name="setup")
        if resp.status_code == 200:
            events = resp.json().get("data", {}).get("items", [])
            if events:
                self.dummy_event_id = events[0]["id"]
                
                # Fetch a seat for this event
                resp_seats = self.client.get(f"/api/v1/events/{self.dummy_event_id}/seats", name="setup")
                if resp_seats.status_code == 200:
                    seats = resp_seats.json().get("data", {}).get("items", [])
                    if seats:
                        self.dummy_seat_id = seats[0]["seat_id"]

    @task(3)
    def cache_scenario_get_event(self):
        """Scenario 2/Baseline: Fetch events (should hit Redis if Cache is active)."""
        self.client.get("/api/v1/events?limit=10", name="GET /events")

    @task(2)
    def cache_scenario_get_inventory(self):
        """Fetch event seats/inventory status."""
        if self.dummy_event_id:
            self.client.get(f"/api/v1/events/{self.dummy_event_id}/seats", name="GET /events/{id}/seats")

    @task(1)
    def async_queue_scenario_create_order(self):
        """Scenario 3: Create an order to hit the Kafka queue."""
        if not self.dummy_seat_id:
            return
            
        idempotency_key = str(uuid.uuid4())
        payload = {
            "event_id": self.dummy_event_id,
            "seat_id": self.dummy_seat_id
        }
        with self.client.post(
            "/api/v1/orders", 
            json=payload, 
            headers={"Idempotency-Key": idempotency_key},
            name="POST /orders",
            catch_response=True
        ) as resp:
            # We expect 409 Conflict if the seat is not held by the user yet
            if resp.status_code in [201, 400, 409]:
                resp.success()
            else:
                resp.failure(f"Unexpected status {resp.status_code}: {resp.text[:100]}")
