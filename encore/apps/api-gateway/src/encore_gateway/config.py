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

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


settings = Settings()
