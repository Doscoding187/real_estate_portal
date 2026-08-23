import { describe, expect, it } from 'vitest';
import { validateLandSearchGeography } from '../../shared/landSearchGeography';

describe('Land public-search geography authority', () => {
  it.each([
    [{ searchAreaId: 'johannesburg-sandton', locationId: 'suburb:34' }],
    [{ searchAreaId: 'johannesburg-sandton', city: 'Johannesburg', province: 'Gauteng' }],
    [{ locationId: 'city:12', city: 'Johannesburg' }],
    [{ locationIds: ['suburb:34', 'suburb:35'], province: 'Gauteng' }],
    [{ locationId: 'city:12', locationIds: ['city:13', 'city:14'] }],
  ])('rejects conflicting geography authorities: %o', input => {
    expect(validateLandSearchGeography(input)).toBeDefined();
  });

  it.each([
    [{ locationId: 'suburb:34' }],
    [{ locationIds: ['suburb:34', 'suburb:35'] }],
    [{ searchAreaId: 'johannesburg-sandton' }],
    [{ city: 'Johannesburg', province: 'Gauteng' }],
  ])('allows one unambiguous geography authority: %o', input => {
    expect(validateLandSearchGeography(input)).toBeUndefined();
  });

  it('rejects invalid, duplicate, and one-item multi-location values', () => {
    expect(validateLandSearchGeography({ locationId: 'not-canonical' })?.path).toBe('locationId');
    expect(validateLandSearchGeography({ locationIds: ['suburb:34'] })?.path).toBe('locationIds');
    expect(validateLandSearchGeography({ locationIds: ['suburb:34', 'suburb:34'] })?.path).toBe(
      'locationIds',
    );
  });
});
