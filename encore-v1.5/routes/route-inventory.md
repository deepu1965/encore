# Route Inventory

Every route in the V1.5 application. "Task IDs" links to the exact backlog rows (see planning/exhaustive-task-backlog.md and the accompanying Encore-V1.5-Exhaustive-Backlog.xlsx) that implement it — every row below has at least one, or is explicitly marked NOT APPLICABLE / DEFERRED with a reason, per the requirement that no route be silently dropped.

## Authentication

| Route | Feature | Epic | RBAC | Priority | Task Count | Task ID Range | Status |
|---|---|---|---|---|---|---|---|
| `/login` | Login | AUTH | Public | P0 | 9 | V15-AUTH-001 .. V15-AUTH-009 | Covered |
| `/signup` | Signup | AUTH | Public | P0 | 9 | V15-AUTH-010 .. V15-AUTH-018 | Covered |
| `/forgot-password` | Forgot Password | AUTH | Public | P0 | 9 | V15-AUTH-019 .. V15-AUTH-027 | Covered |
| `/reset-password` | Reset Password | AUTH | Public | P0 | 9 | V15-AUTH-028 .. V15-AUTH-036 | Covered |
| `/unauthorized` | Unauthorized | AUTH | Public | P0 | 7 | V15-AUTH-037 .. V15-AUTH-043 | Covered |
| `/forbidden` | Forbidden | AUTH | Public | P0 | 7 | V15-AUTH-044 .. V15-AUTH-050 | Covered |

## Discovery

| Route | Feature | Epic | RBAC | Priority | Task Count | Task ID Range | Status |
|---|---|---|---|---|---|---|---|
| `/` | Home | DISC | Public | P0 | 12 | V15-DISC-001 .. V15-DISC-012 | Covered |
| `/explore` | Explore | DISC | Public | P0 | 11 | V15-DISC-013 .. V15-DISC-023 | Covered |
| `/search` | Search | DISC | Public | P0 | 12 | V15-DISC-024 .. V15-DISC-035 | Covered |
| `/venues/[venueId]` | Venue Details | DISC | Public | P1 | 11 | V15-DISC-036 .. V15-DISC-046 | Covered |
| `/near-me` | Near Me | LOC | Public | P2 | 12 | V15-LOC-001 .. V15-LOC-012 | Covered |
| `/leaderboard` | Leaderboard | LEAD | Public | P2 | 11 | V15-LEAD-001 .. V15-LEAD-011 | Covered |

## Event, Seat Selection, Waiting Room

| Route | Feature | Epic | RBAC | Priority | Task Count | Task ID Range | Status |
|---|---|---|---|---|---|---|---|
| `/events/[eventId]` | Event Details | EVENT | Public | P0 | 13 | V15-EVENT-001 .. V15-EVENT-013 | Covered |
| `/events/[eventId]/select-seats` | Seat Selection | SEAT | CUSTOMER | P0 | 17 | V15-SEAT-001 .. V15-SEAT-017 | Covered |
| `/events/[eventId]/waiting-room` | Waiting Room | WAIT | CUSTOMER | P0 | 13 | V15-WAIT-001 .. V15-WAIT-013 | Covered |

## Checkout, Payment, Confirmation

| Route | Feature | Epic | RBAC | Priority | Task Count | Task ID Range | Status |
|---|---|---|---|---|---|---|---|
| `/checkout` | Checkout | CHECK | CUSTOMER | P0 | 14 | V15-CHECK-001 .. V15-CHECK-014 | Covered |
| `/orders/[orderId]/confirmation` | Order Confirmation | CONF | CUSTOMER | P0 | 12 | V15-CONF-001 .. V15-CONF-012 | Covered |

## Tickets, Orders, Wallet, Profile

| Route | Feature | Epic | RBAC | Priority | Task Count | Task ID Range | Status |
|---|---|---|---|---|---|---|---|
| `/tickets` | My Tickets | TIX | CUSTOMER | P0 | 12 | V15-TIX-001 .. V15-TIX-012 | Covered |
| `/tickets/[ticketId]` | Ticket Details | TIX | CUSTOMER | P0 | 11 | V15-TIX-013 .. V15-TIX-023 | Covered |
| `/orders` | Order History | ORD | CUSTOMER | P1 | 10 | V15-ORD-001 .. V15-ORD-010 | Covered |
| `/orders/[orderId]` | Order Details | ORD | CUSTOMER | P1 | 9 | V15-ORD-011 .. V15-ORD-019 | Covered |
| `/wallet` | Wallet | WAL | CUSTOMER | P1 | 12 | V15-WAL-001 .. V15-WAL-012 | Covered |
| `/profile` | Profile | PROF | CUSTOMER | P1 | 11 | V15-PROF-001 .. V15-PROF-011 | Covered |
| `/settings` | Settings Index | PROF | CUSTOMER | P1 | 9 | V15-PROF-012 .. V15-PROF-020 | Covered |
| `/settings/notifications` | Notification Preferences | PROF | CUSTOMER | P1 | 11 | V15-PROF-021 .. V15-PROF-031 | Covered |
| `/settings/privacy` | Privacy Settings | PROF | CUSTOMER | P2 | 11 | V15-PROF-032 .. V15-PROF-042 | Covered |
| `/help` | Help Center | PROF | Public | P2 | 7 | V15-PROF-043 .. V15-PROF-049 | Covered |

## Resale

| Route | Feature | Epic | RBAC | Priority | Task Count | Task ID Range | Status |
|---|---|---|---|---|---|---|---|
| `/tickets/[ticketId]/sell` | Create Resale Listing | RESALE | CUSTOMER | P0 | 10 | V15-RESALE-001 .. V15-RESALE-010 | Covered |
| `/resale` | Resale Marketplace | RESALE | Public | P0 | 9 | V15-RESALE-011 .. V15-RESALE-019 | Covered |
| `/resale/events/[eventId]` | Resale Order Book | RESALE | Public | P0 | 11 | V15-RESALE-020 .. V15-RESALE-030 | Covered |
| `/resale/listings/[listingId]` | Listing Details / Buy | RESALE | Public | P0 | 11 | V15-RESALE-031 .. V15-RESALE-041 | Covered |
| `/resale/my-listings` | My Listings | RESALE | CUSTOMER | P0 | 11 | V15-RESALE-042 .. V15-RESALE-052 | Covered |
| `/resale/my-trades` | My Trades | RESALE | CUSTOMER | P0 | 10 | V15-RESALE-053 .. V15-RESALE-062 | Covered |
| `/resale/trades/[tradeId]` | Trade / Settlement Details | RESALE | CUSTOMER | P0 | 11 | V15-RESALE-063 .. V15-RESALE-073 | Covered |

## Notifications, Chat

| Route | Feature | Epic | RBAC | Priority | Task Count | Task ID Range | Status |
|---|---|---|---|---|---|---|---|
| `/notifications` | Notification Center | NOTIF | CUSTOMER | P1 | 13 | V15-NOTIF-001 .. V15-NOTIF-013 | Covered |
| `/events/[eventId]/chat` | Event Chat | CHAT | CUSTOMER | P1 | 12 | V15-CHAT-001 .. V15-CHAT-012 | Covered |

## Media

| Route | Feature | Epic | RBAC | Priority | Task Count | Task ID Range | Status |
|---|---|---|---|---|---|---|---|
| `/events/[eventId]/live` | Live Stream Viewer | MEDIA | CUSTOMER | P2 | 11 | V15-MEDIA-001 .. V15-MEDIA-011 | Covered |
| `/events/[eventId]/replay` | VOD Replay | MEDIA | CUSTOMER | P2 | 9 | V15-MEDIA-012 .. V15-MEDIA-020 | Covered |

## System

| Route | Feature | Epic | RBAC | Priority | Task Count | Task ID Range | Status |
|---|---|---|---|---|---|---|---|
| `/404` | Not Found | SYS | Public | P0 | 7 | V15-SYS-001 .. V15-SYS-007 | Covered |
| `/500` | Unhandled Error | SYS | Public | P0 | 7 | V15-SYS-008 .. V15-SYS-014 | Covered |

## Organizer

| Route | Feature | Epic | RBAC | Priority | Task Count | Task ID Range | Status |
|---|---|---|---|---|---|---|---|
| `/organizer` | Organizer Dashboard Overview | ORG-DASH | ORGANIZER | P1 | 10 | V15-ORG-DASH-001 .. V15-ORG-DASH-010 | Covered |
| `/organizer/events` | Organizer Event List | ORG-EVT | ORGANIZER | P1 | 10 | V15-ORG-EVT-001 .. V15-ORG-EVT-010 | Covered |
| `/organizer/events/new` | Create Event | ORG-EVT | ORGANIZER | P1 | 10 | V15-ORG-EVT-011 .. V15-ORG-EVT-020 | Covered |
| `/organizer/events/[eventId]` | Event Management Overview | ORG-EVT | ORGANIZER | P1 | 11 | V15-ORG-EVT-021 .. V15-ORG-EVT-031 | Covered |
| `/organizer/events/[eventId]/edit` | Edit Event | ORG-EVT | ORGANIZER | P1 | 10 | V15-ORG-EVT-032 .. V15-ORG-EVT-041 | Covered |
| `/organizer/events/[eventId]/inventory` | Inventory Management | ORG-INV | ORGANIZER | P1 | 16 | V15-ORG-INV-001 .. V15-ORG-INV-016 | Covered |
| `/organizer/events/[eventId]/waiting-room` | Waiting Room Control | ORG-WR | ORGANIZER | P1 | 14 | V15-ORG-WR-001 .. V15-ORG-WR-014 | Covered |
| `/organizer/events/[eventId]/orders` | Organizer Orders | ORG-ORD | ORGANIZER | P1 | 10 | V15-ORG-ORD-001 .. V15-ORG-ORD-010 | Covered |
| `/organizer/events/[eventId]/resale` | Organizer Resale Monitoring | ORG-RES | ORGANIZER | P1 | 11 | V15-ORG-RES-001 .. V15-ORG-RES-011 | Covered |
| `/organizer/events/[eventId]/analytics` | Event Analytics | ORG-ANA | ORGANIZER | P1 | 9 | V15-ORG-ANA-001 .. V15-ORG-ANA-009 | Covered |
| `/organizer/events/[eventId]/attendees` | Attendees | ORG-ATT | ORGANIZER | P1 | 10 | V15-ORG-ATT-001 .. V15-ORG-ATT-010 | Covered |
| `/organizer/events/[eventId]/chat` | Chat Moderation | ORG-CHAT | ORGANIZER | P1 | 10 | V15-ORG-CHAT-001 .. V15-ORG-CHAT-010 | Covered |
| `/organizer/events/[eventId]/media` | Media Management | ORG-MED | ORGANIZER | P2 | 12 | V15-ORG-MED-001 .. V15-ORG-MED-012 | Covered |
| `/organizer/events/[eventId]/notifications` | Notification Campaigns | ORG-NOTIF | ORGANIZER | P1 | 10 | V15-ORG-NOTIF-001 .. V15-ORG-NOTIF-010 | Covered |
| `/organizer/revenue` | Cross-Event Revenue | ORG-REV | ORGANIZER | P1 | 9 | V15-ORG-REV-001 .. V15-ORG-REV-009 | Covered |
| `/organizer/documents` | Document List | ORG-DOC | ORGANIZER | P1 | 11 | V15-ORG-DOC-001 .. V15-ORG-DOC-011 | Covered |
| `/organizer/documents/[documentId]` | Document Detail | ORG-DOC | ORGANIZER | P1 | 12 | V15-ORG-DOC-012 .. V15-ORG-DOC-023 | Covered |
| `/organizer/settings` | Organizer Settings | ORG-SET | ORGANIZER | P1 | 11 | V15-ORG-SET-001 .. V15-ORG-SET-011 | Covered |

## Operations

| Route | Feature | Epic | RBAC | Priority | Task Count | Task ID Range | Status |
|---|---|---|---|---|---|---|---|
| `/ops` | Ops Overview | OPS-OV | OPERATIONS | P0 | 11 | V15-OPS-OV-001 .. V15-OPS-OV-011 | Covered |
| `/ops/flash-sale` | Flash-Sale Control Center | OPS-FS | OPERATIONS | P0 | 19 | V15-OPS-FS-001 .. V15-OPS-FS-019 | Covered |
| `/ops/waiting-room` | Cross-Event Waiting Room Monitor | OPS-WR | OPERATIONS | P0 | 10 | V15-OPS-WR-001 .. V15-OPS-WR-010 | Covered |
| `/ops/inventory` | Cross-Event Inventory Monitor | OPS-INV | OPERATIONS | P0 | 10 | V15-OPS-INV-001 .. V15-OPS-INV-010 | Covered |
| `/ops/kafka` | Kafka Dashboard | OPS-KAFKA | OPERATIONS | P0 | 12 | V15-OPS-KAFKA-001 .. V15-OPS-KAFKA-012 | Covered |
| `/ops/redis` | Redis Dashboard | OPS-REDIS | OPERATIONS | P0 | 11 | V15-OPS-REDIS-001 .. V15-OPS-REDIS-011 | Covered |
| `/ops/database` | Database Dashboard | OPS-DB | OPERATIONS | P0 | 11 | V15-OPS-DB-001 .. V15-OPS-DB-011 | Covered |
| `/ops/payments` | Payment Operations | OPS-PAY | OPERATIONS | P0 | 11 | V15-OPS-PAY-001 .. V15-OPS-PAY-011 | Covered |
| `/ops/services` | Service Map | OPS-SVC | OPERATIONS | P0 | 11 | V15-OPS-SVC-001 .. V15-OPS-SVC-011 | Covered |
| `/ops/deployments` | Deployment List | OPS-DEPLOY | OPERATIONS | P0 | 12 | V15-OPS-DEPLOY-001 .. V15-OPS-DEPLOY-012 | Covered |
| `/ops/deployments/[deploymentId]` | Deployment Detail | OPS-DEPLOY | OPERATIONS | P0 | 12 | V15-OPS-DEPLOY-013 .. V15-OPS-DEPLOY-024 | Covered |
| `/ops/incidents` | Incident List | OPS-INC | OPERATIONS | DEFERRED | 10 | V15-OPS-INC-001, V15-OPS-INC-002, V15-OPS-INC-003, V15-OPS-INC-004, V15-OPS-INC-005, V15-OPS-INC-006, V15-OPS-INC-007, V15-OPS-INC-008, V15-OPS-INC-009, V15-OPS-INC-010 | NOT APPLICABLE / DEFERRED — Blocked on backend gap G-2 (no Incident entity in V1) |
| `/ops/incidents/[incidentId]` | Incident Detail | OPS-INC | OPERATIONS | DEFERRED | 9 | V15-OPS-INC-011, V15-OPS-INC-012, V15-OPS-INC-013, V15-OPS-INC-014, V15-OPS-INC-015, V15-OPS-INC-016, V15-OPS-INC-017, V15-OPS-INC-018, V15-OPS-INC-019 | NOT APPLICABLE / DEFERRED — Blocked on backend gap G-2 (no Incident entity in V1) |
| `/ops/logs` | Log Explorer | OPS-LOG | OPERATIONS | P0 | 11 | V15-OPS-LOG-001 .. V15-OPS-LOG-011 | Covered |
| `/ops/traces` | Trace Search | OPS-TRACE | OPERATIONS | P0 | 11 | V15-OPS-TRACE-001 .. V15-OPS-TRACE-011 | Covered |
| `/ops/traces/[traceId]` | Trace Waterfall | OPS-TRACE | OPERATIONS | P0 | 10 | V15-OPS-TRACE-012 .. V15-OPS-TRACE-021 | Covered |
| `/ops/metrics` | Metrics Explorer | OPS-MET | OPERATIONS | P0 | 10 | V15-OPS-MET-001 .. V15-OPS-MET-010 | Covered |
| `/ops/alerts` | Alerts | OPS-ALERT | OPERATIONS | P0 | 13 | V15-OPS-ALERT-001 .. V15-OPS-ALERT-013 | Covered |
