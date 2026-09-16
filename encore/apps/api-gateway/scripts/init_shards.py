import logging

from sqlalchemy import create_engine

import encore_gateway.models  # noqa: F401 - populates Base.metadata
from encore_gateway.config import settings
from encore_gateway.db import Base

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_shards():
    logger.info("Initializing shard databases with Base.metadata.create_all()...")
    for url in settings.shard_urls:
        logger.info(f"Initializing {url}")
        engine = create_engine(url)
        Base.metadata.create_all(bind=engine)
    logger.info("Shard databases initialized.")

if __name__ == "__main__":
    init_shards()
