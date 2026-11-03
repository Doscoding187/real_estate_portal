import { describe, expect, it } from 'vitest';
import { buildDiscoveryFeedCacheKey } from '../discoveryCache';

describe('discoveryCache', () => {
  it('scopes keys by query context that changes feed composition', () => {
    const baseQuery = {
      mode: 'feed' as const,
      limit: 20,
      cursor: '0',
    };

    const johannesburgKey = buildDiscoveryFeedCacheKey(
      {
        ...baseQuery,
        canonicalPlaceId: 'pl-place-01-000000000000000000000001',
        category: 'property' as const,
      },
      { userId: 42 },
    );

    const capeTownKey = buildDiscoveryFeedCacheKey(
      {
        ...baseQuery,
        canonicalPlaceId: 'pl-place-01-000000000000000000000002',
        category: 'property' as const,
      },
      { userId: 42 },
    );

    const creatorScopedKey = buildDiscoveryFeedCacheKey(
      {
        ...baseQuery,
        creatorActorId: 99,
        category: 'property' as const,
      },
      { userId: 42 },
    );

    expect(johannesburgKey).not.toBe(capeTownKey);
    expect(johannesburgKey).not.toBe(creatorScopedKey);
  });
});
