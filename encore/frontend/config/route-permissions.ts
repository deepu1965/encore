import type { Role } from '@/types';

/**
 * Route → allowed-roles map, consumed by middleware.ts (RBAC gate) and the
 * usePermission hook. This is a UX optimization (no flash of protected
 * content); the backend re-checks authorization on every request.
 *
 * Prefix matching: the longest matching prefix wins. A route not listed is
 * public. `null` allowedRoles means "any authenticated user".
 */
export interface RoutePermission {
  prefix: string;
  allowedRoles: Role[] | null; // null = any authenticated user
}

// Ordered longest-prefix-first at lookup time.
export const routePermissions: RoutePermission[] = [
  // Operations — ADMIN today; OPERATIONS aliased to ADMIN (gap G-11) until
  // the backend adds a real OPERATIONS role.
  { prefix: '/ops', allowedRoles: ['OPERATIONS', 'ADMIN'] },

  // Organizer console
  { prefix: '/organizer', allowedRoles: ['ORGANIZER', 'ADMIN'] },

  // Authenticated customer areas
  { prefix: '/checkout', allowedRoles: null },
  { prefix: '/orders', allowedRoles: null },
  { prefix: '/tickets', allowedRoles: null },
  { prefix: '/wallet', allowedRoles: null },
  { prefix: '/resale', allowedRoles: null },
  { prefix: '/notifications', allowedRoles: null },
  { prefix: '/profile', allowedRoles: null },
  { prefix: '/settings', allowedRoles: null },
];

/** Public routes need no session; everything else needs at least auth. */
export const PUBLIC_PREFIXES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/unauthorized',
  '/forbidden',
  '/explore',
  '/search',
  '/near-me',
  '/leaderboard',
  '/venues',
  '/events',
  '/onboarding',
  '/', // home
];

export function matchRoutePermission(pathname: string): RoutePermission | null {
  const sorted = [...routePermissions].sort((a, b) => b.prefix.length - a.prefix.length);
  return sorted.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`)) ?? null;
}

export function isPublicRoute(pathname: string): boolean {
  if (matchRoutePermission(pathname)) return false;
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || (p !== '/' && pathname.startsWith(`${p}/`)),
  );
}
