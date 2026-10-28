import { describe, expect, it } from 'vitest';
import { validateLandSearchGeography } from '../../shared/landSearchGeography';

const PLACE_A = 'pl-place-01-000000000000000000000001';
const PLACE_B = 'pl-place-01-000000000000000000000002';

describe('Land public-search geography authority', () => {
  it.each([
    { canonicalPlaceId: PLACE_A, canonicalPlaceIds: [PLACE_A, PLACE_B] },
  ])('rejects conflicting geography authorities: %o', input => {
    expect(validateLandSearchGeography(input)).toBeDefined();
  });

  it.each([
    { canonicalPlaceId: PLACE_A },
    { canonicalPlaceIds: [PLACE_A, PLACE_B] },
  ])('allows one canonical geography authority: %o', input => {
    expect(validateLandSearchGeography(input)).toBeUndefined();
  });

  it('rejects invalid, duplicate, and one-item multi-Place values', () => {
    expect(validateLandSearchGeography({ canonicalPlaceId: 'city:12' })?.path).toBe(
      'canonicalPlaceId',
    );
    expect(validateLandSearchGeography({ canonicalPlaceIds: [PLACE_A] })?.path).toBe(
      'canonicalPlaceIds',
    );
    expect(validateLandSearchGeography({ canonicalPlaceIds: [PLACE_A, PLACE_A] })?.path).toBe(
      'canonicalPlaceIds',
    );
  });

  it('requires an exact Place or approved Search Area instead of an empty scope', () => {
    expect(validateLandSearchGeography({})?.path).toBe('canonicalPlaceId');
  });
});
