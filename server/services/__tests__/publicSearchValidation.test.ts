import { describe, expect, it } from 'vitest';
import { validatePublicSearchInput } from '../../../shared/publicSearchValidation';

const PLACE_ID = 'pl-place-01-000000000000000000000001';

describe('public search canonical Place boundary', () => {
  it('accepts one admitted Place identity for Buy and Rent', () => {
    expect(validatePublicSearchInput({ canonicalPlaceId: PLACE_ID, listingType: 'sale' })).toBeUndefined();
    expect(validatePublicSearchInput({ canonicalPlaceId: PLACE_ID, listingType: 'rent' })).toBeUndefined();
  });

  it('rejects malformed canonical Place IDs', () => {
    expect(validatePublicSearchInput({ canonicalPlaceId: 'suburb:34' })).toMatchObject({
      path: 'canonicalPlaceId',
    });
  });

  it.each([
    ['city', { city: 'Johannesburg' }],
    ['locationId', { locationId: '34' }],
    ['locationIds', { locationIds: [PLACE_ID] }],
    ['canonicalPlaceIds', { canonicalPlaceIds: [PLACE_ID, PLACE_ID] }],
    ['searchAreaId', { searchAreaId: 'johannesburg-sandton' }],
  ])('rejects retired geography field %s', (path, geography) => {
    expect(validatePublicSearchInput(geography as never)).toMatchObject({ path });
  });
});
