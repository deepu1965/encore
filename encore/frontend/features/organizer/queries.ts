'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { OrganizerEvent, OrganizerStats } from './types';
import { organizerKeys } from './types';

export function useOrganizerStats() {
  return useQuery({
    queryKey: organizerKeys.stats(),
    queryFn: async (): Promise<OrganizerStats> => {
      const res = await apiClient.get<OrganizerStats>('/api/v1/organizer/stats');
      return res.data;
    }
  });
}

export function useOrganizerEvents() {
  return useQuery({
    queryKey: organizerKeys.events(),
    queryFn: async (): Promise<OrganizerEvent[]> => {
      const res = await apiClient.get<{ items: OrganizerEvent[] }>('/api/v1/organizer/events');
      return res.data.items ?? [];
    }
  });
}

export function useOrganizerEvent(eventId: string) {
  return useQuery({
    queryKey: organizerKeys.event(eventId),
    queryFn: async (): Promise<OrganizerEvent> => {
      const res = await apiClient.get<OrganizerEvent>(`/api/v1/organizer/events/${eventId}`);
      return res.data;
    },
    enabled: !!eventId,
  });
}
