/**
 * Types for seat selection feature.
 *
 * Matches backend schemas from api-gateway/schemas.py:
 * - SeatOut: inventory_id, seat_id, section, row_label, seat_number, status, price_cents
 * - HoldOut: inventory_id, event_id, seat_id, status, held_by_user_id, held_at, hold_expires_at
 */

import type { InventoryStatus } from '@/types';

// ---------------------------------------------------------------------------
// Seat types (from GET /api/v1/events/{event_id}/seats)
// ---------------------------------------------------------------------------

export interface Seat {
  inventoryId: string;
  seatId: string;
  section: string;
  rowLabel: string;
  seatNumber: string;
  status: InventoryStatus;
  priceCents: number;
}

export interface SeatList {
  eventId: string;
  items: Seat[];
}

// ---------------------------------------------------------------------------
// Hold types (from POST /api/v1/holds)
// ---------------------------------------------------------------------------

export type HoldStatus = 'ACTIVE' | 'EXPIRED' | 'RELEASED' | 'CONVERTED';

export interface Hold {
  inventoryId: string;
  eventId: string;
  seatId: string;
  status: InventoryStatus;
  heldByUserId: string;
  heldAt: string;
  holdExpiresAt: string | null;
  priceCents?: number;
  section?: string;
  row?: string;
  seatNumber?: string;
}

export interface HoldCreatePayload {
  eventId: string;
  seatId: string;
}

// ---------------------------------------------------------------------------
// Seat selection state machine
// ---------------------------------------------------------------------------

/**
 * Client-side seat selection state.
 *
 * State machine:
 * - IDLE: No seat selected
 * - PENDING_SELECTION: User tapped seat, waiting for hold API response
 * - HELD: Hold created successfully, countdown active
 * - CONFLICT: 409 received, another user holds the seat
 * - EXPIRED: Hold timer ran out
 * - ERROR: API error (not 409)
 */
export type SeatSelectionStatus =
  | 'IDLE'
  | 'PENDING_SELECTION'
  | 'HELD'
  | 'CONFLICT'
  | 'EXPIRED'
  | 'ERROR';

// ---------------------------------------------------------------------------
// WebSocket event payloads (from inventory.{event_id} channel)
// ---------------------------------------------------------------------------

export interface SeatHeldPayload {
  eventId: string;
  seatId: string;
  inventoryId: string;
  heldByUserId: string;
  heldAt: string;
  holdExpiresAt: string;
}

export interface SeatReleasedPayload {
  eventId: string;
  seatId: string;
  inventoryId: string;
  releasedByUserId: string;
  releasedAt: string;
}

export interface SeatSoldPayload {
  eventId: string;
  seatId: string;
  inventoryId: string;
  soldToUserId: string;
  soldAt: string;
}

// ---------------------------------------------------------------------------
// Seat map rendering types
// ---------------------------------------------------------------------------

export interface SeatCoordinate {
  seatId: string;
  x: number;
  y: number;
  section: string;
  row: string;
  number: string;
}

export interface SeatMapConfig {
  /** Use canvas rendering for venues with >500 seats */
  useCanvas: boolean;
  /** Zoom level (1.0 = 100%) */
  zoom: number;
  /** Pan offset X */
  panX: number;
  /** Pan offset Y */
  panY: number;
}

export interface SeatTooltipData {
  seatId: string;
  section: string;
  row: string;
  number: string;
  priceCents: number;
  status: InventoryStatus;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const seatSelectionKeys = {
  seats: (eventId: string) => ['seat-selection', 'seats', eventId] as const,
  hold: (eventId: string, seatId: string) => ['seat-selection', 'hold', eventId, seatId] as const,
  userHolds: (eventId: string) => ['seat-selection', 'user-holds', eventId] as const,
};
