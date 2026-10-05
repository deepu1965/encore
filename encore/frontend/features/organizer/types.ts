export interface OrganizerEvent {
  id: string;
  name: string;
  venueName: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ON_SALE' | 'COMPLETED' | 'SOLD_OUT' | 'SCHEDULED' | 'CANCELLED';
  date: string;
  ticketsSold: number;
  totalCapacity: number;
  revenueCents: number;
}

export interface OrganizerStats {
  totalRevenueCents: number;
  totalTicketsSold: number;
  activeEventsCount: number;
}

export const organizerKeys = {
  stats: () => ['organizer', 'stats'] as const,
  events: () => ['organizer', 'events'] as const,
  event: (id: string) => ['organizer', 'events', id] as const,
};
