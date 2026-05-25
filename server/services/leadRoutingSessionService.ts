import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { leadCampaigns, leadEvents, leadFunnelSessions } from '../../drizzle/schema';
import { getDb } from '../db';
import { LEAD_SOURCE_TYPES, type Attribution, type LeadSourceType } from '../../shared/leadRouting';

type LeadFunnelSessionInsert = typeof leadFunnelSessions.$inferInsert;

export type StartLeadFunnelSessionInput = Partial<Attribution> & {
  campaignId?: number | null;
  campaignSlug?: string | null;
  sourceType?: LeadSourceType | string | null;
  metadata?: Record<string, unknown> | null;
  ttlHours?: number;
};

export type StartLeadFunnelSessionResult = {
  sessionId: number;
  sessionToken: string;
  campaignId: number | null;
  sourceType: LeadSourceType;
  expiresAt: string;
};

const DEFAULT_SESSION_TTL_HOURS = 24 * 30;
const LEAD_SOURCE_TYPE_SET = new Set<string>(LEAD_SOURCE_TYPES);

function normalizeText(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

function lower(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function toMysqlDateTime(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export function generateLeadFunnelSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function normalizeLeadSourceType(value?: string | null): LeadSourceType | null {
  const normalized = lower(value);
  if (!normalized) return null;
  return LEAD_SOURCE_TYPE_SET.has(normalized) ? (normalized as LeadSourceType) : null;
}

export function inferLeadSourceType(
  input: Partial<Omit<Attribution, 'sourceType'>> & { sourceType?: string | null },
): LeadSourceType {
  const explicit = normalizeLeadSourceType(input.sourceType);
  if (explicit) return explicit;

  const utmSource = lower(input.utmSource);
  const utmMedium = lower(input.utmMedium);
  const referrerUrl = lower(input.referrerUrl);

  if (input.gclid || utmSource.includes('google')) return 'google_ads';
  if (
    input.fbclid ||
    utmSource.includes('meta') ||
    utmSource.includes('facebook') ||
    utmSource.includes('instagram')
  ) {
    return 'meta_ads';
  }
  if (utmSource.includes('linkedin')) return 'linkedin_ads';
  if (
    utmSource.includes('whatsapp') ||
    referrerUrl.includes('wa.me') ||
    referrerUrl.includes('whatsapp')
  ) {
    return 'whatsapp';
  }
  if (utmSource.includes('explore') || utmSource.includes('internal_explore')) {
    return 'internal_explore';
  }
  if (utmMedium === 'organic' || utmSource === 'organic') return 'organic';

  return 'direct';
}

export function normalizeAttribution(
  input: Partial<Omit<Attribution, 'sourceType'>> & { sourceType?: string | null },
): Attribution {
  return {
    sourceType: inferLeadSourceType(input),
    utmSource: normalizeText(input.utmSource, 100),
    utmMedium: normalizeText(input.utmMedium, 100),
    utmCampaign: normalizeText(input.utmCampaign, 150),
    utmContent: normalizeText(input.utmContent, 150),
    utmTerm: normalizeText(input.utmTerm, 150),
    fbclid: normalizeText(input.fbclid, 255),
    gclid: normalizeText(input.gclid, 255),
    referrerUrl: normalizeText(input.referrerUrl, 2048),
    landingPageUrl: normalizeText(input.landingPageUrl, 2048),
  };
}

export function buildLeadFunnelSessionInsert(input: {
  attribution: Attribution;
  sessionToken: string;
  campaignId?: number | null;
  metadata?: Record<string, unknown> | null;
  expiresAt: Date;
}): LeadFunnelSessionInsert {
  return {
    campaignId: input.campaignId ?? null,
    sessionToken: input.sessionToken,
    sourceType: input.attribution.sourceType,
    status: 'active',
    utmSource: input.attribution.utmSource ?? null,
    utmMedium: input.attribution.utmMedium ?? null,
    utmCampaign: input.attribution.utmCampaign ?? null,
    utmContent: input.attribution.utmContent ?? null,
    utmTerm: input.attribution.utmTerm ?? null,
    fbclid: input.attribution.fbclid ?? null,
    gclid: input.attribution.gclid ?? null,
    referrerUrl: input.attribution.referrerUrl ?? null,
    landingPageUrl: input.attribution.landingPageUrl ?? null,
    metadata: input.metadata ?? null,
    expiresAt: toMysqlDateTime(input.expiresAt),
  };
}

async function resolveCampaignId(input: {
  campaignId?: number | null;
  campaignSlug?: string | null;
}): Promise<number | null> {
  if (input.campaignId && Number.isFinite(Number(input.campaignId))) {
    return Number(input.campaignId);
  }

  const slug = normalizeText(input.campaignSlug, 160);
  if (!slug) return null;

  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [campaign] = await db
    .select({ id: leadCampaigns.id })
    .from(leadCampaigns)
    .where(eq(leadCampaigns.slug, slug))
    .limit(1);

  return campaign?.id ? Number(campaign.id) : null;
}

export async function startLeadFunnelSession(
  input: StartLeadFunnelSessionInput,
): Promise<StartLeadFunnelSessionResult> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const campaignId = await resolveCampaignId(input);
  const attribution = normalizeAttribution(input);
  const sessionToken = generateLeadFunnelSessionToken();
  const ttlHours = Math.max(
    1,
    Math.min(Number(input.ttlHours || DEFAULT_SESSION_TTL_HOURS), 24 * 90),
  );
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  const payload = buildLeadFunnelSessionInsert({
    attribution,
    sessionToken,
    campaignId,
    metadata: input.metadata ?? null,
    expiresAt,
  });

  const insertResult = await db.insert(leadFunnelSessions).values(payload);
  const sessionId = Number((insertResult as any)?.[0]?.insertId || 0);
  if (!sessionId) {
    throw new Error('Failed to create lead funnel session');
  }

  await db.insert(leadEvents).values({
    sessionId,
    campaignId,
    sourceType: attribution.sourceType,
    eventType: 'session_created',
    payload: {
      attribution,
      metadata: input.metadata ?? null,
    },
  });

  return {
    sessionId,
    sessionToken,
    campaignId,
    sourceType: attribution.sourceType,
    expiresAt: toMysqlDateTime(expiresAt),
  };
}

export async function getLeadFunnelSessionByToken(sessionToken: string) {
  const token = normalizeText(sessionToken, 96);
  if (!token) return null;

  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [session] = await db
    .select()
    .from(leadFunnelSessions)
    .where(eq(leadFunnelSessions.sessionToken, token))
    .limit(1);

  return session ?? null;
}
