import { and, asc, desc, eq, gt, lte } from 'drizzle-orm';
import { getDb } from '../db-connection';
import { leadDeliveries, place as canonicalPlace, placeName, slLeadContexts, slListingAuthorities, slMessages, slPlaces, slSpaces } from '../../drizzle/schema';

/**
 * Shared Living enquiry authority.
 *
 * Enquiries are canonical platform leads (capturePublicLead) with an adjunct
 * context row and an on-platform message thread keyed to the lead. MVP
 * posture: every Shared Living lead is platform-managed — the lister engages
 * through the thread, counterpart contact details stay shielded until both
 * sides have engaged on-platform.
 */

export interface SharedLivingLeadCustodyResolution {
  placeId: number;
  spaceId: number | null;
  placeSlug: string;
  recipientUserId: number;
  spaceLabelSnapshot: string;
  spaceTypeSnapshot: string;
}

/** Validates the place/space pair is publicly enquirable and snapshots truth. */
export async function resolveSharedLivingLeadCustody(input: {
  slPlaceId: number;
  slSpaceId?: number | null;
}): Promise<SharedLivingLeadCustodyResolution | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [residence] = await db
    .select({
      id: slPlaces.id,
      slug: slPlaces.slug,
      status: slPlaces.publicationStatus,
      canonicalPlaceId: slPlaces.canonicalPlaceId,
    })
    .from(slPlaces)
    .where(eq(slPlaces.id, input.slPlaceId))
    .limit(1);
  if (!residence || residence.status !== 'published') return null;

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const [authority] = await db
    .select({ agentUserId: slListingAuthorities.agentUserId })
    .from(slListingAuthorities)
    .innerJoin(canonicalPlace, eq(canonicalPlace.placeId, residence.canonicalPlaceId))
    .innerJoin(placeName, and(
      eq(placeName.placeId, canonicalPlace.placeId),
      eq(placeName.nameRole, 'preferred_public'),
      eq(placeName.nameState, 'active'),
    ))
    .where(and(
      eq(slListingAuthorities.placeId, input.slPlaceId),
      eq(slListingAuthorities.status, 'approved'),
      lte(slListingAuthorities.effectiveAt, now),
      gt(slListingAuthorities.expiresAt, now),
      eq(canonicalPlace.lifecycleStatus, 'active'),
      eq(canonicalPlace.searchEligible, 1),
      eq(canonicalPlace.publicationEligible, 1),
      eq(canonicalPlace.verificationStatus, 'verified'),
    ))
    .orderBy(desc(slListingAuthorities.effectiveAt))
    .limit(1);
  if (!authority) return null;

  let spaceLabelSnapshot = 'Whole place';
  let spaceTypeSnapshot = 'shared_living';
  let spaceId: number | null = null;
  if (input.slSpaceId != null) {
    const [space] = await db
      .select({
        id: slSpaces.id,
        label: slSpaces.label,
        accommodationType: slSpaces.accommodationType,
        status: slSpaces.publicationStatus,
        availabilityStatus: slSpaces.availabilityStatus,
        placeId: slSpaces.placeId,
      })
      .from(slSpaces)
      .where(eq(slSpaces.id, input.slSpaceId))
      .limit(1);
    if (!space || Number(space.placeId) !== residence.id || space.status !== 'published' || space.availabilityStatus !== 'available') return null;
    spaceId = space.id;
    spaceLabelSnapshot = space.label;
    spaceTypeSnapshot = space.accommodationType;
  }

  return {
    placeId: residence.id,
    spaceId,
    placeSlug: residence.slug,
    recipientUserId: Number(authority.agentUserId),
    spaceLabelSnapshot,
    spaceTypeSnapshot,
  };
}

export type ThreadAuthor = 'consumer' | 'lister' | 'moderator';

export async function appendThreadMessage(input: {
  leadId: number;
  authorKind: ThreadAuthor;
  senderUserId?: number | null;
  body: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [result] = await db.insert(slMessages).values({
    leadId: input.leadId,
    authorKind: input.authorKind,
    senderUserId: input.senderUserId ?? null,
    body: input.body.slice(0, 4000),
  });
  return Number(result.insertId);
}

/** Guest-safe thread identity: the secret capture request id acts as the capability token. */
export interface SharedLivingThreadView {
  placeSlug: string;
  spaceLabelSnapshot: string;
  leadStatus: string;
  deliveryStatus: string | null;
  messages: Array<{ id: number; authorKind: string; body: string; createdAt: string }>;
}

export async function threadViewByToken(
  captureRequestId: string,
): Promise<SharedLivingThreadView | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const { leads } = await import('../../drizzle/schema');
  const [lead] = await db
    .select({
      leadId: leads.id,
      leadStatus: leads.status,
      deliveryStatus: leads.deliveryStatus,
      placeId: slLeadContexts.placeId,
      spaceLabelSnapshot: slLeadContexts.spaceLabelSnapshot,
    })
    .from(leads)
    .innerJoin(slLeadContexts, eq(slLeadContexts.leadId, leads.id))
    .where(eq(leads.captureRequestId, captureRequestId))
    .limit(1);
  if (!lead) return null;

  const [place] = await db
    .select({ slug: slPlaces.slug })
    .from(slPlaces)
    .where(eq(slPlaces.id, lead.placeId))
    .limit(1);

  const messages = await listThreadMessages(lead.leadId);

  return {
    placeSlug: place?.slug || '',
    spaceLabelSnapshot: lead.spaceLabelSnapshot || 'Shared Living listing',
    leadStatus: lead.leadStatus,
    deliveryStatus: lead.deliveryStatus ?? null,
    messages: messages.map(message => ({
      id: message.id,
      authorKind: message.authorKind,
      body: message.body,
      createdAt: String(message.createdAt),
    })),
  };
}

export async function replyByToken(
  captureRequestId: string,
  body: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!body.trim()) return { ok: false, reason: 'Message is empty.' };
  const db = await getDb();
  if (!db) return { ok: false, reason: 'Database not available.' };
  const { leads } = await import('../../drizzle/schema');
  const [lead] = await db
    .select({ id: leads.id })
    .from(leads)
    // A capture request ID exists across the wider lead platform. A guest
    // capability may only append to the Shared Living thread it was issued
    // for; it must never become a write token for another lead domain.
    .innerJoin(slLeadContexts, eq(slLeadContexts.leadId, leads.id))
    .where(eq(leads.captureRequestId, captureRequestId))
    .limit(1);
  if (!lead) return { ok: false, reason: 'Thread not found.' };
  await appendThreadMessage({ leadId: lead.id, authorKind: 'consumer', body });
  return { ok: true };
}

export async function listerOwnsThread(userId: number, captureRequestId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const { leads } = await import('../../drizzle/schema');
  const [row] = await db
    .select({ recipientUserId: leadDeliveries.recipientUserId })
    .from(leads)
    .innerJoin(slLeadContexts, eq(slLeadContexts.leadId, leads.id))
    .innerJoin(leadDeliveries, and(eq(leadDeliveries.leadId, leads.id), eq(leadDeliveries.purpose, 'primary_custody')))
    .where(eq(leads.captureRequestId, captureRequestId))
    .limit(1);
  return Boolean(row && Number(row.recipientUserId) === userId);
}

async function listerCanReplyToThread(userId: number, captureRequestId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const { leads } = await import('../../drizzle/schema');
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const [row] = await db.select({ id: slListingAuthorities.id })
    .from(leads)
    .innerJoin(slLeadContexts, eq(slLeadContexts.leadId, leads.id))
    .innerJoin(slListingAuthorities, and(
      eq(slListingAuthorities.placeId, slLeadContexts.placeId),
      eq(slListingAuthorities.agentUserId, userId),
      eq(slListingAuthorities.status, 'approved'),
      lte(slListingAuthorities.effectiveAt, now),
      gt(slListingAuthorities.expiresAt, now),
    ))
    .where(eq(leads.captureRequestId, captureRequestId))
    .limit(1);
  return Boolean(row);
}

export async function replyAsListerThread(
  userId: number,
  captureRequestId: string,
  body: string,
): Promise<boolean> {
  if (!(await listerOwnsThread(userId, captureRequestId)) || !(await listerCanReplyToThread(userId, captureRequestId))) return false;
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const { leads } = await import('../../drizzle/schema');
  const [lead] = await db
    .select({ id: leads.id })
    .from(leads)
    .where(eq(leads.captureRequestId, captureRequestId))
    .limit(1);
  if (!lead) return false;
  await appendThreadMessage({
    leadId: Number(lead.id),
    authorKind: 'lister',
    senderUserId: userId,
    body,
  });
  return true;
}

/** Historical lead visibility follows the recipient snapshot recorded at capture. */
export async function listListerThreads(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const { leads } = await import('../../drizzle/schema');
  return db
    .select({
      leadId: leads.id,
      token: leads.captureRequestId,
      leadStatus: leads.status,
      deliveryStatus: leads.deliveryStatus,
      placeSlug: slPlaces.slug,
      spaceLabelSnapshot: slLeadContexts.spaceLabelSnapshot,
      createdAt: leads.createdAt,
    })
    .from(slLeadContexts)
    .innerJoin(leads, eq(slLeadContexts.leadId, leads.id))
    .innerJoin(slPlaces, eq(slLeadContexts.placeId, slPlaces.id))
    .innerJoin(leadDeliveries, and(eq(leadDeliveries.leadId, leads.id), eq(leadDeliveries.purpose, 'primary_custody')))
    .where(eq(leadDeliveries.recipientUserId, userId))
    .orderBy(desc(leads.createdAt));
}

/** The generic capability view is only returned to a lister after ownership is proven. */
export async function listerThreadView(userId: number, captureRequestId: string) {
  if (!(await listerOwnsThread(userId, captureRequestId))) return null;
  return threadViewByToken(captureRequestId);
}

export async function listThreadMessages(leadId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db
    .select({
      id: slMessages.id,
      authorKind: slMessages.authorKind,
      senderUserId: slMessages.senderUserId,
      body: slMessages.body,
      createdAt: slMessages.createdAt,
    })
    .from(slMessages)
    .where(eq(slMessages.leadId, leadId))
    .orderBy(asc(slMessages.createdAt));
}

export async function ensureLeadContextRow(input: {
  leadId: number;
  placeId: number;
  spaceId: number | null;
  spaceLabelSnapshot: string;
  spaceTypeSnapshot: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [existing] = await db
    .select({ id: slLeadContexts.id })
    .from(slLeadContexts)
    .where(eq(slLeadContexts.leadId, input.leadId))
    .limit(1);
  if (existing) return;
  await db.insert(slLeadContexts).values({
    leadId: input.leadId,
    placeId: input.placeId,
    spaceId: input.spaceId,
    spaceLabelSnapshot: input.spaceLabelSnapshot,
    spaceTypeSnapshot: input.spaceTypeSnapshot,
  });
}
