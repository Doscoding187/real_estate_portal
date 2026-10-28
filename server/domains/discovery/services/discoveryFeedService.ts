import type {
  DiscoveryFeedItem,
  DiscoveryFeedResponse,
  DiscoveryQuery,
} from '../../../../shared/discovery/contracts';
import {
  getDiscoveryFeedCache,
  setDiscoveryFeedCache,
} from '../caching/discoveryCache';
import { discoveryRankingService } from './discoveryRankingService';
import {
  discoveryFeedSource,
  type DiscoveryCandidateResult,
} from './discoveryFeedSource';

interface DiscoveryFeedContext {
  userId?: number;
}

const DEFAULT_LIMIT = 20;
const MAX_CANDIDATE_LIMIT = 60;

const DISCOVERY_CATEGORY_MAP: Partial<Record<NonNullable<DiscoveryQuery['category']>, string>> = {
  property: 'property',
  service: 'services',
};

function mapCategory(query: DiscoveryQuery): string | undefined {
  if (!query.category) return undefined;
  return DISCOVERY_CATEGORY_MAP[query.category];
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
  if (item?.locationInsight) return 'location';
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

function toDiscoveryFeedItem(item: any): DiscoveryFeedItem | null {
  const locationName =
    item?.location && typeof item.location === 'object' && typeof item.location.name === 'string'
      ? item.location.name
      : undefined;
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
    canonicalPlaceId:
      typeof item?.canonicalPlaceId === 'string' ? item.canonicalPlaceId : undefined,
    location: locationName ? { name: locationName } : undefined,
    price: getItemPrice(item),
    engagement: {
      likes: Number(item?.likeCount ?? item?.stats?.likes ?? 0),
      saves: Number(item?.saveCount ?? item?.stats?.saves ?? 0),
      views: Number(item?.viewCount ?? item?.stats?.views ?? 0),
    },
    metadata: stripLegacyGeography(item),
  };
}

function stripLegacyGeography(item: any): Record<string, unknown> {
  const safeItem = { ...(item ?? {}) };
  delete safeItem.locationId;
  delete safeItem.locationType;
  delete safeItem.location;
  const metadata = safeItem.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return safeItem;

  const safeMetadata = { ...(metadata as Record<string, unknown>) };
  delete safeMetadata.locationId;
  delete safeMetadata.locationType;
  delete safeMetadata.location;
  return { ...safeItem, metadata: safeMetadata };
}

function normalizeDiscoveryCategory(category?: DiscoveryQuery['category']): string | undefined {
  if (!category) return undefined;
  return mapCategory({ mode: 'feed', category }) ?? category;
}

function getCandidateLimit(limit: number): number {
  return Math.min(Math.max(limit * 3, limit), MAX_CANDIDATE_LIMIT);
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

    if (query.canonicalPlaceId && item?.canonicalPlaceId !== query.canonicalPlaceId) {
      return false;
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

    if (shouldUseDiscoveryCache) {
      const cached = await getDiscoveryFeedCache<DiscoveryFeedResponse>(query, { userId });
      if (cached) {
        return cached;
      }
    }

    if (query.canonicalPlaceId) {
      const result = await discoveryFeedSource.getAreaCandidates({
        canonicalPlaceId: query.canonicalPlaceId,
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

    if (category) {
      const result = await discoveryFeedSource.getCategoryCandidates({
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

    const result = await discoveryFeedSource.getRecommendedCandidates({
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
