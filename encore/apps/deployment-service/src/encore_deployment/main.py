import asyncio
import logging
import uuid
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Protocol

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException
from pydantic import BaseModel
from pydantic_settings import BaseSettings
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    database_url: str


settings = Settings()

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class DeploymentExecutor(Protocol):
    async def run_canary(self, service_name: str, version: str) -> bool: ...
    async def run_health_checks(self, service_name: str, version: str) -> bool: ...
    async def run_rolling(self, service_name: str, version: str) -> bool: ...
    async def run_rollback(self, service_name: str, version: str) -> bool: ...


class MockDeploymentExecutor(DeploymentExecutor):
    async def run_canary(self, service_name: str, version: str) -> bool:
        await asyncio.sleep(1)
        if version.endswith("-fail-canary"):
            logger.error(f"Canary failed for {service_name}:{version}")
            return False
        logger.info(f"Canary deployed for {service_name}:{version}")
        return True

    async def run_health_checks(self, service_name: str, version: str) -> bool:
        await asyncio.sleep(1)
        if version.endswith("-fail-health"):
            logger.error(f"Health checks failed for {service_name}:{version}")
            return False
        logger.info(f"Health checks passed for {service_name}:{version}")
        return True

    async def run_rolling(self, service_name: str, version: str) -> bool:
        await asyncio.sleep(1)
        if version.endswith("-fail-rolling"):
            logger.error(f"Rolling deploy failed for {service_name}:{version}")
            return False
        logger.info(f"Rolling deploy completed for {service_name}:{version}")
        return True
        
    async def run_rollback(self, service_name: str, version: str) -> bool:
        await asyncio.sleep(1)
        logger.info(f"Rollback completed for {service_name}:{version}")
        return True


executor = MockDeploymentExecutor()


async def process_deployment(deployment_id: uuid.UUID, service_name: str, version: str):
    logger.info(f"Starting deployment process for {deployment_id}")
    db = SessionLocal()
    
    def update_status(new_status: str):
        db.execute(
            text("UPDATE deployments SET status = :status WHERE id = :id"),
            {"status": new_status, "id": deployment_id}
        )
        db.commit()
        logger.info(f"Deployment {deployment_id} transition -> {new_status}")

    try:
        # Re-check status before proceeding (in case it was cancelled)
        row = db.execute(text("SELECT status FROM deployments WHERE id = :id"), {"id": deployment_id}).fetchone()  # noqa: E501
        if not row or row.status == "CANCELLED":
            return
            
        update_status("CANARY")
        if not await executor.run_canary(service_name, version):
            update_status("CANARY_FAILED")
            update_status("ROLLBACK")
            await executor.run_rollback(service_name, version)
            update_status("ROLLED_BACK")
            return

        row = db.execute(text("SELECT status FROM deployments WHERE id = :id"), {"id": deployment_id}).fetchone()  # noqa: E501
        if not row or row.status == "CANCELLED":
            update_status("ROLLBACK")
            await executor.run_rollback(service_name, version)
            update_status("ROLLED_BACK")
            return

        update_status("HEALTH_CHECK")
        if not await executor.run_health_checks(service_name, version):
            update_status("HEALTH_CHECK_FAILED")
            update_status("ROLLBACK")
            await executor.run_rollback(service_name, version)
            update_status("ROLLED_BACK")
            return

        update_status("ROLLING")
        if not await executor.run_rolling(service_name, version):
            update_status("FAILED")
            update_status("ROLLBACK")
            await executor.run_rollback(service_name, version)
            update_status("ROLLED_BACK")
            return

        update_status("SUCCESS")
    except Exception as e:
        logger.error(f"Error during deployment {deployment_id}: {e}")
        update_status("FAILED")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # In a real system, we might pick up PENDING deployments on startup
    yield


app = FastAPI(title="Encore Deployment Service", lifespan=lifespan)


class DeploymentCreate(BaseModel):
    service_name: str
    version: str
    strategy: str = "rolling"


class DeploymentResponse(BaseModel):
    id: uuid.UUID
    service_name: str
    version: str
    status: str
    strategy: str
    created_at: datetime


@app.post("/deployments", response_model=DeploymentResponse)
def trigger_deployment(deploy_in: DeploymentCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):  # noqa: E501
    deploy_id = uuid.uuid4()
    
    db.execute(
        text("""
            INSERT INTO deployments (id, service_name, version, status, strategy)
            VALUES (:id, :service_name, :version, 'PENDING', :strategy)
        """),
        {
            "id": deploy_id,
            "service_name": deploy_in.service_name,
            "version": deploy_in.version,
            "strategy": deploy_in.strategy
        }
    )
    db.commit()
    
    # Start the async mock executor in background
    background_tasks.add_task(process_deployment, deploy_id, deploy_in.service_name, deploy_in.version)  # noqa: E501

    return {
        "id": deploy_id,
        "service_name": deploy_in.service_name,
        "version": deploy_in.version,
        "status": "PENDING",
        "strategy": deploy_in.strategy,
        "created_at": datetime.now(UTC)
    }


@app.get("/deployments/{deploy_id}", response_model=DeploymentResponse)
def get_deployment(deploy_id: uuid.UUID, db: Session = Depends(get_db)):
    row = db.execute(
        text("SELECT id, service_name, version, status, strategy, created_at FROM deployments WHERE id = :id"),  # noqa: E501
        {"id": deploy_id}
    ).fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Deployment not found")
        
    return {
        "id": row.id,
        "service_name": row.service_name,
        "version": row.version,
        "status": row.status,
        "strategy": row.strategy,
        "created_at": row.created_at
    }


@app.post("/deployments/{deploy_id}/cancel")
def cancel_deployment(deploy_id: uuid.UUID, db: Session = Depends(get_db)):
    row = db.execute(
        text("SELECT status FROM deployments WHERE id = :id"),
        {"id": deploy_id}
    ).fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Deployment not found")
        
    if row.status in ["SUCCESS", "FAILED", "ROLLED_BACK", "CANCELLED"]:
        raise HTTPException(status_code=400, detail="Cannot cancel a completed deployment")
        
    db.execute(
        text("UPDATE deployments SET status = 'CANCELLED' WHERE id = :id"),
        {"id": deploy_id}
    )
    db.commit()
    return {"status": "CANCELLED"}


@app.get("/deployments", response_model=list[DeploymentResponse])
def list_deployments(limit: int = 10, db: Session = Depends(get_db)):
    rows = db.execute(
        text("SELECT id, service_name, version, status, strategy, created_at FROM deployments ORDER BY created_at DESC LIMIT :limit"),  # noqa: E501
        {"limit": limit}
    ).fetchall()
    
    return [
        {
            "id": row.id,
            "service_name": row.service_name,
            "version": row.version,
            "status": row.status,
            "strategy": row.strategy,
            "created_at": row.created_at
        }
        for row in rows
    ]


@app.get("/health")
def health_check():
    return {"status": "ok"}
