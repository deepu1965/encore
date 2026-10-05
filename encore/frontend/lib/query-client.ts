import { QueryClient } from '@tanstack/react-query';

import { ApiError } from './api-client';

/**
 * TanStack Query defaults.
 *
 * staleTime is set per-query at the call site using STALE_TIMES (from
 * state-management.md §1). The global default is a small positive value;
 * seats/holds queries override to 0 because a stale read there could cause
 * an incorrect user action (§5).
 *
 * Auto-retry here is disabled — retry policy lives in apiClient (the retry
 * table in state-management.md is method/path-specific and cannot be
 * expressed as a single Query-level number). We only let Query retry safe
 * network/timeout GET failures a limited number of times as a backstop,
 * and never retry 4xx.
 */
export const STALE_TIMES = {
  eventList: 60_000,
  eventDetail: 30_000,
  seats: 0,
  hold: 0,
  search: 30_000,
  autocomplete: 120_000,
  orders: 30_000,
  tickets: 30_000,
  wallet: 15_000,
  resale: 15_000,
  notifications: 30_000,
  ops: 15_000,
  leaderboard: 30_000,
} as const;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true, // ops dashboards opt out per-query
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          // apiClient already applied the method/path retry table; here we
          // only guard against Query re-retrying 4xx. Allow a single extra
          // backstop attempt for transient server/network errors.
          if (error instanceof ApiError) {
            const transient =
              error.kind === 'server' || error.kind === 'timeout' || error.kind === 'network';
            return transient && failureCount < 1;
          }
          return false;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
