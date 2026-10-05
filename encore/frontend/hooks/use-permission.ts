'use client';

import { usePermission as useAuthPermission } from '@/features/auth/queries';

/**
 * Hook to check if the current user has required permissions.
 * Re-exports from the auth feature module for convenience.
 */
export function usePermission() {
  return useAuthPermission();
}
