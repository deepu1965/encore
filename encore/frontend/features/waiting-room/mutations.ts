'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { WaitingRoomEntry, JoinWaitingRoomPayload } from './types';
import { waitingRoomKeys } from './types';

/**
 * Join a waiting room.
 * Endpoint: POST /api/v1/waiting-room/join
 */
export function useJoinWaitingRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: JoinWaitingRoomPayload): Promise<WaitingRoomEntry> => {
      const res = await apiClient.post<WaitingRoomEntry>('/api/v1/waiting-room/join', payload);
      return res.data;
    },
    onSuccess: (data) => {
      // Seed the cache with the joined entry
      queryClient.setQueryData(waitingRoomKeys.entry(data.entryId), data);
    }
  });
}
