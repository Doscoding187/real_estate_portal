import type {
  DiscoveryFeedItem,
  DiscoveryFeedResponse,
  DiscoveryQuery,
} from '../../../../shared/discovery/contracts';
import { getDb } from '../../../db';
import { locations } from '../../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import {
  getDiscoveryFeedCache,
  setDiscoveryFeedCache,
} from '../caching/discoveryCache';
import { discoveryRankingService } from './discoveryRankingService';
import {
  discoveryLegacyFeedSource,
  type DiscoveryCandidateResult,
} from './discoveryLegacyFeedSource';

interface DiscoveryFeedContext {
  userId?: number;
}

const DEFAULT_LIMIT = 20;
const MAX_CANDIDATE_LIMIT = 60;

const LEGACY_CATEGORY_MAP: Partial<Record<NonNullable<DiscoveryQuery['category']>, string>> = {
  property: 'property',
  service: 'services',
};

function mapCategory(query: DiscoveryQuery): string | undefined {
  if (!query.category) return undefined;
  return LEGACY_CATEGORY_MAP[query.category];
}

function getItemPrice(item: any): number | undefined {
  const price =
    item?.property?.price ??
    item?.price ??
    item?.priceMin ??
    item?.listing?.price;

  return typeof price === 'number' && Number.isFinite(price) ? price : undefined;
}

function inferDiscoveryItemType(item: any): DiscoveryFeedItem['type'] {
  const contentType = getItemContentType(item);
  const category = getItemCategory(item);

  if (contentType === 'short' || contentType === 'walkthrough' || contentType === 'showcase') {
    return 'video';
  }

  if (item?.development || item?.developmentId) return 'development';
  if (item?.locationInsight || item?.locationType === 'suburb') return 'location';
  if (category === 'finance' || category === 'investment') return 'insight';
  if (item?.service || category === 'services') return 'service';
  return 'property';
}

function getItemContentType(item: any): string | undefined {
  const value = item?.contentType;
  return typeof value === 'string' ? value.toLowerCase() : undefined;
}

function getItemCategory(item: any): string | undefined {
  const value = item?.category;
  return typeof value === 'string' ? value.toLowerCase() : undefined;
}

function getItemCreatorActorId(item: any): number | undefined {
  const value =
    item?.actorId ??
    item?.creatorActorId ??
    item?.actor?.id ??
    item?.metadata?.actor?.id ??
    item?.metadata?.creatorActorId;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function getItemLocationIdentity(item: any): { type?: string; id?: number } {
  const rawLocation =
    (item?.location && typeof item.location === 'object' ? item.location : undefined) ??
    (item?.metadata?.location && typeof item.metadata.location === 'object'
      ? item.metadata.location
      : undefined);

  const typeValue = rawLocation?.type ?? item?.locationType ?? item?.metadata?.locationType;
  const idValue = rawLocation?.id ?? item?.locationId ?? item?.metadata?.locationId;
  const parsedId = Number(idValue);

  return {
    type: typeof typeValue === 'string' ? typeValue.toLowerCase() : undefined,
    id: Number.isFinite(parsedId) && parsedId > 0 ? parsedId : undefined,
  };
}

function toDiscoveryFeedItem(item: any): DiscoveryFeedItem | null {
  const suburb = item?.location?.suburb;
  const city = item?.location?.city;
  const province = item?.location?.province;
  const locationName = [suburb, city].filter(Boolean).join(', ') || city || province || item?.location;
  const coverUrl =
    item?.thumbnailUrl ||
    item?.primaryMediaUrl ||
    item?.media?.[0]?.thumbnailUrl ||
    item?.media?.[0]?.url ||
    '';
  const videoUrl =
    item?.videoUrl || item?.media?.find?.((media: any) => media?.type === 'video')?.url;

  if (!coverUrl) return null;

  return {
    id: String(item?.id ?? ''),
    type: inferDiscoveryItemType(item),
    title: item?.title,
    description: item?.description ?? item?.caption,
    media: {
      coverUrl,
      videoUrl: typeof videoUrl === 'string' ? videoUrl : undefined,
    },
    location: locationName
      ? {
          name: locationName,
          province: province || undefined,
        }
      : undefined,
    price: getItemPrice(item),
    engagement: {
      likes: Number(item?.likeCount ?? item?.stats?.likes ?? 0),
      saves: Number(item?.saveCount ?? item?.stats?.saves ?? 0),
      views: Number(item?.viewCount ?? item?.stats?.views ?? 0),
    },
    metadata: item,
  };
}

function normalizeDiscoveryCategory(category?: DiscoveryQuery['category']): string | undefined {
  if (!category) return undefined;
  return mapCategory({ mode: 'feed', category }) ?? category;
}

function getCandidateLimit(limit: number): number {
  return Math.min(Math.max(limit * 3, limit), MAX_CANDIDATE_LIMIT);
}

async function resolveLocationLabel(query: DiscoveryQuery): Promise<string | undefined> {
  if (!query.location?.id) return undefined;

  const db = await getDb();
  const [location] = await db
    .select({
      id: locations.id,
      name: locations.name,
      type: locations.type,
    })
    .from(locations)
    .where(eq(locations.id, query.location.id))
    .limit(1);

  if (!location?.name) return undefined;

  const normalizedType = String(location.type || '').toLowerCase();
  if (query.location.type && normalizedType && normalizedType !== query.location.type) {
    return undefined;
  }

  return String(location.name);
}

function finalizeResult(
  result: DiscoveryCandidateResult,
  query: DiscoveryQuery,
  limit: number,
  offset: number,
  context: DiscoveryFeedContext,
): DiscoveryFeedResponse {
  const rankedItems = discoveryRankingService.rankItems(result.items, query, context);
  const pagedItems = rankedItems.slice(0, limit);
  const hasMore = rankedItems.length > limit || result.hasMore;
  const discoveryItems = pagedItems
    .map(toDiscoveryFeedItem)
    .filter((item): item is DiscoveryFeedItem => Boolean(item?.id));

  return {
    items: discoveryItems,
    hasMore,
    offset: offset + discoveryItems.length,
    metadata: {
      ...result.metadata,
      discoveryQuery: query,
      discoveryCandidateCount: rankedItems.length,
      discoveryCacheScoped: true,
      feedType: result.feedType,
    },
  };
}

function applyQueryFilters(
  result: DiscoveryCandidateResult,
  query: DiscoveryQuery,
): DiscoveryCandidateResult {
  const normalizedCategory = normalizeDiscoveryCategory(query.category);
  const minPrice = query.priceRange?.min;
  const maxPrice = query.priceRange?.max;

  const items = result.items.filter(item => {
    const itemContentType = getItemContentType(item);
    const itemCategory = getItemCategory(item);
    const itemPrice = getItemPrice(item);
    const itemCreatorActorId = getItemCreatorActorId(item);
    const itemLocation = getItemLocationIdentity(item);

    if (query.contentType && query.contentType !== 'video') {
      return false;
    }

    if (query.contentType === 'video' && itemContentType && !['video', 'short', 'walkthrough', 'showcase'].includes(itemContentType)) {
      return false;
    }

    if (normalizedCategory && itemCategory && itemCategory !== normalizedCategory) {
      return false;
    }

    if (query.creatorActorId && itemCreatorActorId !== query.creatorActorId) {
      return false;
    }

    if (query.location?.id) {
      if (itemLocation.id && itemLocation.id !== query.location.id) {
        return false;
      }

      if (query.location.type && itemLocation.type && itemLocation.type !== query.location.type) {
        return false;
      }
    }

    if (minPrice !== undefined && (itemPrice === undefined || itemPrice < minPrice)) {
      return false;
    }

    if (maxPrice !== undefined && (itemPrice === undefined || itemPrice > maxPrice)) {
      return false;
    }

    return true;
  });

  return {
    ...result,
    items,
    shorts: items,
    hasMore: result.hasMore && items.length >= (query.limit ?? 20),
    metadata: {
      ...result.metadata,
      discoveryQuery: query,
    },
  };
}

export class DiscoveryFeedService {
  async getFeed(query: DiscoveryQuery, context: DiscoveryFeedContext = {}): Promise<DiscoveryFeedResponse> {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const offset = Number(query.cursor ?? 0) || 0;
    const userId = context.userId;
    const category = mapCategory(query);
    const candidateLimit = getCandidateLimit(limit);
    const shouldUseDiscoveryCache = process.env.NODE_ENV === 'production';
    const locationLabel = await resolveLocationLabel(query);

    if (shouldUseDiscoveryCache) {
      const cached = await getDiscoveryFeedCache<DiscoveryFeedResponse>(query, { userId });
      if (cached) {
        return cached;
      }
    }

    if (category) {
      const result = await discoveryLegacyFeedSource.getCategoryCandidates({
        category,
        limit: candidateLimit,
        offset,
      });
      const filtered = applyQueryFilters(result, query);
      const finalized = finalizeResult(filtered, query, limit, offset, context);

      if (shouldUseDiscoveryCache) {
        await setDiscoveryFeedCache(query, finalized, { userId });
      }

      return finalized;
    }

    if (locationLabel) {
      const result = await discoveryLegacyFeedSource.getAreaCandidates({
        location: locationLabel,
        limit: candidateLimit,
        offset,
      });
      const filtered = applyQueryFilters(result, query);
      const finalized = finalizeResult(
        {
          ...filtered,
          metadata: {
            ...filtered.metadata,
            resolvedLocationLabel: locationLabel,
          },
        },
        query,
        limit,
        offset,
        context,
      );

      if (shouldUseDiscoveryCache) {
        await setDiscoveryFeedCache(query, finalized, { userId });
      }

      return finalized;
    }

    // Location IDs are part of the new contract, but this worktree's explore service
    // still resolves "area" feeds from free-form location strings. If we cannot resolve
    // a canonical location label, fall back to the recommended feed.
    const result = await discoveryLegacyFeedSource.getRecommendedCandidates({
      userId,
      limit: candidateLimit,
      offset,
    });
    const filtered = applyQueryFilters(result, query);
    const finalized = finalizeResult(filtered, query, limit, offset, context);

    if (shouldUseDiscoveryCache) {
      await setDiscoveryFeedCache(query, finalized, { userId });
    }

    return finalized;
  }
}

export const discoveryFeedService = new DiscoveryFeedService();
