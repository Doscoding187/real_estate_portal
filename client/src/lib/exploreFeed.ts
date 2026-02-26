export type FeedContentType = 'short' | 'walkthrough' | 'showcase';
export type FeedOrientation = 'vertical' | 'horizontal' | 'square';

export interface FeedItem {
  id: number;
  title: string;
  category: string;
  contentType: FeedContentType;
  mediaUrl: string;
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

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asString(value: unknown, fallback = ''): string {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function asOptionalNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeContentType(value: unknown): FeedContentType {
  const raw = asString(value, 'short').toLowerCase();
  if (raw === 'walkthrough') return 'walkthrough';
  if (raw === 'showcase') return 'showcase';
  return 'short';
}

function normalizeOrientation(value: unknown): FeedOrientation {
  const raw = asString(value, 'vertical').toLowerCase();
  if (raw === 'horizontal' || raw === 'landscape') return 'horizontal';
  if (raw === 'square') return 'square';
  return 'vertical';
}

function normalizeActorType(value: unknown): FeedItem['actor']['actorType'] {
  const raw = asString(value, 'user').toLowerCase();
  if (raw === 'agent') return 'agent';
  if (raw === 'developer') return 'developer';
  if (raw === 'contractor') return 'contractor';
  if (raw === 'finance_partner') return 'finance_partner';
  return 'user';
}

function normalizeVerificationStatus(value: unknown): FeedItem['actor']['verificationStatus'] {
  const raw = asString(value, 'unverified').toLowerCase();
  if (raw === 'pending') return 'pending';
  if (raw === 'verified') return 'verified';
  if (raw === 'rejected') return 'rejected';
  return 'unverified';
}

function normalizeTrustBand(value: unknown): 'low' | 'standard' | 'high' {
  const raw = asString(value, '').toLowerCase();
  if (raw === 'low' || raw === 'high' || raw === 'standard') {
    return raw;
  }
  const score = asNumber(value, 50);
  if (score >= 75) return 'high';
  if (score >= 45) return 'standard';
  return 'low';
}

export function toFeedItem(raw: unknown): FeedItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, any>;

  const id = asNumber(item.id);
  if (!id) return null;

  const mediaUrl = asString(item.mediaUrl ?? item.primaryMediaUrl ?? item.videoUrl ?? item.url);
  const thumbnailUrl = asString(item.thumbnailUrl ?? item.imageUrl ?? item.posterUrl);
  const listingId = asOptionalNumber(
    item.linkedListingId ?? item.referenceId ?? item.listingId ?? item.metadata?.listingId,
  );

  return {
    id,
    title: asString(item.title, 'Untitled'),
    category: asString(item.category, 'property').toLowerCase(),
    contentType: normalizeContentType(item.contentType),
    mediaUrl: mediaUrl || thumbnailUrl || '',
    thumbnailUrl: thumbnailUrl || mediaUrl || null,
    durationSec: asNumber(item.durationSec ?? item.duration, 0),
    orientation: normalizeOrientation(item.orientation ?? item.metadata?.orientation),
    actor: {
      id: asOptionalNumber(item.actor?.id ?? item.actorId) ?? null,
      displayName: asString(item.actor?.displayName ?? item.creatorName, 'Creator'),
      actorType: normalizeActorType(item.actor?.actorType ?? item.creatorType),
      verificationStatus: normalizeVerificationStatus(item.actor?.verificationStatus),
    },
    actorInsights:
      item.actorInsights || item.trustScore
        ? {
            trustBand: normalizeTrustBand(item.actorInsights?.trustBand ?? item.trustScore),
          }
        : undefined,
    stats: {
      views: asNumber(item.stats?.views ?? item.views ?? item.viewCount, 0),
      saves: asNumber(item.stats?.saves ?? item.saves ?? item.saveCount, 0),
      shares: asNumber(item.stats?.shares ?? item.shares ?? item.shareCount, 0),
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
    referenceId: listingId,
    linkedListingId: listingId,
    listingId,
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
