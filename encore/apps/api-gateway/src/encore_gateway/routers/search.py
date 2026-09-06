import logging
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import text
from sqlalchemy.orm import Session
from sqlalchemy.engine import Engine
from pydantic import BaseModel

from ..db import get_db_read
from ..models import Event, EventStatus

router = APIRouter(prefix="/api/v1", tags=["Search"])
logger = logging.getLogger(__name__)

class EventSearchResult(BaseModel):
    id: str
    name: str
    description: str | None
    starts_at: datetime
    status: str
    venue_name: str | None = None

class SearchResponse(BaseModel):
    items: list[EventSearchResult]
    total: int


@router.get("/search", response_model=SearchResponse)
def search_events(
    q: Annotated[str | None, Query(description="Search query")] = None,
    start_date: Annotated[datetime | None, Query(description="Filter by start date")] = None,
    end_date: Annotated[datetime | None, Query(description="Filter by end date")] = None,
    status: Annotated[EventStatus | None, Query(description="Filter by status")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    db: Session = Depends(get_db_read),
):
    """Full-text search for events using PostgreSQL tsvector."""
    
    query = db.query(Event)
    
    if q:
        # plainto_tsquery transforms a plain text into a tsquery
        ts_query = text("plainto_tsquery('pg_catalog.english', :q)")
        query = query.filter(Event.search_vector.op('@@')(ts_query)).params(q=q)
    
    if start_date:
        query = query.filter(Event.starts_at >= start_date)
    
    if end_date:
        query = query.filter(Event.starts_at <= end_date)
        
    if status:
        query = query.filter(Event.status == status)

    total = query.count()
    events = query.order_by(Event.starts_at.asc()).offset(offset).limit(limit).all()
    
    # We could join with venue, but for V1 we just fetch it if needed.
    items = []
    for e in events:
        items.append(
            EventSearchResult(
                id=str(e.id),
                name=e.name,
                description=e.description,
                starts_at=e.starts_at,
                status=e.status.value,
                venue_name=e.venue.name if e.venue else None
            )
        )
    
    return SearchResponse(items=items, total=total)


@router.get("/autocomplete")
def autocomplete(
    request: Request,
    q: Annotated[str, Query(description="Prefix to search for")],
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
):
    """Fast prefix search using Redis ZRANGEBYLEX."""
    
    redis = getattr(request.app.state.cache, "_redis", None)
    if not redis:
        return {"items": []}
        
    q_lower = q.lower().strip()
    if not q_lower:
        return {"items": []}
        
    # In Redis: ZRANGEBYLEX autocomplete:events "[prefix" "[prefix\xff"
    results = redis.zrangebylex(
        "autocomplete:events",
        min=f"[{q_lower}",
        max=f"[{q_lower}\xff",
        start=0,
        num=limit
    )
    
    decoded = []
    for r in results:
        val = r.decode("utf-8") if isinstance(r, bytes) else r
        if val.endswith("*"):
            val = val[:-1]
        decoded.append(val)
        
    return {"items": decoded}
