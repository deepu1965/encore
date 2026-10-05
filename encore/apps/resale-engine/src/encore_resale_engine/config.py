import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = os.getenv("DATABASE_URL", "postgresql://encore:encore_dev_only@localhost:5432/encore")
    kafka_bootstrap_servers: str = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    wallet_service_url: str = os.getenv("WALLET_SERVICE_URL", "http://wallet-service:8008/api/v1/wallet")
    api_gateway_url: str = os.getenv("API_GATEWAY_URL", "http://api-gateway:8000/internal")

    @property
    def sync_database_url(self) -> str:
        url = self.database_url
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url


settings = Settings()
