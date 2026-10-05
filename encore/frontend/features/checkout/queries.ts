'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Order, Payment } from './types';
import { checkoutKeys } from './types';

export function useOrder(orderId: string | null) {
  return useQuery({
    queryKey: checkoutKeys.order(orderId!),
    queryFn: async (): Promise<Order> => {
      const res = await apiClient.get<Order>(`/api/v1/orders/${orderId}`);
      return res.data;
    },
    enabled: !!orderId,
  });
}

export function usePaymentStatus(idempotencyKey: string | null) {
  return useQuery({
    queryKey: checkoutKeys.paymentStatus(idempotencyKey!),
    queryFn: async (): Promise<Payment | null> => {
      const res = await apiClient.get<{ items: Payment[] }>(`/api/v1/payments`, {
        query: { idempotency_key: idempotencyKey }
      });
      return res.data.items?.[0] || null;
    },
    enabled: !!idempotencyKey,
    // Typically polled or used once on recovery
  });
}
