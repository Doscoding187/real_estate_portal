import { describe, expect, it } from 'vitest';
import {
  buildCanonicalLocationQueryBoundary,
  combineSearchAreaQueryBoundaries,
} from '../searchAreaQueryBoundary';
import type { ResolvedLocation } from '../locationResolverService';

function suburb(id: number, name: string, cityId = 12): ResolvedLocation {
  return {
    level: 'suburb',
    province: { id: 1, name: 'Gauteng', slug: 'gauteng', code: 'GP' },
    city: {
      id: cityId,
      name: cityId === 12 ? 'Johannesburg' : 'Cape Town',
      slug: cityId === 12 ? 'johannesburg' : 'cape-town',
      provinceId: cityId === 12 ? 1 : 2,
    },
    suburb: { id, name, slug: name.toLowerCase().replace(/\s+/g, '-'), cityId },
    confidence: 'exact',
    fallbackLevel: 'none',
    originalIntent: name,
  };
}

describe('multi-location server query boundary', () => {
  it('builds one deterministic canonical sibling boundary for OR queries', () => {
    const boundary = buildCanonicalLocationQueryBoundary(
      [suburb(35, 'Rosebank'), suburb(34, 'Sandton')],
      ['suburb:35', 'suburb:34'],
    );

    expect(boundary).toMatchObject({
      kind: 'canonical_locations',
      level: 'suburb',
      parentCanonicalLocationId: 'city:12',
      members: [
        expect.objectContaining({ canonicalLocationId: 'suburb:34' }),
        expect.objectContaining({ canonicalLocationId: 'suburb:35' }),
      ],
    });
    expect(boundary?.authorityKey).toContain('suburb:34,suburb:35');
  });

  it('fails closed for mixed-parent canonical locations', () => {
    expect(
      buildCanonicalLocationQueryBoundary(
        [suburb(34, 'Sandton'), suburb(99, 'Sea Point', 99)],
        ['suburb:34', 'suburb:99'],
      ),
    ).toBeNull();
  });

  it('deduplicates overlapping server-owned Search Area members without duplicating OR rows', () => {
    const first = {
      kind: 'canonical_members' as const,
      authorityKey: 'search-area:first:v1',
      parentCanonicalLocationId: 'city:12',
      parentCityId: 12,
      parentCityName: 'Johannesburg',
      memberCanonicalLocationIds: ['suburb:34', 'suburb:35'],
      memberSuburbIds: [34, 35],
      memberSuburbNames: ['Sandton', 'Rosebank'],
    };
    const second = {
      ...first,
      authorityKey: 'search-area:second:v1',
      memberCanonicalLocationIds: ['suburb:35', 'suburb:36'],
      memberSuburbIds: [35, 36],
      memberSuburbNames: ['Rosebank', 'Bryanston'],
    };

    expect(combineSearchAreaQueryBoundaries([first, second])).toMatchObject({
      kind: 'canonical_members',
      memberCanonicalLocationIds: ['suburb:34', 'suburb:35', 'suburb:36'],
      memberSuburbIds: [34, 35, 36],
      memberSuburbNames: ['Sandton', 'Rosebank', 'Bryanston'],
    });
  });
});
