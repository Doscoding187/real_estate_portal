import { createHash, randomBytes, randomUUID } from 'crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import {
  leads,
  prospectActionAttributions,
  prospectActionClaimTokens,
  prospectIdentities,
  showings,
  auditLogs,
} from '../../drizzle/schema';

type JourneyDb = any;
export const PROSPECT_CLAIM_NEUTRAL_MESSAGE = 'This claim link is invalid or expired.';
export class ProspectClaimError extends Error {
  constructor(readonly kind: 'invalid_or_expired' | 'unexpected', options?: { cause?: unknown }) {
    super(kind === 'invalid_or_expired' ? PROSPECT_CLAIM_NEUTRAL_MESSAGE : 'Prospect claim transaction failed');
    this.name = 'ProspectClaimError';
    // Keep driver diagnostics server-side without depending on the newer
    // ErrorOptions constructor overload in this project's TypeScript target.
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}
export const hashProspectClaimToken = (token: string) => createHash('sha256').update(token, 'utf8').digest('hex');

const PUBLIC_SOURCE_TYPES = new Set([
  'search_results',
  'property_detail',
  'development_detail',
  'suburb_page',
  'location_page',
  'explore',
  'agent_profile',
  'sponsored_placement',
  'referral_campaign',
  'service_provider_card',
  'web',
]);

export function normalizeProspectSourceType(source?: string | null): string {
  const value = String(source || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  const aliases: Record<string, string> = {
    property: 'property_detail',
    property_page: 'property_detail',
    property_search: 'search_results',
    development: 'development_detail',
    development_page: 'development_detail',
    agent: 'agent_profile',
    referral: 'referral_campaign',
    direct: 'web',
    website: 'web',
  };
  const normalized = aliases[value] || value;
  return PUBLIC_SOURCE_TYPES.has(normalized) ? normalized : 'web';
}

export async function getOrCreateProspectIdentity(db: JourneyDb, userId: number) {
  const [existing] = await db
    .select()
    .from(prospectIdentities)
    .where(eq(prospectIdentities.userId, userId))
    .limit(1);
  if (existing) return existing;

  const id = randomUUID();
  try {
    await db.insert(prospectIdentities).values({ id, userId, contactPreferences: {} });
  } catch (error) {
    // The unique user link is the concurrency guard. A simultaneous request can
    // create the identity first; in that case read the authoritative row.
    const [raced] = await db
      .select()
      .from(prospectIdentities)
      .where(eq(prospectIdentities.userId, userId))
      .limit(1);
    if (raced) return raced;
    throw error;
  }

  return { id, userId, contactPreferences: {} };
}

export async function recordProspectLeadAction({
  db,
  leadId,
  authenticatedUserId,
  source,
  propertyId,
  developmentId,
  referrerUrl,
  utmSource,
  utmMedium,
  utmCampaign,
}: {
  db: JourneyDb;
  leadId: number;
  authenticatedUserId?: number;
  source?: string | null;
  propertyId?: number | null;
  developmentId?: number | null;
  referrerUrl?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}) {
  if (authenticatedUserId) {
    const identity = await getOrCreateProspectIdentity(db, authenticatedUserId);
    await db
      .update(leads)
      .set({ prospectIdentityId: identity.id })
      .where(eq(leads.id, leadId));
  }

  const sourceType = normalizeProspectSourceType(source);
  const capturedAt = new Date().toISOString();
  const actionTouch = {
    sourceType,
    propertyId: propertyId || null,
    developmentId: developmentId || null,
    capturedAt,
  };

  await db.insert(prospectActionAttributions).values({
    leadId,
    sourceType,
    sourceEntityId: propertyId ? `property:${propertyId}` : developmentId ? `development:${developmentId}` : null,
    campaignContext: utmCampaign ? { campaign: utmCampaign } : null,
    utmContext: utmSource || utmMedium || utmCampaign
      ? { source: utmSource || null, medium: utmMedium || null, campaign: utmCampaign || null }
      : null,
    referrerContext: referrerUrl || null,
    // Public lead capture has no durable first-party touch store yet. Snapshot
    // this accepted action consistently rather than inventing a person/profile.
    firstTouch: actionTouch,
    lastTouch: actionTouch,
    actionTouch,
  });
}

/**
 * Server-only hand-off for an existing verified email/one-time-token delivery
 * path. The plaintext is returned once to that delivery boundary and never
 * persisted; callers must not expose it from a public lookup endpoint.
 */
export async function issueProspectActionClaimToken({
  db,
  leadId,
  expiresInMinutes = 30,
}: {
  db: JourneyDb;
  leadId: number;
  expiresInMinutes?: number;
}) {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashProspectClaimToken(token);
  const minutes = Math.max(1, Math.min(expiresInMinutes, 60 * 24));
  await db.insert(prospectActionClaimTokens).values({
    leadId,
    tokenHash,
    // Match MySQL's NOW()-based redemption clock; app-host timezone must not
    // decide whether a one-time proof is valid.
    expiresAt: sql`DATE_ADD(NOW(), INTERVAL ${minutes} MINUTE)` as any,
  });
  return { token, expiresAt: null };
}

export async function redeemProspectActionClaim({ db, userId, token }: { db: JourneyDb; userId: number; token: string }) {
  try {
    const hash = hashProspectClaimToken(token);
    const [claim] = await db.select().from(prospectActionClaimTokens).where(eq(prospectActionClaimTokens.tokenHash, hash)).limit(1);
    if (!claim || claim.usedAt || new Date(claim.expiresAt).getTime() <= Date.now()) throw new ProspectClaimError('invalid_or_expired');
    const identity = await getOrCreateProspectIdentity(db, userId);
    await db.transaction(async (tx: any) => {
      const result = await tx.update(prospectActionClaimTokens).set({ usedAt: sql`NOW()`, claimedByUserId: userId }).where(and(eq(prospectActionClaimTokens.id, claim.id), isNull(prospectActionClaimTokens.usedAt)));
      if (Number(result?.[0]?.affectedRows ?? result?.affectedRows ?? 0) !== 1) throw new ProspectClaimError('invalid_or_expired');
      await tx.update(leads).set({ prospectIdentityId: identity.id }).where(eq(leads.id, claim.leadId));
      await tx.update(showings).set({ prospectIdentityId: identity.id }).where(eq(showings.leadId, claim.leadId));
      await tx.insert(auditLogs).values({ userId, action: 'prospect.action_claimed', targetType: 'lead', targetId: claim.leadId, metadata: JSON.stringify({ prospectIdentityId: identity.id }) });
    });
    return { leadId: claim.leadId, prospectIdentityId: identity.id };
  } catch (error) {
    if (error instanceof ProspectClaimError) throw error;
    throw new ProspectClaimError('unexpected', { cause: error });
  }
}
