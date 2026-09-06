from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@localhost:5432/encore"
    postgres_shard_urls: str = ""
    kafka_bootstrap_servers: str = "localhost:9092"
    redis_host: str = "localhost"
    redis_port: int = 6379

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def shard_urls(self) -> list[str]:
        if not self.postgres_shard_urls:
            return []
        return [url.strip() for url in self.postgres_shard_urls.split(",") if url.strip()]

settings = Settings()
