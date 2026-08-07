import { describe, expect, it } from 'vitest';
import { generateIntentUrl, resolveSearchIntent } from '@/lib/searchIntent';
import {
  buildParentRecoveryIntent,
  buildZeroResultDescription,
  clearAllOptionalSearchFilters,
  clearSearchIntentFilters,
  getExplicitParentRecoveryTarget,
  getSearchResultsDisplayState,
} from '@/lib/searchZeroResultRecovery';

describe('search zero-result recovery authority', () => {
  it('recognizes a successful zero-result Buy response', () => {
    expect(
      getSearchResultsDisplayState({
        isLoading: false,
        hasError: false,
        isTransactionalJourney: true,
        hasValidation: false,
        hasResponse: true,
        locationState: 'resolved',
        total: 0,
        hasRenderableResults: false,
        pageNeedsNormalization: false,
      }),
    ).toBe('zero');
  });

  it('recognizes a successful zero-result Rent response without geography', () => {
    expect(
      getSearchResultsDisplayState({
        isLoading: false,
        hasError: false,
        isTransactionalJourney: true,
        hasValidation: false,
        hasResponse: true,
        locationState: 'not_requested',
        total: 0,
        hasRenderableResults: false,
        pageNeedsNormalization: false,
      }),
    ).toBe('zero');
  });

  it('keeps loading, error, invalid, unavailable and page-normalizing states distinct', () => {
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

    expect(getSearchResultsDisplayState({ ...base, isLoading: true })).toBe('loading');
    expect(getSearchResultsDisplayState({ ...base, hasError: true })).toBe('error');
    expect(getSearchResultsDisplayState({ ...base, hasValidation: true })).toBe('invalid');
    expect(getSearchResultsDisplayState({ ...base, locationState: 'unavailable' })).toBe(
      'unavailable',
    );
    expect(getSearchResultsDisplayState({ ...base, pageNeedsNormalization: true })).toBe(
      'page-normalizing',
    );
    expect(
      getSearchResultsDisplayState({
        ...base,
        total: 4,
        hasRenderableResults: true,
      }),
    ).toBe('results');
  });

  it('clears one active filter while preserving Rent, geography and resetting page', () => {
    const intent = resolveSearchIntent(
      '/property-to-rent',
      {},
      new URLSearchParams('locationId=suburb%3A34&maxPrice=12000&minBedrooms=3&page=4'),
    );
    const nextIntent = clearSearchIntentFilters(intent, ['maxPrice']);
    const nextUrl = generateIntentUrl(nextIntent);

    expect(nextUrl).toContain('/property-to-rent');
    expect(nextUrl).toContain('locationId=suburb%3A34');
    expect(nextUrl).toContain('minBedrooms=3');
    expect(nextUrl).not.toContain('maxPrice=12000');
    expect(nextUrl).not.toContain('page=4');
  });

  it('clears all optional filters without widening a multi-location scope', () => {
    const intent = resolveSearchIntent(
      '/property-for-sale',
      {},
      new URLSearchParams('locationIds=suburb%3A34&locationIds=suburb%3A35&maxPrice=12000&page=3'),
    );
    const nextUrl = generateIntentUrl(clearAllOptionalSearchFilters(intent));
    const parsed = new URL(nextUrl, 'https://listify.test');

    expect(parsed.pathname).toBe('/property-for-sale');
    expect(parsed.searchParams.getAll('locationIds')).toEqual(['suburb:34', 'suburb:35']);
    expect(parsed.searchParams.get('maxPrice')).toBeNull();
    expect(parsed.searchParams.get('page')).toBeNull();
  });

  it('creates an explicit canonical parent action without changing state before invocation', () => {
    const intent = resolveSearchIntent(
      '/property-for-sale',
      {},
      new URLSearchParams('locationId=suburb%3A34&maxPrice=12000&page=2'),
    );
    const context = {
      type: 'suburb' as const,
      hierarchy: { city: 'Johannesburg' },
      ids: { cityId: 12 },
    };
    const target = getExplicitParentRecoveryTarget(context);
    expect(target).toEqual({
      level: 'city',
      canonicalLocationId: 'city:12',
      label: 'Johannesburg',
    });

    const parentUrl = generateIntentUrl(buildParentRecoveryIntent(intent, target!));
    expect(parentUrl).toContain('locationId=city%3A12');
    expect(parentUrl).not.toContain('locationId=suburb%3A34');
    expect(parentUrl).toContain('maxPrice=12000');
    expect(parentUrl).not.toContain('page=2');
  });

  it('uses governed Search Area parent metadata without exposing membership', () => {
    const target = getExplicitParentRecoveryTarget(undefined, {
      parentCanonicalLocationId: 'city:12',
      parentLabel: 'Johannesburg',
    });
    expect(target?.canonicalLocationId).toBe('city:12');
    expect(target?.label).toBe('Johannesburg');
  });

  it('does not offer an ungoverned parent action', () => {
    expect(
      getExplicitParentRecoveryTarget({
        type: 'suburb',
        hierarchy: { city: 'Johannesburg' },
        ids: {},
      }),
    ).toBeUndefined();
  });

  it('describes multi-location zero results from supplied display metadata', () => {
    expect(
      buildZeroResultDescription({
        transactionType: 'to-rent',
        locationNames: ['Rosebank', 'Sandton', 'Bryanston'],
      }),
    ).toBe('No rentals match your search in Rosebank, Sandton, and Bryanston.');
  });
});
