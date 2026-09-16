"""Configuration, loaded from environment variables.

Matches .env.example at the repo root. Nothing here is a real secret —
these are local-dev defaults.
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", extra="ignore")

    # ------------------------------------------------------------------ Postgres
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_user: str = "encore"
    postgres_password: str = "encore_dev_only"
    postgres_db: str = "encore"
    postgres_write_db: str = "encore"
    postgres_read_db: str = "encore"
    postgres_shard_urls: str = ""

    # ------------------------------------------------------------------ Short URLs (Week 25)
    short_url_base: str = "http://localhost:8000"

    # ------------------------------------------------------------------ Redis (Week 3)
    redis_host: str = "localhost"
    redis_port: int = 6379

    # ------------------------------------------------------------------ Rate Limiter (Week 4)
    # Global per-IP limits applied via middleware on every request.
    # capacity = burst size (tokens); rate = tokens refilled per second.
    # 100 req/min with a burst of 10 → rate = 100/60 ≈ 1.6667/s, capacity=10.
    rate_limit_global_capacity: int = 10
    rate_limit_global_per_second: float = 100 / 60  # ≈ 1.6667

    # Checkout / order endpoint: tighter limit per authenticated user.
    # 3 orders/min, burst of 1.
    rate_limit_checkout_capacity: int = 1
    rate_limit_checkout_per_second: float = 3 / 60  # ≈ 0.05

    # ------------------------------------------------------------------ ID Generator (Week 4)
    # Worker ID for the Snowflake ID generator. Must be unique per process
    # in a multi-process deployment. 0 is the default for local dev.
    snowflake_worker_id: int = 0

    # ------------------------------------------------------------------ Kafka (Week 5)
    kafka_bootstrap_servers: str = "localhost:9092"
    kafka_producer_name: str = "api-gateway"

    # ------------------------------------------------------------------ Waiting Room (Week 6)
    # Comma-separated UUIDs of events that require waiting-room admission.
    # Users must present an X-Waiting-Room-Token on POST /holds for these events.
    # Week 6 shortcut: long-term design is is_flash_sale column on events table (ADR-0009).
    flash_sale_event_ids: str = ""

    @property
    def flash_sale_set(self) -> set[str]:
        """Return the set of flash-sale event IDs (UUIDs as strings)."""
        if not self.flash_sale_event_ids:
            return set()
        return {e.strip() for e in self.flash_sale_event_ids.split(",") if e.strip()}

    # ------------------------------------------------------------------ Inventory Core (Week 7)
    hold_ttl_minutes: float = 5.0
    expiry_poll_interval_secs: int = 60
    # PG advisory lock ID to ensure only one gateway instance runs the expiry tick
    expiry_advisory_lock_id: int = 1001

    @property
    def hold_ttl_seconds(self) -> int:
        """Hold TTL as integer seconds — for use with Redis SETNX EX argument."""
        return max(1, int(self.hold_ttl_minutes * 60))

    @property
    def database_url(self) -> str:
        # Legacy fallback
        return self.database_write_url

    @property
    def database_write_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_write_db}"
        )
        
    @property
    def database_read_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_read_db}"
        )
        
    @property
    def shard_urls(self) -> list[str]:
        if not self.postgres_shard_urls:
            return []
        return [url.strip() for url in self.postgres_shard_urls.split(",") if url.strip()]

    jwt_secret_key: str = "super_secret_week2_key"
    jwt_algorithm: str = "HS256"

    # Service URLs
    payment_service_url: str = "http://localhost:8002"
    location_service_url: str = "http://location-service:8004"
    scheduler_service_url: str = "http://scheduler-service:8005"
    deployment_service_url: str = "http://deployment-service:8006"
    
    # MinIO / Object Storage
    minio_url: str = "http://minio:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"


settings = Settings()
