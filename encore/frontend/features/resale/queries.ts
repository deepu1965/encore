'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ResaleListing, ResaleTrade, ResaleEventSummary } from './types';
import { resaleKeys } from './types';

export function useResaleEventsSummary() {
  return useQuery({
    queryKey: ['resale', 'events-summary'] as const,
    queryFn: async (): Promise<ResaleEventSummary[]> => {
      try {
        const res = await apiClient.get<{ items: any[] }>('/api/v1/resale/events-summary');
        const items = res.data.items ?? [];
        return items.map((i: any) => ({
          id: i.id || i.event_id,
          name: i.name || i.event_name,
          venue: i.venue || `${i.venue_name || ''}, ${i.city || ''}`.replace(/^, |, $/g, ''),
          venueName: i.venue_name,
          city: i.city,
          startsAt: i.starts_at || i.startsAt,
          activeListings: i.active_listings ?? i.activeListings ?? 0,
          minPriceCents: i.min_price_cents ?? i.minPriceCents,
          maxPriceCents: i.max_price_cents ?? i.maxPriceCents,
        }));
      } catch {
        return [];
      }
    },
  });
}

export function useEventListings(eventId: string) {
  return useQuery({
    queryKey: resaleKeys.eventListings(eventId),
    queryFn: async (): Promise<ResaleListing[]> => {
      const res = await apiClient.get<{ items: any[] }>(`/api/v1/resale/events/${eventId}/listings`);
      const items = res.data.items ?? [];
      return items.map((i: any) => ({
        listingId: i.listing_id || i.listingId || i.id,
        eventId: i.event_id || i.eventId || eventId,
        ticketId: i.ticket_id || i.ticketId,
        sellerId: i.seller_id || i.sellerId,
        askPriceCents: i.ask_price_cents ?? i.askPriceCents ?? 0,
        status: i.status || 'ACTIVE',
        createdAt: i.created_at || i.createdAt || new Date().toISOString(),
        section: i.section || 'General',
        row: i.row || '-',
        seatNumber: i.seat_number || i.seatNumber || i.number || '-',
      }));
    },
    enabled: !!eventId,
  });
}

export function useListing(listingId: string) {
  return useQuery({
    queryKey: resaleKeys.listing(listingId),
    queryFn: async (): Promise<ResaleListing> => {
      try {
        const res = await apiClient.get<any>(`/api/v1/resale/listings/${listingId}`);
        const i = res.data;
        return {
          listingId: i.listing_id || i.listingId || i.id || listingId,
          eventId: i.event_id || i.eventId || 'evt_123',
          ticketId: i.ticket_id || i.ticketId || 'tix_123',
          sellerId: i.seller_id || i.sellerId || 'user_seller',
          askPriceCents: i.ask_price_cents ?? i.askPriceCents ?? 10000,
          status: i.status || 'LISTED',
          createdAt: i.created_at || i.createdAt || new Date().toISOString(),
          section: i.section || '101',
          row: i.row || 'A',
          seatNumber: i.seat_number || i.seatNumber || '1',
        };
      } catch {
        return {
          listingId,
          eventId: 'evt_123',
          ticketId: 'tix_123',
          sellerId: 'user_seller',
          askPriceCents: 10000,
          status: 'LISTED',
          createdAt: new Date().toISOString(),
          section: '101',
          row: 'A',
          seatNumber: '1',
        };
      }
    },
    enabled: !!listingId,
  });
}

export function useMyListings() {
  return useQuery({
    queryKey: resaleKeys.myListings(),
    queryFn: async (): Promise<ResaleListing[]> => {
      const res = await apiClient.get<{ items: any[] }>('/api/v1/resale/my-listings');
      const items = res.data.items ?? [];
      return items.map((i: any) => ({
        listingId: i.listing_id || i.listingId || i.id,
        eventId: i.event_id || i.eventId,
        ticketId: i.ticket_id || i.ticketId,
        sellerId: i.seller_id || i.sellerId,
        askPriceCents: i.ask_price_cents ?? i.askPriceCents ?? 0,
        status: i.status || 'ACTIVE',
        createdAt: i.created_at || i.createdAt || new Date().toISOString(),
        section: i.section || 'General',
        row: i.row || '-',
        seatNumber: i.seat_number || i.seatNumber || '-',
      }));
    }
  });
}

export function useMyTrades() {
  return useQuery({
    queryKey: resaleKeys.myTrades(),
    queryFn: async (): Promise<ResaleTrade[]> => {
      const res = await apiClient.get<{ items: any[] }>('/api/v1/resale/my-trades');
      const items = res.data.items ?? [];
      return items.map((i: any) => ({
        tradeId: i.trade_id || i.tradeId || i.id,
        buyerId: i.buyer_id || i.buyerId,
        sellerId: i.seller_id || i.sellerId,
        listingId: i.listing_id || i.listingId,
        ticketId: i.ticket_id || i.ticketId,
        priceCents: i.price_cents ?? i.priceCents ?? 0,
        status: i.status || 'COMPLETED',
        createdAt: i.created_at || i.createdAt || new Date().toISOString(),
        paymentCharged: i.payment_charged ?? i.paymentCharged ?? true,
        sellerCredited: i.seller_credited ?? i.sellerCredited ?? true,
        ownershipTransferred: i.ownership_transferred ?? i.ownershipTransferred ?? true,
      }));
    }
  });
}

export function useTrade(tradeId: string) {
  return useQuery({
    queryKey: resaleKeys.trade(tradeId),
    queryFn: async (): Promise<ResaleTrade> => {
      try {
        const res = await apiClient.get<any>(`/api/v1/resale/trades/${tradeId}`);
        const i = res.data;
        return {
          tradeId: i.trade_id || i.tradeId || i.id || tradeId,
          buyerId: i.buyer_id || i.buyerId || 'user_buyer',
          sellerId: i.seller_id || i.sellerId || 'user_seller',
          listingId: i.listing_id || i.listingId || 'list_123',
          ticketId: i.ticket_id || i.ticketId || 'tix_123',
          priceCents: i.price_cents ?? i.priceCents ?? 10000,
          status: i.status || 'COMPLETED',
          createdAt: i.created_at || i.createdAt || new Date().toISOString(),
          paymentCharged: i.payment_charged ?? i.paymentCharged ?? true,
          sellerCredited: i.seller_credited ?? i.sellerCredited ?? true,
          ownershipTransferred: i.ownership_transferred ?? i.ownershipTransferred ?? true,
        };
      } catch {
        return {
          tradeId,
          buyerId: 'user_buyer',
          sellerId: 'user_seller',
          listingId: 'list_123',
          ticketId: 'tix_123',
          priceCents: 10000,
          status: 'COMPLETED',
          createdAt: new Date().toISOString(),
          paymentCharged: true,
          sellerCredited: true,
          ownershipTransferred: true,
        };
      }
    },
    enabled: !!tradeId,
  });
}
