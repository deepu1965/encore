# 12. Real JWT Auth (Week 24)

Date: 2026-09-14

## Status

Accepted

## Context

In Week 2, we took a shortcut and used a "fake bearer token" (ADR-0004) where the token itself was just the user UUID string. This was done to accelerate feature development while providing a stable interface for route handlers (`get_current_user`, `require_role`).

As per the Week 24 deliverables (Security/RBAC review), we must transition to a real, cryptographically verified token scheme.

## Decision

We have implemented a standard JSON Web Token (JWT) system using the `PyJWT` library. 
- Algorithm: HMAC-SHA256 (`HS256`) using a symmetric secret key.
- The secret key is loaded from the `JWT_SECRET_KEY` environment variable.
- Tokens expire by default after 24 hours (`exp` claim).
- A new package `packages/auth` houses the token creation and validation logic to keep security concerns decoupled.
- The `get_current_user` dependency now decodes and verifies the JWT, extracting the user UUID from the `sub` claim.
- A new endpoint `POST /api/v1/auth/token` has been added for clients to obtain JWTs in exchange for their user ID (in development) or credentials (in production).

## Consequences

- All clients (including E2E test clients) must now obtain and send a valid JWT. The raw UUID shortcut will return HTTP 401.
- We must securely manage the `JWT_SECRET_KEY` in production deployments.
