'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { Event, Venue, SearchResult, AutocompleteResult, EventFilters, PaginatedEvents, LeaderboardEntry } from './types';

export const discoveryKeys = {
  events: ['discovery', 'events'] as const,
  event: (id: string) => ['discovery', 'event', id] as const,
  venues: ['discovery', 'venues'] as const,
  venue: (id: string) => ['discovery', 'venue', id] as const,
  search: (query: string) => ['discovery', 'search', query] as const,
  autocomplete: (query: string) => ['discovery', 'autocomplete', query] as const,
  nearby: (lat: number, lng: number) => ['discovery', 'nearby', lat, lng] as const,
  leaderboard: ['discovery', 'leaderboard'] as const,
};

/**
 * Fetch paginated events list.
 */
export function useEvents(filters?: EventFilters) {
  return useQuery({
    queryKey: [...discoveryKeys.events, filters],
    queryFn: async (): Promise<Event[]> => {
      const res = await apiClient.get<{ items?: Event[]; events?: Event[] }>('/api/v1/events', {
        query: {
          status: filters?.status,
          date_from: filters?.dateFrom,
          date_to: filters?.dateTo,
          venue_id: filters?.venueId,
        },
      });
      return res.data.items ?? res.data.events ?? [];
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Fetch infinite scroll events list.
 */
export function useInfiniteEvents(limit = 20) {
  return useInfiniteQuery({
    queryKey: discoveryKeys.events,
    queryFn: async ({ pageParam }): Promise<PaginatedEvents> => {
      const res = await apiClient.get<{
        items?: Event[];
        events?: Event[];
        nextCursor?: string | null;
        cursor?: string | null;
      }>('/api/v1/events', {
        query: { limit, cursor: pageParam },
      });
      const events = res.data.items ?? res.data.events ?? [];
      const cursor = res.data.nextCursor ?? res.data.cursor ?? null;
      return {
        events,
        cursor,
        hasMore: !!cursor,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor ?? undefined,
  });
}

/**
 * Fetch single event details.
 */
export function useEvent(eventId: string) {
  return useQuery({
    queryKey: discoveryKeys.event(eventId),
    queryFn: async (): Promise<Event> => {
      const res = await apiClient.get<Event>(`/api/v1/events/${eventId}`);
      return res.data;
    },
    enabled: !!eventId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Fetch venue details.
 */
export function useVenue(venueId: string) {
  return useQuery({
    queryKey: discoveryKeys.venue(venueId),
    queryFn: async (): Promise<Venue> => {
      const res = await apiClient.get<Venue>(`/api/v1/venues/${venueId}`);
      return res.data;
    },
    enabled: !!venueId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch all venues with optional city filter.
 */
export function useVenues(city?: string) {
  return useQuery({
    queryKey: ['venues', city ?? 'all'] as const,
    queryFn: async (): Promise<Venue[]> => {
      const params = city && city !== 'all' ? { city } : undefined;
      const res = await apiClient.get<{ items: Venue[]; total: number }>('/api/v1/venues', {
        query: params,
      });
      return res.data.items ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Search events and venues.
 */
export function useSearch(query: string) {
  return useQuery({
    queryKey: discoveryKeys.search(query),
    queryFn: async (): Promise<SearchResult> => {
      const res = await apiClient.get<{
        items?: Event[];
        events?: Event[];
        venues?: Venue[];
        total?: number;
        totalEvents?: number;
        totalVenues?: number;
      }>('/api/v1/search', {
        query: { q: query },
      });
      const events = res.data.items ?? res.data.events ?? [];
      const venues = res.data.venues ?? [];
      return {
        events,
        venues,
        totalEvents: res.data.total ?? res.data.totalEvents ?? events.length,
        totalVenues: res.data.totalVenues ?? venues.length,
      };
    },
    enabled: query.length >= 2,
    staleTime: 60 * 1000,
  });
}

/**
 * Autocomplete suggestions (debounced in component).
 */
export function useAutocomplete(query: string) {
  return useQuery({
    queryKey: discoveryKeys.autocomplete(query),
    queryFn: async (): Promise<AutocompleteResult[]> => {
      try {
        const res = await apiClient.get<{
          items?: (string | AutocompleteResult)[];
          results?: AutocompleteResult[];
        }>('/api/v1/autocomplete', {
          query: { q: query },
        });
        if (res.data.items) {
          return res.data.items.map((item, idx) => {
            if (typeof item === 'string') {
              return {
                type: 'event' as const,
                id: `sug_${idx}`,
                name: item,
              };
            }
            return item;
          });
        }
        return res.data.results ?? [];
      } catch {
        const fallbackRes = await apiClient.get<{ results?: AutocompleteResult[] }>('/api/v1/search/autocomplete', {
          query: { q: query },
        });
        return fallbackRes.data.results ?? [];
      }
    },
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch events for a specific venue.
 */
export function useVenueEvents(venueId: string) {
  return useQuery({
    queryKey: [...discoveryKeys.venue(venueId), 'events'] as const,
    queryFn: async (): Promise<Event[]> => {
      const res = await apiClient.get<{ items?: Event[]; events?: Event[] }>(`/api/v1/venues/${venueId}/events`);
      return res.data.items ?? res.data.events ?? [];
    },
    enabled: !!venueId,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch nearby events.
 */
export function useNearbyEvents(lat: number, lng: number) {
  return useQuery({
    queryKey: discoveryKeys.nearby(lat, lng),
    queryFn: async (): Promise<Event[]> => {
      const res = await apiClient.get<{ items?: Event[]; events?: Event[] }>('/api/v1/location/events-near-me', {
        query: { lat: lat.toString(), lon: lng.toString() },
      });
      return res.data.items ?? res.data.events ?? [];
    },
    enabled: !!lat && !!lng,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch leaderboard.
 */
export function useLeaderboard() {
  return useQuery({
    queryKey: discoveryKeys.leaderboard,
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const res = await apiClient.get<any>('/api/v1/leaderboard/trending');
      const list = Array.isArray(res.data) ? res.data : (res.data?.items ?? res.data?.leaderboard ?? []);
      return list.map((item: any, idx: number) => ({
        userId: item.eventId ?? item.event_id ?? item.userId ?? `user-${idx}`,
        name: item.name ?? `Event ${item.eventId ?? item.event_id ?? idx + 1}`,
        points: item.score ?? item.points ?? 0,
        rank: idx + 1,
      }));
    },
    staleTime: 60 * 1000,
  });
}
