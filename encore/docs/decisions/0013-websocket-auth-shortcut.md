# 13. WebSocket Auth Shortcut (and JWT Upgrade)

Date: 2026-09-14

## Status

Superseded by ADR-0012 (Real JWT Auth)

## Context

In Week 20, the WebSocket endpoint for event chat (`/ws/chat/{event_id}`) was implemented. To authenticate users, it expected a `token` query parameter. Following the pattern established for HTTP endpoints in ADR-0004 ("Fake Bearer Token"), the WebSocket handler accepted the raw user UUID string as the token and used it directly. 

This behavior was undocumented, leading to confusion during security audits regarding how WebSocket connections were authenticated.

## Decision

1. We retroactively document that the WebSocket chat endpoint initially used the `token = user_id` shortcut identical to the HTTP `Bearer <uuid>` shortcut.
2. In alignment with Work Group 2 (Security / ADR-0012), this shortcut has now been completely removed. The WebSocket endpoint now decodes and validates a proper JWT using the `encore-auth` package (`decode_token`).

## Consequences

- The `/ws/chat/{event_id}?token=...` endpoint now strictly requires a valid, signed JWT.
- Passing raw UUIDs as the token will result in the WebSocket being closed with a `1008 Policy Violation` (Invalid token) code.
- This fully eliminates the fake UUID auth pattern across both HTTP and WebSocket interfaces in the API gateway.
