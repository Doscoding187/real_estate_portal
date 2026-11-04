import { describe, expect, it } from 'vitest';
import { landPublicRouter, landPublicSearchInput } from '../landPublicRouter';

const PLACE_A = 'pl-place-01-000000000000000000000001';
const PLACE_B = 'pl-place-01-000000000000000000000002';

describe('Land public-search router geography boundary', () => {
  it.each([
    { searchAreaId: 'johannesburg-sandton', canonicalPlaceId: PLACE_A },
    { searchAreaId: 'johannesburg-sandton' },
    { canonicalPlaceId: 'city:12' },
    { canonicalPlaceIds: [PLACE_A] },
    {},
    { city: 'Johannesburg', province: 'Gauteng' },
    { locationId: 'city:12' },
  ])('rejects requests outside the canonical geography contract: %o', input => {
    expect(landPublicSearchInput.safeParse(input).success).toBe(false);
  });

  it.each([
    { canonicalPlaceId: PLACE_A },
    { canonicalPlaceIds: [PLACE_A, PLACE_B] },
  ])('accepts one canonical authority: %o', input => {
    expect(landPublicSearchInput.safeParse(input).success).toBe(true);
  });

  it('returns no Land inventory or guide data while the first-cohort flag is off', async () => {
    const caller = landPublicRouter.createCaller({
      req: { headers: {} },
      res: {},
      requestId: 'land-public-launch-guard-test',
    } as any);

    await expect(caller.search({ canonicalPlaceId: PLACE_A })).resolves.toEqual([]);
    await expect(caller.guideAreas({ canonicalPlaceId: PLACE_A })).resolves.toEqual([]);
    await expect(caller.detail({ slug: 'deferred-land-fixture' })).resolves.toBeNull();
  });
});
