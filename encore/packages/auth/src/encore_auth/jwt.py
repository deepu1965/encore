"""JWT encode/decode for Encore V1.

Algorithm: HS256 (symmetric, secret from JWT_SECRET_KEY env var).
Claims: sub (user_id UUID), role, exp (configurable TTL, default 24h), iat, jti.
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import TypedDict

import jwt  # PyJWT

from encore_auth.config import JWT_ALGORITHM, JWT_TTL_SECONDS, get_jwt_secret


class TokenClaims(TypedDict):
    sub: str          # user UUID
    role: str         # UserRole value
    exp: int
    iat: int
    jti: str          # unique token ID (prevents replay in DLQ scenarios)


def create_token(user_id: uuid.UUID, role: str) -> str:
    now = datetime.now(timezone.utc)
    claims: TokenClaims = {
        "sub": str(user_id),
        "role": role,
        "exp": int((now + timedelta(seconds=JWT_TTL_SECONDS)).timestamp()),
        "iat": int(now.timestamp()),
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(claims, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> TokenClaims:
    """Raises jwt.ExpiredSignatureError, jwt.InvalidTokenError on failure."""
    return jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
