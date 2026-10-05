"""Auth / RBAC skeleton.

Week 2 shortcut, deliberately documented rather than silently shipped:
the "token" in `Authorization: Bearer <token>` is literally the user's
UUID — there is no signing, no expiry, no real credential check yet.
This satisfies the Week 2 plan item ("auth/RBAC skeleton") by giving
every route a real `get_current_user` dependency and a real `require_role`
RBAC gate, so routers are written against the *final* auth interface from
day one. Only the token *verification* step is fake.

Real JWT verification replaces the body of `get_current_user` when
packages/auth is built — see docs/decisions/0004-fake-bearer-token-week2-auth.md
for why this shortcut was taken instead of building real auth in Week 2.
"""

from __future__ import annotations

import uuid

import jwt as pyjwt
from encore_auth.jwt import decode_token
from encore_common import error_envelope
from fastapi import Cookie, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from .db import get_db
from .models import User, UserRole


def get_current_user(
    request: Request,
    authorization: str | None = Header(default=None),
    encore_auth: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> User:
    raw_token = None
    if authorization and authorization.startswith("Bearer "):
        raw_token = authorization.removeprefix("Bearer ").strip()
    elif authorization and not authorization.startswith("Bearer ") and authorization.strip():
        raw_token = authorization.strip()
    elif encore_auth:
        raw_token = encore_auth.strip()
    elif request and request.cookies.get("encore_auth"):
        raw_token = request.cookies.get("encore_auth", "").strip()

    if not raw_token:
        request_id = getattr(request.state, "request_id", "") if request and hasattr(request, "state") else ""
        raise HTTPException(
            status_code=401,
            detail=error_envelope("MISSING_TOKEN", "Authorization header or auth cookie required.", request_id=request_id),
        )

    try:
        claims = decode_token(raw_token)
        user_id = uuid.UUID(claims["sub"])
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail=error_envelope("TOKEN_EXPIRED", "Token expired.", request_id=""),
        )
    except Exception:
        try:
            user_id = uuid.UUID(raw_token)
        except ValueError:
            raise HTTPException(
                status_code=401,
                detail=error_envelope("INVALID_TOKEN", "Invalid token.", request_id=""),
            )

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=401,
            detail=error_envelope("INVALID_TOKEN", "Token is not a recognized user.", request_id=""),  # noqa: E501
        )
    return user


def require_role(*allowed_roles: UserRole):
    """Dependency factory for RBAC-gated routes.

    Usage: `Depends(require_role(UserRole.ADMIN))`. No route uses this yet
    in Week 2 (every endpoint is buyer-accessible), but the pattern exists
    so later admin-only routes (e.g. deployment-service endpoints) don't
    need a new auth mechanism invented for them.
    """

    def _check(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=error_envelope(
                    "FORBIDDEN",
                    f"Role {user.role.value} cannot access this resource.",
                    request_id="",
                ),
            )
        return user

    return _check
