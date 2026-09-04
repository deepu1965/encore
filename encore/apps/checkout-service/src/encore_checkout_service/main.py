import contextlib
import logging

from fastapi import FastAPI
from sqlalchemy import create_engine
from encore_kafka_client import KafkaEventProducer

from .config import settings
from .consumer import CheckoutOrchestrator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

engine = create_engine(settings.database_url)

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    producer = KafkaEventProducer(
        bootstrap_servers=settings.kafka_bootstrap_servers,
        producer_name="checkout-service"
    )
    app.state.producer = producer
    
    import redis
    redis_client = redis.Redis(
        host=settings.redis_host,
        port=settings.redis_port,
        decode_responses=True
    )
    
    orchestrator = CheckoutOrchestrator(
        engine=engine,
        bootstrap_servers=settings.kafka_bootstrap_servers,
        producer=producer,
        redis_client=redis_client
    )
    orchestrator.start()
    app.state.orchestrator = orchestrator
    
    yield
    
    orchestrator.stop()
    producer.close()
    redis_client.close()

app = FastAPI(title="Encore Checkout Service", lifespan=lifespan)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "checkout-service"}
