/**
 * Domain types. String-literal unions match backend enum values exactly.
 *
 * Where the V1 backend enum diverges from the V1.5 plan (found in Phase 0),
 * the union includes the ACTUAL backend values and is annotated. Regenerate
 * from OpenAPI once gap G-3 closes.
 */

// Phase 0 / G-11: backend UserRole is BUYER | ORGANIZER | ADMIN only.
// The frontend role space is the 5 the plan names; the mapping layer
// (Phase 3) maps backend -> frontend. OPERATIONS/SUPPORT have no backend
// identity yet (OPERATIONS is aliased to ADMIN until the backend adds it).
export type Role = 'CUSTOMER' | 'ORGANIZER' | 'SUPPORT' | 'OPERATIONS' | 'ADMIN';
export type BackendRole = 'BUYER' | 'ORGANIZER' | 'ADMIN';

export type EventStatus = 'SCHEDULED' | 'ON_SALE' | 'SOLD_OUT' | 'CANCELLED';

// G-5: backend InventoryStatus has no RESERVED yet — kept optional/annotated.
export type InventoryStatus = 'AVAILABLE' | 'HELD' | 'SOLD' | 'RESERVED';

// Corrected per Phase 0: V1 backend OrderStatus includes EXPIRED + CANCELLED.
export type OrderStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'EXPIRED' | 'CANCELLED';

export type PaymentStatus =
  | 'INITIAL'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'TIMEOUT'
  | 'UNKNOWN'
  | 'RETRYING'
  | 'CANCELLED';

// Backend TicketStatus is ISSUED | USED today (Phase 0). Resale/transfer
// states are plan-level and feature-flagged until the backend supports them.
export type TicketStatus =
  | 'ISSUED'
  | 'ACTIVE'
  | 'USED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'LISTED_FOR_RESALE'
  | 'LISTED'
  | 'SOLD'
  | 'REVOKED'
  | 'TRANSFERRED';

export type ListingStatus =
  | 'LISTED'
  | 'MATCHING'
  | 'MATCHED'
  | 'SOLD'
  | 'CANCELLED'
  | 'EXPIRED';
export type TradeStatus = 'CREATED' | 'SETTLING' | 'COMPLETED' | 'FAILED';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  createdAt: string;
}

export interface EncoreEvent {
  id: string;
  name: string;
  venueId: string;
  venueName?: string;
  city?: string;
  description?: string;
  artistId?: string;
  startsAt: string;
  status: EventStatus;
  posterImageUrl?: string;
}

export interface SeatWithInventory {
  id: string;
  sectionId: string;
  row: string;
  number: string;
  inventoryId: string;
  status: InventoryStatus;
  priceCents: number;
  heldByUserId?: string;
}

export interface SeatHold {
  id: string;
  eventId: string;
  seatId: string;
  userId: string;
  expiresAt: string;
  status: 'ACTIVE' | 'EXPIRED' | 'RELEASED' | 'CONVERTED';
}
