import type { BackendRole, Role } from '@/types';

/**
 * Role mapping layer (Phase 0 gap G-11).
 *
 * The V1 backend has only three roles (BUYER | ORGANIZER | ADMIN). The
 * V1.5 frontend reasons in terms of five. This is the single place the two
 * spaces are reconciled:
 *   BUYER     -> CUSTOMER
 *   ORGANIZER -> ORGANIZER
 *   ADMIN     -> ADMIN  (also grants OPERATIONS surfaces until the backend
 *                        introduces a real OPERATIONS role)
 * SUPPORT has no backend identity and is unreachable (gap G-7).
 */
export function mapBackendRole(role: BackendRole): Role {
  switch (role) {
    case 'BUYER':
      return 'CUSTOMER';
    case 'ORGANIZER':
      return 'ORGANIZER';
    case 'ADMIN':
      return 'ADMIN';
  }
}

/**
 * Whether an effective frontend role satisfies a required role. ADMIN
 * satisfies OPERATIONS (G-11 alias). Otherwise it's an exact match.
 */
export function roleSatisfies(effective: Role, required: Role): boolean {
  if (effective === required) return true;
  if (required === 'OPERATIONS' && effective === 'ADMIN') return true;
  return false;
}

export function hasAnyRole(effective: Role, allowed: Role[]): boolean {
  return allowed.some((r) => roleSatisfies(effective, r));
}

export const SESSION_COOKIE = 'encore_session';
