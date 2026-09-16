from typing import Any

from encore_common.envelope import success_envelope
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from ..auth import get_current_user

router = APIRouter(prefix="/api/v1", tags=["ads"])

class AdClickRequest(BaseModel):
    ad_id: str
    metadata: dict = {}

@router.post("/ads/click")
async def register_ad_click(request: Request, body: AdClickRequest, user: Any = Depends(get_current_user)):  # noqa: E501
    # Publish to ad.clicks topic
    event_data = {
        "ad_id": body.ad_id,
        "user_id": str(user.id),
        "metadata": body.metadata
    }
    producer = request.app.state.kafka_producer
    if producer:
        producer.produce_event_sync(
            topic="ad.clicks",
            key=body.ad_id, # partition by ad_id
            event_type="ad.clicked",
            data=event_data,
            request_id=getattr(request.state, "request_id", "")
        )
    return success_envelope(request_id=getattr(request.state, "request_id", ""), data={"status": "registered"})  # noqa: E501
