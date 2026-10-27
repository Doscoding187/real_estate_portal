import { describe, expect, it } from 'vitest';
import {
  matchesCanonicalPlaceSelection,
  matchesDistributionOpportunity,
  type DistributionOpportunityCandidate,
} from '../distributionOpportunityMatching';

const JOHANNESBURG_PLACE_ID = 'pl-place-01-000000000000000000000001';
const JOHANNESBURG_LOCALITY_PLACE_ID = 'pl-place-01-000000000000000000000002';

function candidate(
  canonicalPlaceId: string | null,
): DistributionOpportunityCandidate {
  return {
    canonicalPlaceId,
    marketMode: 'sale',
    available: true,
    priceFrom: 1_000_000,
    priceTo: 1_500_000,
    unitTypes: [],
  };
}

describe('distribution opportunity Place matching', () => {
  it('matches only an exact selected Place ID', () => {
    expect(matchesCanonicalPlaceSelection(JOHANNESBURG_PLACE_ID, JOHANNESBURG_PLACE_ID)).toBe(true);
    expect(
      matchesCanonicalPlaceSelection(JOHANNESBURG_LOCALITY_PLACE_ID, JOHANNESBURG_PLACE_ID),
    ).toBe(false);
    expect(
      matchesDistributionOpportunity(candidate(JOHANNESBURG_PLACE_ID), {
        marketMode: 'sale',
        canonicalPlaceId: JOHANNESBURG_PLACE_ID,
      }),
    ).toBe(true);
    expect(
      matchesDistributionOpportunity(candidate(JOHANNESBURG_LOCALITY_PLACE_ID), {
        marketMode: 'sale',
        canonicalPlaceId: JOHANNESBURG_PLACE_ID,
      }),
    ).toBe(false);
  });

  it('fails closed for null, malformed, or mismatched assignments and selections', () => {
    expect(matchesCanonicalPlaceSelection(null, JOHANNESBURG_PLACE_ID)).toBe(false);
    expect(matchesCanonicalPlaceSelection('city:12', JOHANNESBURG_PLACE_ID)).toBe(false);
    expect(matchesCanonicalPlaceSelection(JOHANNESBURG_PLACE_ID, 'city:12')).toBe(false);
    expect(
      matchesDistributionOpportunity(candidate(null), {
        marketMode: 'sale',
        canonicalPlaceId: JOHANNESBURG_PLACE_ID,
      }),
    ).toBe(false);
    expect(
      matchesDistributionOpportunity(candidate('city:12'), {
        marketMode: 'sale',
        canonicalPlaceId: JOHANNESBURG_PLACE_ID,
      }),
    ).toBe(false);
  });

  it('does not apply a geographic filter when no Place was selected', () => {
    expect(matchesCanonicalPlaceSelection(null)).toBe(true);
    expect(matchesDistributionOpportunity(candidate(null), { marketMode: 'sale' })).toBe(true);
  });
});
