import type { DiscoveryQuery } from '../../../../shared/discovery/contracts';

interface DiscoveryRankingContext {
  userId?: number;
}

interface RankedDiscoveryItem<T> {
  item: T;
  score: number;
}

function toLower(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function toNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getRawLocation(item: any): Record<string, unknown> | undefined {
  if (item?.location && typeof item.location === 'object') return item.location;
  if (item?.metadata?.location && typeof item.metadata.location === 'object') return item.metadata.location;
  return undefined;
}

function getCreatedAt(item: any): Date | undefined {
  const value = item?.createdAt ?? item?.publishedAt ?? item?.metadata?.createdAt;
  const date = value ? new Date(value) : undefined;
  return date && !Number.isNaN(date.getTime()) ? date : undefined;
}

function getCreatorActorId(item: any): number | undefined {
  return (
    toNumber(item?.actorId) ??
    toNumber(item?.creatorActorId) ??
    toNumber(item?.actor?.id) ??
    toNumber(item?.metadata?.actor?.id) ??
    toNumber(item?.metadata?.creatorActorId)
  );
}

function getLocationIdentity(item: any): { type?: string; id?: number } {
  const location = getRawLocation(item);

  return {
    type: toLower(location?.type ?? item?.locationType ?? item?.metadata?.locationType),
    id:
      toNumber(location?.id) ??
      toNumber(item?.locationId) ??
      toNumber(item?.metadata?.locationId),
  };
}

function getItemCategory(item: any): string {
  return toLower(item?.category ?? item?.metadata?.category);
}

function getItemContentType(item: any): string {
  return toLower(item?.contentType ?? item?.metadata?.contentType);
}

function getEngagementScore(item: any): number {
  const views =
    toNumber(item?.views) ??
    toNumber(item?.viewCount) ??
    toNumber(item?.stats?.views) ??
    toNumber(item?.metadata?.stats?.views) ??
    0;
  const likes =
    toNumber(item?.likes) ??
    toNumber(item?.likeCount) ??
    toNumber(item?.stats?.likes) ??
    toNumber(item?.metadata?.stats?.likes) ??
    0;
  const saves =
    toNumber(item?.saves) ??
    toNumber(item?.saveCount) ??
    toNumber(item?.stats?.saves) ??
    toNumber(item?.metadata?.stats?.saves) ??
    0;
  const shares =
    toNumber(item?.shares) ??
    toNumber(item?.shareCount) ??
    toNumber(item?.stats?.shares) ??
    toNumber(item?.metadata?.stats?.shares) ??
    0;
  const explicitPerformance =
    toNumber(item?.performanceScore) ??
    toNumber(item?.engagementScore) ??
    toNumber(item?.metadata?.engagementScore) ??
    0;

  return Math.log10(views + likes * 4 + saves * 6 + shares * 5 + explicitPerformance + 1);
}

function getRecencyScore(item: any): number {
  const createdAt = getCreatedAt(item);
  if (!createdAt) return 0.2;

  const ageInHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  if (ageInHours <= 24) return 1;
  if (ageInHours <= 24 * 3) return 0.85;
  if (ageInHours <= 24 * 7) return 0.7;
  if (ageInHours <= 24 * 14) return 0.5;
  return 0.25;
}

function getIntentAffinity(item: any, query: DiscoveryQuery): number {
  if (!query.intent) return 0.25;

  const haystack = [
    item?.title,
    item?.description,
    item?.category,
    item?.contentType,
    item?.metadata?.category,
    item?.metadata?.contentType,
    item?.metadata?.intent,
    item?.metadata?.propertyType,
  ]
    .filter(Boolean)
    .map(value => String(value).toLowerCase())
    .join(' ');

  switch (query.intent) {
    case 'buy':
      return haystack.includes('rent') ? 0.2 : 1;
    case 'rent':
      return haystack.includes('rent') || haystack.includes('lease') ? 1 : 0.3;
    case 'invest':
      return haystack.includes('invest') || haystack.includes('yield') || haystack.includes('finance')
        ? 1
        : 0.35;
    case 'explore':
      return 0.8;
    default:
      return 0.25;
  }
}

function getQueryAffinity(item: any, query: DiscoveryQuery): number {
  let score = 0.25;
  const itemCategory = getItemCategory(item);
  const itemContentType = getItemContentType(item);
  const creatorActorId = getCreatorActorId(item);
  const itemLocation = getLocationIdentity(item);

  if (query.category) {
    score += itemCategory === query.category ? 0.45 : -0.25;
  }

  if (query.contentType === 'video') {
    score += ['video', 'short', 'walkthrough', 'showcase'].includes(itemContentType) ? 0.25 : -0.35;
  }

  if (query.creatorActorId) {
    score += creatorActorId === query.creatorActorId ? 0.6 : -0.4;
  }

  if (query.location) {
    if (itemLocation.id === query.location.id && itemLocation.type === query.location.type) {
      score += 0.5;
    } else if (itemLocation.id === query.location.id) {
      score += 0.25;
    } else {
      score -= 0.2;
    }
  }

  score += getIntentAffinity(item, query);
  return Math.max(0, score);
}

function getModeFit(item: any, query: DiscoveryQuery): number {
  const contentType = getItemContentType(item);
  const orientation = toLower(item?.orientation ?? item?.metadata?.orientation);

  if (query.mode === 'shorts') {
    if (orientation.includes('vertical') || contentType === 'short') return 1;
    if (contentType === 'walkthrough' || contentType === 'video') return 0.75;
    return 0.35;
  }

  if (query.mode === 'home') {
    if (contentType === 'walkthrough' || contentType === 'showcase') return 0.95;
    return 0.7;
  }

  return ['video', 'short', 'walkthrough', 'showcase'].includes(contentType) ? 0.9 : 0.45;
}

function applyDiversity<T>(rankedItems: Array<RankedDiscoveryItem<T & Record<string, any>>>): Array<RankedDiscoveryItem<T & Record<string, any>>> {
  const creatorCounts = new Map<number, number>();
  const categoryCounts = new Map<string, number>();

  return rankedItems.map(entry => {
    const creatorActorId = getCreatorActorId(entry.item);
    const category = getItemCategory(entry.item) || 'uncategorized';
    const creatorDupes = creatorActorId ? creatorCounts.get(creatorActorId) ?? 0 : 0;
    const categoryDupes = categoryCounts.get(category) ?? 0;
    const penalty = creatorDupes * 0.18 + categoryDupes * 0.08;

    if (creatorActorId) creatorCounts.set(creatorActorId, creatorDupes + 1);
    categoryCounts.set(category, categoryDupes + 1);

    return {
      ...entry,
      score: entry.score - penalty,
    };
  });
}

export class DiscoveryRankingService {
  rankItems<T extends Record<string, any>>(
    items: T[],
    query: DiscoveryQuery,
    _context: DiscoveryRankingContext = {},
  ): T[] {
    const ranked = items.map(item => {
      const recency = getRecencyScore(item);
      const engagement = getEngagementScore(item);
      const queryAffinity = getQueryAffinity(item, query);
      const modeFit = getModeFit(item, query);

      const score = queryAffinity * 45 + engagement * 16 + recency * 24 + modeFit * 15;

      return {
        item: {
          ...item,
          discoveryRanking: {
            score,
            queryAffinity,
            engagement,
            recency,
            modeFit,
          },
        },
        score,
      };
    });

    ranked.sort((a, b) => b.score - a.score);

    const diversified = applyDiversity(ranked);
    diversified.sort((a, b) => b.score - a.score);

    return diversified.map(entry => entry.item);
  }
}

export const discoveryRankingService = new DiscoveryRankingService();
