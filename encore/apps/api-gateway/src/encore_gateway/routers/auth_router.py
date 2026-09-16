"""POST /api/v1/auth/token — issue JWT. Week 24 implementation of real auth."""
from encore_auth.jwt import create_token
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

class TokenRequest(BaseModel):
    user_id: str  # UUID string — in prod this would be username+password

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

@router.post("/token", response_model=TokenResponse)
def issue_token(req: TokenRequest, db: Session = Depends(get_db)):
    """Development token issuance. In prod: validate credentials first."""
    import uuid
    try:
        uid = uuid.UUID(req.user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id UUID")
    user = db.get(User, uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    token = create_token(uid, user.role.value)
    return TokenResponse(access_token=token)
