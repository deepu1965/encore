import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..db import get_db, get_db_read
from ..models import ShortUrl, Event
from ..base62 import encode_base62, decode_base62

router = APIRouter(tags=["Short URLs"])
logger = logging.getLogger(__name__)

class ShortenRequest(BaseModel):
    event_id: uuid.UUID

class ShortenResponse(BaseModel):
    short_url: str

@router.post("/api/v1/shorten", response_model=ShortenResponse)
def shorten_url(
    payload: ShortenRequest,
    db: Session = Depends(get_db),
):
    """Generate a short URL for an event."""
    # Ensure event exists
    event = db.get(Event, payload.event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    short_url_record = ShortUrl(event_id=payload.event_id)
    db.add(short_url_record)
    db.commit()
    db.refresh(short_url_record)
    
    hash_str = encode_base62(short_url_record.id)
    return ShortenResponse(short_url=f"http://localhost:8000/s/{hash_str}")


@router.get("/s/{hash_str}", response_class=RedirectResponse)
def redirect_short_url(
    hash_str: str,
    db: Session = Depends(get_db_read),
):
    """Redirect to the original event page."""
    try:
        record_id = decode_base62(hash_str)
    except ValueError:
        raise HTTPException(status_code=404, detail="Invalid short URL")
        
    record = db.get(ShortUrl, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Short URL not found")
        
    # In a real app we would redirect to a frontend URL. For this API, we just return the URL or redirect to the event endpoint.
    return RedirectResponse(url=f"/api/v1/events/{record.event_id}/seats", status_code=302)
