import datetime
import logging
import uuid
from typing import Annotated

from encore_cache import CacheClient
from fastapi import APIRouter, Depends, HTTPException, Path, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..base62 import generate_random_base62
from ..cache import get_cache
from ..config import settings
from ..db import get_db, get_db_read
from ..models import Event, ShortUrl

router = APIRouter(tags=["Short URLs"])
logger = logging.getLogger(__name__)

class ShortenRequest(BaseModel):
    event_id: uuid.UUID

class ShortenResponse(BaseModel):
    short_url: str

@router.post("/api/v1/shorten", response_model=ShortenResponse)
def shorten_url(
    payload: ShortenRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Generate a short URL for an event."""
    # Ensure event exists
    event = db.get(Event, payload.event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    for attempt in range(5):
        hash_str = generate_random_base62(7)
        short_url_record = ShortUrl(
            id=hash_str,
            event_id=payload.event_id,
            target_url=f"/api/v1/events/{payload.event_id}/seats"  # Basic fallback target
        )
        db.add(short_url_record)
        try:
            db.commit()
            break
        except IntegrityError:
            db.rollback()
            if attempt == 4:
                raise HTTPException(status_code=500, detail="Failed to generate unique short URL")
    
    # We construct the final URL using SHORT_URL_BASE
    # Ensure no trailing slash on base URL
    base = settings.short_url_base.rstrip("/")
    return ShortenResponse(short_url=f"{base}/{hash_str}")


@router.get("/{hash_str}", response_class=RedirectResponse)
def redirect_short_url(
    request: Request,
    hash_str: str = Path(..., min_length=7, max_length=7, pattern="^[a-zA-Z0-9]{7}$"),
    db: Session = Depends(get_db_read),
    cache: CacheClient = Depends(get_cache),
):
    """Redirect to the original event page."""
    # 1. Cache-aside
    cache_key = f"shortlink:{hash_str}"
    target_url = None
    event_id = None
    
    cached_data = cache.get(cache_key)
    if cached_data:
        # Assume cached format is "event_id|target_url"
        parts = cached_data.split("|", 1)
        if len(parts) == 2:
            event_id, target_url = parts
    
    if not target_url:
        # 2. Cache miss -> check DB
        record = db.get(ShortUrl, hash_str)
        if not record:
            raise HTTPException(status_code=404, detail="Short URL not found")
            
        target_url = record.target_url
        event_id = str(record.event_id)
        
        # 3. Populate Cache (24 hour TTL)
        cache.set(cache_key, f"{event_id}|{target_url}", ttl_seconds=86400)

    # 4. Asynchronously record the metric
    producer = getattr(request.app.state, "kafka_producer", None)
    if producer:
        try:
            producer.produce_event(
                topic="url.redirected",
                event_type="RedirectEvent",
                payload={
                    "hash_str": hash_str,
                    "event_id": event_id,
                    "timestamp": datetime.datetime.now(datetime.UTC).isoformat(),
                },
                key=hash_str,
            )
        except Exception as e:
            logger.warning(f"Failed to emit url.redirected event: {e}")
            
    # 5. Return redirect immediately
    return RedirectResponse(url=target_url, status_code=302)
