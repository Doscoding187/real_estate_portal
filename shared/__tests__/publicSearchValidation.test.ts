import { describe, expect, it } from 'vitest';
import { validatePublicSearchInput } from '../publicSearchValidation';

describe('public Search Area request validation', () => {
  it('accepts a stable Search Area with an optional canonical locality refinement', () => {
    expect(
      validatePublicSearchInput({
        searchAreaId: 'johannesburg-sandton',
        locationId: 'suburb:34',
        listingType: 'rent',
      }),
    ).toBeUndefined();
  });

  it('rejects malformed Search Area identities', () => {
    expect(validatePublicSearchInput({ searchAreaId: 'Sandton/preview' })).toMatchObject({
      path: 'searchAreaId',
    });
  });

  it('rejects broad geography fields beside a Search Area', () => {
    expect(
      validatePublicSearchInput({
        searchAreaId: 'johannesburg-sandton',
        city: 'johannesburg',
      }),
    ).toMatchObject({ path: 'searchAreaId' });
  });

  it('rejects a non-locality canonical refinement', () => {
    expect(
      validatePublicSearchInput({
        searchAreaId: 'johannesburg-sandton',
        locationId: 'city:12',
      }),
    ).toMatchObject({ path: 'locationId' });
  });

  it('rejects unsupported runtime journeys instead of normalizing them to Rent', () => {
    for (const listingType of ['shared_living', 'developments', 'plot_land', 'commercial']) {
      expect(validatePublicSearchInput({ listingType: listingType as never })).toMatchObject({
        path: 'listingType',
      });
    }
  });

  it('accepts bounded canonical sibling selections for Buy and Rent', () => {
    expect(
      validatePublicSearchInput({
        locationIds: ['suburb:35', 'suburb:34'],
        listingType: 'sale',
      }),
    ).toBeUndefined();
    expect(
      validatePublicSearchInput({
        locationIds: ['city:13', 'city:12'],
        listingType: 'rent',
      }),
    ).toBeUndefined();
  });

  it('rejects mixed authority, mixed level, invalid and excessive selections', () => {
    expect(
      validatePublicSearchInput({
        locationIds: ['suburb:34', 'city:12'],
        listingType: 'sale',
      }),
    ).toMatchObject({ path: 'locationIds' });
    expect(
      validatePublicSearchInput({
        locationIds: ['suburb:34', 'not-canonical'],
        listingType: 'sale',
      }),
    ).toMatchObject({ path: 'locationIds' });
    expect(
      validatePublicSearchInput({
        locationIds: ['suburb:34', 'suburb:35'],
        searchAreaIds: ['johannesburg-sandton'],
        listingType: 'sale',
      }),
    ).toMatchObject({ path: 'locationIds' });
    expect(
      validatePublicSearchInput({
        locationIds: Array.from({ length: 11 }, (_, index) => `suburb:${index + 1}`),
        listingType: 'sale',
      }),
    ).toMatchObject({ path: 'locationIds' });
  });

  it('rejects mixed geography fields instead of silently widening the OR', () => {
    expect(
      validatePublicSearchInput({
        locationIds: ['suburb:34', 'suburb:35'],
        city: 'johannesburg',
        listingType: 'rent',
      }),
    ).toMatchObject({ path: 'locationIds' });
  });
});
