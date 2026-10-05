import { describe, expect, it } from 'vitest';

import { camelizeKeys } from '@/lib/api-client';

describe('camelizeKeys', () => {
  it('converts snake_case keys to camelCase recursively', () => {
    const input = {
      event_id: 'e1',
      held_by_user_id: 'u1',
      nested_object: { seat_number: '14B', price_cents: 1500 },
      list_items: [{ order_id: 'o1' }, { order_id: 'o2' }],
    };
    expect(camelizeKeys(input)).toEqual({
      eventId: 'e1',
      heldByUserId: 'u1',
      nestedObject: { seatNumber: '14B', priceCents: 1500 },
      listItems: [{ orderId: 'o1' }, { orderId: 'o2' }],
    });
  });

  it('leaves primitives and null untouched', () => {
    expect(camelizeKeys(42)).toBe(42);
    expect(camelizeKeys('a_b')).toBe('a_b');
    expect(camelizeKeys(null)).toBeNull();
  });
});
