'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ResaleListing, ResaleTrade } from './types';
import { resaleKeys } from './types';

export function useCreateListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { ticketId: string; askPriceCents: number }): Promise<ResaleListing> => {
      const res = await apiClient.post<any>('/api/v1/resale/orders', {
        type: 'SELL',
        ticket_id: payload.ticketId,
        ticketId: payload.ticketId,
        ask_price_cents: payload.askPriceCents,
        askPriceCents: payload.askPriceCents,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resaleKeys.all() });
      queryClient.invalidateQueries({ queryKey: resaleKeys.myListings() });
      queryClient.invalidateQueries({ queryKey: ['resale'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    }
  });
}

export function useCancelListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (listingId: string): Promise<void> => {
      await apiClient.delete(`/api/v1/resale/orders/${listingId}`);
    },
    onSuccess: (_, listingId) => {
      queryClient.invalidateQueries({ queryKey: resaleKeys.all() });
      queryClient.invalidateQueries({ queryKey: resaleKeys.listing(listingId) });
      queryClient.invalidateQueries({ queryKey: resaleKeys.myListings() });
      queryClient.invalidateQueries({ queryKey: ['resale'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    }
  });
}

export function useBuyListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { listingId: string }): Promise<ResaleTrade> => {
      const res = await apiClient.post<any>('/api/v1/resale/orders', {
        type: 'BUY',
        listing_id: payload.listingId,
        listingId: payload.listingId,
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: resaleKeys.all() });
      queryClient.invalidateQueries({ queryKey: resaleKeys.listing(variables.listingId) });
      queryClient.invalidateQueries({ queryKey: resaleKeys.myTrades() });
      queryClient.invalidateQueries({ queryKey: resaleKeys.myListings() });
      queryClient.invalidateQueries({ queryKey: ['resale'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    }
  });
}
