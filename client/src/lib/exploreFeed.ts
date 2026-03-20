export type FeedContentType = 'short' | 'walkthrough' | 'showcase';
export type FeedCategory = 'property' | 'renovation' | 'finance' | 'investment' | 'services';
export type FeedOrientation = 'vertical' | 'horizontal' | 'square';
export type FeedMediaType = 'video' | 'image';
export type FeedContentDomain = 'market' | 'finance' | 'improve' | 'invest' | 'community';
export type FeedContentKind =
  | 'listing'
  | 'development'
  | 'advice'
  | 'service'
  | 'insight'
  | 'story';
export type FeedCreatorType =
  | 'agent'
  | 'agency'
  | 'developer'
  | 'bond_originator'
  | 'financial_institution'
  | 'contractor'
  | 'architect'
  | 'investor'
  | 'other';

export interface FeedItem {
  id: number;
  contentType: FeedContentType;
  category: FeedCategory | string;
  contentDomain?: FeedContentDomain;
  contentKind?: FeedContentKind;
  creatorType?: FeedCreatorType;
  title: string;
  mediaUrl: string;
  mediaType?: FeedMediaType;
  thumbnailUrl: string | null;
  durationSec: number;
  orientation: FeedOrientation;
  actor: {
    id: number | null;
    displayName: string;
    actorType: 'agent' | 'developer' | 'contractor' | 'finance_partner' | 'user';
    verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  };
  actorInsights?: {
    trustBand: 'low' | 'standard' | 'high';
    trustScore?: number;
    momentumScore?: number;
    abuseScore?: number;
    momentumLabel?: 'rising' | 'stable' | 'cooling';
    lowReports?: boolean;
  };
  stats: {
    views: number;
    saves: number;
    shares: number;
  };
  location?: {
    city?: string;
    suburb?: string;
    province?: string;
    latitude?: number;
    longitude?: number;
  };
  referenceId?: number;
  linkedListingId?: number;
  listingId?: number;
  metadata?: Record<string, unknown>;
}

const ALLOWED_CONTENT_TYPES: FeedContentType[] = ['short', 'walkthrough', 'showcase'];
const ALLOWED_CATEGORIES: FeedCategory[] = [
  'property',
  'renovation',
  'finance',
  'investment',
  'services',
];
const ALLOWED_ORIENTATIONS: FeedOrientation[] = ['vertical', 'horizontal', 'square'];

function asNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function asOptionalNumber(value: unknown): number | undefined {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function asString(value: unknown, fallback = ''): string {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function toTrustBand(score: number): 'low' | 'standard' | 'high' {
  if (score >= 75) return 'high';
  if (score >= 45) return 'standard';
  return 'low';
}

function toMomentumLabel(score: number): 'rising' | 'stable' | 'cooling' {
  if (score >= 60) return 'rising';
  if (score <= 40) return 'cooling';
  return 'stable';
}

function normalizeContentType(value: unknown): FeedContentType {
  const raw = asString(value, 'short').toLowerCase();
  if (raw === 'video') return 'short';
  return ALLOWED_CONTENT_TYPES.includes(raw as FeedContentType)
    ? (raw as FeedContentType)
    : 'short';
}

function normalizeCategory(value: unknown): FeedCategory | string {
  const raw = asString(value, 'property').toLowerCase();
  return ALLOWED_CATEGORIES.includes(raw as FeedCategory) ? (raw as FeedCategory) : raw;
}

function normalizeOrientation(value: unknown, width?: number, height?: number): FeedOrientation {
  const raw = asString(value).toLowerCase();
  if (ALLOWED_ORIENTATIONS.includes(raw as FeedOrientation)) {
    return raw as FeedOrientation;
  }
  if (raw === 'landscape') return 'horizontal';
  if (width && height) {
    if (height > width) return 'vertical';
    if (width > height) return 'horizontal';
  }
  return 'square';
}

function inferMediaType(mediaUrl: string): FeedMediaType {
  const normalized = mediaUrl.toLowerCase();
  if (
    /\.(png|jpe?g|webp|gif|avif|bmp|svg)(?:\?|$)/i.test(normalized) ||
    normalized.includes('/images/')
  ) {
    return 'image';
  }
  return 'video';
}

function normalizeCreatorType(value: unknown): FeedCreatorType {
  const raw = asString(value, 'other').toLowerCase();
  switch (raw) {
    case 'agent':
      return 'agent';
    case 'agency':
      return 'agency';
    case 'developer':
      return 'developer';
    case 'contractor':
      return 'contractor';
    case 'architect':
      return 'architect';
    case 'investor':
      return 'investor';
    case 'bond_originator':
    case 'finance_partner':
      return 'bond_originator';
    case 'bank':
    case 'financial_institution':
      return 'financial_institution';
    default:
      return 'other';
  }
}

function inferDomainAndKind(
  category: FeedCategory | string,
  contentType: FeedContentType,
  referenceId: number,
  referenceTypeRaw: unknown,
): { contentDomain: FeedContentDomain; contentKind: FeedContentKind } {
  const referenceType = asString(referenceTypeRaw).toLowerCase();
  const hasReference = referenceId > 0;

  if (hasReference) {
    if (referenceType.includes('development') || contentType === 'showcase') {
      return { contentDomain: 'market', contentKind: 'development' };
    }
    return { contentDomain: 'market', contentKind: 'listing' };
  }

  switch (category) {
    case 'finance':
      return { contentDomain: 'finance', contentKind: 'advice' };
    case 'renovation':
    case 'services':
      return { contentDomain: 'improve', contentKind: 'service' };
    case 'investment':
      return { contentDomain: 'invest', contentKind: 'insight' };
    case 'property':
    default:
      return { contentDomain: 'community', contentKind: 'story' };
  }
}

export function toFeedItem(raw: unknown): FeedItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, any>;

  const id = asNumber(item.id);
  if (!id) return null;

  const width = asNumber(item.width ?? item.metadata?.width, 0);
  const height = asNumber(item.height ?? item.metadata?.height, 0);
  const mediaUrl = asString(item.mediaUrl ?? item.primaryMediaUrl ?? item.videoUrl ?? item.url);
  const thumbnailUrl = asString(
    item.thumbnailUrl ?? item.imageUrl ?? item.posterUrl ?? item.metadata?.thumbnailUrl,
  );
  const referenceId = asNumber(
    item.referenceId ?? item.linkedListingId ?? item.listingId ?? item.metadata?.listingId,
    0,
  );
  const actorId = asNumber(item.actor?.id ?? item.actorId, 0);
  const actorType = asString(item.actor?.actorType ?? item.creatorType ?? 'user').toLowerCase();
  const trustScore = clamp(
    asNumber(item.actorInsights?.trustScore ?? item.trustScore, 50),
    0,
    100,
  );
  const momentumScore = clamp(
    asNumber(item.actorInsights?.momentumScore ?? item.momentumScore, 50),
    0,
    100,
  );
  const abuseScore = clamp(
    asNumber(item.actorInsights?.abuseScore ?? item.actorAbuseScore ?? item.abuseScore, 50),
    0,
    100,
  );
  const contentType = normalizeContentType(item.contentType);
  const category = normalizeCategory(item.category ?? item.metadata?.category);
  const { contentDomain, contentKind } = inferDomainAndKind(
    category,
    contentType,
    referenceId,
    item.referenceType ?? item.metadata?.referenceType,
  );
  const mediaType = inferMediaType(mediaUrl || thumbnailUrl);

  return {
    id,
    title: asString(item.title, 'Untitled'),
    category,
    contentType,
    contentDomain,
    contentKind,
    creatorType: normalizeCreatorType(item.creatorType ?? item.actor?.actorType),
    mediaUrl: mediaUrl || thumbnailUrl || '',
    mediaType,
    thumbnailUrl: thumbnailUrl || mediaUrl || null,
    durationSec: asNumber(item.durationSec ?? item.duration ?? item.metadata?.durationSec, 0),
    orientation: normalizeOrientation(item.orientation ?? item.metadata?.orientation, width, height),
    actor: {
      id: actorId > 0 ? actorId : null,
      displayName: asString(item.actor?.displayName ?? item.creatorName, 'Creator'),
      actorType: ['agent', 'developer', 'contractor', 'finance_partner', 'user'].includes(actorType)
        ? (actorType as FeedItem['actor']['actorType'])
        : 'user',
      verificationStatus: (asString(item.actor?.verificationStatus, 'unverified').toLowerCase() ||
        'unverified') as FeedItem['actor']['verificationStatus'],
    },
    actorInsights:
      item.actorInsights || item.trustScore
        ? {
            trustBand:
              item.actorInsights?.trustBand === 'low' ||
              item.actorInsights?.trustBand === 'high' ||
              item.actorInsights?.trustBand === 'standard'
                ? item.actorInsights.trustBand
                : toTrustBand(trustScore),
            trustScore,
            momentumScore,
            abuseScore,
            momentumLabel:
              item.actorInsights?.momentumLabel === 'rising' ||
              item.actorInsights?.momentumLabel === 'cooling'
                ? item.actorInsights.momentumLabel
                : toMomentumLabel(momentumScore),
            lowReports:
              typeof item.actorInsights?.lowReports === 'boolean'
                ? item.actorInsights.lowReports
                : abuseScore >= 60,
          }
        : undefined,
    stats: {
      views: asNumber(item.stats?.views ?? item.views ?? item.viewCount),
      saves: asNumber(item.stats?.saves ?? item.saves ?? item.saveCount),
      shares: asNumber(item.stats?.shares ?? item.shares ?? item.shareCount),
    },
    location:
      item.location && typeof item.location === 'object'
        ? {
            city: asString(item.location.city),
            suburb: asString(item.location.suburb),
            province: asString(item.location.province),
            latitude: asOptionalNumber(item.location.latitude),
            longitude: asOptionalNumber(item.location.longitude),
          }
        : undefined,
    referenceId: referenceId || undefined,
    linkedListingId: referenceId || undefined,
    listingId: referenceId || undefined,
    metadata:
      item.metadata && typeof item.metadata === 'object'
        ? (item.metadata as Record<string, unknown>)
        : undefined,
  };
}

function pickRawItems(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.shorts)) return payload.shorts;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.items)) return payload.data.items;
  return [];
}

export function getFeedItems(payload: unknown): FeedItem[] {
  return pickRawItems(payload)
    .map(toFeedItem)
    .filter((item): item is FeedItem => item !== null);
}
