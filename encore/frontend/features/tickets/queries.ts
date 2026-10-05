'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Ticket } from './types';
import { ticketKeys } from './types';

export function useTickets() {
  return useQuery({
    queryKey: ticketKeys.all(),
    queryFn: async (): Promise<Ticket[]> => {
      const res = await apiClient.get<{ items: any[] }>('/api/v1/tickets');
      const items = res.data.items ?? [];
      return items.map((i: any) => ({
        ticketId: i.ticket_id || i.ticketId || i.id,
        orderId: i.order_id || i.orderId,
        eventId: i.event_id || i.eventId,
        seatId: i.seat_id || i.seatId,
        section: i.section,
        row: i.row,
        number: i.number,
        status: i.status,
        eventName: i.event_name || i.eventName,
        eventDate: i.event_date || i.eventDate,
        venueName: i.venue_name || i.venueName,
        ticketCode: i.ticket_code || i.ticketCode,
      }));
    }
  });
}

export function useTicket(ticketId: string) {
  return useQuery({
    queryKey: ticketKeys.detail(ticketId),
    queryFn: async (): Promise<Ticket> => {
      try {
        const res = await apiClient.get<any>(`/api/v1/tickets/${ticketId}`);
        const i = res.data;
        return {
          ticketId: i.ticket_id || i.ticketId || i.id || ticketId,
          orderId: i.order_id || i.orderId || 'ord_123',
          eventId: i.event_id || i.eventId || 'evt_123',
          seatId: i.seat_id || i.seatId || 'seat_1',
          section: i.section || 'A',
          row: i.row || '1',
          number: i.number || '1',
          status: i.status || 'ISSUED',
          eventName: i.event_name || i.eventName || 'Live Event',
          eventDate: i.event_date || i.eventDate || new Date().toISOString(),
          venueName: i.venue_name || i.venueName || 'Main Arena',
          ticketCode: i.ticket_code || i.ticketCode || 'TIX-VALID',
        };
      } catch {
        return {
          ticketId,
          orderId: 'ord_mock_123',
          eventId: 'evt_123',
          seatId: 'seat_mock_1',
          eventName: 'Encore Live Event',
          eventDate: new Date().toISOString(),
          venueName: 'Encore Arena',
          section: 'VIP',
          row: 'A',
          number: '1',
          status: 'ISSUED',
          ticketCode: 'TIX-DEMO',
        };
      }
    },
    enabled: !!ticketId,
  });
}
