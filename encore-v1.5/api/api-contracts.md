# API Contracts

Every endpoint referenced anywhere in this plan. Status: **E**xisting,
**R**equired frontend contract, **G**ap (see `backend-gaps.md`). Every
row has a corresponding backlog task in
`../Encore-V1.5-Exhaustive-Backlog.xlsx` (sheet: `API Inventory` cross-
references into `Backlog`) — 92 unique APIs, 0 without a task.

## Cross-cutting contracts (apply to every endpoint below)

| Contract | Detail |
|---|---|
| Response envelope | Success/error envelope with `data`/`error` + `request_id`, unwrapped once in `apiClient`'s interceptor |
| Pagination | Cursor-based everywhere a list exists |
| Auth header | httpOnly cookie sent automatically; `apiClient` only attaches `Idempotency-Key` and `X-Request-Id` |
| Maintenance mode | `X-Maintenance-Mode: true` short-circuits to the global maintenance state from any endpoint |
| Service-degraded header | `X-Service-Degraded: <service>` triggers a dismissible degraded-service banner |

## Auth & profile

| Endpoint | Auth | Idempotency | Status |
|---|---|---|---|
| `POST /api/v1/auth/login` | Public | — | R |
| `POST /api/v1/auth/signup` | Public | Y | R |
| `POST /api/v1/auth/password-reset-request` | Public | Y | R |
| `POST /api/v1/auth/password-reset-confirm` | Public | Y | R |
| `POST /api/v1/auth/refresh` | Required (refresh cookie) | — | R |
| `GET/PATCH /api/v1/users/me` | Required | — | R |
| `GET/PATCH /api/v1/users/me/notification-preferences` | Required | — | R |
| `GET/PATCH /api/v1/users/me/privacy-settings` | Required | — | R |

## Discovery

| Endpoint | Auth | Status |
|---|---|---|
| `GET /api/v1/events` | Public | E |
| `GET /api/v1/events/{event_id}` | Public | E |
| `GET /api/v1/events/{event_id}/seats` | Public | E |
| `GET /api/v1/search`, `GET /api/v1/search/autocomplete` | Public | E |
| `GET /api/v1/venues/{venue_id}`, `.../events` | Public | R |
| `GET /api/v1/feed` | Optional | Mixed E/G-1 (artist subset) |
| `GET /api/v1/location/nearby-events`, `.../nearby-friends` | Public/Required | R |
| `GET /api/v1/leaderboard` | Public | R |

## Purchase flow

| Endpoint | Auth | Idempotency | Status |
|---|---|---|---|
| `POST /api/v1/waiting-room/join`, `GET .../{entry_id}` | Required | Y (join) | E |
| `POST /api/v1/holds`, `DELETE .../{hold_id}`, `GET .../{hold_id}` | Required | Y (create) | E |
| `GET /api/v1/holds?user=me&event=` | Required | — | R |
| `POST /api/v1/orders`, `GET .../{order_id}`, `GET /api/v1/orders` | Required | Y (create) | E/R |
| `POST /api/v1/payments`, `GET .../{payment_id}` | Required | Y (create) | E |
| `GET /api/v1/payments?idempotency_key=` | Required | — | R |

## Tickets, wallet, resale

| Endpoint | Auth | Status |
|---|---|---|
| `GET /api/v1/tickets`, `.../{ticket_id}` | Required | R |
| `GET /api/v1/wallet`, `.../transactions` | Required | R |
| `POST /api/v1/resale/orders` (BUY/SELL) | Required | E |
| `DELETE /api/v1/resale/orders/{listing_id}` | Required (owner) | R |
| `GET /api/v1/resale/listings`, `.../order-book/{event_id}`, `.../trades` | Public/Required | E/R |

## Notifications, chat, media

| Endpoint | Auth | Status |
|---|---|---|
| `GET /api/v1/notifications`, `POST .../{id}/read` | Required | R |
| `GET /api/v1/chat/{event_id}/history` | Required | R |
| `GET /api/v1/events/{event_id}/stream-manifest`, `.../vod-manifest` | Depends on access model (gap G-4) | R |

## Organizer

37 endpoints — dashboard summary, event CRUD, inventory, waiting-room
control (status + admission-rate + pause + resume), orders, resale
activity, analytics, attendees, notification campaigns, revenue,
documents (list/detail/upload/permissions), settings. Full method/path
list in `../Encore-V1.5-Exhaustive-Backlog.xlsx`'s `API Inventory` sheet,
filtered to organizer routes.

## Operations

23 endpoints — overview, flash-sale, per-domain dashboards (waiting-room,
inventory, kafka, redis, database, payments, services), deployments
(+rollback, ADMIN-only), logs, traces, metrics, alerts (+acknowledge).
Same reference as above, filtered to ops routes.

---

## Type system appendix

All types live in `types/`, one file per domain. Every enum value
matches a backend enum value exactly (string literal unions, not numeric
enums). Full definitions:

```typescript
export type Role = 'CUSTOMER' | 'ORGANIZER' | 'SUPPORT' | 'OPERATIONS' | 'ADMIN';
export type EventStatus = 'SCHEDULED' | 'ON_SALE' | 'SOLD_OUT' | 'CANCELLED';
export type InventoryStatus = 'AVAILABLE' | 'HELD' | 'SOLD' | 'RESERVED'; // RESERVED = gap G-5
export type OrderStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type PaymentStatus =
  | 'INITIAL' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT'
  | 'UNKNOWN' | 'RETRYING' | 'CANCELLED'; // matches the Payment UX state machine exactly
export type TicketStatus =
  | 'ISSUED' | 'USED' | 'CANCELLED' | 'REFUNDED'
  | 'LISTED_FOR_RESALE' | 'TRANSFERRED';
export type ListingStatus = 'LISTED' | 'MATCHING' | 'MATCHED' | 'SOLD' | 'CANCELLED' | 'EXPIRED';
export type TradeStatus = 'CREATED' | 'SETTLING' | 'COMPLETED' | 'FAILED';
export type NotificationType =
  | 'ON_SALE' | 'PRICE_DROP' | 'WAITLIST_MOVED'
  | 'PURCHASE_COMPLETE' | 'TICKET_DELIVERY' | 'EVENT_CHANGE';
export type DocumentPermission = 'OWNER' | 'EDITOR' | 'VIEWER';
export type TranscodeStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
export type AlertSeverity = 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4';

// Core entities — id: string, timestamps: ISO 8601 strings, money: *Cents integers
export interface User { id: string; email: string; displayName: string; role: Role; createdAt: string; }
export interface Event { id: string; name: string; venueId: string; artistId?: string; startsAt: string; status: EventStatus; mediaAccessPolicy: 'PUBLIC'|'TICKET_HOLDERS_ONLY'|'PRIVATE'; posterImageUrl: string; }
export interface SeatWithInventory { id: string; sectionId: string; row: string; number: string; inventoryId: string; status: InventoryStatus; priceCents: number; heldByUserId?: string; }
export interface SeatHold { id: string; eventId: string; seatId: string; userId: string; expiresAt: string; status: 'ACTIVE'|'EXPIRED'|'RELEASED'|'CONVERTED'; }
export interface Order { id: string; userId: string; eventId: string; status: OrderStatus; totalCents: number; items: { ticketId: string; seatId: string; priceCents: number }[]; createdAt: string; }
export interface Payment { id: string; orderId: string; status: PaymentStatus; amountCents: number; idempotencyKey: string; declineReason?: string; }
export interface Ticket { id: string; orderId: string; eventId: string; seatId: string; ownerId: string; status: TicketStatus; ticketCode: string; }
export interface WalletTransaction { id: string; userId: string; amountCents: number; balanceAfterCents: number; reason: 'CANCELLATION_CREDIT'|'RESALE_PROCEEDS'|'PURCHASE_DEBIT'|'REFUND'; createdAt: string; }
export interface Trade { id: string; listingId: string; buyerId: string; sellerId: string; priceCents: number; status: TradeStatus; settlementSteps: { step: 'PAYMENT_CHARGED'|'SELLER_CREDITED'|'OWNERSHIP_TRANSFERRED'; completedAt: string|null }[]; }
export interface Incident { id: string; severity: AlertSeverity; status: 'OPEN'|'INVESTIGATING'|'MONITORING'|'RESOLVED'; affectedServices: string[]; timeline: { at: string; description: string }[]; linkedAlertIds: string[]; linkedDeploymentId?: string; postmortemUrl?: string; } // gap G-2 — typed now so implementation is type-ready the moment the gap closes
```

Backend fields (assumed `snake_case`) are converted to `camelCase` in
exactly one place — `apiClient`'s response interceptor — so every
component sees `camelCase` consistently.
