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
});
