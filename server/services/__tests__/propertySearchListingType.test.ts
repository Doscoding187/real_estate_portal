import { describe, expect, it } from 'vitest';

import { normalizePropertySearchListingType } from '../propertySearchService';

describe('property search listing type normalization', () => {
  it('maps public route and development aliases to canonical property listing types', () => {
    expect(normalizePropertySearchListingType('sale')).toBe('sale');
    expect(normalizePropertySearchListingType('for-sale')).toBe('sale');
    expect(normalizePropertySearchListingType('to-rent')).toBe('rent');
    expect(normalizePropertySearchListingType('for_rent')).toBe('rent');
    expect(normalizePropertySearchListingType('auctions')).toBe('auction');
    expect(normalizePropertySearchListingType('auction')).toBe('auction');
  });

  it('ignores unknown listing type filters instead of emitting impossible DB predicates', () => {
    expect(normalizePropertySearchListingType('development')).toBeNull();
    expect(normalizePropertySearchListingType('')).toBeNull();
    expect(normalizePropertySearchListingType(null)).toBeNull();
  });
});
