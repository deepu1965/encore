from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request

from ..auth import require_role
from ..models import UserRole

router = APIRouter(prefix="/api/v1/jobs", tags=["Scheduler"])

from ..config import settings  # noqa: E402

SCHEDULER_SERVICE_URL = settings.scheduler_service_url


@router.post("")
async def create_job(request: Request, user: Any = Depends(require_role(UserRole.ADMIN))) -> Any:
    body = await request.json()
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(f"{SCHEDULER_SERVICE_URL}/jobs", json=body)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@router.get("/{job_id}")
async def get_job(job_id: str, user: Any = Depends(require_role(UserRole.ADMIN))) -> Any:
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{SCHEDULER_SERVICE_URL}/jobs/{job_id}")
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{job_id}")
async def delete_job(job_id: str, user: Any = Depends(require_role(UserRole.ADMIN))) -> Any:
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.delete(f"{SCHEDULER_SERVICE_URL}/jobs/{job_id}")
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
