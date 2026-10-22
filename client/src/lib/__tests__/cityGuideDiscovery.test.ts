import { describe, expect, it } from 'vitest';
import { cityGuideChoices, exactGuidePlace, guidePlaceNode } from '../cityGuideDiscovery';
import type { CanonicalLocationDiscoveryResult } from '@shared/searchDiscovery';
const guide = { provinceSlug: 'gauteng' };
const suburb: CanonicalLocationDiscoveryResult = {
  kind: 'canonical_location',
  canonicalLocationId: 'pl-place-01-2b1c0e5d3f4a5b6c7d8e9f01',
  label: 'Emmarentia',
  factualLevel: 'suburb',
  searchScopeKind: 'locality',
  display: { typeLabel: 'Suburb' },
  provinceSlug: 'gauteng',
  citySlug: 'johannesburg',
  suburbSlug: 'emmarentia',
  canonicalPath: '/gauteng/johannesburg/emmarentia',
  source: 'canonical_geography',
};
const town: CanonicalLocationDiscoveryResult = {
  kind: 'canonical_location',
  canonicalLocationId: 'pl-place-01-3c2d1f6e4a5b6c7d8e9f012',
  label: 'Rosebank',
  factualLevel: 'city',
  factualType: 'town',
  searchScopeKind: 'metro_city',
  display: { typeLabel: 'Town', contextLabel: 'City of Johannesburg' },
  provinceSlug: 'gauteng',
  citySlug: 'rosebank',
  canonicalPath: '/gauteng/rosebank',
  source: 'canonical_geography',
};
describe('City guide place identity', () => {
  it('keeps a separate factual town out of Johannesburg suburb results', () => {
    expect(cityGuideChoices([town, suburb], guide, 'johannesburg')).toEqual([suburb]);
    expect(guidePlaceNode(town)).toMatchObject({
      type: 'city',
      canonicalLocationId: 'pl-place-01-3c2d1f6e4a5b6c7d8e9f012',
      factualType: 'town',
      slug: 'rosebank',
    });
  });
  it('keeps the published path the authority returned', () => {
    expect(guidePlaceNode(suburb).canonicalPath).toBe('/gauteng/johannesburg/emmarentia');
    expect(exactGuidePlace([town], guide, 'Rosebank')?.canonicalPath).toBe('/gauteng/rosebank');
  });
  it('rejects cross-province and mismatched canonical paths', () => {
    expect(
      cityGuideChoices(
        [
          { ...suburb, provinceSlug: 'western-cape' },
          { ...suburb, canonicalPath: '/gauteng/pretoria/emmarentia' },
        ],
        guide,
      ),
    ).toEqual([]);
  });
  it('does not choose between ambiguous exact place identities', () => {
    expect(
      exactGuidePlace(
        [suburb, { ...suburb, canonicalLocationId: 'pl-place-01-4d3e2a7f5b6c7d8e9f0123' }],
        guide,
        'Emmarentia',
      ),
    ).toBeUndefined();
    expect(exactGuidePlace([suburb, suburb], guide, 'Emmarentia')).toEqual(suburb);
  });
});
