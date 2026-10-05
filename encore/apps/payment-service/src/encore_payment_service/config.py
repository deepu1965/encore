from pydantic_settings import BaseSettings


import os

class Settings(BaseSettings):
    db_uri: str = os.environ.get("DATABASE_URL") or os.environ.get("DB_URI") or "postgresql://encore:encore_dev_only@localhost:5432/encore"
    kafka_bootstrap_servers: str = os.environ.get("KAFKA_BOOTSTRAP_SERVERS") or "localhost:9092"

settings = Settings()
