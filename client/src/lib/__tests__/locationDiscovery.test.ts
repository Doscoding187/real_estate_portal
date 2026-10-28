import { describe, expect, it } from 'vitest';

import { buildLocationDiscoveryPath, hasCanonicalPlaceIdentity } from '../locationDiscovery';
import type { LocationNode } from '@/types/location';

const location = (overrides: Partial<LocationNode>): LocationNode => ({
  canonicalPlaceId: 'pl-place-01-21f154cd5d0954c29ec7525f',
  slug: 'johannesburg',
  name: 'Johannesburg',
  type: 'city',
  provinceSlug: 'gauteng',
  canonicalPath: '/gauteng/johannesburg',
  ...overrides,
});

describe('buildLocationDiscoveryPath', () => {
  it('uses the exact canonical path supplied with a Place identity', () => {
    expect(
      buildLocationDiscoveryPath(
        location({
          canonicalPlaceId: 'pl-place-01-2bfd89dfb3b792235d492939',
          slug: 'hiltonia',
          name: 'Hiltonia',
          type: 'suburb',
          canonicalPath: '/gauteng/city-of-johannesburg/hiltonia',
        }),
      ),
    ).toBe('/gauteng/city-of-johannesburg/hiltonia');
  });

  it('does not rebuild paths from slugs when the canonical route is absent', () => {
    expect(buildLocationDiscoveryPath(location({ canonicalPath: undefined }))).toBeUndefined();
    expect(
      buildLocationDiscoveryPath(
        location({ canonicalPath: 'https://example.test/gauteng/johannesburg' }),
      ),
    ).toBeUndefined();
  });

  it('rejects malformed Place IDs and objects that offer only a generic id', () => {
    expect(hasCanonicalPlaceIdentity(location({ canonicalPlaceId: 'city:12' }))).toBe(false);
    expect(hasCanonicalPlaceIdentity(location({ canonicalPlaceId: undefined }))).toBe(false);
    expect(
      hasCanonicalPlaceIdentity({ id: 'pl-place-01-21f154cd5d0954c29ec7525f' } as unknown as LocationNode),
    ).toBe(false);
  });
});
