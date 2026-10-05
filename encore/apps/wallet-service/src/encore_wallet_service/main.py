import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from sqlalchemy import text

from .db import engine
from .routers import wallet


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Verify DB connectivity on startup
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    yield
    engine.dispose()


app = FastAPI(title="Encore Wallet Service", version="0.1.0", lifespan=lifespan)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    incoming = request.headers.get("X-Request-Id")
    request_id = incoming or f"req_{uuid.uuid4().hex}"
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-Id"] = request_id
    return response


@app.get("/health", tags=["health"])
def health_check():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "healthy", "service": "wallet-service"}


app.include_router(wallet.router)
