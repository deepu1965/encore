'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { WaitingRoomEntry } from './types';
import { waitingRoomKeys } from './types';

/**
 * Fetch a user's waiting room entry to restore state.
 * Endpoint: GET /api/v1/waiting-room/{entry_id}
 */
export function useWaitingRoomEntry(entryId: string | null) {
  return useQuery({
    queryKey: waitingRoomKeys.entry(entryId!),
    queryFn: async (): Promise<WaitingRoomEntry> => {
      const res = await apiClient.get<WaitingRoomEntry>(`/api/v1/waiting-room/${entryId}`);
      return res.data;
    },
    enabled: !!entryId,
    staleTime: 0, 
    refetchOnWindowFocus: true,
  });
}

export function useWaitingRoomMutator() {
  const queryClient = useQueryClient();

  const updateEntry = (entryId: string, updates: Partial<WaitingRoomEntry>) => {
    queryClient.setQueryData<WaitingRoomEntry>(
      waitingRoomKeys.entry(entryId),
      (old) => {
        if (!old) return old;
        return { ...old, ...updates };
      }
    );
  };

  return { updateEntry };
}
