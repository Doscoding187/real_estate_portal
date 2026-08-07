import { describe, expect, it } from 'vitest';
import { validatePublicSearchInput } from '../../../shared/publicSearchValidation';

describe('public multi-location validation boundary', () => {
  it('accepts explicit canonical siblings for both transactional journeys', () => {
    expect(
      validatePublicSearchInput({
        locationIds: ['suburb:34', 'suburb:35'],
        listingType: 'sale',
      }),
    ).toBeUndefined();
    expect(
      validatePublicSearchInput({
        locationIds: ['suburb:34', 'suburb:35'],
        listingType: 'rent',
      }),
    ).toBeUndefined();
  });

  it('rejects invalid, mixed-level, mixed-authority and over-limit selections', () => {
    expect(
      validatePublicSearchInput({
        locationIds: ['suburb:34', 'city:12'],
        listingType: 'sale',
      }),
    ).toMatchObject({ path: 'locationIds' });
    expect(
      validatePublicSearchInput({
        locationIds: ['suburb:34', 'google-place-id'],
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
        listingType: 'rent',
      }),
    ).toMatchObject({ path: 'locationIds' });
  });

  it('does not allow a selected OR set beside broad geography', () => {
    expect(
      validatePublicSearchInput({
        locationIds: ['suburb:34', 'suburb:35'],
        city: 'johannesburg',
        listingType: 'rent',
      }),
    ).toMatchObject({ path: 'locationIds' });
  });

  it('requires a real multi-location array while allowing duplicate selections to canonicalize', () => {
    expect(validatePublicSearchInput({ locationIds: [], listingType: 'sale' })).toMatchObject({
      path: 'locationIds',
    });
    expect(
      validatePublicSearchInput({ locationIds: ['suburb:34'], listingType: 'sale' }),
    ).toMatchObject({ path: 'locationIds' });
    expect(
      validatePublicSearchInput({
        locationIds: ['suburb:34', 'suburb:34'],
        listingType: 'sale',
      }),
    ).toBeUndefined();
  });
});
