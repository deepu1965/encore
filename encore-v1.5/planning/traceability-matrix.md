# Traceability Matrix

Every V1 capability (from `Encore_v1_Final.md`, as inventoried against the spec's own section structure) mapped to its V1.5 epic, routes, and backlog task IDs. The full interactive version — with every matching task ID, not just the first few — is the **Traceability Matrix** sheet in `../Encore-V1.5-Exhaustive-Backlog.xlsx`; this document is the readable summary. Per the update request's completeness rule: **no capability has an empty status** — every row is exactly one of Covered, NOT USER-FACING, DEFERRED (backend gap), or (if this ever happens) UNCLASSIFIED, which the live audit sheet counts and which must be zero.

| V1 Capability | Section | V1.5 Epic(s) | Backend Status | Task Count | Status | Note |
|---|---|---|---|---|---|---|
| Users, auth | A | AUTH | R | 50 | Covered |  |
| RBAC roles (CUSTOMER/ORGANIZER/SUPPORT/OPERATIONS/ADMIN) | A | AUTH, SEC | Mixed (E role names / R endpoint) | 65 | Covered | SUPPORT role: gap G-7, no frontend surface — see audit notes |
| Events, venues | A | DISC, EVENT, ORG-EVT | E | 101 | Covered |  |
| Seats, inventory state machine | A | SEAT, ORG-INV | E | 40 | Covered |  |
| Holds, TTL expiration | A | SEAT, CHECK | E | 45 | Covered |  |
| Checkout orchestrator (saga) | A | CHECK | E | 21 | Covered |  |
| Idempotent payments | A | PAY | E | 6 | Covered |  |
| Orders | A | ORD, CONF | E | 36 | Covered |  |
| Tickets, ownership | A | TIX | E | 25 | Covered |  |
| Wallet / store credit, immutable ledger | A | WAL | E | 12 | Covered |  |
| Resale marketplace, matching engine | A | RESALE | E | 94 | Covered |  |
| API Gateway | B | OPS-SVC | E | 12 | Covered |  |
| Redis / distributed cache, consistent hashing | B | OPS-REDIS | E/R | 12 | Covered |  |
| Distributed locking | B | OPS-INV | R | 11 | Covered |  |
| Kafka / distributed message queue | B | OPS-KAFKA | E | 13 | Covered |  |
| Virtual waiting room | B | WAIT, ORG-WR, OPS-WR | E | 43 | Covered |  |
| Snowflake-style distributed ID generator | B | N/A | E | 0 | NOT USER-FACING | No UI needed — IDs appear as opaque strings everywhere |
| Rate limiter, anti-scalper | B | CHECK, SEAT | E | 45 | Covered |  |
| Read replicas, sharding | B | OPS-DB | R | 12 | Covered |  |
| Horizontal scaling / load balancing | B | OPS-SVC | R | 12 | Covered |  |
| Search (events/artists/venues/categories/location/date/price) | C | DISC | E (events/venues) / G-1 (artists) | 46 | DEFERRED (backend gap) |  |
| Autocomplete | C | DISC | E | 46 | Covered |  |
| Event crawler | C | N/A | E | 0 | NOT USER-FACING | No UI needed — output appears as ordinary events |
| URL shortener | C | EVENT, TIX | E | 39 | Covered |  |
| Event feed, fan-out hybrid | C | DISC | E / G-1 (artists-followed) | 46 | DEFERRED (backend gap) |  |
| Ad click aggregation | C | DISC | R | 46 | Covered | Instrumentation only, not a page |
| Notification service (6 event types) | D | NOTIF | R | 14 | Covered |  |
| Chat service | D | CHAT, ORG-CHAT | R | 26 | Covered |  |
| Email service | D | CONF | E | 17 | Covered | No dedicated page — confirmation banner only |
| Object storage | E | N/A | E | 0 | NOT USER-FACING | No dedicated UI — underlies uploads/media |
| Organizer document sharing (OWNER/EDITOR/VIEWER) | E | ORG-DOC | E/R | 23 | Covered |  |
| Livestream / VOD, transcoding | E | MEDIA, ORG-MED | E/R | 37 | Covered |  |
| Proximity service, geohash | F | LOC | R | 12 | Covered |  |
| Nearby friends, privacy filter | F | LOC, PROF | R | 61 | Covered |  |
| Venue routing / ETA | F | DISC | R | 46 | Covered |  |
| Distributed job scheduler | G | ORG-NOTIF | R | 10 | Covered | General job-management UI is P2, deprioritized — see audit |
| Deployment system, canary, rollback | G | OPS-DEPLOY | E/R | 26 | Covered |  |
| Metrics, Prometheus | G | OPS-MET | E | 10 | Covered |  |
| Monitoring, alerting | G | OPS-ALERT | R | 15 | Covered |  |
| Structured logging | G | OPS-LOG | R | 11 | Covered |  |
| Distributed tracing (OpenTelemetry) | G | OPS-TRACE | R | 21 | Covered |  |
| Kafka monitoring | G | OPS-KAFKA | E | 13 | Covered |  |
| Redis monitoring | G | OPS-REDIS | E | 12 | Covered |  |
| Database monitoring | G | OPS-DB | E/R | 12 | Covered |  |
| Payment monitoring | G | OPS-PAY | E | 12 | Covered |  |
| Incident handling | G | OPS-INC | G-2 (BACKEND GAP) | 21 | DEFERRED (backend gap) | DEFERRED — no Incident entity in V1 backend |
| Live leaderboard | H | LEAD | R | 12 | Covered |  |
| Audit events | H | ORD, WAL, RESALE | R | 125 | Covered | No dedicated audit-log UI in P0 — surfaced indirectly via order/wallet/trade history; dedicated view is P2 |

**48 total V1 capabilities. Unclassified: 0 (target: 0).**