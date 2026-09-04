"""GET /health — every service exposes this, per README.md's operational
conventions. Checks DB connectivity so 'the process is up' and 'the
service can actually do its job' aren't conflated.
"""

from __future__ import annotations

from encore_common import health_check
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..db import get_db
from ..cache import get_cache
from encore_cache import CacheClient
from fastapi.responses import JSONResponse

router = APIRouter(tags=["health"])


@router.get("/health")
def health(
    db: Session = Depends(get_db),
    cache: CacheClient = Depends(get_cache)
) -> JSONResponse:
    db_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False
        
    redis_ok = True
    try:
        # Check if cache is RedisCacheClient and can ping
        if hasattr(cache, "ping"):
            redis_ok = cache.ping()
    except Exception:
        redis_ok = False

    result = health_check(
        service="api-gateway",
        critical_deps={"postgres": db_ok},
        non_critical_deps={"redis": redis_ok}
    )
    return JSONResponse(status_code=result.http_code, content=result.as_dict())
