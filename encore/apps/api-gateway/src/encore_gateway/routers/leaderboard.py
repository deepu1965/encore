from typing import Any

from encore_cache.client import CacheClient
from encore_common.envelope import success_envelope
from fastapi import APIRouter, Depends, Request

from ..auth import get_current_user
from ..cache import get_cache

router = APIRouter(prefix="/api/v1", tags=["leaderboard"])

@router.get("/leaderboard/trending")
def get_trending_leaderboard(
    request: Request, 
    limit: int = 10, 
    user: Any = Depends(get_current_user),
    cache: CacheClient = Depends(get_cache)
):
    redis = getattr(cache, "_redis", None)
    if not redis:
        return success_envelope(request_id=request.state.request_id, data=[])
    
    # ZREVRANGE to get highest scores first
    # withscores=True returns [(member, score), ...]
    top_events = redis.zrevrange("fastest-selling-events", 0, limit - 1, withscores=True)
    
    results = [
        {"event_id": item[0].decode('utf-8') if isinstance(item[0], bytes) else item[0], "score": float(item[1])}  # noqa: E501
        for item in top_events
    ]
    
    return success_envelope(request_id=request.state.request_id, data=results)
