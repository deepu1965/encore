'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';

import { apiClient, ApiError } from '@/lib/api-client';

import type { Hold, HoldCreatePayload } from './types';
import { seatSelectionKeys } from './types';

/**
 * Create a seat hold.
 *
 * Endpoint: POST /api/v1/holds
 * Headers: Idempotency-Key (required)
 *
 * State machine:
 * - Success (201): Seat is now HELD, start countdown
 * - Conflict (409): Seat taken by another user, show toast + refetch
 * - Error (4xx/5xx): Show error message
 */
export function useCreateHold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: HoldCreatePayload): Promise<Hold> => {
      const idempotencyKey = `hold-${nanoid(16)}`;
      const body = {
        event_id: payload.eventId,
        seat_id: payload.seatId,
      };
      const res = await apiClient.post<any>('/api/v1/holds', body, {
        idempotencyKey,
      });
      const d = res.data;
      return {
        inventoryId: d.inventoryId || d.inventory_id || payload.seatId,
        eventId: d.eventId || d.event_id || payload.eventId,
        seatId: d.seatId || d.seat_id || payload.seatId,
        status: d.status || 'HELD',
        heldByUserId: d.heldByUserId || d.held_by_user_id || 'user_current',
        heldAt: d.heldAt || d.held_at || new Date().toISOString(),
        holdExpiresAt: d.holdExpiresAt || d.hold_expires_at || new Date(Date.now() + 300000).toISOString(),
      };
    },
    onSuccess: (_data, variables) => {
      // Update the seats cache with the new status
      queryClient.setQueryData<{
        eventId: string;
        items: Array<{ seatId: string; status: string }>;
      }>(seatSelectionKeys.seats(variables.eventId), (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((seat) =>
            seat.seatId === variables.seatId
              ? { ...seat, status: 'HELD' }
              : seat,
          ),
        };
      });

      // Invalidate user holds to refetch
      queryClient.invalidateQueries({
        queryKey: seatSelectionKeys.userHolds(variables.eventId),
      });
    },
    onError: (error, variables) => {
      // On conflict (409), invalidate the seats cache to refetch
      if (error instanceof ApiError && error.kind === 'conflict') {
        queryClient.invalidateQueries({
          queryKey: seatSelectionKeys.seats(variables.eventId),
        });
      }
    },
  });
}

/**
 * Release a seat hold.
 *
 * Endpoint: DELETE /api/v1/holds/{inventory_id}
 *
 * Called when:
 * - User explicitly releases a held seat
 * - User navigates away from the seat selection page (cleanup)
 */
export function useReleaseHold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      inventoryId,
    }: {
      inventoryId: string;
      eventId: string;
      seatId: string;
    }): Promise<void> => {
      await apiClient.delete(`/api/v1/holds/${inventoryId}`);
    },
    onSuccess: (_, variables) => {
      // Update the seats cache
      queryClient.setQueryData<{
        eventId: string;
        items: Array<{ seatId: string; status: string }>;
      }>(seatSelectionKeys.seats(variables.eventId), (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((seat) =>
            seat.seatId === variables.seatId
              ? { ...seat, status: 'AVAILABLE' }
              : seat,
          ),
        };
      });

      // Invalidate user holds
      queryClient.invalidateQueries({
        queryKey: seatSelectionKeys.userHolds(variables.eventId),
      });
    },
  });
}

/**
 * Generate a stable idempotency key for hold creation.
 *
 * Uses a deterministic key based on event+seat so that retries
 * (due to network failures) are safe and don't create duplicate holds.
 */
export function generateHoldIdempotencyKey(eventId: string, seatId: string): string {
  return `hold-${eventId}-${seatId}`;
}
