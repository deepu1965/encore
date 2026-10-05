/**
 * Seat selection feature module.
 *
 * Provides types, queries, mutations, and hooks for:
 * - Viewing seat availability in real-time
 * - Creating and releasing seat holds
 * - Managing hold countdown
 * - Handling concurrent user conflicts
 */

// Types
export type {
  Seat,
  SeatList,
  Hold,
  HoldStatus,
  HoldCreatePayload,
  SeatSelectionStatus,
  SeatHeldPayload,
  SeatReleasedPayload,
  SeatSoldPayload,
  SeatCoordinate,
  SeatMapConfig,
  SeatTooltipData,
  seatSelectionKeys,
} from './types';

// Queries
export {
  useEventSeats,
  useUserHolds,
  useSeatSelectionMutator,
} from './queries';

// Mutations
export {
  useCreateHold,
  useReleaseHold,
  generateHoldIdempotencyKey,
} from './mutations';
