import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import text
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..db import get_db_read
from ..models import Event
from ..cache import get_cache
from encore_cache import CacheClient

router = APIRouter(tags=["Feed"])

class FeedItem(BaseModel):
    event_id: uuid.UUID
    published_at_ts: float

class FeedResponse(BaseModel):
    items: list[FeedItem]

@router.get("/api/v1/feed", response_model=FeedResponse)
def get_user_feed(
    request: Request,
    user_id: uuid.UUID = Query(..., description="The user to fetch the feed for"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db_read),
    cache: CacheClient = Depends(get_cache),
):
    """
    Fetch the personalized event feed for a user.
    Uses a hybrid fan-out model: reads from the user's pre-computed Redis feed 
    and merges it on-the-fly with events from followed mega-organizers' outboxes.
    """
    redis = getattr(cache, "_redis", None)
    if not redis:
        return FeedResponse(items=[])

    feed_key = f"feed:{user_id}"
    
    # 1. Fetch user's direct feed (Fan-out-on-write)
    # ZREVRANGE to get most recent first
    direct_feed_raw = redis.zrevrange(feed_key, 0, limit - 1, withscores=True)
    merged_items = []
    
    for event_id_bytes, score in direct_feed_raw:
        merged_items.append({
            "event_id": event_id_bytes.decode("utf-8"),
            "published_at_ts": score
        })

    # 2. Fetch mega-organizers the user follows (Fan-out-on-read)
    mega_orgs = db.execute(
        text("""
            SELECT u.id 
            FROM user_follows uf
            JOIN users u ON uf.organizer_id = u.id
            WHERE uf.follower_id = :user_id AND u.is_mega_organizer = true
        """),
        {"user_id": user_id}
    ).scalars().all()
    
    for org_id in mega_orgs:
        outbox_key = f"outbox:{org_id}"
        outbox_raw = redis.zrevrange(outbox_key, 0, limit - 1, withscores=True)
        for event_id_bytes, score in outbox_raw:
            merged_items.append({
                "event_id": event_id_bytes.decode("utf-8"),
                "published_at_ts": score
            })
            
    # 3. Merge, sort, and truncate
    merged_items.sort(key=lambda x: x["published_at_ts"], reverse=True)
    merged_items = merged_items[:limit]
    
    result = [
        FeedItem(event_id=uuid.UUID(item["event_id"]), published_at_ts=item["published_at_ts"])
        for item in merged_items
    ]
    
    return FeedResponse(items=result)
