'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { SessionUser } from './types';

export const sessionKeys = {
  all: ['auth', 'session'] as const,
};

/**
 * Fetch the current session user from the backend.
 * Returns null if not authenticated.
 */
export function useSession() {
  return useQuery({
    queryKey: sessionKeys.all,
    queryFn: async (): Promise<SessionUser | null> => {
      try {
        const res = await apiClient.get<{ user: any }>('/api/v1/users/me');
        if (!res?.data?.user) return null;
        const u = res.data.user;
        const backendRole = (u.role || '') as string;
        const role = backendRole === 'BUYER' ? 'CUSTOMER' : (backendRole as import('@/types').Role);
        return {
          id: u.id,
          email: u.email || '',
          displayName: u.displayName || u.display_name || u.email || '',
          role: role || 'CUSTOMER',
        };
      } catch {
        return null;
      }
    },
    staleTime: 2 * 60 * 1000,
    retry: false,
  });
}

/**
 * Hook to check if the current user has a specific permission.
 */
export function usePermission() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const hasRole = (requiredRole: import('@/types').Role): boolean => {
    if (!session) return false;
    if (session.role === requiredRole) return true;
    // ADMIN satisfies OPERATIONS (gap G-11 alias)
    if (requiredRole === 'OPERATIONS' && session.role === 'ADMIN') return true;
    return false;
  };

  const hasAnyRole = (roles: import('@/types').Role[]): boolean => {
    if (!session) return false;
    return roles.some((r) => hasRole(r));
  };

  const clearSession = () => {
    queryClient.setQueryData(sessionKeys.all, null);
    queryClient.removeQueries({ queryKey: sessionKeys.all });
  };

  return {
    session,
    isAuthenticated: !!session,
    hasRole,
    hasAnyRole,
    clearSession,
  };
}
