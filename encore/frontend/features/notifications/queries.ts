'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Notification } from './types';
import { notificationKeys } from './types';

export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.all(),
    queryFn: async (): Promise<Notification[]> => {
      const res = await apiClient.get<{ items: Notification[] }>('/api/v1/notifications');
      return res.data.items ?? [];
    }
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string): Promise<void> => {
      await apiClient.post(`/api/v1/notifications/${notificationId}/read`, {});
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all() });
      const previous = queryClient.getQueryData<Notification[]>(notificationKeys.all());
      if (previous) {
        queryClient.setQueryData<Notification[]>(notificationKeys.all(), old => 
          old?.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );
      }
      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationKeys.all(), context.previous);
      }
    }
  });
}
