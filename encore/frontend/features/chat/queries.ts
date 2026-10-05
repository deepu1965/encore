'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ChatMessage, ChatPresence } from './types';
import { chatKeys } from './types';

export function useChatHistory(eventId: string, afterSequence?: number) {
  return useQuery({
    queryKey: chatKeys.history(eventId),
    queryFn: async (): Promise<ChatMessage[]> => {
      const q = afterSequence ? { after_sequence: afterSequence.toString() } : undefined;
      const res = await apiClient.get<{ items: ChatMessage[] }>(`/api/v1/events/${eventId}/chat`, { query: q });
      return res.data.items ?? [];
    },
    enabled: !!eventId,
  });
}

export function useChatPresence(eventId: string) {
  return useQuery({
    queryKey: chatKeys.presence(eventId),
    queryFn: async (): Promise<ChatPresence[]> => {
      const res = await apiClient.get<{ items: ChatPresence[] }>(`/api/v1/events/${eventId}/chat/presence`);
      return res.data.items ?? [];
    },
    enabled: !!eventId,
  });
}

export function useSendMessage() {
  return useMutation({
    mutationFn: async ({ eventId, content, idempotencyKey }: { eventId: string, content: string, idempotencyKey: string }): Promise<ChatMessage> => {
      const res = await apiClient.post<ChatMessage>(`/api/v1/events/${eventId}/chat`, { content }, { idempotencyKey });
      return res.data;
    }
  });
}
