import type { DiscoveryQuery } from '../../../../shared/discovery/contracts';
import { exploreFeedService } from '../../../services/exploreFeedService';
import type { FeedResult } from '../../../services/exploreFeedService';

interface DiscoveryFeedContext {
  userId?: number;
}

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

function getItemContentType(item: any): string | undefined {
  const value = item?.contentType;
  return typeof value === 'string' ? value.toLowerCase() : undefined;
}

function getItemCategory(item: any): string | undefined {
  const value = item?.category;
  return typeof value === 'string' ? value.toLowerCase() : undefined;
}

function normalizeDiscoveryCategory(category?: DiscoveryQuery['category']): string | undefined {
  if (!category) return undefined;
  return mapCategory({ mode: 'feed', category }) ?? category;
}

function applyQueryFilters(result: FeedResult, query: DiscoveryQuery): FeedResult {
  const normalizedCategory = normalizeDiscoveryCategory(query.category);
  const minPrice = query.priceRange?.min;
  const maxPrice = query.priceRange?.max;

  const items = result.items.filter(item => {
    const itemContentType = getItemContentType(item);
    const itemCategory = getItemCategory(item);
    const itemPrice = getItemPrice(item);

    if (query.contentType && query.contentType !== 'video') {
      return false;
    }

    if (query.contentType === 'video' && itemContentType && !['video', 'short', 'walkthrough', 'showcase'].includes(itemContentType)) {
      return false;
    }

    if (normalizedCategory && itemCategory && itemCategory !== normalizedCategory) {
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
  async getFeed(query: DiscoveryQuery, context: DiscoveryFeedContext = {}): Promise<FeedResult> {
    const limit = query.limit ?? 20;
    const offset = Number(query.cursor ?? 0) || 0;
    const userId = context.userId;
    const category = mapCategory(query);

    if (category) {
      const result = await exploreFeedService.getCategoryFeed({
        category,
        limit,
        offset,
      });
      return applyQueryFilters(result, query);
    }

    // Location IDs are part of the new contract, but this worktree's explore service
    // still resolves "area" feeds from free-form location strings. Until the discovery
    // router owns canonical location resolution, fall back to the recommended feed.
    const result = await exploreFeedService.getRecommendedFeed({
      userId,
      limit,
      offset,
    });
    return applyQueryFilters(result, query);
  }
}

export const discoveryFeedService = new DiscoveryFeedService();
