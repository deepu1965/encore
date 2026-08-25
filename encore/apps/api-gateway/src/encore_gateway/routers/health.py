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

router = APIRouter(tags=["health"])


@router.get("/health")
def health(db: Session = Depends(get_db)) -> dict:
    db_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    result = health_check("api-gateway", {"postgres": db_ok})
    return result.as_dict()
