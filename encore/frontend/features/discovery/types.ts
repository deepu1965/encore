import type { EventStatus } from '@/types';

export interface Event {
  id: string;
  name: string;
  venueId?: string;
  venueName?: string;
  artistId?: string;
  artistName?: string;
  startsAt: string;
  status: EventStatus;
  posterImageUrl?: string;
  minPriceCents?: number;
  description?: string;
  city?: string;
}

export interface Venue {
  id: string;
  name: string;
  city: string;
  state?: string;
  country?: string;
  address?: string;
  capacity?: number;
  imageUrl?: string;
}

export interface SearchResult {
  events: Event[];
  venues: Venue[];
  totalEvents: number;
  totalVenues: number;
}

export interface AutocompleteResult {
  type: 'event' | 'venue' | 'artist';
  id: string;
  name: string;
  subtitle?: string;
  imageUrl?: string;
}

export interface EventFilters {
  status?: EventStatus;
  dateFrom?: string;
  dateTo?: string;
  venueId?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface PaginatedEvents {
  events: Event[];
  cursor: string | null;
  hasMore: boolean;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  points: number;
  rank: number;
  avatarUrl?: string;
}
