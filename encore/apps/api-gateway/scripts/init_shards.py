import os
from sqlalchemy import create_engine
from encore_gateway.config import settings
from encore_gateway.db import Base
from encore_gateway.models import (
    Event,
    IdempotencyRecord,
    Inventory,
    Order,
    Seat,
    Ticket,
    User,
    Venue,
)
import logging

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
