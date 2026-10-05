import type { TicketStatus } from '@/types';
export type { TicketStatus };

export interface Ticket {
  ticketId: string;
  orderId: string;
  eventId: string;
  seatId: string;
  section: string;
  row: string;
  number: string;
  status: TicketStatus;
  eventName: string;
  eventDate: string;
  venueName: string;
  ticketCode?: string;
}

export const ticketKeys = {
  all: () => ['tickets'] as const,
  detail: (id: string) => ['tickets', id] as const,
};
