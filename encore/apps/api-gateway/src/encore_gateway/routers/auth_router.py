"""Authentication & User Identity API router."""
import uuid
from encore_auth.jwt import create_token
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..db import get_db
from ..models import User, UserRole

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
users_router = APIRouter(prefix="/api/v1/users", tags=["users"])

class TokenRequest(BaseModel):
    user_id: str | None = None
    email: str | None = None
    identifier: str | None = None
    password: str | None = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class SignupRequest(BaseModel):
    email: str
    display_name: str
    password: str | None = None
    role: str = "BUYER"

class UserOut(BaseModel):
    id: str
    email: str
    display_name: str
    role: str

class SignupResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

@router.post("/token", response_model=TokenResponse)
def issue_token(req: TokenRequest, db: Session = Depends(get_db)):
    """Token issuance by user_id or email."""
    ident = req.identifier or req.email or req.user_id
    if not ident:
        raise HTTPException(status_code=400, detail="user_id or email is required")

    ident = ident.strip()
    user = None
    try:
        uid = uuid.UUID(ident)
        user = db.get(User, uid)
    except ValueError:
        pass

    if not user:
        user = db.execute(select(User).where(User.email.ilike(ident))).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    token = create_token(user.id, user.role.value)
    return TokenResponse(access_token=token)

@router.post("/login", response_model=SignupResponse)
def login(req: TokenRequest, db: Session = Depends(get_db)):
    """User login endpoint returning user details and token."""
    ident = req.identifier or req.email or req.user_id
    if not ident:
        raise HTTPException(status_code=400, detail="Email or user_id is required")

    ident = ident.strip()
    user = None
    try:
        uid = uuid.UUID(ident)
        user = db.get(User, uid)
    except ValueError:
        pass

    if not user:
        user = db.execute(select(User).where(User.email.ilike(ident))).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or user ID")

    token = create_token(user.id, user.role.value)
    return SignupResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut(
            id=str(user.id),
            email=user.email,
            display_name=user.display_name,
            role=user.role.value,
        ),
    )

@router.post("/signup", status_code=201, response_model=SignupResponse)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    """User registration endpoint for new customers and organizers."""
    existing = db.execute(select(User).where(User.email == req.email)).scalar_one_or_none()
    if existing:
        user = existing
    else:
        role_val = UserRole.BUYER
        if req.role.upper() == "ORGANIZER":
            role_val = UserRole.ORGANIZER
        elif req.role.upper() == "ADMIN":
            role_val = UserRole.ADMIN
        user = User(
            id=uuid.uuid4(),
            email=req.email,
            display_name=req.display_name,
            role=role_val,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_token(user.id, user.role.value)
    return SignupResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut(
            id=str(user.id),
            email=user.email,
            display_name=user.display_name,
            role=user.role.value,
        ),
    )

@router.get("/me")
def get_auth_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return {
        "user": {
            "id": str(current_user.id),
            "email": current_user.email,
            "display_name": current_user.display_name,
            "role": current_user.role.value,
        }
    }

@users_router.get("/me")
def get_user_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return {
        "user": {
            "id": str(current_user.id),
            "email": current_user.email,
            "display_name": current_user.display_name,
            "role": current_user.role.value,
        }
    }

