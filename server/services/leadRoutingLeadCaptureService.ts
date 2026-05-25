import { and, eq, or } from 'drizzle-orm';
import { buyerLeads, leadEvents, leadFunnelSessions } from '../../drizzle/schema';
import { getDb } from '../db';
import {
  CaptureBuyerLeadInputSchema,
  type CaptureBuyerLeadInput,
  type LeadSourceType,
} from '../../shared/leadRouting';

type BuyerLeadInsert = typeof buyerLeads.$inferInsert;

export type LeadCaptureContext = {
  sessionId: number | null;
  campaignId: number | null;
  sourceType: LeadSourceType;
};

export type DuplicateLeadCandidate = {
  id: number;
  normalizedPhone: string | null;
  normalizedEmail: string | null;
  campaignId: number | null;
  createdAt?: string | null;
};

export type CaptureBuyerLeadResult = {
  buyerLeadId: number;
  duplicateOfLeadId: number | null;
  status: 'new' | 'duplicate';
  sessionId: number | null;
  campaignId: number | null;
  sourceType: LeadSourceType;
};

function normalizeText(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

function toMysqlDateTime(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export function normalizeLeadEmail(email?: string | null): string | null {
  const normalized = normalizeText(email, 320)?.toLowerCase() ?? null;
  return normalized || null;
}

export function normalizeLeadPhone(phone?: string | null): string | null {
  const raw = normalizeText(phone, 50);
  if (!raw) return null;

  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith('0')) digits = `27${digits.slice(1)}`;
  return digits || null;
}

export function findDuplicateLeadCandidate(input: {
  normalizedPhone?: string | null;
  normalizedEmail?: string | null;
  candidates: DuplicateLeadCandidate[];
}): DuplicateLeadCandidate | null {
  const phone = input.normalizedPhone || null;
  const email = input.normalizedEmail || null;
  if (!phone && !email) return null;

  return (
    input.candidates.find(candidate => {
      return Boolean(
        (phone && candidate.normalizedPhone === phone) ||
        (email && candidate.normalizedEmail === email),
      );
    }) ?? null
  );
}

export function buildBuyerLeadPayload(input: {
  context: LeadCaptureContext;
  lead: CaptureBuyerLeadInput;
  duplicateOfLeadId?: number | null;
}): BuyerLeadInsert {
  const parsed = CaptureBuyerLeadInputSchema.parse(input.lead);
  const normalizedPhone = normalizeLeadPhone(parsed.phone);
  const normalizedEmail = normalizeLeadEmail(parsed.email);
  const hasConsent = parsed.contactPermission || parsed.marketingConsent;

  return {
    sessionId: input.context.sessionId,
    campaignId: parsed.campaignId ?? input.context.campaignId,
    platformLeadId: parsed.platformLeadId ?? null,
    sourceType: parsed.sourceType ?? input.context.sourceType,
    status: input.duplicateOfLeadId ? 'duplicate' : 'new',
    fullName: normalizeText(parsed.fullName, 200) as string,
    phone: normalizeText(parsed.phone, 50),
    normalizedPhone,
    email: normalizeText(parsed.email, 320),
    normalizedEmail,
    preferredContactMethod: parsed.preferredContactMethod ?? 'any',
    contactPermission: parsed.contactPermission ? 1 : 0,
    marketingConsent: parsed.marketingConsent ? 1 : 0,
    consentTimestamp: hasConsent ? toMysqlDateTime(new Date()) : null,
    privacyPolicyVersion: normalizeText(parsed.privacyPolicyVersion, 40),
    duplicateOfLeadId: input.duplicateOfLeadId ?? null,
    duplicateReason: input.duplicateOfLeadId ? 'normalized_phone_or_email_match' : null,
    notes: normalizeText(parsed.notes, 2000),
  };
}

async function resolveLeadCaptureContext(
  input: CaptureBuyerLeadInput,
): Promise<LeadCaptureContext> {
  const explicitSource = input.sourceType ?? null;
  const fallback: LeadCaptureContext = {
    sessionId: input.sessionId ?? null,
    campaignId: input.campaignId ?? null,
    sourceType: explicitSource ?? 'direct',
  };

  if (!input.sessionToken && !input.sessionId) return fallback;

  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [session] = await db
    .select({
      id: leadFunnelSessions.id,
      campaignId: leadFunnelSessions.campaignId,
      sourceType: leadFunnelSessions.sourceType,
    })
    .from(leadFunnelSessions)
    .where(
      input.sessionId
        ? eq(leadFunnelSessions.id, input.sessionId)
        : eq(leadFunnelSessions.sessionToken, input.sessionToken as string),
    )
    .limit(1);

  if (!session) throw new Error('Lead funnel session not found');

  return {
    sessionId: Number(session.id),
    campaignId: input.campaignId ?? (session.campaignId ? Number(session.campaignId) : null),
    sourceType: explicitSource ?? session.sourceType,
  };
}

async function findExistingDuplicate(input: {
  normalizedPhone?: string | null;
  normalizedEmail?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const conditions = [];
  if (input.normalizedPhone) conditions.push(eq(buyerLeads.normalizedPhone, input.normalizedPhone));
  if (input.normalizedEmail) conditions.push(eq(buyerLeads.normalizedEmail, input.normalizedEmail));
  if (!conditions.length) return null;

  const [lead] = await db
    .select({
      id: buyerLeads.id,
      normalizedPhone: buyerLeads.normalizedPhone,
      normalizedEmail: buyerLeads.normalizedEmail,
      campaignId: buyerLeads.campaignId,
      createdAt: buyerLeads.createdAt,
    })
    .from(buyerLeads)
    .where(conditions.length === 1 ? conditions[0] : or(...conditions))
    .limit(1);

  return lead ?? null;
}

export async function captureBuyerLead(
  input: CaptureBuyerLeadInput,
): Promise<CaptureBuyerLeadResult> {
  const parsed = CaptureBuyerLeadInputSchema.parse(input);
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const context = await resolveLeadCaptureContext(parsed);
  const normalizedPhone = normalizeLeadPhone(parsed.phone);
  const normalizedEmail = normalizeLeadEmail(parsed.email);
  const duplicate = await findExistingDuplicate({ normalizedPhone, normalizedEmail });
  const payload = buildBuyerLeadPayload({
    context,
    lead: parsed,
    duplicateOfLeadId: duplicate?.id ? Number(duplicate.id) : null,
  });

  const insertResult = await db.insert(buyerLeads).values(payload);
  const buyerLeadId = Number((insertResult as any)?.[0]?.insertId || 0);
  if (!buyerLeadId) throw new Error('Failed to capture buyer lead');

  if (context.sessionId) {
    await db
      .update(leadFunnelSessions)
      .set({
        status: duplicate ? 'duplicate' : 'converted',
        convertedAt: toMysqlDateTime(new Date()),
      })
      .where(eq(leadFunnelSessions.id, context.sessionId));
  }

  await db.insert(leadEvents).values({
    buyerLeadId,
    sessionId: context.sessionId,
    campaignId: context.campaignId,
    sourceType: context.sourceType,
    eventType: 'lead_captured',
    payload: {
      duplicateOfLeadId: duplicate?.id ? Number(duplicate.id) : null,
      preferredContactMethod: parsed.preferredContactMethod,
      contactPermission: parsed.contactPermission,
      marketingConsent: parsed.marketingConsent,
      metadata: parsed.metadata ?? null,
    },
  });

  if (duplicate?.id) {
    await db.insert(leadEvents).values({
      buyerLeadId,
      sessionId: context.sessionId,
      campaignId: context.campaignId,
      sourceType: context.sourceType,
      eventType: 'duplicate_detected',
      payload: {
        duplicateOfLeadId: Number(duplicate.id),
        normalizedPhone,
        normalizedEmail,
      },
    });
  }

  return {
    buyerLeadId,
    duplicateOfLeadId: duplicate?.id ? Number(duplicate.id) : null,
    status: duplicate ? 'duplicate' : 'new',
    sessionId: context.sessionId,
    campaignId: context.campaignId,
    sourceType: context.sourceType,
  };
}
