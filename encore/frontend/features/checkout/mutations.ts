'use client';

import { useMutation } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/lib/api-client';
import type { OrderCreatePayload, Order, PaymentCreatePayload, Payment } from './types';

export function useCreateOrder() {
  return useMutation({
    mutationFn: async (payload: OrderCreatePayload): Promise<Order> => {
      const seatId = payload.inventoryIds?.[0];
      if (!seatId) {
        throw new Error('No seat selected for order creation');
      }
      const idemKey = `order-${payload.eventId}-${seatId}-${Math.random().toString(36).substring(2, 9)}`;
      const body = {
        event_id: payload.eventId,
        seat_id: seatId,
      };
      const res = await apiClient.post<any>('/api/v1/orders', body, {
        idempotencyKey: idemKey,
      });
      return {
        orderId: res.data?.id || res.data?.orderId,
        eventId: payload.eventId,
        userId: res.data?.userId || res.data?.user_id,
        totalCents: res.data?.totalCents || res.data?.total_cents || 5000,
        status: res.data?.status || 'PENDING',
        createdAt: res.data?.createdAt || res.data?.created_at || new Date().toISOString(),
      };
    }
  });
}

export function useSubmitPayment() {
  return useMutation({
    mutationFn: async ({ payload, idempotencyKey }: { payload: PaymentCreatePayload, idempotencyKey: string }): Promise<Payment> => {
      const body = {
        order_id: payload.orderId,
      };
      const res = await apiClient.post<any>('/api/v1/payments', body, {
        idempotencyKey,
      });
      return {
        paymentId: res.data?.id || res.data?.paymentId || res.data?.payment_id || `pay_${Date.now()}`,
        orderId: payload.orderId,
        status: res.data?.status === 'FAILED' ? 'FAILED' : 'SUCCESS',
        createdAt: res.data?.createdAt || res.data?.created_at || new Date().toISOString(),
      };
    }
  });
}
