import { describe, expect, it } from 'vitest';
import { validatePublicSearchInput } from '../publicSearchValidation';

const PLACE_ID = 'pl-place-01-000000000000000000000001';

describe('public Buy/Rent search geography validation', () => {
  it('accepts one valid canonical Place identity', () => {
    expect(
      validatePublicSearchInput({
        canonicalPlaceId: PLACE_ID,
        listingType: 'rent',
      }),
    ).toBeUndefined();
  });

  it('rejects malformed canonical Place identities', () => {
    expect(validatePublicSearchInput({ canonicalPlaceId: 'city:12' })).toMatchObject({
      path: 'canonicalPlaceId',
    });
  });

  it.each([
    ['city', { city: 'Johannesburg' }],
    ['province', { province: 'Gauteng' }],
    ['locationId', { locationId: '12' }],
    ['locationIds', { locationIds: [PLACE_ID, 'pl-place-01-000000000000000000000002'] }],
    ['searchAreaId', { searchAreaId: 'johannesburg-sandton' }],
  ])('rejects retired geography input %s', (path, geography) => {
    expect(validatePublicSearchInput(geography as never)).toMatchObject({ path });
  });

  describe('canonicalPlaceIds (multi-area)', () => {
    const idAt = (index: number) => `pl-place-01-${String(index).padStart(24, '0')}`;
    const ids = (count: number) => Array.from({ length: count }, (_, index) => idAt(index + 1));

    it('accepts 1 to 10 distinct valid Places', () => {
      expect(validatePublicSearchInput({ canonicalPlaceIds: ids(1) })).toBeUndefined();
      expect(validatePublicSearchInput({ canonicalPlaceIds: ids(10) })).toBeUndefined();
    });

    it('rejects an empty list, more than 10, duplicates and malformed ids', () => {
      for (const canonicalPlaceIds of [[], ids(11), [idAt(1), idAt(1)], [idAt(1), 'city:12']]) {
        expect(validatePublicSearchInput({ canonicalPlaceIds })).toMatchObject({
          path: 'canonicalPlaceIds',
        });
      }
    });

    it('is exclusive with the single canonicalPlaceId', () => {
      expect(
        validatePublicSearchInput({ canonicalPlaceId: PLACE_ID, canonicalPlaceIds: ids(2) }),
      ).toMatchObject({ path: 'canonicalPlaceIds' });
    });
  });

  it('rejects unsupported runtime journeys instead of normalizing them to Rent', () => {
    for (const listingType of ['shared_living', 'developments', 'plot_land', 'commercial']) {
      expect(validatePublicSearchInput({ listingType: listingType as never })).toMatchObject({
        path: 'listingType',
      });
    }
  });

  it('accepts only canonical residential rental property types', () => {
    for (const propertyType of ['apartment', 'house', 'townhouse', 'cluster_home', 'farm']) {
      expect(validatePublicSearchInput({ listingType: 'rent', propertyType })).toBeUndefined();
    }

    for (const propertyType of ['villa', 'plot', 'commercial', 'shared_living']) {
      expect(validatePublicSearchInput({ listingType: 'rent', propertyType })).toMatchObject({
        path: 'propertyType',
      });
    }
  });

  it('rejects commercial from the generic Buy journey so Commercial stays on its dedicated authority', () => {
    expect(
      validatePublicSearchInput({ listingType: 'sale', propertyType: 'commercial' }),
    ).toMatchObject({ path: 'propertyType' });
  });

  it('rejects inverted bedroom and bathroom ranges', () => {
    expect(
      validatePublicSearchInput({
        listingType: 'rent',
        minBedrooms: 4,
        maxBedrooms: 2,
      }),
    ).toMatchObject({ path: 'minBedrooms' });

    expect(
      validatePublicSearchInput({
        listingType: 'rent',
        minBathrooms: 3,
        maxBathrooms: 1,
      }),
    ).toMatchObject({ path: 'minBathrooms' });
  });

  it('accepts coherent bedroom and bathroom ranges', () => {
    expect(
      validatePublicSearchInput({
        listingType: 'rent',
        minBedrooms: 2,
        maxBedrooms: 4,
        minBathrooms: 1,
        maxBathrooms: 2,
      }),
    ).toBeUndefined();
  });
});
