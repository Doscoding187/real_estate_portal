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
  category: FeedCategory;
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
    trustScore: number;
    momentumScore: number;
    abuseScore: number;
    trustBand: 'low' | 'standard' | 'high';
    momentumLabel: 'rising' | 'stable' | 'cooling';
    lowReports: boolean;
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
  return ALLOWED_CONTENT_TYPES.includes(raw as FeedContentType) ? (raw as FeedContentType) : 'short';
}

function normalizeCategory(value: unknown): FeedCategory {
  const raw = asString(value, 'property').toLowerCase();
  return ALLOWED_CATEGORIES.includes(raw as FeedCategory) ? (raw as FeedCategory) : 'property';
}

function normalizeOrientation(value: unknown, width: number, height: number): FeedOrientation {
  const raw = asString(value).toLowerCase();
  if (ALLOWED_ORIENTATIONS.includes(raw as FeedOrientation)) {
    return raw as FeedOrientation;
  }
  if (height > width) return 'vertical';
  if (width > height) return 'horizontal';
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
  category: FeedCategory,
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

export function toFeedItem(raw: any): FeedItem | null {
  const id = asNumber(raw?.id);
  if (!id) return null;

  const width = asNumber(raw?.width ?? raw?.metadata?.width);
  const height = asNumber(raw?.height ?? raw?.metadata?.height);
  const mediaUrl = asString(raw?.mediaUrl ?? raw?.primaryMediaUrl ?? raw?.videoUrl);
  const thumbnailUrl = asString(raw?.thumbnailUrl ?? raw?.metadata?.thumbnailUrl);
  const title = asString(raw?.title, 'Untitled');
  const referenceId = asNumber(raw?.referenceId ?? raw?.linkedListingId ?? raw?.metadata?.listingId, 0);
  const actorId = asNumber(raw?.actor?.id ?? raw?.actorId, 0);
  const actorType = asString(raw?.actor?.actorType ?? raw?.creatorType ?? 'user').toLowerCase();
  const creatorType = normalizeCreatorType(raw?.creatorType ?? raw?.actor?.actorType ?? raw?.metadata?.creatorType);
  const trustScore = clamp(asNumber(raw?.trustScore, 50), 0, 100);
  const momentumScore = clamp(asNumber(raw?.momentumScore, 50), 0, 100);
  const abuseScore = clamp(asNumber(raw?.actorAbuseScore ?? raw?.abuseScore, 50), 0, 100);
  const contentType = normalizeContentType(raw?.contentType);
  const category = normalizeCategory(raw?.category ?? raw?.metadata?.category);
  const { contentDomain, contentKind } = inferDomainAndKind(
    category,
    contentType,
    referenceId,
    raw?.referenceType ?? raw?.metadata?.referenceType,
  );
  const mediaType = inferMediaType(mediaUrl);

  return {
    id,
    contentType,
    category,
    contentDomain,
    contentKind,
    creatorType,
    title,
    mediaUrl,
    mediaType,
    thumbnailUrl: thumbnailUrl || null,
    durationSec: asNumber(raw?.durationSec ?? raw?.duration ?? raw?.metadata?.durationSec, 0),
    orientation: normalizeOrientation(raw?.orientation ?? raw?.metadata?.orientation, width, height),
    actor: {
      id: actorId > 0 ? actorId : null,
      displayName: asString(raw?.actor?.displayName ?? raw?.creatorName, 'Creator'),
      actorType: ['agent', 'developer', 'contractor', 'finance_partner', 'user'].includes(actorType)
        ? (actorType as FeedItem['actor']['actorType'])
        : 'user',
      verificationStatus: (asString(
        raw?.actor?.verificationStatus,
        'unverified',
      ).toLowerCase() || 'unverified') as FeedItem['actor']['verificationStatus'],
    },
    actorInsights: {
      trustScore,
      momentumScore,
      abuseScore,
      trustBand: toTrustBand(trustScore),
      momentumLabel: toMomentumLabel(momentumScore),
      lowReports: abuseScore >= 60,
    },
    stats: {
      views: asNumber(raw?.stats?.views ?? raw?.viewCount),
      saves: asNumber(raw?.stats?.saves ?? raw?.saveCount),
      shares: asNumber(raw?.stats?.shares ?? raw?.shareCount),
    },
    location:
      raw?.location && typeof raw.location === 'object'
        ? {
            city: raw.location.city,
            suburb: raw.location.suburb,
            province: raw.location.province,
            latitude: asOptionalNumber(raw.location.latitude),
            longitude: asOptionalNumber(raw.location.longitude),
          }
        : undefined,
    referenceId,
    linkedListingId: referenceId > 0 ? referenceId : undefined,
  };
}

export function getFeedItems(payload: any): FeedItem[] {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items
    .map(toFeedItem)
    .filter((item): item is FeedItem => item !== null);
}
