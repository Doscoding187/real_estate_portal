import { TRPCError } from '@trpc/server';
import { and, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import {
  distributionAgentAccess,
  distributionDealEvents,
  distributionDeals,
  distributionManagerAssignments,
  distributionPrograms,
  referralAssessments,
  referralDocuments,
  referralMatches,
  referrals,
  users,
} from '../drizzle/schema';
import { ENV } from './_core/env';
import { agentProcedure, publicProcedure, router } from './_core/trpc';
import { getDb } from './db';
import {
  REQUIRED_DOCUMENT_CHECKLIST,
  confidenceLevelHint,
  computeQuickQualification,
  deriveConfidenceLevel,
  generateReferralReference,
  listAccessibleDevelopmentCandidates,
  matchDevelopments,
  renderReferralPdfHtml,
  type DevelopmentCandidate,
  type PdfTemplateInput,
  type QuickQualificationInput,
  type QuickQualificationResult,
  type RankedReferralMatch,
  type ReferralConfidenceLevel,
  type ReferralQualificationMode,
  type ReferralReadinessStatus,
} from './services/referralQualificationService';
import { getAffordabilityConfigSnapshot } from './services/affordabilityConfigService';

type ReferralStatus = (typeof referrals.status.enumValues)[number];
const QUAL_MODE_VALUES = ['quick_qual', 'verified_qual'] as const;
const DOCUMENT_TYPE_VALUES = [
  'payslip',
  'bank_statement',
  'credit_report',
  'id_document',
  'proof_of_address',
  'other',
 ] as const;

type DocumentType = (typeof DOCUMENT_TYPE_VALUES)[number];
type QualificationMode = (typeof QUAL_MODE_VALUES)[number];
const DISTRIBUTION_PROGRAM_COMMISSION_TYPE_VALUES = ['flat', 'percentage'] as const;
const DISTRIBUTION_PROGRAM_COMMISSION_BASIS_VALUES = ['sale_price', 'base_price'] as const;
type ProgramCommissionType = (typeof DISTRIBUTION_PROGRAM_COMMISSION_TYPE_VALUES)[number];
type ProgramCommissionBasis = (typeof DISTRIBUTION_PROGRAM_COMMISSION_BASIS_VALUES)[number];
type ProgramCommissionTrack = {
  type: ProgramCommissionType;
  value: number;
  basis: ProgramCommissionBasis | null;
};

const secureTokenTtlDaysDefault = 7;
const secureTokenTtlDaysMax = 30;

const quickQualificationInputSchema = z.object({
  mode: z.enum(QUAL_MODE_VALUES).default('quick_qual'),
  client: z.object({
    name: z.string().trim().min(2).max(200),
    email: z.string().trim().email().max(320).nullable().optional(),
    phone: z.string().trim().max(50).nullable().optional(),
    preferredAreas: z.array(z.string().trim().min(1).max(120)).min(1).max(10),
  }),
  financial: z.object({
    grossMonthlyIncome: z.number().positive(),
    monthlyDebts: z.number().nonnegative().nullable().optional(),
    monthlyExpenses: z.number().nonnegative().nullable().optional(),
    dependents: z.number().int().min(0).max(12).nullable().optional(),
    depositAmount: z.number().nonnegative().nullable().optional(),
    employmentType: z.string().trim().max(64).nullable().optional(),
    docsUploaded: z.number().int().min(0).max(20).nullable().optional(),
  }),
});

function assertDistributionEnabled() {
  if (!ENV.distributionNetworkEnabled) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message:
        'Distribution Network is disabled. Set FEATURE_DISTRIBUTION_NETWORK=true to enable this module.',
    });
  }
}

function normalizePreferredAreas(areas: string[]) {
  return Array.from(
    new Set(
      areas
        .map(area => String(area || '').trim())
        .filter(Boolean),
    ),
  ).slice(0, 10);
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function toNumberOrNull(value: unknown) {
  if (value === null || typeof value === 'undefined') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric;
}

function normalizeCommissionType(
  value: unknown,
  fallback: ProgramCommissionType = 'flat',
): ProgramCommissionType {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'flat' || normalized === 'percentage') {
    return normalized;
  }
  return fallback;
}

function normalizeCommissionBasis(
  value: unknown,
  type: ProgramCommissionType,
  fallback: ProgramCommissionBasis = 'sale_price',
): ProgramCommissionBasis | null {
  if (type !== 'percentage') return null;
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'sale_price' || normalized === 'base_price') {
    return normalized;
  }
  return fallback;
}

function resolveReferrerCommissionTrackFromProgram(program: {
  commissionModel?: unknown;
  defaultCommissionPercent?: unknown;
  defaultCommissionAmount?: unknown;
  referrerCommissionType?: unknown;
  referrerCommissionValue?: unknown;
  referrerCommissionBasis?: unknown;
}): ProgramCommissionTrack {
  const model = String(program.commissionModel || '')
    .trim()
    .toLowerCase();
  const defaultPercent = Math.max(0, toNumberOrNull(program.defaultCommissionPercent) ?? 0);
  const defaultAmount = Math.max(0, toNumberOrNull(program.defaultCommissionAmount) ?? 0);
  const legacyType: ProgramCommissionType =
    model === 'flat_percentage' || model === 'tiered_percentage' || (model === 'hybrid' && defaultPercent > 0)
      ? 'percentage'
      : 'flat';
  const legacyValue = legacyType === 'percentage' ? defaultPercent : defaultAmount;

  const type = normalizeCommissionType(program.referrerCommissionType, legacyType);
  const value = Math.max(0, toNumberOrNull(program.referrerCommissionValue) ?? legacyValue);
  const basis = normalizeCommissionBasis(program.referrerCommissionBasis, type, 'sale_price');
  return {
    type,
    value,
    basis,
  };
}

function estimateCommissionAmount(track: ProgramCommissionTrack, baseAmount: number) {
  const normalizedBase = Math.max(0, Math.round(baseAmount));
  if (track.type === 'percentage') {
    return Math.max(0, Math.round((normalizedBase * Math.max(0, track.value)) / 100));
  }
  return Math.max(0, Math.round(track.value));
}

function normalizeConfidenceLevel(
  level: unknown,
  confidenceScore: number | null | undefined,
): ReferralConfidenceLevel {
  const normalized = String(level || '').trim().toLowerCase();
  if (normalized === 'low' || normalized === 'medium' || normalized === 'high' || normalized === 'verified') {
    return normalized as ReferralConfidenceLevel;
  }
  return deriveConfidenceLevel(Number(confidenceScore || 0));
}

function readinessToStatus(readinessStatus: ReferralReadinessStatus): ReferralStatus {
  if (readinessStatus === 'quick_estimate') return 'quick';
  if (readinessStatus === 'awaiting_documents') return 'awaiting_documents';
  if (readinessStatus === 'under_review') return 'under_review';
  if (readinessStatus === 'verified_estimate') return 'verified';
  if (readinessStatus === 'matched_to_development') return 'verified';
  return 'submitted';
}

function statusLabel(status: ReferralStatus) {
  if (status === 'quick') return 'Quick';
  if (status === 'awaiting_documents') return 'Awaiting Docs';
  if (status === 'under_review') return 'Under Review';
  if (status === 'verified') return 'Verified';
  if (status === 'submitted') return 'Submitted to Dev';
  return 'Viewing Booked';
}

function splitMatches(matches: RankedReferralMatch[]) {
  return {
    preferred: matches.filter(match => match.matchBucket === 'preferred_area'),
    nearby: matches.filter(match => match.matchBucket === 'nearby_area'),
    other: matches.filter(
      match => match.matchBucket === 'other_area' || match.matchBucket === 'fallback_area',
    ),
  };
}

function normalizeMatchBucket(value: unknown): RankedReferralMatch['matchBucket'] {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'preferred_area') return 'preferred_area';
  if (normalized === 'nearby_area') return 'nearby_area';
  if (normalized === 'other_area') return 'other_area';
  return 'fallback_area';
}

function buildQuickInput(input: z.infer<typeof quickQualificationInputSchema>): QuickQualificationInput {
  return {
    mode: input.mode,
    grossMonthlyIncome: input.financial.grossMonthlyIncome,
    preferredAreas: normalizePreferredAreas(input.client.preferredAreas),
    monthlyDebts: input.financial.monthlyDebts ?? null,
    monthlyExpenses: input.financial.monthlyExpenses ?? null,
    dependents: input.financial.dependents ?? null,
    depositAmount: input.financial.depositAmount ?? null,
    employmentType: input.financial.employmentType ?? null,
    docsUploaded: input.financial.docsUploaded ?? null,
  };
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(value);
}

function buildPdfPayload(params: {
  referral: {
    referenceCode: string;
    clientName: string;
    clientEmail: string | null;
    clientPhone: string | null;
  };
  assessment: {
    mode: QualificationMode;
    affordabilityMin: number;
    affordabilityMax: number;
    confidenceScore: number;
    confidenceLevel: ReferralConfidenceLevel;
    assumptions: string[];
  };
  matches: RankedReferralMatch[];
  uploadLink: string | null;
  agent: { name: string | null; email: string | null; phone: string | null };
}): PdfTemplateInput {
  return {
    clientName: params.referral.clientName,
    referenceCode: params.referral.referenceCode,
    generatedAtIso: new Date().toISOString(),
    affordabilityMin: params.assessment.affordabilityMin,
    affordabilityMax: params.assessment.affordabilityMax,
    mode: params.assessment.mode,
    confidenceScore: params.assessment.confidenceScore,
    confidenceLevel: params.assessment.confidenceLevel,
    confidenceHint: confidenceLevelHint(params.assessment.confidenceLevel),
    assumptions: params.assessment.assumptions,
    matches: params.matches,
    uploadLink: params.uploadLink,
    agentName: params.agent.name,
    agentEmail: params.agent.email,
    agentPhone: params.agent.phone,
  };
}

function normalizeAssessmentAssumptions(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(item => String(item || '').trim()).filter(Boolean);
      }
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeAssessmentMatches(rows: any[]): RankedReferralMatch[] {
  return rows.map(row => ({
    programId: Number(row.programId || 0),
    developmentId: Number(row.developmentId || 0),
    developmentName: String(row.developmentName || 'Development'),
    areaLabel: row.areaLabel ? String(row.areaLabel) : null,
    rankScore: Number(row.rankScore || 0),
    rankPosition: Number(row.rankPosition || 0),
    matchBucket: normalizeMatchBucket(row.matchBucket),
    matchReasons: Array.isArray(row.matchReasons) ? row.matchReasons.map((reason: any) => String(reason)) : [],
    qualifyingUnitTypes: Array.isArray(row.qualifyingUnitTypes)
      ? row.qualifyingUnitTypes.map((unit: any) => ({
          name: String(unit?.name || ''),
          bedrooms: typeof unit?.bedrooms === 'number' ? unit.bedrooms : null,
          priceFrom: typeof unit?.priceFrom === 'number' ? unit.priceFrom : null,
          priceTo: typeof unit?.priceTo === 'number' ? unit.priceTo : null,
        }))
      : [],
    estimatedEntryPrice:
      typeof row.estimatedEntryPrice === 'number' ? Number(row.estimatedEntryPrice) : null,
  }));
}

async function resolveOwnedReferral(db: any, referralId: number, user: { id: number; role: string }) {
  const [referral] = await db
    .select({
      id: referrals.id,
      referenceCode: referrals.referenceCode,
      agentId: referrals.agentId,
      clientName: referrals.clientName,
      clientEmail: referrals.clientEmail,
      clientPhone: referrals.clientPhone,
      preferredAreas: referrals.preferredAreas,
      status: referrals.status,
      latestAssessmentId: referrals.latestAssessmentId,
      latestAssessmentVersion: referrals.latestAssessmentVersion,
      latestMode: referrals.latestMode,
      latestConfidenceScore: referrals.latestConfidenceScore,
      latestAffordabilityMin: referrals.latestAffordabilityMin,
      latestAffordabilityMax: referrals.latestAffordabilityMax,
      latestMonthlyPaymentEstimate: referrals.latestMonthlyPaymentEstimate,
      lastSubmittedDealId: referrals.lastSubmittedDealId,
      submittedAt: referrals.submittedAt,
      createdAt: referrals.createdAt,
      updatedAt: referrals.updatedAt,
    })
    .from(referrals)
    .where(eq(referrals.id, referralId))
    .limit(1);

  if (!referral) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Referral not found.',
    });
  }

  if (user.role !== 'super_admin' && Number(referral.agentId) !== Number(user.id)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have access to this referral.',
    });
  }

  return referral;
}

async function createAssessmentAndMatches(params: {
  db: any;
  referralId: number;
  mode: QualificationMode;
  quickResult: QuickQualificationResult;
  preferredAreas: string[];
  clientSnapshot: Record<string, unknown>;
  financialSnapshot: Record<string, unknown>;
  candidates: DevelopmentCandidate[];
  createdByUserId: number;
}) {
  const { db, referralId, mode, quickResult, preferredAreas, clientSnapshot, financialSnapshot, candidates } = params;
  const [versionRow] = await db
    .select({ maxVersion: sql<number>`COALESCE(MAX(${referralAssessments.version}), 0)` })
    .from(referralAssessments)
    .where(eq(referralAssessments.referralId, referralId));

  const version = Number(versionRow?.maxVersion || 0) + 1;

  const rankedMatches = matchDevelopments({
    affordabilityMin: quickResult.affordabilityMin,
    affordabilityMax: quickResult.affordabilityMax,
    preferredAreas,
    developments: candidates,
    mode,
  }).slice(0, 24);

  const [assessmentInsert] = await db.insert(referralAssessments).values({
    referralId,
    version,
    mode,
    inputSnapshot: {
      mode,
      client: clientSnapshot,
      financial: financialSnapshot,
    } as any,
    affordabilityMin: quickResult.affordabilityMin,
    affordabilityMax: quickResult.affordabilityMax,
    monthlyPaymentEstimate: quickResult.monthlyPaymentEstimate,
    confidenceScore: quickResult.confidenceScore,
    confidenceLevel: quickResult.confidenceLevel,
    confidenceFactors: quickResult.confidenceFactors as any,
    readinessStatus: quickResult.readinessStatus,
    flags: quickResult.flags as any,
    assumptions: quickResult.assumptions as any,
    improveAccuracy: quickResult.improveAccuracy as any,
    disclaimer: 'Indicative estimate only. Not a final bond approval.',
    documentCount: Math.max(0, Number(financialSnapshot.docsUploaded || 0)),
    matchedDevelopmentCount: rankedMatches.length,
    createdByUserId: params.createdByUserId,
  });
  const assessmentId = Number((assessmentInsert as any).insertId || 0);

  if (assessmentId <= 0) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create referral assessment.',
    });
  }

  if (rankedMatches.length > 0) {
    await db.insert(referralMatches).values(
      rankedMatches.map(match => ({
        referralId,
        assessmentId,
        developmentId: match.developmentId || null,
        developmentName: match.developmentName,
        areaLabel: match.areaLabel,
        rankScore: match.rankScore,
        rankPosition: match.rankPosition,
        matchBucket: match.matchBucket,
        matchReasons: match.matchReasons as any,
        qualifyingUnitTypes: match.qualifyingUnitTypes as any,
        metadata: {
          programId: match.programId,
          estimatedEntryPrice: match.estimatedEntryPrice,
        } as any,
      })),
    );
  }

  return {
    assessmentId,
    version,
    rankedMatches,
  };
}

async function updateReferralLatestSnapshot(params: {
  db: any;
  referralId: number;
  assessmentId: number;
  version: number;
  mode: QualificationMode;
  quickResult: QuickQualificationResult;
  createdByUserId: number;
}) {
  const { db, referralId, assessmentId, version, mode, quickResult, createdByUserId } = params;
  await db
    .update(referrals)
    .set({
      latestAssessmentId: assessmentId,
      latestAssessmentVersion: version,
      latestMode: mode,
      latestConfidenceScore: quickResult.confidenceScore,
      latestAffordabilityMin: quickResult.affordabilityMin,
      latestAffordabilityMax: quickResult.affordabilityMax,
      latestMonthlyPaymentEstimate: quickResult.monthlyPaymentEstimate,
      status: readinessToStatus(quickResult.readinessStatus),
      updatedByUserId: createdByUserId,
    })
    .where(eq(referrals.id, referralId));
}

function resolveUploadUrl(token: string) {
  const appUrl = String(ENV.appUrl || 'http://localhost:5173').replace(/\/$/, '');
  return `${appUrl}/referral-upload/${token}`;
}

export const distributionQualificationRouter = router({
  previewQuick: agentProcedure.input(quickQualificationInputSchema).mutation(async ({ ctx, input }) => {
    assertDistributionEnabled();
    const agentId = Number(ctx.user!.id);
    const affordabilityConfig = await getAffordabilityConfigSnapshot();

    const quickInput = buildQuickInput(input);
    const quickResult = computeQuickQualification(quickInput, affordabilityConfig.config);
    const candidates = await listAccessibleDevelopmentCandidates(agentId);
    const matches = matchDevelopments({
      affordabilityMin: quickResult.affordabilityMin,
      affordabilityMax: quickResult.affordabilityMax,
      preferredAreas: quickInput.preferredAreas,
      developments: candidates,
      mode: input.mode,
    }).slice(0, 18);

    return {
      qualification: {
        ...quickResult,
        affordabilityLabel: `${formatCurrency(quickResult.affordabilityMin)} - ${formatCurrency(quickResult.affordabilityMax)}`,
      },
      matches: splitMatches(matches),
      candidateCount: candidates.length,
    };
  }),

  createReferral: agentProcedure.input(quickQualificationInputSchema).mutation(async ({ ctx, input }) => {
    assertDistributionEnabled();
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const agentId = Number(ctx.user!.id);
    const affordabilityConfig = await getAffordabilityConfigSnapshot();
    const quickInput = buildQuickInput(input);
    const quickResult = computeQuickQualification(quickInput, affordabilityConfig.config);
    const candidates = await listAccessibleDevelopmentCandidates(agentId);
    const preferredAreas = normalizePreferredAreas(input.client.preferredAreas);
    const referenceCode = generateReferralReference(new Date(), randomUUID());

    const [referralInsert] = await db.insert(referrals).values({
      referenceCode,
      agentId,
      clientName: input.client.name.trim(),
      clientEmail: normalizeOptionalText(input.client.email),
      clientPhone: normalizeOptionalText(input.client.phone),
      preferredAreas: preferredAreas as any,
      status: readinessToStatus(quickResult.readinessStatus),
      createdByUserId: agentId,
      updatedByUserId: agentId,
    });

    const referralId = Number((referralInsert as any).insertId || 0);
    if (!referralId) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create referral.',
      });
    }

    const assessment = await createAssessmentAndMatches({
      db,
      referralId,
      mode: input.mode,
      quickResult,
      preferredAreas,
      clientSnapshot: {
        name: input.client.name.trim(),
        email: normalizeOptionalText(input.client.email),
        phone: normalizeOptionalText(input.client.phone),
        preferredAreas,
      },
      financialSnapshot: {
        ...input.financial,
      },
      candidates,
      createdByUserId: agentId,
    });

    await updateReferralLatestSnapshot({
      db,
      referralId,
      assessmentId: assessment.assessmentId,
      version: assessment.version,
      mode: input.mode,
      quickResult,
      createdByUserId: agentId,
    });

    return {
      referralId,
      referenceCode,
      status: readinessToStatus(quickResult.readinessStatus),
      statusLabel: statusLabel(readinessToStatus(quickResult.readinessStatus)),
      latestAssessmentId: assessment.assessmentId,
      latestAssessmentVersion: assessment.version,
      qualification: quickResult,
      matches: splitMatches(assessment.rankedMatches),
    };
  }),

  createAssessmentVersion: agentProcedure
    .input(
      z.object({
        referralId: z.number().int().positive(),
        mode: z.enum(QUAL_MODE_VALUES).default('quick_qual'),
        financial: quickQualificationInputSchema.shape.financial,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const agentId = Number(ctx.user!.id);
      const affordabilityConfig = await getAffordabilityConfigSnapshot();

      const referral = await resolveOwnedReferral(db, input.referralId, {
        id: agentId,
        role: ctx.user!.role,
      });

      const preferredAreasRaw = Array.isArray(referral.preferredAreas)
        ? referral.preferredAreas
        : Array.isArray((referral.preferredAreas as any)?.areas)
          ? (referral.preferredAreas as any).areas
          : [];
      const preferredAreas = normalizePreferredAreas(
        preferredAreasRaw.map((value: unknown) => String(value || '')),
      );
      if (preferredAreas.length === 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Referral has no preferred areas. Edit referral before re-assessment.',
        });
      }

      const quickResult = computeQuickQualification(
        {
          mode: input.mode,
          grossMonthlyIncome: input.financial.grossMonthlyIncome,
          preferredAreas,
          monthlyDebts: input.financial.monthlyDebts ?? null,
          monthlyExpenses: input.financial.monthlyExpenses ?? null,
          dependents: input.financial.dependents ?? null,
          depositAmount: input.financial.depositAmount ?? null,
          employmentType: input.financial.employmentType ?? null,
          docsUploaded: input.financial.docsUploaded ?? null,
        },
        affordabilityConfig.config,
      );

      const candidates = await listAccessibleDevelopmentCandidates(agentId);
      const assessment = await createAssessmentAndMatches({
        db,
        referralId: input.referralId,
        mode: input.mode,
        quickResult,
        preferredAreas,
        clientSnapshot: {
          name: referral.clientName,
          email: referral.clientEmail,
          phone: referral.clientPhone,
          preferredAreas,
        },
        financialSnapshot: {
          ...input.financial,
        },
        candidates,
        createdByUserId: agentId,
      });

      await updateReferralLatestSnapshot({
        db,
        referralId: input.referralId,
        assessmentId: assessment.assessmentId,
        version: assessment.version,
        mode: input.mode,
        quickResult,
        createdByUserId: agentId,
      });

      return {
        referralId: input.referralId,
        latestAssessmentId: assessment.assessmentId,
        latestAssessmentVersion: assessment.version,
        status: readinessToStatus(quickResult.readinessStatus),
        statusLabel: statusLabel(readinessToStatus(quickResult.readinessStatus)),
        qualification: quickResult,
        matches: splitMatches(assessment.rankedMatches),
      };
    }),

  listMine: agentProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(200).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const userId = Number(ctx.user!.id);
      const role = ctx.user!.role;
      const limit = input?.limit || 20;

      const conditions = role === 'super_admin' ? sql`1 = 1` : eq(referrals.agentId, userId);

      const rows = await db
        .select({
          id: referrals.id,
          referenceCode: referrals.referenceCode,
          agentId: referrals.agentId,
          clientName: referrals.clientName,
          clientEmail: referrals.clientEmail,
          clientPhone: referrals.clientPhone,
          preferredAreas: referrals.preferredAreas,
          status: referrals.status,
          latestAssessmentId: referrals.latestAssessmentId,
          latestAssessmentVersion: referrals.latestAssessmentVersion,
          latestMode: referrals.latestMode,
          latestConfidenceScore: referrals.latestConfidenceScore,
          latestAffordabilityMin: referrals.latestAffordabilityMin,
          latestAffordabilityMax: referrals.latestAffordabilityMax,
          latestMonthlyPaymentEstimate: referrals.latestMonthlyPaymentEstimate,
          lastSubmittedDealId: referrals.lastSubmittedDealId,
          submittedAt: referrals.submittedAt,
          createdAt: referrals.createdAt,
          updatedAt: referrals.updatedAt,
        })
        .from(referrals)
        .where(conditions)
        .orderBy(desc(referrals.updatedAt))
        .limit(limit);

      return rows.map(row => {
        const preferredAreas = Array.isArray(row.preferredAreas)
          ? row.preferredAreas
          : Array.isArray((row.preferredAreas as any)?.areas)
            ? (row.preferredAreas as any).areas
            : [];
        const confidenceLevel = deriveConfidenceLevel(Number(row.latestConfidenceScore || 0));

        return {
          ...row,
          preferredAreas: preferredAreas.map((value: unknown) => String(value || '')).filter(Boolean),
          statusLabel: statusLabel(row.status as ReferralStatus),
          confidenceLevel,
          confidenceHint: confidenceLevelHint(confidenceLevel),
          affordabilityLabel:
            row.latestAffordabilityMin && row.latestAffordabilityMax
              ? `${formatCurrency(Number(row.latestAffordabilityMin))} - ${formatCurrency(Number(row.latestAffordabilityMax))}`
              : 'Pending estimate',
        };
      });
    }),

  getById: agentProcedure
    .input(
      z.object({
        referralId: z.number().int().positive(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const referral = await resolveOwnedReferral(db, input.referralId, {
        id: Number(ctx.user!.id),
        role: ctx.user!.role,
      });

      const assessments = await db
        .select({
          id: referralAssessments.id,
          version: referralAssessments.version,
          mode: referralAssessments.mode,
          affordabilityMin: referralAssessments.affordabilityMin,
          affordabilityMax: referralAssessments.affordabilityMax,
          monthlyPaymentEstimate: referralAssessments.monthlyPaymentEstimate,
          confidenceScore: referralAssessments.confidenceScore,
          confidenceLevel: referralAssessments.confidenceLevel,
          confidenceFactors: referralAssessments.confidenceFactors,
          readinessStatus: referralAssessments.readinessStatus,
          flags: referralAssessments.flags,
          assumptions: referralAssessments.assumptions,
          improveAccuracy: referralAssessments.improveAccuracy,
          uploadLinkToken: referralAssessments.uploadLinkToken,
          uploadLinkExpiresAt: referralAssessments.uploadLinkExpiresAt,
          documentCount: referralAssessments.documentCount,
          matchedDevelopmentCount: referralAssessments.matchedDevelopmentCount,
          createdAt: referralAssessments.createdAt,
        })
        .from(referralAssessments)
        .where(eq(referralAssessments.referralId, input.referralId))
        .orderBy(desc(referralAssessments.version));

      const assessmentIds = assessments.map(item => Number(item.id));
      const matchRows = assessmentIds.length
        ? await db
            .select({
              id: referralMatches.id,
              referralId: referralMatches.referralId,
              assessmentId: referralMatches.assessmentId,
              developmentId: referralMatches.developmentId,
              developmentName: referralMatches.developmentName,
              areaLabel: referralMatches.areaLabel,
              rankScore: referralMatches.rankScore,
              rankPosition: referralMatches.rankPosition,
              matchBucket: referralMatches.matchBucket,
              matchReasons: referralMatches.matchReasons,
              qualifyingUnitTypes: referralMatches.qualifyingUnitTypes,
              metadata: referralMatches.metadata,
            })
            .from(referralMatches)
            .where(and(eq(referralMatches.referralId, input.referralId), inArray(referralMatches.assessmentId, assessmentIds)))
            .orderBy(referralMatches.assessmentId, referralMatches.rankPosition)
        : [];

      const documents = await db
        .select({
          id: referralDocuments.id,
          referralId: referralDocuments.referralId,
          assessmentId: referralDocuments.assessmentId,
          documentType: referralDocuments.documentType,
          documentStatus: referralDocuments.documentStatus,
          uploadedBy: referralDocuments.uploadedBy,
          fileName: referralDocuments.fileName,
          fileUrl: referralDocuments.fileUrl,
          consentConfirmed: referralDocuments.consentConfirmed,
          uploadedAt: referralDocuments.uploadedAt,
          createdAt: referralDocuments.createdAt,
          updatedAt: referralDocuments.updatedAt,
        })
        .from(referralDocuments)
        .where(eq(referralDocuments.referralId, input.referralId))
        .orderBy(desc(referralDocuments.createdAt));

      const matchesByAssessment = new Map<number, RankedReferralMatch[]>();
      for (const match of matchRows) {
        const assessmentId = Number(match.assessmentId);
        const current = matchesByAssessment.get(assessmentId) || [];
        current.push(
          normalizeAssessmentMatches([
            {
              programId: Number((match.metadata as any)?.programId || 0),
              developmentId: match.developmentId,
              developmentName: match.developmentName,
              areaLabel: match.areaLabel,
              rankScore: match.rankScore,
              rankPosition: match.rankPosition,
              matchBucket: match.matchBucket,
              matchReasons: match.matchReasons,
              qualifyingUnitTypes: match.qualifyingUnitTypes,
              estimatedEntryPrice: (match.metadata as any)?.estimatedEntryPrice || null,
            },
          ])[0],
        );
        matchesByAssessment.set(assessmentId, current);
      }

      return {
        referral: {
          ...referral,
          statusLabel: statusLabel(referral.status as ReferralStatus),
          preferredAreas: Array.isArray(referral.preferredAreas)
            ? referral.preferredAreas
            : Array.isArray((referral.preferredAreas as any)?.areas)
              ? (referral.preferredAreas as any).areas
              : [],
        },
        assessments: assessments.map(assessment => {
          const level = normalizeConfidenceLevel(
            (assessment as any).confidenceLevel,
            Number((assessment as any).confidenceScore || 0),
          );
          return {
            ...assessment,
            confidenceLevel: level,
            confidenceHint: confidenceLevelHint(level),
            assumptions: normalizeAssessmentAssumptions(assessment.assumptions),
            matches: splitMatches(matchesByAssessment.get(Number(assessment.id)) || []),
            uploadUrl: assessment.uploadLinkToken ? resolveUploadUrl(assessment.uploadLinkToken) : null,
          };
        }),
        documents: documents.map(doc => ({
          ...doc,
          consentConfirmed: Number(doc.consentConfirmed || 0) === 1,
        })),
      };
    }),

  generatePdf: agentProcedure
    .input(
      z.object({
        referralId: z.number().int().positive(),
        assessmentId: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const referral = await resolveOwnedReferral(db, input.referralId, {
        id: Number(ctx.user!.id),
        role: ctx.user!.role,
      });

      const assessmentConditions = [eq(referralAssessments.referralId, input.referralId)];
      if (input.assessmentId) {
        assessmentConditions.push(eq(referralAssessments.id, input.assessmentId));
      }

      const [assessment] = await db
        .select({
          id: referralAssessments.id,
          mode: referralAssessments.mode,
          affordabilityMin: referralAssessments.affordabilityMin,
          affordabilityMax: referralAssessments.affordabilityMax,
          confidenceScore: referralAssessments.confidenceScore,
          confidenceLevel: referralAssessments.confidenceLevel,
          assumptions: referralAssessments.assumptions,
          uploadLinkToken: referralAssessments.uploadLinkToken,
          uploadLinkExpiresAt: referralAssessments.uploadLinkExpiresAt,
          version: referralAssessments.version,
        })
        .from(referralAssessments)
        .where(and(...assessmentConditions))
        .orderBy(desc(referralAssessments.version))
        .limit(1);

      if (!assessment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No assessment found for this referral.',
        });
      }

      const matchesRows = await db
        .select({
          assessmentId: referralMatches.assessmentId,
          developmentId: referralMatches.developmentId,
          developmentName: referralMatches.developmentName,
          areaLabel: referralMatches.areaLabel,
          rankScore: referralMatches.rankScore,
          rankPosition: referralMatches.rankPosition,
          matchBucket: referralMatches.matchBucket,
          matchReasons: referralMatches.matchReasons,
          qualifyingUnitTypes: referralMatches.qualifyingUnitTypes,
          metadata: referralMatches.metadata,
        })
        .from(referralMatches)
        .where(and(eq(referralMatches.referralId, input.referralId), eq(referralMatches.assessmentId, assessment.id)))
        .orderBy(referralMatches.rankPosition);

      const matches = normalizeAssessmentMatches(
        matchesRows.map(row => ({
          programId: Number((row.metadata as any)?.programId || 0),
          developmentId: row.developmentId,
          developmentName: row.developmentName,
          areaLabel: row.areaLabel,
          rankScore: row.rankScore,
          rankPosition: row.rankPosition,
          matchBucket: row.matchBucket,
          matchReasons: row.matchReasons,
          qualifyingUnitTypes: row.qualifyingUnitTypes,
          estimatedEntryPrice: (row.metadata as any)?.estimatedEntryPrice || null,
        })),
      );

      const [agent] = await db
        .select({
          name: users.name,
          email: users.email,
          phone: users.phone,
        })
        .from(users)
        .where(eq(users.id, Number(referral.agentId)))
        .limit(1);

      const uploadLink =
        assessment.uploadLinkToken &&
        (!assessment.uploadLinkExpiresAt ||
          Date.parse(String(assessment.uploadLinkExpiresAt)) > Date.now())
          ? resolveUploadUrl(assessment.uploadLinkToken)
          : null;

      const pdfPayload = buildPdfPayload({
        referral: {
          referenceCode: referral.referenceCode,
          clientName: referral.clientName,
          clientEmail: referral.clientEmail,
          clientPhone: referral.clientPhone,
        },
        assessment: {
          mode: assessment.mode as QualificationMode,
          affordabilityMin: Number(assessment.affordabilityMin || 0),
          affordabilityMax: Number(assessment.affordabilityMax || 0),
          confidenceScore: Number(assessment.confidenceScore || 0),
          confidenceLevel: normalizeConfidenceLevel(
            (assessment as any).confidenceLevel,
            Number(assessment.confidenceScore || 0),
          ),
          assumptions: normalizeAssessmentAssumptions(assessment.assumptions),
        },
        matches,
        uploadLink,
        agent: {
          name: agent?.name || null,
          email: agent?.email || null,
          phone: agent?.phone || null,
        },
      });

      const html = renderReferralPdfHtml(pdfPayload);

      await db
        .update(referralAssessments)
        .set({
          pdfHtml: html,
          disclaimer: 'Indicative estimate only. Not a final bond approval.',
        })
        .where(eq(referralAssessments.id, assessment.id));

      return {
        referralId: input.referralId,
        assessmentId: Number(assessment.id),
        referenceCode: referral.referenceCode,
        filename: `${referral.referenceCode}_qualification_summary.html`,
        html,
      };
    }),

  sendUploadLink: agentProcedure
    .input(
      z.object({
        referralId: z.number().int().positive(),
        assessmentId: z.number().int().positive().optional(),
        expiresInDays: z.number().int().min(1).max(secureTokenTtlDaysMax).default(secureTokenTtlDaysDefault),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const referral = await resolveOwnedReferral(db, input.referralId, {
        id: Number(ctx.user!.id),
        role: ctx.user!.role,
      });

      const [assessment] = await db
        .select({
          id: referralAssessments.id,
          mode: referralAssessments.mode,
          version: referralAssessments.version,
        })
        .from(referralAssessments)
        .where(
          and(
            eq(referralAssessments.referralId, input.referralId),
            input.assessmentId ? eq(referralAssessments.id, input.assessmentId) : sql`1 = 1`,
          ),
        )
        .orderBy(desc(referralAssessments.version))
        .limit(1);

      if (!assessment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No assessment found for this referral.',
        });
      }

      const token = randomUUID().replace(/-/g, '');
      const expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ');

      await db
        .update(referralAssessments)
        .set({
          uploadLinkToken: token,
          uploadLinkExpiresAt: expiresAt,
        })
        .where(eq(referralAssessments.id, assessment.id));

      await db.insert(referralDocuments).values(
        REQUIRED_DOCUMENT_CHECKLIST.map((item, index) => {
          const documentType = index === 0
            ? 'payslip'
            : index === 1
              ? 'bank_statement'
              : index === 2
                ? 'credit_report'
                : index === 3
                  ? 'id_document'
                  : 'proof_of_address';

          return {
            referralId: Number(referral.id),
            assessmentId: Number(assessment.id),
            documentType: documentType as DocumentType,
            documentStatus: 'requested',
            uploadedBy: 'system',
            secureToken: token,
            consentConfirmed: 0,
            consentText: `Requested via secure upload link for ${item}`,
          };
        }),
      );

      await db
        .update(referrals)
        .set({
          status: 'awaiting_documents',
          updatedByUserId: Number(ctx.user!.id),
        })
        .where(eq(referrals.id, input.referralId));

      const uploadUrl = resolveUploadUrl(token);

      return {
        referralId: input.referralId,
        assessmentId: Number(assessment.id),
        uploadUrl,
        token,
        expiresAt,
      };
    }),

  recordDocumentUpload: publicProcedure
    .input(
      z.object({
        token: z.string().trim().min(16).max(128),
        documentType: z.enum(DOCUMENT_TYPE_VALUES),
        fileName: z.string().trim().min(2).max(255),
        fileUrl: z.string().trim().url().max(2000),
        consentConfirmed: z.boolean(),
        consentText: z.string().trim().max(255).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      assertDistributionEnabled();
      if (!input.consentConfirmed) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Consent confirmation is required.',
        });
      }

      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [assessment] = await db
        .select({
          id: referralAssessments.id,
          referralId: referralAssessments.referralId,
          mode: referralAssessments.mode,
          uploadLinkToken: referralAssessments.uploadLinkToken,
          uploadLinkExpiresAt: referralAssessments.uploadLinkExpiresAt,
        })
        .from(referralAssessments)
        .where(eq(referralAssessments.uploadLinkToken, input.token))
        .orderBy(desc(referralAssessments.id))
        .limit(1);

      if (!assessment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Upload link is invalid or expired.',
        });
      }

      if (assessment.uploadLinkExpiresAt && Date.parse(String(assessment.uploadLinkExpiresAt)) < Date.now()) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Upload link has expired.',
        });
      }

      await db.insert(referralDocuments).values({
        referralId: Number(assessment.referralId),
        assessmentId: Number(assessment.id),
        documentType: input.documentType,
        documentStatus: 'received',
        uploadedBy: 'client',
        fileName: input.fileName.trim(),
        fileUrl: input.fileUrl.trim(),
        secureToken: input.token,
        consentConfirmed: 1,
        consentText: normalizeOptionalText(input.consentText) || 'Client consent confirmed for affordability assessment.',
        uploadedAt: sql`CURRENT_TIMESTAMP`,
      });

      const [docCountRow] = await db
        .select({
          count: sql<number>`COUNT(*)`,
        })
        .from(referralDocuments)
        .where(
          and(
            eq(referralDocuments.referralId, Number(assessment.referralId)),
            eq(referralDocuments.assessmentId, Number(assessment.id)),
            inArray(referralDocuments.documentStatus, ['received', 'verified']),
          ),
        );

      const docCount = Number(docCountRow?.count || 0);
      const readinessStatus: ReferralReadinessStatus =
        assessment.mode === 'verified_qual'
          ? docCount >= 3
            ? 'verified_estimate'
            : 'under_review'
          : 'awaiting_documents';

      await db
        .update(referralAssessments)
        .set({
          documentCount: docCount,
          readinessStatus,
        })
        .where(eq(referralAssessments.id, Number(assessment.id)));

      await db
        .update(referrals)
        .set({
          status: readinessToStatus(readinessStatus),
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(referrals.id, Number(assessment.referralId)));

      return {
        success: true,
        referralId: Number(assessment.referralId),
        assessmentId: Number(assessment.id),
        documentCount: docCount,
        readinessStatus,
      };
    }),

  submitToDevelopment: agentProcedure
    .input(
      z.object({
        referralId: z.number().int().positive(),
        developmentId: z.number().int().positive(),
        notes: z.string().max(2000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const referral = await resolveOwnedReferral(db, input.referralId, {
        id: Number(ctx.user!.id),
        role: ctx.user!.role,
      });

      const [programAccess] = await db
        .select({
          programId: distributionAgentAccess.programId,
          developmentId: distributionAgentAccess.developmentId,
          isProgramActive: distributionPrograms.isActive,
          isReferralEnabled: distributionPrograms.isReferralEnabled,
          commissionModel: distributionPrograms.commissionModel,
          defaultCommissionPercent: distributionPrograms.defaultCommissionPercent,
          defaultCommissionAmount: distributionPrograms.defaultCommissionAmount,
          referrerCommissionType: distributionPrograms.referrerCommissionType,
          referrerCommissionValue: distributionPrograms.referrerCommissionValue,
          referrerCommissionBasis: distributionPrograms.referrerCommissionBasis,
        })
        .from(distributionAgentAccess)
        .innerJoin(distributionPrograms, eq(distributionAgentAccess.programId, distributionPrograms.id))
        .where(
          and(
            eq(distributionAgentAccess.agentId, Number(ctx.user!.id)),
            eq(distributionAgentAccess.developmentId, input.developmentId),
            eq(distributionAgentAccess.accessStatus, 'active'),
            eq(distributionPrograms.isActive, 1),
            eq(distributionPrograms.isReferralEnabled, 1),
          ),
        )
        .limit(1);

      if (!programAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have active access to submit this referral to the selected development.',
        });
      }

      const [latestAssessment] = await db
        .select({
          id: referralAssessments.id,
          mode: referralAssessments.mode,
          confidenceScore: referralAssessments.confidenceScore,
          affordabilityMin: referralAssessments.affordabilityMin,
          affordabilityMax: referralAssessments.affordabilityMax,
          monthlyPaymentEstimate: referralAssessments.monthlyPaymentEstimate,
          readinessStatus: referralAssessments.readinessStatus,
          assumptions: referralAssessments.assumptions,
        })
        .from(referralAssessments)
        .where(eq(referralAssessments.referralId, input.referralId))
        .orderBy(desc(referralAssessments.version))
        .limit(1);

      if (!latestAssessment) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'No assessment found for this referral. Run Quick Qual first.',
        });
      }

      const [managerAssignment] = await db
        .select({
          managerUserId: distributionManagerAssignments.managerUserId,
        })
        .from(distributionManagerAssignments)
        .where(
          and(
            eq(distributionManagerAssignments.developmentId, Number(input.developmentId)),
            eq(distributionManagerAssignments.isActive, 1),
            eq(distributionManagerAssignments.isPrimary, 1),
          ),
        )
        .orderBy(desc(distributionManagerAssignments.updatedAt))
        .limit(1);

      const managerUserId = managerAssignment?.managerUserId ? Number(managerAssignment.managerUserId) : null;

      const duplicateConditions: any[] = [
        eq(distributionDeals.developmentId, Number(input.developmentId)),
        sql`${distributionDeals.currentStage} NOT IN ('cancelled', 'commission_paid')`,
      ];
      const email = normalizeOptionalText(referral.clientEmail);
      const phone = normalizeOptionalText(referral.clientPhone);
      if (email || phone) {
        const identityClauses: SQL[] = [];
        if (email) {
          identityClauses.push(sql`LOWER(${distributionDeals.buyerEmail}) = LOWER(${email})`);
        }
        if (phone) {
          const normalizedPhone = phone.replace(/[\s\-()]/g, '');
          identityClauses.push(
            sql`REPLACE(REPLACE(REPLACE(REPLACE(${distributionDeals.buyerPhone}, ' ', ''), '-', ''), '(', ''), ')', '') = ${normalizedPhone}`,
          );
        }
        if (identityClauses.length > 0) {
          duplicateConditions.push(sql`(${sql.join(identityClauses, sql` OR `)})`);
        }
      }

      if (duplicateConditions.length > 2) {
        const [existingDeal] = await db
          .select({ id: distributionDeals.id })
          .from(distributionDeals)
          .where(and(...duplicateConditions))
          .limit(1);
        if (existingDeal) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'An active deal already exists for this client at the selected development.',
          });
        }
      }

      const commissionBaseAmount = Math.max(0, Number(latestAssessment.affordabilityMax || 0));
      const referrerCommissionTrack = resolveReferrerCommissionTrackFromProgram(programAccess);
      const referrerCommissionEstimate = estimateCommissionAmount(
        referrerCommissionTrack,
        commissionBaseAmount,
      );

      const [dealInsert] = await db.insert(distributionDeals).values({
        programId: Number(programAccess.programId),
        developmentId: Number(input.developmentId),
        agentId: Number(ctx.user!.id),
        managerUserId,
        externalRef: `${referral.referenceCode}-A${Number(latestAssessment.id)}`,
        buyerName: referral.clientName,
        buyerEmail: email,
        buyerPhone: phone,
        dealAmount: Number(latestAssessment.affordabilityMax || 0),
        currentStage: 'viewing_scheduled',
        commissionStatus: 'not_ready',
      });

      const dealId = Number((dealInsert as any).insertId || 0);
      const priorityQualified = String(latestAssessment.mode || '') === 'verified_qual';

      await db.insert(distributionDealEvents).values({
        dealId,
        fromStage: null,
        toStage: 'viewing_scheduled',
        eventType: 'system',
        actorUserId: Number(ctx.user!.id),
        metadata: {
          source: 'distribution.qualification.submitToDevelopment',
          referralId: Number(referral.id),
          assessmentId: Number(latestAssessment.id),
          assessmentVersion: Number(referral.latestAssessmentVersion || 0),
          confidenceScore: Number(latestAssessment.confidenceScore || 0),
          affordabilityMin: Number(latestAssessment.affordabilityMin || 0),
          affordabilityMax: Number(latestAssessment.affordabilityMax || 0),
          monthlyPaymentEstimate: Number(latestAssessment.monthlyPaymentEstimate || 0),
          readinessStatus: latestAssessment.readinessStatus,
          priorityQualified,
          referrerCommissionPreview: {
            type: referrerCommissionTrack.type,
            value: referrerCommissionTrack.value,
            basis: referrerCommissionTrack.basis,
            estimatedAmount: referrerCommissionEstimate,
            baseAmount: commissionBaseAmount,
          },
          commissionSnapshotLocked: false,
          assumptions: normalizeAssessmentAssumptions(latestAssessment.assumptions),
        } as any,
        notes: input.notes ?? null,
      });

      await db
        .update(referralAssessments)
        .set({
          readinessStatus: 'submitted_to_partner',
        })
        .where(eq(referralAssessments.id, Number(latestAssessment.id)));

      await db
        .update(referrals)
        .set({
          status: 'submitted',
          lastSubmittedProgramId: Number(programAccess.programId),
          lastSubmittedDealId: dealId,
          submittedAt: sql`CURRENT_TIMESTAMP`,
          updatedByUserId: Number(ctx.user!.id),
        })
        .where(eq(referrals.id, Number(referral.id)));

      return {
        success: true,
        referralId: Number(referral.id),
        dealId,
        priorityQualified,
        stage: 'viewing_scheduled' as const,
      };
    }),
});
