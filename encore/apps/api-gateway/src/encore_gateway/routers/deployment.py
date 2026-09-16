from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request

from ..auth import require_role
from ..models import UserRole

router = APIRouter(prefix="/api/v1/deployments", tags=["Deployment"])

from ..config import settings  # noqa: E402

DEPLOYMENT_SERVICE_URL = settings.deployment_service_url


@router.post("")
async def trigger_deployment(request: Request, user: Any = Depends(require_role(UserRole.ADMIN))) -> Any:  # noqa: E501
    body = await request.json()
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(f"{DEPLOYMENT_SERVICE_URL}/deployments", json=body)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def list_deployments(limit: int = 10, user: Any = Depends(require_role(UserRole.ADMIN))) -> Any:  # noqa: E501
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{DEPLOYMENT_SERVICE_URL}/deployments?limit={limit}")
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@router.get("/{deploy_id}")
async def get_deployment(deploy_id: str, user: Any = Depends(require_role(UserRole.ADMIN))) -> Any:
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{DEPLOYMENT_SERVICE_URL}/deployments/{deploy_id}")
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@router.post("/{deploy_id}/cancel")
async def cancel_deployment(deploy_id: str, user: Any = Depends(require_role(UserRole.ADMIN))) -> Any:  # noqa: E501
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(f"{DEPLOYMENT_SERVICE_URL}/deployments/{deploy_id}/cancel")
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
