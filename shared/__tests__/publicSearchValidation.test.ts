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
    ['canonicalPlaceIds', { canonicalPlaceIds: [PLACE_ID] }],
    ['searchAreaId', { searchAreaId: 'johannesburg-sandton' }],
  ])('rejects retired geography input %s', (path, geography) => {
    expect(validatePublicSearchInput(geography as never)).toMatchObject({ path });
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
