import { create } from 'zustand';

import type { Hold, SeatSelectionStatus } from '@/features/seat-selection';

/**
 * Seat selection state machine.
 *
 * Ephemeral client-side state for the seat selection flow. This store tracks:
 * - The current event context
 * - User's pending seat selections (before hold is created)
 * - Active hold details (after successful hold creation)
 * - Connection status for WebSocket reconnect handling
 * - Error/conflict states for UI feedback
 *
 * IMPORTANT: This store NEVER answers "is this seat available?"
 * That comes from the server via:
 * 1. TanStack Query cache (GET /events/{id}/seats)
 * 2. WebSocket updates (inventory.{event_id} channel)
 */

interface SeatSelectionState {
  // ---------------------------------------------------------------------------
  // Event context
  // ---------------------------------------------------------------------------

  /** Current event ID being viewed */
  eventId: string | null;
  /** Set the event context, clears any previous selection */
  setEvent: (eventId: string) => void;

  // ---------------------------------------------------------------------------
  // Pending selection (before hold is created)
  // ---------------------------------------------------------------------------

  /** Seat IDs the user has tapped but not yet successfully held */
  pendingSeatIds: string[];
  /** Toggle a seat in the pending selection */
  toggleSeat: (seatId: string) => void;
  /** Clear all pending selections */
  clearPending: () => void;

  // ---------------------------------------------------------------------------
  // Active hold (after successful hold creation)
  // ---------------------------------------------------------------------------

  /** Current active hold details from the server */
  activeHold: Hold | null;
  /** Server-authoritative expiration timestamp */
  holdExpiresAt: string | null;
  /** Set the active hold after successful creation */
  setActiveHold: (hold: Hold) => void;
  /** Clear the active hold (released, expired, or checkout) */
  clearActiveHold: () => void;

  // ---------------------------------------------------------------------------
  // Selection status (state machine)
  // ---------------------------------------------------------------------------

  /** Current state in the selection flow */
  status: SeatSelectionStatus;
  /** Last error message (for toast display) */
  errorMessage: string | null;
  /** Seat ID that caused a conflict (for UI highlighting) */
  conflictSeatId: string | null;
  /** Set status to PENDING_SELECTION while hold API is in flight */
  setPending: (seatId: string) => void;
  /** Set status to HELD after successful hold */
  setHeld: (hold: Hold) => void;
  /** Set status to CONFLICT when 409 received */
  setConflict: (seatId: string, message: string) => void;
  /** Set status to EXPIRED when hold timer runs out */
  setExpired: () => void;
  /** Set status to ERROR for other failures */
  setError: (message: string) => void;
  /** Reset to IDLE state */
  reset: () => void;

  // ---------------------------------------------------------------------------
  // WebSocket connection tracking (for reconnect refetch)
  // ---------------------------------------------------------------------------

  /** Whether WebSocket is currently connected */
  wsConnected: boolean;
  /** Timestamp when WebSocket disconnected (null if connected) */
  wsDisconnectedAt: number | null;
  /** Update WebSocket connection status */
  setWsConnected: (connected: boolean) => void;
  /** Check if we should force-refetch (disconnected >5 seconds) */
  shouldRefetchOnReconnect: () => boolean;

  // ---------------------------------------------------------------------------
  // Seat map view state
  // ---------------------------------------------------------------------------

  /** Current zoom level (1.0 = 100%) */
  zoom: number;
  /** Pan offset X */
  panX: number;
  /** Pan offset Y */
  panY: number;
  /** Set zoom level */
  setZoom: (zoom: number) => void;
  /** Set pan offset */
  setPan: (x: number, y: number) => void;
  /** Reset view to default */
  resetView: () => void;
}

const DEFAULT_ZOOM = 1.0;
const RECONNECT_REFETCH_THRESHOLD_MS = 5000;

export const useSeatSelectionStore = create<SeatSelectionState>((set, get) => ({
  // Event context
  eventId: null,
  setEvent: (eventId) =>
    set((s) => {
      // If event changed, clear everything
      if (s.eventId !== eventId) {
        return {
          eventId,
          pendingSeatIds: [],
          activeHold: null,
          holdExpiresAt: null,
          status: 'IDLE',
          errorMessage: null,
          conflictSeatId: null,
          zoom: DEFAULT_ZOOM,
          panX: 0,
          panY: 0,
        };
      }
      return s;
    }),

  // Pending selection
  pendingSeatIds: [],
  toggleSeat: (seatId) =>
    set((s) => {
      // Don't allow toggling while a hold is active or pending
      if (s.status === 'HELD' || s.status === 'PENDING_SELECTION') {
        return s;
      }
      return {
        pendingSeatIds: s.pendingSeatIds.includes(seatId)
          ? s.pendingSeatIds.filter((id) => id !== seatId)
          : [...s.pendingSeatIds, seatId],
        status: 'IDLE',
        errorMessage: null,
        conflictSeatId: null,
      };
    }),
  clearPending: () =>
    set({
      pendingSeatIds: [],
      status: 'IDLE',
      errorMessage: null,
      conflictSeatId: null,
    }),

  // Active hold
  activeHold: null,
  holdExpiresAt: null,
  setActiveHold: (hold) =>
    set({
      activeHold: hold,
      holdExpiresAt: hold.holdExpiresAt,
      pendingSeatIds: [],
      status: 'HELD',
      errorMessage: null,
      conflictSeatId: null,
    }),
  clearActiveHold: () =>
    set({
      activeHold: null,
      holdExpiresAt: null,
      status: 'IDLE',
      pendingSeatIds: [],
    }),

  // Selection status
  status: 'IDLE',
  errorMessage: null,
  conflictSeatId: null,
  setPending: (seatId) =>
    set({
      status: 'PENDING_SELECTION',
      pendingSeatIds: [seatId],
      errorMessage: null,
      conflictSeatId: null,
    }),
  setHeld: (hold) =>
    set({
      status: 'HELD',
      activeHold: hold,
      holdExpiresAt: hold.holdExpiresAt,
      pendingSeatIds: [],
      errorMessage: null,
      conflictSeatId: null,
    }),
  setConflict: (seatId, message) =>
    set({
      status: 'CONFLICT',
      conflictSeatId: seatId,
      errorMessage: message,
      pendingSeatIds: [],
    }),
  setExpired: () =>
    set({
      status: 'EXPIRED',
      activeHold: null,
      holdExpiresAt: null,
      pendingSeatIds: [],
    }),
  setError: (message) =>
    set({
      status: 'ERROR',
      errorMessage: message,
      pendingSeatIds: [],
    }),
  reset: () =>
    set({
      status: 'IDLE',
      pendingSeatIds: [],
      activeHold: null,
      holdExpiresAt: null,
      errorMessage: null,
      conflictSeatId: null,
    }),

  // WebSocket connection tracking
  wsConnected: false,
  wsDisconnectedAt: null,
  setWsConnected: (connected) =>
    set((s) => {
      if (connected) {
        return { wsConnected: true, wsDisconnectedAt: null };
      }
      // Track when we disconnected
      return {
        wsConnected: false,
        wsDisconnectedAt: s.wsDisconnectedAt ?? Date.now(),
      };
    }),
  shouldRefetchOnReconnect: () => {
    const state = get();
    if (state.wsConnected) return false;
    const disconnectedAt = state.wsDisconnectedAt;
    if (!disconnectedAt) return false;
    return Date.now() - disconnectedAt > RECONNECT_REFETCH_THRESHOLD_MS;
  },

  // Seat map view state
  zoom: DEFAULT_ZOOM,
  panX: 0,
  panY: 0,
  setZoom: (zoom) => set({ zoom: Math.max(0.5, Math.min(3, zoom)) }),
  setPan: (panX, panY) => set({ panX, panY }),
  resetView: () => set({ zoom: DEFAULT_ZOOM, panX: 0, panY: 0 }),
}));
