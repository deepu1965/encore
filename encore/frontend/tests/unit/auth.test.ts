import { describe, expect, it } from 'vitest';

import { hasAnyRole, mapBackendRole, roleSatisfies } from '@/lib/auth';

describe('role mapping (gap G-11)', () => {
  it('maps backend roles to frontend roles', () => {
    expect(mapBackendRole('BUYER')).toBe('CUSTOMER');
    expect(mapBackendRole('ORGANIZER')).toBe('ORGANIZER');
    expect(mapBackendRole('ADMIN')).toBe('ADMIN');
  });

  it('treats ADMIN as satisfying OPERATIONS (alias until real role exists)', () => {
    expect(roleSatisfies('ADMIN', 'OPERATIONS')).toBe(true);
    expect(roleSatisfies('ADMIN', 'ADMIN')).toBe(true);
    expect(roleSatisfies('CUSTOMER', 'OPERATIONS')).toBe(false);
  });

  it('checks membership against an allowed set', () => {
    expect(hasAnyRole('ADMIN', ['OPERATIONS', 'ADMIN'])).toBe(true);
    expect(hasAnyRole('CUSTOMER', ['ORGANIZER', 'ADMIN'])).toBe(false);
  });
});
