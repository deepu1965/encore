import { describe, expect, it } from 'vitest';

import { isPublicRoute, matchRoutePermission } from '@/config/route-permissions';

describe('route permissions', () => {
  it('gates ops routes to OPERATIONS/ADMIN', () => {
    const perm = matchRoutePermission('/ops/kafka');
    expect(perm?.allowedRoles).toEqual(['OPERATIONS', 'ADMIN']);
  });

  it('gates organizer routes to ORGANIZER/ADMIN', () => {
    const perm = matchRoutePermission('/organizer/events');
    expect(perm?.allowedRoles).toEqual(['ORGANIZER', 'ADMIN']);
  });

  it('treats public discovery routes as public', () => {
    expect(isPublicRoute('/')).toBe(true);
    expect(isPublicRoute('/events/evt_1')).toBe(true);
    expect(isPublicRoute('/search')).toBe(true);
  });

  it('treats authenticated customer areas as non-public', () => {
    expect(isPublicRoute('/wallet')).toBe(false);
    expect(isPublicRoute('/checkout')).toBe(false);
  });
});
