import { describe, expect, it } from 'vitest';
import { landPublicSearchInput } from '../landPublicRouter';

describe('Land public-search router geography boundary', () => {
  it.each([
    { searchAreaId: 'johannesburg-sandton', locationId: 'suburb:34' },
    { searchAreaId: 'johannesburg-sandton', city: 'Johannesburg', province: 'Gauteng' },
    { locationId: 'city:12', city: 'Johannesburg' },
    { locationIds: ['suburb:34'] },
  ])('rejects a request that has ambiguous geography authority: %o', input => {
    expect(landPublicSearchInput.safeParse(input).success).toBe(false);
  });

  it.each([
    { locationId: 'suburb:34' },
    { locationIds: ['suburb:34', 'suburb:35'] },
    { searchAreaId: 'johannesburg-sandton' },
    { city: 'Johannesburg', province: 'Gauteng' },
  ])('accepts one exact geography authority: %o', input => {
    expect(landPublicSearchInput.safeParse(input).success).toBe(true);
  });
});
