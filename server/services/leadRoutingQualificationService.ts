import { and, desc, eq, isNull } from 'drizzle-orm';
import {
  buyerLeads,
  buyerQualificationProfiles,
  leadEvents,
  leadFunnelSessions,
} from '../../drizzle/schema';
import { getDb } from '../db';
import {
  QualificationProfileAnswersSchema,
  type QualificationProfileAnswers,
  type SaveQualificationProfileInput,
} from '../../shared/leadRouting';

type BuyerQualificationProfileInsert = typeof buyerQualificationProfiles.$inferInsert;
type BuyerQualificationProfileUpdate = Partial<BuyerQualificationProfileInsert>;

export type QualificationProfileContext = {
  sessionId: number | null;
  buyerLeadId: number | null;
  campaignId: number | null;
  sourceType: (typeof leadFunnelSessions.$inferSelect)['sourceType'];
};

export type SaveQualificationProfileResult = {
  profileId: number;
  sessionId: number | null;
  buyerLeadId: number | null;
  campaignId: number | null;
  sourceType: QualificationProfileContext['sourceType'];
  created: boolean;
};

function normalizeText(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

function normalizeOptionalInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return null;
  return Math.max(0, Math.trunc(numberValue));
}

function normalizeTargetPrices(input: {
  targetPriceMin?: number | null;
  targetPriceMax?: number | null;
}) {
  const min = normalizeOptionalInt(input.targetPriceMin);
  const max = normalizeOptionalInt(input.targetPriceMax);
  if (min !== null && max !== null && min > max) {
    return { targetPriceMin: max, targetPriceMax: min };
  }
  return { targetPriceMin: min, targetPriceMax: max };
}

export function normalizeQualificationProfileAnswers(
  input: QualificationProfileAnswers,
): QualificationProfileAnswers {
  const parsed = QualificationProfileAnswersSchema.parse(input);
  const targetPrices = normalizeTargetPrices(parsed);

  return {
    grossMonthlyIncome: normalizeOptionalInt(parsed.grossMonthlyIncome),
    grossMonthlyIncomeRange: normalizeText(parsed.grossMonthlyIncomeRange, 80),
    coApplicantIncome: normalizeOptionalInt(parsed.coApplicantIncome),
    employmentType: parsed.employmentType ?? null,
    buyingMode: parsed.buyingMode ?? 'unsure',
    preferredProvince: normalizeText(parsed.preferredProvince, 100),
    preferredCity: normalizeText(parsed.preferredCity, 100),
    preferredSuburb: normalizeText(parsed.preferredSuburb, 100),
    targetPriceMin: targetPrices.targetPriceMin,
    targetPriceMax: targetPrices.targetPriceMax,
    creditReportStatus: parsed.creditReportStatus ?? null,
    buyingTimeline: normalizeText(parsed.buyingTimeline, 120),
    estimatedBondAmount: normalizeOptionalInt(parsed.estimatedBondAmount),
    metadata: parsed.metadata ?? null,
  };
}

export function buildQualificationProfilePayload(input: {
  context: QualificationProfileContext;
  answers: QualificationProfileAnswers;
}): BuyerQualificationProfileInsert {
  const answers = normalizeQualificationProfileAnswers(input.answers);

  return {
    sessionId: input.context.sessionId,
    buyerLeadId: input.context.buyerLeadId,
    grossMonthlyIncome: answers.grossMonthlyIncome ?? null,
    grossMonthlyIncomeRange: answers.grossMonthlyIncomeRange ?? null,
    coApplicantIncome: answers.coApplicantIncome ?? null,
    employmentType: answers.employmentType ?? null,
    buyingMode: answers.buyingMode ?? 'unsure',
    preferredProvince: answers.preferredProvince ?? null,
    preferredCity: answers.preferredCity ?? null,
    preferredSuburb: answers.preferredSuburb ?? null,
    targetPriceMin: answers.targetPriceMin ?? null,
    targetPriceMax: answers.targetPriceMax ?? null,
    creditReportStatus: answers.creditReportStatus ?? null,
    buyingTimeline: answers.buyingTimeline ?? null,
    estimatedBondAmount: answers.estimatedBondAmount ?? null,
    metadata: answers.metadata ?? null,
  };
}

async function resolveQualificationContext(input: {
  sessionToken?: string | null;
  sessionId?: number | null;
  buyerLeadId?: number | null;
}): Promise<QualificationProfileContext> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const buyerLeadId = input.buyerLeadId ? Number(input.buyerLeadId) : null;
  if (buyerLeadId) {
    const [lead] = await db
      .select({
        id: buyerLeads.id,
        sessionId: buyerLeads.sessionId,
        campaignId: buyerLeads.campaignId,
        sourceType: buyerLeads.sourceType,
      })
      .from(buyerLeads)
      .where(eq(buyerLeads.id, buyerLeadId))
      .limit(1);

    if (!lead) throw new Error('Buyer lead not found');
    return {
      sessionId: lead.sessionId ? Number(lead.sessionId) : null,
      buyerLeadId: Number(lead.id),
      campaignId: lead.campaignId ? Number(lead.campaignId) : null,
      sourceType: lead.sourceType,
    };
  }

  const sessionId = input.sessionId ? Number(input.sessionId) : null;
  const token = normalizeText(input.sessionToken, 96);
  if (!sessionId && !token) {
    throw new Error('A session or buyer lead is required');
  }

  const [session] = await db
    .select({
      id: leadFunnelSessions.id,
      campaignId: leadFunnelSessions.campaignId,
      sourceType: leadFunnelSessions.sourceType,
    })
    .from(leadFunnelSessions)
    .where(
      sessionId
        ? eq(leadFunnelSessions.id, sessionId)
        : eq(leadFunnelSessions.sessionToken, token as string),
    )
    .limit(1);

  if (!session) throw new Error('Lead funnel session not found');

  return {
    sessionId: Number(session.id),
    buyerLeadId: null,
    campaignId: session.campaignId ? Number(session.campaignId) : null,
    sourceType: session.sourceType,
  };
}

async function findExistingQualificationProfile(context: QualificationProfileContext) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const whereClause = context.buyerLeadId
    ? eq(buyerQualificationProfiles.buyerLeadId, context.buyerLeadId)
    : context.sessionId
      ? and(
          eq(buyerQualificationProfiles.sessionId, context.sessionId),
          isNull(buyerQualificationProfiles.buyerLeadId),
        )
      : undefined;

  if (!whereClause) return null;

  const [profile] = await db
    .select({ id: buyerQualificationProfiles.id })
    .from(buyerQualificationProfiles)
    .where(whereClause)
    .orderBy(desc(buyerQualificationProfiles.updatedAt))
    .limit(1);

  return profile ?? null;
}

export async function saveQualificationProfile(
  input: SaveQualificationProfileInput,
): Promise<SaveQualificationProfileResult> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const context = await resolveQualificationContext(input);
  const payload = buildQualificationProfilePayload({ context, answers: input });
  const existing = await findExistingQualificationProfile(context);

  let profileId: number;
  let created = false;

  if (existing?.id) {
    await db
      .update(buyerQualificationProfiles)
      .set(payload as BuyerQualificationProfileUpdate)
      .where(eq(buyerQualificationProfiles.id, Number(existing.id)));
    profileId = Number(existing.id);
  } else {
    const insertResult = await db.insert(buyerQualificationProfiles).values(payload);
    profileId = Number((insertResult as any)?.[0]?.insertId || 0);
    created = true;
  }

  if (!profileId) {
    throw new Error('Failed to save qualification profile');
  }

  await db.insert(leadEvents).values({
    buyerLeadId: context.buyerLeadId,
    sessionId: context.sessionId,
    campaignId: context.campaignId,
    sourceType: context.sourceType,
    eventType: 'qualification_completed',
    payload: {
      profileId,
      created,
      answers: normalizeQualificationProfileAnswers(input),
    },
  });

  return {
    profileId,
    sessionId: context.sessionId,
    buyerLeadId: context.buyerLeadId,
    campaignId: context.campaignId,
    sourceType: context.sourceType,
    created,
  };
}
