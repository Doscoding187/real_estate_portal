import type { DiscoveryQuery } from '../../../../shared/discovery/contracts';
import { cache, CacheTTL } from '../../../lib/cache';

interface DiscoveryCacheContext {
  userId?: number;
}

type DiscoveryLocationFilter = NonNullable<DiscoveryQuery['location']>;

interface DiscoveryFeedCacheKeyParts {
  userId: number | 'guest';
  mode: DiscoveryQuery['mode'];
  intent: DiscoveryQuery['intent'] | 'any';
  locationType: DiscoveryLocationFilter['type'] | 'any';
  locationId: number | 'any';
  category: DiscoveryQuery['category'] | 'any';
  creatorActorId: number | 'any';
  contentType: DiscoveryQuery['contentType'] | 'any';
  cursor: string | 'origin';
  limit: number;
}

export function buildDiscoveryFeedCacheKey(
  query: DiscoveryQuery,
  context: DiscoveryCacheContext = {},
): string {
  const keyParts: DiscoveryFeedCacheKeyParts = {
    userId: context.userId ?? 'guest',
    mode: query.mode,
    intent: query.intent ?? 'any',
    locationType: query.location?.type ?? 'any',
    locationId: query.location?.id ?? 'any',
    category: query.category ?? 'any',
    creatorActorId: query.creatorActorId ?? 'any',
    contentType: query.contentType ?? 'any',
    cursor: query.cursor ?? 'origin',
    limit: query.limit ?? 20,
  };

  return `discovery:feed:${JSON.stringify(keyParts)}`;
}

export async function getDiscoveryFeedCache<T>(
  query: DiscoveryQuery,
  context: DiscoveryCacheContext = {},
): Promise<T | null> {
  return cache.get<T>(buildDiscoveryFeedCacheKey(query, context));
}

export async function setDiscoveryFeedCache<T>(
  query: DiscoveryQuery,
  value: T,
  context: DiscoveryCacheContext = {},
  ttlSeconds: number = CacheTTL.FEED,
): Promise<void> {
  await cache.set(buildDiscoveryFeedCacheKey(query, context), value, ttlSeconds);
}
