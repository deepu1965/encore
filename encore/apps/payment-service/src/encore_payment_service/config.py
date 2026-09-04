from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    db_uri: str = "postgresql://encore:encore_dev_only@localhost:5432/encore"
    kafka_bootstrap_servers: str = "localhost:9092"

settings = Settings()
