'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Order } from '@/features/checkout'; // Reuse Order type from checkout

export const orderKeys = {
  all: () => ['orders'] as const,
};

export function useOrders() {
  return useQuery({
    queryKey: orderKeys.all(),
    queryFn: async (): Promise<Order[]> => {
      const res = await apiClient.get<{ items: Order[] }>('/api/v1/orders');
      return res.data.items ?? [];
    }
  });
}
