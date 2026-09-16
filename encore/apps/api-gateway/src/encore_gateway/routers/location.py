import uuid
from typing import Any

import httpx
from encore_common.envelope import success_envelope
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from ..auth import get_current_user

router = APIRouter(prefix="/api/v1", tags=["location"])
from ..config import settings  # noqa: E402

LOCATION_SERVICE_URL = settings.location_service_url

class LocationUpdateRequest(BaseModel):
    lat: float
    lon: float
    opt_in: bool

@router.get("/location/events-near-me")
async def get_events_near_me(request: Request, lat: float, lon: float, radius_km: float = 10.0, user: Any = Depends(get_current_user)):  # noqa: E501
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{LOCATION_SERVICE_URL}/events-near-me",
            params={"lat": lat, "lon": lon, "radius_km": radius_km}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Error fetching nearby events")
        return success_envelope(request_id=request.state.request_id, data=resp.json())

@router.post("/location/friends/location")
async def update_friend_location(request: Request, body: LocationUpdateRequest, user: Any = Depends(get_current_user)):  # noqa: E501
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{LOCATION_SERVICE_URL}/friends/location",
            json=body.model_dump(),
            headers={"x-user-id": str(user.id)}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Error updating location")
        return success_envelope(request_id=request.state.request_id, data=resp.json())

@router.get("/location/friends/nearby")
async def get_nearby_friends(request: Request, lat: float, lon: float, radius_km: float = 10.0, user: Any = Depends(get_current_user)):  # noqa: E501
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{LOCATION_SERVICE_URL}/friends/nearby",
            params={"lat": lat, "lon": lon, "radius_km": radius_km},
            headers={"x-user-id": str(user.id)}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Error fetching nearby friends")  # noqa: E501
        return success_envelope(request_id=request.state.request_id, data=resp.json())

@router.get("/location/routing/eta")
async def get_routing_eta(request: Request, lat: float, lon: float, venue_id: uuid.UUID, user: Any = Depends(get_current_user)):  # noqa: E501
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{LOCATION_SERVICE_URL}/routing/eta",
            params={"lat": lat, "lon": lon, "venue_id": str(venue_id)}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Error fetching routing ETA")
        return success_envelope(request_id=request.state.request_id, data=resp.json())
