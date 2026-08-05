import { describe, expect, it } from 'vitest';

import { buildLocationDiscoveryPath, isCanonicalProvinceSlug } from '../locationDiscovery';
import type { LocationNode } from '@/types/location';

const location = (overrides: Partial<LocationNode>): LocationNode => ({
  id: 'city:12',
  canonicalLocationId: 'city:12',
  slug: 'johannesburg',
  name: 'Johannesburg',
  type: 'city',
  provinceSlug: 'gauteng',
  ...overrides,
});

describe('buildLocationDiscoveryPath', () => {
  it('builds a neutral province destination', () => {
    expect(
      buildLocationDiscoveryPath(
        location({
          id: 'province:1',
          canonicalLocationId: 'province:1',
          slug: 'gauteng',
          name: 'Gauteng',
          type: 'province',
          provinceSlug: undefined,
          citySlug: undefined,
        }),
      ),
    ).toBe('/gauteng');
  });

  it('builds neutral city and suburb destinations with hierarchy', () => {
    expect(buildLocationDiscoveryPath(location({}))).toBe('/gauteng/johannesburg');
    expect(
      buildLocationDiscoveryPath(
        location({
          id: 'suburb:34',
          canonicalLocationId: 'suburb:34',
          slug: 'sandton',
          name: 'Sandton',
          type: 'suburb',
          citySlug: 'johannesburg',
        }),
      ),
    ).toBe('/gauteng/johannesburg/sandton');
  });

  it('does not invent a hierarchy for an incomplete location', () => {
    expect(
      buildLocationDiscoveryPath(
        location({ type: 'suburb', citySlug: undefined, provinceSlug: undefined }),
      ),
    ).toBeUndefined();
    expect(buildLocationDiscoveryPath(location({ type: 'area' }))).toBeUndefined();
  });

  it('rejects an unresolved typed identity instead of creating a geography URL', () => {
    expect(
      buildLocationDiscoveryPath(
        location({ id: 'google-place-123', canonicalLocationId: undefined }),
      ),
    ).toBeUndefined();
  });
});

describe('neutral route province guard', () => {
  it.each(['gauteng', 'western-cape', 'kwazulu-natal'])(
    'accepts canonical province slug %s',
    slug => {
      expect(isCanonicalProvinceSlug(slug)).toBe(true);
    },
  );

  it.each(['agents', 'admin', 'developments', 'not-a-province'])(
    'rejects reserved or unknown first segments: %s',
    slug => {
      expect(isCanonicalProvinceSlug(slug)).toBe(false);
    },
  );
});
