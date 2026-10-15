import { describe, expect, it } from 'vitest';
import { cityGuideChoices, exactGuidePlace, guidePlaceNode } from '../cityGuideDiscovery';
import type { CanonicalLocationDiscoveryResult } from '@shared/searchDiscovery';
const guide = { provinceSlug: 'gauteng' };
const suburb: CanonicalLocationDiscoveryResult = {
  kind: 'canonical_location',
  canonicalLocationId: 'suburb:8',
  label: 'Emmarentia',
  factualLevel: 'suburb',
  searchScopeKind: 'locality',
  display: { typeLabel: 'Suburb' },
  provinceSlug: 'gauteng',
  citySlug: 'johannesburg',
  suburbSlug: 'emmarentia',
  parentCanonicalLocationId: 'city:1',
  canonicalPath: '/gauteng/johannesburg/emmarentia',
  source: 'canonical_geography',
};
const town: CanonicalLocationDiscoveryResult = {
  kind: 'canonical_location',
  canonicalLocationId: 'city:258',
  label: 'Rosebank',
  factualLevel: 'city',
  factualType: 'town',
  searchScopeKind: 'metro_city',
  display: { typeLabel: 'Town', contextLabel: 'City of Johannesburg' },
  provinceSlug: 'gauteng',
  citySlug: 'rosebank',
  parentCanonicalLocationId: 'province:3',
  canonicalPath: '/gauteng/rosebank',
  source: 'canonical_geography',
};
describe('City guide place identity', () => {
  it('keeps a separate factual town out of Johannesburg suburb results', () => {
    expect(cityGuideChoices([town, suburb], guide, 1)).toEqual([suburb]);
    expect(guidePlaceNode(town)).toMatchObject({
      type: 'city',
      canonicalLocationId: 'city:258',
      factualType: 'town',
      slug: 'rosebank',
    });
  });
  it('keeps separate place guide links on their canonical routes', () => {
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
        [suburb, { ...suburb, canonicalLocationId: 'suburb:9' }],
        guide,
        'Emmarentia',
      ),
    ).toBeUndefined();
    expect(exactGuidePlace([suburb, suburb], guide, 'Emmarentia')).toEqual(suburb);
  });
});
