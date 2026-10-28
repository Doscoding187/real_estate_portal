import { describe, expect, it } from 'vitest';
import { generateIntentUrl, resolveSearchIntent } from '@/lib/searchIntent';
import {
  buildZeroResultDescription,
  clearAllOptionalSearchFilters,
  clearSearchIntentFilters,
  getSearchResultsDisplayState,
} from '@/lib/searchZeroResultRecovery';

const PLACE_ID = 'pl-place-01-000000000000000000000001';

describe('canonical search zero-result recovery', () => {
  it('distinguishes successful zero results from unavailable and invalid searches', () => {
    const base = {
      isLoading: false,
      hasError: false,
      isTransactionalJourney: true,
      hasValidation: false,
      hasResponse: true,
      locationState: 'resolved' as const,
      total: 0,
      hasRenderableResults: false,
      pageNeedsNormalization: false,
    };

    expect(getSearchResultsDisplayState(base)).toBe('zero');
    expect(getSearchResultsDisplayState({ ...base, locationState: 'unavailable' })).toBe(
      'unavailable',
    );
    expect(getSearchResultsDisplayState({ ...base, hasValidation: true })).toBe('invalid');
  });

  it('clears one optional filter while preserving the exact Place and resetting pagination', () => {
    const intent = resolveSearchIntent(
      '/property-to-rent',
      {},
      new URLSearchParams(`canonicalPlaceId=${PLACE_ID}&maxPrice=12000&minBedrooms=3&page=4`),
    );
    const nextUrl = generateIntentUrl(clearSearchIntentFilters(intent, ['maxPrice']));
    const next = new URL(nextUrl, 'https://listify.test');

    expect(next.pathname).toBe('/property-to-rent');
    expect(next.searchParams.get('canonicalPlaceId')).toBe(PLACE_ID);
    expect(next.searchParams.get('minBedrooms')).toBe('3');
    expect(next.searchParams.has('maxPrice')).toBe(false);
    expect(next.searchParams.has('page')).toBe(false);
  });

  it('clears optional filters without widening the search to country scope', () => {
    const intent = resolveSearchIntent(
      '/property-for-sale',
      {},
      new URLSearchParams(`canonicalPlaceId=${PLACE_ID}&maxPrice=12000&page=3`),
    );
    const next = new URL(
      generateIntentUrl(clearAllOptionalSearchFilters(intent)),
      'https://listify.test',
    );

    expect(next.searchParams.get('canonicalPlaceId')).toBe(PLACE_ID);
    expect(next.searchParams.has('maxPrice')).toBe(false);
    expect(next.searchParams.has('page')).toBe(false);
  });

  it('refuses to recover a retired typed-location URL into a broader search', () => {
    const intent = resolveSearchIntent(
      '/property-for-sale',
      {},
      new URLSearchParams('city=johannesburg&province=gauteng'),
    );
    const next = new URL(generateIntentUrl(intent), 'https://listify.test');

    expect(intent.validation?.code).toBe('invalid-place-authority');
    expect(next.searchParams.get('searchError')).toBe('invalid-place-authority');
    expect(next.searchParams.has('city')).toBe(false);
    expect(next.searchParams.has('canonicalPlaceId')).toBe(false);
  });

  it('uses only a resolved Place label in the zero-result message', () => {
    expect(
      buildZeroResultDescription({
        transactionType: 'to-rent',
        locationName: 'Johannesburg',
      }),
    ).toBe('No rentals match your search in Johannesburg.');
    expect(buildZeroResultDescription({ transactionType: 'for-sale' })).toBe(
      'No homes for sale match your current search.',
    );
  });
});
