import { describe, expect, it } from 'vitest';
import { canAddCanonicalLocation, reconstructCanonicalLocations } from '../ListingNavbar';
import { buildPropertySearchUrl } from '@/lib/heroJourneySearch';
import { generateIntentUrl, resolveSearchIntent } from '@/lib/searchIntent';

const selectedServerLocations = [
  {
    canonicalLocationId: 'suburb:35',
    name: 'Rosebank',
    slug: 'rosebank',
    type: 'suburb' as const,
    parentCanonicalLocationId: 'city:12',
  },
  {
    canonicalLocationId: 'suburb:34',
    name: 'Sandton',
    slug: 'sandton',
    type: 'suburb' as const,
    parentCanonicalLocationId: 'city:12',
  },
];

const siblingCandidate = {
  id: 'suburb:36',
  canonicalLocationId: 'suburb:36',
  name: 'Bryanston',
  slug: 'bryanston',
  type: 'suburb' as const,
  provinceSlug: 'gauteng',
  citySlug: 'johannesburg',
  parentCanonicalLocationId: 'city:12',
};

describe('ListingNavbar multi-location reconstruction', () => {
  it('retains canonical parent context after URL round-trip for a valid sibling', () => {
    const initial = resolveSearchIntent(
      '/property-for-sale',
      {},
      new URLSearchParams('locationIds=suburb%3A35&locationIds=suburb%3A34'),
    );
    const canonicalUrl = generateIntentUrl(initial);
    const roundTripped = resolveSearchIntent(
      new URL(canonicalUrl, 'https://listify.test').pathname,
      {},
      new URL(canonicalUrl, 'https://listify.test').searchParams,
    );

    const reconstructed = reconstructCanonicalLocations(selectedServerLocations);

    expect(roundTripped.geography.locationIds).toEqual(['suburb:34', 'suburb:35']);
    expect(reconstructed.map(location => location.canonicalLocationId)).toEqual([
      'suburb:34',
      'suburb:35',
    ]);
    expect(reconstructed.every(location => location.parentCanonicalLocationId === 'city:12')).toBe(
      true,
    );
    expect(canAddCanonicalLocation(reconstructed, siblingCandidate)).toBe(true);
  });

  it('rejects an incompatible sibling after round-trip without widening the selection', () => {
    const reconstructed = reconstructCanonicalLocations(selectedServerLocations);
    const incompatibleCandidate = {
      ...siblingCandidate,
      id: 'suburb:99',
      canonicalLocationId: 'suburb:99',
      name: 'Pretoria East',
      slug: 'pretoria-east',
      parentCanonicalLocationId: 'city:13',
    };

    expect(canAddCanonicalLocation(reconstructed, incompatibleCandidate)).toBe(false);
    expect(reconstructed.map(location => location.canonicalLocationId)).toEqual([
      'suburb:34',
      'suburb:35',
    ]);
  });

  it('downshifts from two locations to one canonical location when one is removed', () => {
    const remaining = reconstructCanonicalLocations(selectedServerLocations).filter(
      location => location.canonicalLocationId !== 'suburb:35',
    );
    const url = buildPropertySearchUrl({
      transactionType: 'for-sale',
      selectedLocations: remaining,
    });
    const parsed = new URL(url, 'https://listify.test');

    expect(parsed.pathname).toBe('/property-for-sale');
    expect(parsed.searchParams.get('locationId')).toBe('suburb:34');
    expect(parsed.searchParams.getAll('locationIds')).toEqual([]);
  });
});
