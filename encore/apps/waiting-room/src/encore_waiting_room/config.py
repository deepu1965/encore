"""Configuration for the waiting-room service."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", extra="ignore")

    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379

    # Kafka
    kafka_bootstrap_servers: str = "localhost:9092"
    kafka_producer_name: str = "waiting-room"

    # Snowflake ID generator worker ID.
    # MUST be different from api-gateway (which uses 0) to guarantee uniqueness.
    snowflake_worker_id: int = 1

    # Flash-sale event IDs — comma-separated UUIDs.
    # Events NOT in this list bypass the waiting room entirely.
    # This is a Week 6 shortcut; the long-term design is an is_flash_sale
    # column on the events table (documented in ADR-0009).
    flash_sale_event_ids: str = ""

    # Admission control
    admission_batch_size: int = 100       # users admitted per tick
    admission_interval_secs: int = 5      # seconds between admission ticks
    admission_token_ttl_secs: int = 600   # 10 minutes to use the token

    @property
    def flash_sale_set(self) -> set[str]:
        """Return the set of flash-sale event IDs (UUIDs as strings)."""
        if not self.flash_sale_event_ids:
            return set()
        return {e.strip() for e in self.flash_sale_event_ids.split(",") if e.strip()}


settings = Settings()
