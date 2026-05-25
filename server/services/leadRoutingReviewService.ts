import { and, desc, eq, sql } from 'drizzle-orm';
import {
  buyerLeads,
  buyerQualificationProfiles,
  leadCampaigns,
  leadDevelopmentMatches,
  leadRoutingDecisions,
} from '../../drizzle/schema';
import { getDb } from '../db';
import {
  type BuyerLeadStatus,
  type LeadRoutingOutcome,
  type LeadSourceType,
} from '../../shared/leadRouting';

export type LeadReviewListInput = {
  status?: BuyerLeadStatus | null;
  sourceType?: LeadSourceType | null;
  routingOutcome?: LeadRoutingOutcome | null;
  limit?: number;
  offset?: number;
};

export type LeadReviewSummary = {
  id: number;
  fullName: string;
  phone: string | null;
  email: string | null;
  status: BuyerLeadStatus;
  sourceType: LeadSourceType;
  campaignId: number | null;
  campaignTitle: string | null;
  preferredContactMethod: string;
  contactPermission: boolean;
  marketingConsent: boolean;
  duplicateOfLeadId: number | null;
  createdAt: string;
  latestRoutingOutcome: LeadRoutingOutcome | null;
  latestRoutingOwnerType: string | null;
  latestRoutingReason: string | null;
  preferredLocation: string | null;
  grossMonthlyIncomeRange: string | null;
};

export type LeadReviewDetail = LeadReviewSummary & {
  notes: string | null;
  privacyPolicyVersion: string | null;
  qualification: {
    grossMonthlyIncome: number | null;
    grossMonthlyIncomeRange: string | null;
    coApplicantIncome: number | null;
    employmentType: string | null;
    buyingMode: string;
    preferredProvince: string | null;
    preferredCity: string | null;
    preferredSuburb: string | null;
    creditReportStatus: string | null;
    buyingTimeline: string | null;
  } | null;
  routingDecisions: Array<{
    id: number;
    outcome: LeadRoutingOutcome;
    ownerType: string;
    ownerId: number | null;
    assignedUserId: number | null;
    developmentId: number | null;
    selectedMatchId: number | null;
    reason: string | null;
    createdAt: string;
  }>;
  matches: Array<{
    id: number;
    developmentId: number;
    matchScore: number;
    matchLabel: string;
    incomeEligible: boolean;
    locationMatch: boolean;
    campaignEligible: boolean;
    distributionReady: boolean;
    submissionAllowed: boolean;
    selectedByBuyer: boolean;
    createdAt: string;
  }>;
};

function boolFromTinyInt(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatPreferredLocation(input: {
  province?: string | null;
  city?: string | null;
  suburb?: string | null;
}): string | null {
  const parts = [input.suburb, input.city, input.province]
    .map(part => String(part ?? '').trim())
    .filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

export function normalizeLeadReviewSummaryRow(row: any): LeadReviewSummary {
  return {
    id: Number(row.id),
    fullName: String(row.fullName ?? ''),
    phone: row.phone ?? null,
    email: row.email ?? null,
    status: row.status,
    sourceType: row.sourceType,
    campaignId: numberOrNull(row.campaignId),
    campaignTitle: row.campaignTitle ?? null,
    preferredContactMethod: row.preferredContactMethod ?? 'any',
    contactPermission: boolFromTinyInt(row.contactPermission),
    marketingConsent: boolFromTinyInt(row.marketingConsent),
    duplicateOfLeadId: numberOrNull(row.duplicateOfLeadId),
    createdAt: String(row.createdAt ?? ''),
    latestRoutingOutcome: row.latestRoutingOutcome ?? null,
    latestRoutingOwnerType: row.latestRoutingOwnerType ?? null,
    latestRoutingReason: row.latestRoutingReason ?? null,
    preferredLocation: formatPreferredLocation({
      province: row.preferredProvince,
      city: row.preferredCity,
      suburb: row.preferredSuburb,
    }),
    grossMonthlyIncomeRange: row.grossMonthlyIncomeRange ?? null,
  };
}

export async function listLeadReviewItems(
  input: LeadReviewListInput = {},
): Promise<{ items: LeadReviewSummary[]; limit: number; offset: number }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const limit = Math.max(1, Math.min(input.limit ?? 50, 100));
  const offset = Math.max(0, input.offset ?? 0);
  const conditions = [];
  if (input.status) conditions.push(eq(buyerLeads.status, input.status));
  if (input.sourceType) conditions.push(eq(buyerLeads.sourceType, input.sourceType));
  if (input.routingOutcome) conditions.push(eq(leadRoutingDecisions.outcome, input.routingOutcome));

  const rows = await db
    .select({
      id: buyerLeads.id,
      fullName: buyerLeads.fullName,
      phone: buyerLeads.phone,
      email: buyerLeads.email,
      status: buyerLeads.status,
      sourceType: buyerLeads.sourceType,
      campaignId: buyerLeads.campaignId,
      campaignTitle: leadCampaigns.title,
      preferredContactMethod: buyerLeads.preferredContactMethod,
      contactPermission: buyerLeads.contactPermission,
      marketingConsent: buyerLeads.marketingConsent,
      duplicateOfLeadId: buyerLeads.duplicateOfLeadId,
      createdAt: buyerLeads.createdAt,
      latestRoutingOutcome: leadRoutingDecisions.outcome,
      latestRoutingOwnerType: leadRoutingDecisions.ownerType,
      latestRoutingReason: leadRoutingDecisions.reason,
      preferredProvince: buyerQualificationProfiles.preferredProvince,
      preferredCity: buyerQualificationProfiles.preferredCity,
      preferredSuburb: buyerQualificationProfiles.preferredSuburb,
      grossMonthlyIncomeRange: buyerQualificationProfiles.grossMonthlyIncomeRange,
    })
    .from(buyerLeads)
    .leftJoin(leadCampaigns, eq(buyerLeads.campaignId, leadCampaigns.id))
    .leftJoin(buyerQualificationProfiles, eq(buyerQualificationProfiles.buyerLeadId, buyerLeads.id))
    .leftJoin(leadRoutingDecisions, eq(leadRoutingDecisions.buyerLeadId, buyerLeads.id))
    .where(conditions.length ? and(...conditions) : sql`1 = 1`)
    .orderBy(desc(buyerLeads.createdAt), desc(leadRoutingDecisions.createdAt))
    .limit(limit * 3)
    .offset(offset);

  const seen = new Set<number>();
  const items: LeadReviewSummary[] = [];
  for (const row of rows) {
    const id = Number(row.id);
    if (seen.has(id)) continue;
    seen.add(id);
    items.push(normalizeLeadReviewSummaryRow(row));
    if (items.length >= limit) break;
  }

  return { items, limit, offset };
}

export async function getLeadReviewDetail(buyerLeadId: number): Promise<LeadReviewDetail | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [leadRow] = await db
    .select({
      id: buyerLeads.id,
      fullName: buyerLeads.fullName,
      phone: buyerLeads.phone,
      email: buyerLeads.email,
      status: buyerLeads.status,
      sourceType: buyerLeads.sourceType,
      campaignId: buyerLeads.campaignId,
      campaignTitle: leadCampaigns.title,
      preferredContactMethod: buyerLeads.preferredContactMethod,
      contactPermission: buyerLeads.contactPermission,
      marketingConsent: buyerLeads.marketingConsent,
      duplicateOfLeadId: buyerLeads.duplicateOfLeadId,
      createdAt: buyerLeads.createdAt,
      notes: buyerLeads.notes,
      privacyPolicyVersion: buyerLeads.privacyPolicyVersion,
      latestRoutingOutcome: leadRoutingDecisions.outcome,
      latestRoutingOwnerType: leadRoutingDecisions.ownerType,
      latestRoutingReason: leadRoutingDecisions.reason,
      preferredProvince: buyerQualificationProfiles.preferredProvince,
      preferredCity: buyerQualificationProfiles.preferredCity,
      preferredSuburb: buyerQualificationProfiles.preferredSuburb,
      grossMonthlyIncome: buyerQualificationProfiles.grossMonthlyIncome,
      grossMonthlyIncomeRange: buyerQualificationProfiles.grossMonthlyIncomeRange,
      coApplicantIncome: buyerQualificationProfiles.coApplicantIncome,
      employmentType: buyerQualificationProfiles.employmentType,
      buyingMode: buyerQualificationProfiles.buyingMode,
      creditReportStatus: buyerQualificationProfiles.creditReportStatus,
      buyingTimeline: buyerQualificationProfiles.buyingTimeline,
    })
    .from(buyerLeads)
    .leftJoin(leadCampaigns, eq(buyerLeads.campaignId, leadCampaigns.id))
    .leftJoin(buyerQualificationProfiles, eq(buyerQualificationProfiles.buyerLeadId, buyerLeads.id))
    .leftJoin(leadRoutingDecisions, eq(leadRoutingDecisions.buyerLeadId, buyerLeads.id))
    .where(eq(buyerLeads.id, buyerLeadId))
    .orderBy(desc(leadRoutingDecisions.createdAt))
    .limit(1);

  if (!leadRow) return null;

  const [routingRows, matchRows] = await Promise.all([
    db
      .select({
        id: leadRoutingDecisions.id,
        outcome: leadRoutingDecisions.outcome,
        ownerType: leadRoutingDecisions.ownerType,
        ownerId: leadRoutingDecisions.ownerId,
        assignedUserId: leadRoutingDecisions.assignedUserId,
        developmentId: leadRoutingDecisions.developmentId,
        selectedMatchId: leadRoutingDecisions.selectedMatchId,
        reason: leadRoutingDecisions.reason,
        createdAt: leadRoutingDecisions.createdAt,
      })
      .from(leadRoutingDecisions)
      .where(eq(leadRoutingDecisions.buyerLeadId, buyerLeadId))
      .orderBy(desc(leadRoutingDecisions.createdAt)),
    db
      .select({
        id: leadDevelopmentMatches.id,
        developmentId: leadDevelopmentMatches.developmentId,
        matchScore: leadDevelopmentMatches.matchScore,
        matchLabel: leadDevelopmentMatches.matchLabel,
        incomeEligible: leadDevelopmentMatches.incomeEligible,
        locationMatch: leadDevelopmentMatches.locationMatch,
        campaignEligible: leadDevelopmentMatches.campaignEligible,
        distributionReady: leadDevelopmentMatches.distributionReady,
        submissionAllowed: leadDevelopmentMatches.submissionAllowed,
        selectedByBuyer: leadDevelopmentMatches.selectedByBuyer,
        createdAt: leadDevelopmentMatches.createdAt,
      })
      .from(leadDevelopmentMatches)
      .where(eq(leadDevelopmentMatches.buyerLeadId, buyerLeadId))
      .orderBy(desc(leadDevelopmentMatches.matchScore)),
  ]);

  const summary = normalizeLeadReviewSummaryRow(leadRow);

  return {
    ...summary,
    notes: leadRow.notes ?? null,
    privacyPolicyVersion: leadRow.privacyPolicyVersion ?? null,
    qualification: leadRow.buyingMode
      ? {
          grossMonthlyIncome: numberOrNull(leadRow.grossMonthlyIncome),
          grossMonthlyIncomeRange: leadRow.grossMonthlyIncomeRange ?? null,
          coApplicantIncome: numberOrNull(leadRow.coApplicantIncome),
          employmentType: leadRow.employmentType ?? null,
          buyingMode: leadRow.buyingMode,
          preferredProvince: leadRow.preferredProvince ?? null,
          preferredCity: leadRow.preferredCity ?? null,
          preferredSuburb: leadRow.preferredSuburb ?? null,
          creditReportStatus: leadRow.creditReportStatus ?? null,
          buyingTimeline: leadRow.buyingTimeline ?? null,
        }
      : null,
    routingDecisions: routingRows.map(row => ({
      id: Number(row.id),
      outcome: row.outcome,
      ownerType: row.ownerType,
      ownerId: numberOrNull(row.ownerId),
      assignedUserId: numberOrNull(row.assignedUserId),
      developmentId: numberOrNull(row.developmentId),
      selectedMatchId: numberOrNull(row.selectedMatchId),
      reason: row.reason ?? null,
      createdAt: String(row.createdAt ?? ''),
    })),
    matches: matchRows.map(row => ({
      id: Number(row.id),
      developmentId: Number(row.developmentId),
      matchScore: Number(row.matchScore ?? 0),
      matchLabel: row.matchLabel,
      incomeEligible: boolFromTinyInt(row.incomeEligible),
      locationMatch: boolFromTinyInt(row.locationMatch),
      campaignEligible: boolFromTinyInt(row.campaignEligible),
      distributionReady: boolFromTinyInt(row.distributionReady),
      submissionAllowed: boolFromTinyInt(row.submissionAllowed),
      selectedByBuyer: boolFromTinyInt(row.selectedByBuyer),
      createdAt: String(row.createdAt ?? ''),
    })),
  };
}
