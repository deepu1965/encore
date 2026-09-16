import asyncio
import json
import logging
import uuid
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta

from fastapi import Depends, FastAPI, HTTPException
from kafka import KafkaProducer
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    database_url: str
    kafka_bootstrap_servers: str


settings = Settings()

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_kafka_producer():
    return KafkaProducer(
        bootstrap_servers=settings.kafka_bootstrap_servers,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    )


async def scheduler_loop():
    logger.info("Starting scheduler background loop...")
    producer = get_kafka_producer()

    while True:
        try:
            with SessionLocal() as db:
                with db.begin():
                    # Find due jobs and lock them, preventing other workers from claiming them
                    query = text("""
                        SELECT id, job_type, payload, recurring_interval 
                        FROM jobs 
                        WHERE status = 'pending' AND scheduled_for <= NOW() 
                        FOR UPDATE SKIP LOCKED 
                        LIMIT 50
                    """)
                    jobs = db.execute(query).fetchall()

                    for job_id, job_type, payload, recurring_interval in jobs:
                        # Publish to Kafka
                        topic = "jobs.execute"
                        message = {
                            "job_id": str(job_id),
                            "job_type": job_type,
                            "payload": json.loads(payload)
                        }
                        producer.send(topic, message)

                        if recurring_interval:
                            # Schedule next run
                            next_run = datetime.now(UTC) + timedelta(seconds=recurring_interval)
                            db.execute(
                                text("UPDATE jobs SET scheduled_for = :next_run WHERE id = :id"),
                                {"next_run": next_run, "id": job_id}
                            )
                            logger.info(f"Re-scheduled recurring job {job_id} for {next_run}")
                        else:
                            # Mark as queued
                            db.execute(
                                text("UPDATE jobs SET status = 'queued' WHERE id = :id"),
                                {"id": job_id}
                            )
                            logger.info(f"Queued one-time job {job_id}")
        except Exception as e:
            logger.error(f"Error in scheduler loop: {e}")
        
        await asyncio.sleep(2)  # poll every 2 seconds


@asynccontextmanager
async def lifespan(app: FastAPI):
    loop_task = asyncio.create_task(scheduler_loop())
    yield
    loop_task.cancel()


app = FastAPI(title="Encore Scheduler Service", lifespan=lifespan)


class JobCreate(BaseModel):
    job_type: str
    payload: dict
    scheduled_for: datetime = Field(default_factory=lambda: datetime.now(UTC))
    recurring_interval: int | None = None


class JobResponse(BaseModel):
    id: uuid.UUID
    job_type: str
    status: str
    scheduled_for: datetime
    recurring_interval: int | None


@app.post("/jobs", response_model=JobResponse)
def create_job(job_in: JobCreate, db: Session = Depends(get_db)):
    job_id = uuid.uuid4()
    
    db.execute(
        text("""
            INSERT INTO jobs (id, job_type, payload, status, scheduled_for, recurring_interval, retries)
            VALUES (:id, :job_type, :payload, 'pending', :scheduled_for, :recurring_interval, 0)
        """),  # noqa: E501
        {
            "id": job_id,
            "job_type": job_in.job_type,
            "payload": json.dumps(job_in.payload),
            "scheduled_for": job_in.scheduled_for,
            "recurring_interval": job_in.recurring_interval
        }
    )
    db.commit()

    return {
        "id": job_id,
        "job_type": job_in.job_type,
        "status": "pending",
        "scheduled_for": job_in.scheduled_for,
        "recurring_interval": job_in.recurring_interval
    }


@app.get("/jobs/{job_id}", response_model=JobResponse)
def get_job(job_id: uuid.UUID, db: Session = Depends(get_db)):
    row = db.execute(
        text("SELECT id, job_type, status, scheduled_for, recurring_interval FROM jobs WHERE id = :id"),  # noqa: E501
        {"id": job_id}
    ).fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
        
    return {
        "id": row.id,
        "job_type": row.job_type,
        "status": row.status,
        "scheduled_for": row.scheduled_for,
        "recurring_interval": row.recurring_interval
    }


@app.delete("/jobs/{job_id}")
def delete_job(job_id: uuid.UUID, db: Session = Depends(get_db)):
    result = db.execute(
        text("DELETE FROM jobs WHERE id = :id"),
        {"id": job_id}
    )
    db.commit()
    
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Job not found")
        
    return {"message": "Job deleted"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
