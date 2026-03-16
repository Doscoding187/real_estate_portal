import { TRPCError } from '@trpc/server';
import { and, desc, eq, inArray, isNull, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import {
  DISTRIBUTION_ACCESS_CHANNEL_SCOPE_VALUES,
  DISTRIBUTION_BRAND_PARTNERSHIP_STATUS_VALUES,
  DISTRIBUTION_DEAL_STAGE_VALUES,
  DISTRIBUTION_DEVELOPMENT_ACCESS_STATUS_VALUES,
  DISTRIBUTION_TIER_VALUES,
  DISTRIBUTION_VIEWING_STATUS_VALUES,
  DISTRIBUTION_IDENTITY_TYPE_VALUES,
  auditLogs,
  developers,
  developerBrandProfiles,
  developments,
  distributionAgentAccess,
  distributionAgentTiers,
  distributionCommissionEntries,
  distributionCommissionLedger,
  distributionCommissionOverrides,
  distributionDealBankOutcomes,
  distributionDealEvents,
  distributionDealDocumentStatuses,
  distributionDeals,
  distributionDevelopmentAccess,
  distributionIdentities,
  distributionManagerAssignments,
  distributionProgramRequiredDocuments,
  distributionProgramWorkflowSteps,
  distributionProgramWorkflows,
  distributionPrograms,
  distributionReferrerApplications,
  distributionViewings,
  distributionViewingValidations,
  platformTeamRegistrations,
  unitTypes,
  users,
} from '../drizzle/schema';
import { ENV } from './_core/env';
import { protectedProcedure, publicProcedure, router, superAdminProcedure } from './_core/trpc';
import { getDb } from './db';
import { authService } from './_core/auth';
import { logAudit } from './_core/auditLog';
import { ensureCommissionEntryForDeal } from './services/distributionCommissionService';
import {
  ensureDistributionProgramForDevelopment,
  getProgramActivationReadiness,
} from './services/distributionProgramService';
import {
  upsertBrandPartnershipWithAudit,
  upsertDevelopmentAccessWithAudit,
} from './services/distributionAccessAdminService';
import {
  getBrandPartnershipDetails,
  getDevelopmentAccessDetails,
  listDevelopmentAccessDetails,
} from './services/distributionAccessReadService';
import {
  assertDevelopmentSubmissionEligible,
  evaluateDevelopmentDistributionAccess,
  summarizeDistributionBlockers,
} from './services/distributionAccessPolicy';
import { distributionQualificationRouter } from './distributionQualificationRouter';
import { computeDistributionSetupSnapshot } from './services/distributionSetupSnapshot';
import {
  getDistributionSchemaReadinessSnapshot,
  type DistributionSchemaOperation,
  warnSchemaCapabilityOnce,
} from './services/runtimeSchemaCapabilities';
import { buildDistributionManagerInviteUrl } from '../shared/distributionManagerInvite';

const DISTRIBUTION_SUBMODULES = [
  {
    slug: 'partner-developments',
    title: 'Partner Developments',
    description: 'Referral-enabled developments, fee model, and access configuration.',
  },
  {
    slug: 'distribution-managers',
    title: 'Referral Ops Managers',
    description: 'Manager assignments, workload, and validation oversight.',
  },
  {
    slug: 'agent-network',
    title: 'Agent Network',
    description: 'Agent tiering, access rules, and performance baseline.',
  },
  {
    slug: 'viewing-scheduler',
    title: 'Viewing Scheduler',
    description: 'Calendar coordination and manager-assisted viewing operations.',
  },
  {
    slug: 'deal-pipeline',
    title: 'Deal Pipeline',
    description: 'Cross-development deal state tracking with stage controls.',
  },
  {
    slug: 'commission-incentives',
    title: "Finder's Fee Operations",
    description: "Finder's fee triggers, payout states, and incentive signals.",
  },
] as const;

const submoduleSlugs = DISTRIBUTION_SUBMODULES.map(module => module.slug) as [string, ...string[]];
const ACCESS_MUTABLE_STATUSES = ['active', 'paused'] as const;
const DISTRIBUTION_PIPELINE_STAGE_ORDER = [...DISTRIBUTION_DEAL_STAGE_VALUES] as const;
const VIEWING_VALIDATION_STATUS_VALUES = [
  'pending',
  'completed_proceeding',
  'completed_not_proceeding',
  'no_show',
  'cancelled',
] as const;
const COMMISSION_ENTRY_STATUS_VALUES = ['pending', 'approved', 'paid', 'cancelled'] as const;
const DISTRIBUTION_COMMISSION_STATUS_VALUES = [
  'not_ready',
  'pending',
  'approved',
  'paid',
  'cancelled',
] as const;
const DISTRIBUTION_BANK_OUTCOME_STATUS_VALUES = [
  'pending',
  'approved',
  'declined',
  'withdrawn',
] as const;
const REFERRER_APPLICATION_STATUS_VALUES = ['pending', 'approved', 'rejected'] as const;
const TEAM_REGISTRATION_STATUS_VALUES = ['pending', 'approved', 'rejected'] as const;
const TEAM_REGISTRATION_AREA_VALUES = [
  'distribution_manager',
  'agent',
  'agency_operations',
  'developer_operations',
  'other',
] as const;
const DISTRIBUTION_PROGRAM_COMMISSION_TYPE_VALUES = ['flat', 'percentage'] as const;
const DISTRIBUTION_PROGRAM_COMMISSION_BASIS_VALUES = ['sale_price', 'base_price'] as const;
const VIEWING_RESCHEDULE_LIMIT = 3;
const VIEWING_RESCHEDULE_LOCK_HOURS = 4;
const DISTRIBUTION_IDENTITY_VALUES = [...DISTRIBUTION_IDENTITY_TYPE_VALUES] as const;
const COSMO_DEFAULT_BANKS = [
  { code: 'FNB', name: 'FNB' },
  { code: 'STD', name: 'STD' },
  { code: 'NED', name: 'NED' },
  { code: 'ABSA', name: 'ABSA' },
] as const;
const COSMO_FALLBACK_STEPS = [
  { stepKey: 'qualification', stepLabel: 'Qualification', stepType: 'internal', stepOrder: 10 },
  {
    stepKey: 'viewing_completed',
    stepLabel: 'Viewing Completed',
    stepType: 'internal',
    stepOrder: 20,
  },
  {
    stepKey: 'documents_collected',
    stepLabel: 'Cosmo Documents Complete',
    stepType: 'document',
    stepOrder: 30,
  },
  {
    stepKey: 'bank_submission',
    stepLabel: 'Submitted to FNB / STD / NED / ABSA',
    stepType: 'bank',
    stepOrder: 40,
  },
  { stepKey: 'bank_decision', stepLabel: 'Bank Outcomes Tracked', stepType: 'decision', stepOrder: 50 },
  { stepKey: 'bank_selected', stepLabel: 'Final Bank Selected', stepType: 'decision', stepOrder: 60 },
  { stepKey: 'bond_approved', stepLabel: 'Final Bond Approval', stepType: 'closure', stepOrder: 70 },
  { stepKey: 'contract_signed', stepLabel: 'Contract Signed', stepType: 'closure', stepOrder: 80 },
  { stepKey: 'commission_paid', stepLabel: 'Commission Paid', stepType: 'closure', stepOrder: 90 },
] as const;
const GENERIC_FALLBACK_STEPS = [
  {
    stepKey: 'viewing_scheduled',
    stepLabel: 'Viewing Scheduled',
    stepType: 'internal',
    stepOrder: 10,
  },
  {
    stepKey: 'application_submitted',
    stepLabel: 'Application Submitted',
    stepType: 'internal',
    stepOrder: 20,
  },
  { stepKey: 'contract_signed', stepLabel: 'Contract Signed', stepType: 'closure', stepOrder: 30 },
  { stepKey: 'bond_approved', stepLabel: 'Bond Approved', stepType: 'closure', stepOrder: 40 },
  { stepKey: 'commission_paid', stepLabel: 'Commission Paid', stepType: 'closure', stepOrder: 50 },
] as const;
const COSMO_FALLBACK_REQUIRED_DOCS = [
  { documentKey: 'id_copy', documentLabel: 'ID copy', isRequired: true, displayOrder: 10 },
  {
    documentKey: 'marriage_certificate',
    documentLabel: 'Marriage certificate',
    isRequired: false,
    displayOrder: 20,
  },
  { documentKey: 'nca_form', documentLabel: 'NCA form', isRequired: true, displayOrder: 30 },
  { documentKey: 'popia_form', documentLabel: 'POPIA form (EUF)', isRequired: true, displayOrder: 40 },
  { documentKey: 'price_structure', documentLabel: 'Price structure', isRequired: true, displayOrder: 50 },
  { documentKey: 'plan', documentLabel: 'Plan', isRequired: true, displayOrder: 60 },
  {
    documentKey: 'payslips_3_months',
    documentLabel: 'Payslips (3 months)',
    isRequired: true,
    displayOrder: 70,
  },
  {
    documentKey: 'bank_statements_3_months',
    documentLabel: 'Bank statements (3 months)',
    isRequired: true,
    displayOrder: 80,
  },
] as const;
const GENERIC_FALLBACK_REQUIRED_DOCS = [
  { documentKey: 'id_copy', documentLabel: 'ID copy', isRequired: true, displayOrder: 10 },
  {
    documentKey: 'payslips_3_months',
    documentLabel: 'Payslips (3 months)',
    isRequired: true,
    displayOrder: 20,
  },
  {
    documentKey: 'bank_statements_3_months',
    documentLabel: 'Bank statements (3 months)',
    isRequired: true,
    displayOrder: 30,
  },
] as const;

type DistributionDealStage = (typeof DISTRIBUTION_DEAL_STAGE_VALUES)[number];
type DistributionTier = (typeof DISTRIBUTION_TIER_VALUES)[number];
type DistributionIdentityType = (typeof DISTRIBUTION_IDENTITY_VALUES)[number];
type DistributionBankOutcomeStatus = (typeof DISTRIBUTION_BANK_OUTCOME_STATUS_VALUES)[number];
type ProgramCommissionType = (typeof DISTRIBUTION_PROGRAM_COMMISSION_TYPE_VALUES)[number];
type ProgramCommissionBasis = (typeof DISTRIBUTION_PROGRAM_COMMISSION_BASIS_VALUES)[number];
type DealSnapshotSource = 'submission_gate' | 'backfill' | 'override';
type ProgramCommissionTrack = {
  type: ProgramCommissionType;
  value: number;
  basis: ProgramCommissionBasis | null;
};

const AGENT_STAGE_TRANSITIONS: Partial<Record<DistributionDealStage, DistributionDealStage[]>> = {
  viewing_completed: ['application_submitted', 'cancelled'],
  application_submitted: ['contract_signed', 'cancelled'],
  contract_signed: ['bond_approved', 'cancelled'],
  bond_approved: ['commission_pending', 'cancelled'],
};

// ── Manager-controlled stage transitions (source of truth for operator lifecycle) ──
const MANAGER_STAGE_TRANSITIONS: Partial<Record<DistributionDealStage, DistributionDealStage[]>> = {
  viewing_completed: ['application_submitted', 'cancelled'],
  application_submitted: ['contract_signed', 'cancelled'],
  contract_signed: ['bond_approved', 'cancelled'],
  bond_approved: ['commission_pending', 'cancelled'],
};

// Stages where fee accrual has begun — cancellation requires admin override
const ACCRUAL_PROTECTED_STAGES: DistributionDealStage[] = ['commission_pending', 'commission_paid'];

// Viewing expiry: booking must complete within this window or auto-cancel
const VIEWING_EXPIRY_DAYS = 14;

function isForwardStageTransition(
  fromStage: DistributionDealStage,
  toStage: DistributionDealStage,
) {
  const fromIndex = DISTRIBUTION_PIPELINE_STAGE_ORDER.indexOf(fromStage);
  const toIndex = DISTRIBUTION_PIPELINE_STAGE_ORDER.indexOf(toStage);
  if (fromIndex < 0 || toIndex < 0) return false;
  return toIndex > fromIndex;
}

function deriveCommissionStatus(
  nextStage: DistributionDealStage,
  triggerStage: 'contract_signed' | 'bond_approved',
) {
  if (nextStage === 'cancelled') return 'cancelled' as const;
  if (nextStage === 'commission_paid') return 'paid' as const;
  if (nextStage === 'commission_pending') return 'pending' as const;

  if (triggerStage === 'contract_signed') {
    if (nextStage === 'contract_signed' || nextStage === 'bond_approved') {
      return 'pending' as const;
    }
    return 'not_ready' as const;
  }

  if (nextStage === 'bond_approved') {
    return 'pending' as const;
  }
  return 'not_ready' as const;
}

function parseIsoDateOrThrow(value: string, label: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Invalid ${label}. Expected ISO-like datetime string.`,
    });
  }
  return new Date(timestamp);
}

async function logDistributionAudit(params: {
  userId: number;
  action: string;
  targetType: string;
  targetId: number;
  metadata?: Record<string, unknown>;
}) {
  try {
    await logAudit({
      userId: params.userId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: params.metadata,
    });
  } catch {
    // Never block product workflows on audit-log write failures.
  }
}

function hasLockedCommissionSnapshot(input: {
  snapshotVersion?: unknown;
  snapshotSource?: unknown;
  referrerCommissionType?: unknown;
  referrerCommissionValue?: unknown;
  referrerCommissionBasis?: unknown;
  platformCommissionType?: unknown;
  platformCommissionValue?: unknown;
  platformCommissionBasis?: unknown;
}) {
  const snapshotVersion = Number(input.snapshotVersion || 0);
  if (!Number.isFinite(snapshotVersion) || snapshotVersion < 1) return false;

  const snapshotSource = String(input.snapshotSource || '')
    .trim()
    .toLowerCase();
  if (
    snapshotSource !== 'submission_gate' &&
    snapshotSource !== 'backfill' &&
    snapshotSource !== 'override'
  ) {
    return false;
  }

  const referrerType = String(input.referrerCommissionType || '')
    .trim()
    .toLowerCase();
  const platformType = String(input.platformCommissionType || '')
    .trim()
    .toLowerCase();
  if ((referrerType !== 'flat' && referrerType !== 'percentage') || (platformType !== 'flat' && platformType !== 'percentage')) {
    return false;
  }

  const referrerValue = toNumberOrNull(input.referrerCommissionValue);
  const platformValue = toNumberOrNull(input.platformCommissionValue);
  if (typeof referrerValue !== 'number' || typeof platformValue !== 'number') return false;

  if (
    referrerType === 'percentage' &&
    String(input.referrerCommissionBasis || '').trim().toLowerCase() !== 'sale_price' &&
    String(input.referrerCommissionBasis || '').trim().toLowerCase() !== 'base_price'
  ) {
    return false;
  }
  if (
    platformType === 'percentage' &&
    String(input.platformCommissionBasis || '').trim().toLowerCase() !== 'sale_price' &&
    String(input.platformCommissionBasis || '').trim().toLowerCase() !== 'base_price'
  ) {
    return false;
  }

  return true;
}

function normalizeDateForSql(value: Date) {
  return value.toISOString().slice(0, 19).replace('T', ' ');
}

function dateHoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function splitFullName(fullName: string) {
  const normalized = fullName.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return { firstName: null as string | null, lastName: null as string | null };
  }
  const [firstName, ...rest] = normalized.split(' ');
  const lastName = rest.length ? rest.join(' ') : null;
  return {
    firstName: firstName || null,
    lastName,
  };
}

const tierRank: Record<DistributionTier, number> = {
  tier_1: 1,
  tier_2: 2,
  tier_3: 3,
  tier_4: 4,
};

function assertDistributionEnabled() {
  if (!ENV.distributionNetworkEnabled) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message:
        'Distribution Network is disabled. Set FEATURE_DISTRIBUTION_NETWORK=true to enable this module.',
    });
  }
}

const DISTRIBUTION_SCHEMA_ERROR_CODES = new Set([
  'ER_NO_SUCH_TABLE',
  'ER_BAD_FIELD_ERROR',
  'ER_DUP_FIELDNAME',
  'ER_CANT_DROP_FIELD_OR_KEY',
  'ER_EMPTY_QUERY',
  'ER_BAD_DB_ERROR',
  'ER_PARSE_ERROR',
  'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD',
  'ER_WRONG_VALUE_FOR_TYPE',
  'ER_INVALID_DEFAULT',
]);

function extractSqlErrorCode(error: unknown): string | null {
  const visited = new Set<unknown>();
  let cursor: any = error;
  while (cursor && typeof cursor === 'object' && !visited.has(cursor)) {
    visited.add(cursor);
    const code = String(cursor?.code || '').trim();
    if (code.startsWith('ER_')) {
      return code;
    }
    cursor = cursor?.cause;
  }
  return null;
}

function extractSqlErrorMessage(error: unknown): string {
  const visited = new Set<unknown>();
  let cursor: any = error;
  while (cursor && typeof cursor === 'object' && !visited.has(cursor)) {
    visited.add(cursor);
    const message = String(cursor?.sqlMessage || cursor?.message || '').trim();
    if (message) {
      return message;
    }
    cursor = cursor?.cause;
  }
  return '';
}

function isDistributionSchemaError(error: unknown) {
  const code = extractSqlErrorCode(error);
  if (code && DISTRIBUTION_SCHEMA_ERROR_CODES.has(code)) {
    return true;
  }

  const message = extractSqlErrorMessage(error).toLowerCase();
  if (!message) return false;

  return (
    message.includes("doesn't exist") ||
    message.includes('unknown column') ||
    message.includes('unknown table') ||
    message.includes('table') && message.includes('missing') ||
    message.includes('query was empty') ||
    message.includes('column') && message.includes('not found')
  );
}

async function runDistributionDbOperation<T>(operation: string, runner: () => Promise<T>): Promise<T> {
  try {
    return await runner();
  } catch (error) {
    if (isDistributionSchemaError(error)) {
      const dbCode = extractSqlErrorCode(error);
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: `DISTRIBUTION_SCHEMA_NOT_READY: Distribution module is not fully migrated in this environment for ${operation}. Run pending distribution SQL migrations and retry.`,
        cause: dbCode ? `DB_CODE:${dbCode}` : undefined,
      });
    }
    throw error;
  }
}

async function assertDistributionSchemaReady(operation: DistributionSchemaOperation) {
  const snapshot = await getDistributionSchemaReadinessSnapshot();
  const status = snapshot.operations[operation];
  if (status.ready) {
    return;
  }

  const missingSummary = status.missingItems.join(', ');
  warnSchemaCapabilityOnce(
    `distribution-schema-not-ready:${operation}:${missingSummary}`,
    `[DistributionSchema] ${operation} blocked because required schema items are missing: ${missingSummary}`,
  );

  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: `DISTRIBUTION_SCHEMA_NOT_READY: Distribution module is not fully migrated in this environment. Missing schema items for ${operation}: ${missingSummary}.`,
    cause: {
      operation,
      missingItems: status.missingItems,
    } as any,
  });
}

function boolFromTinyInt(value: unknown) {
  return Number(value || 0) === 1;
}

function safeJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  const raw = value.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function countDevelopmentCommercialDocs(input: {
  brochures?: unknown;
  floorPlans?: unknown;
  videos?: unknown;
}) {
  const buckets = [safeJsonArray(input.brochures), safeJsonArray(input.floorPlans), safeJsonArray(input.videos)];
  let count = 0;
  for (const bucket of buckets) {
    for (const entry of bucket) {
      if (typeof entry === 'string') {
        if (entry.trim()) count += 1;
        continue;
      }
      if (entry && typeof entry === 'object') {
        const url = String((entry as any).url || '').trim();
        if (url) count += 1;
      }
    }
  }
  return count;
}

async function getChecklistRequiredCountsByProgramId(db: any, programIds: number[]) {
  const result = new Map<number, number>();
  const clean = Array.from(new Set(programIds.map(value => Number(value)).filter(value => value > 0)));
  if (!clean.length) return result;

  const workflowRows = await db
    .select({
      programId: distributionProgramWorkflows.programId,
      workflowId: distributionProgramWorkflows.id,
    })
    .from(distributionProgramWorkflows)
    .where(inArray(distributionProgramWorkflows.programId, clean));

  const workflowIdByProgramId = new Map<number, number>();
  for (const row of workflowRows) {
    const programId = Number(row.programId || 0);
    const workflowId = Number(row.workflowId || 0);
    if (programId > 0 && workflowId > 0) workflowIdByProgramId.set(programId, workflowId);
  }

  const workflowIds = Array.from(new Set(Array.from(workflowIdByProgramId.values())));
  if (!workflowIds.length) {
    for (const programId of clean) result.set(programId, 0);
    return result;
  }

  const requiredRows = await db
    .select({
      workflowId: distributionProgramRequiredDocuments.workflowId,
      count: sql<number>`COUNT(*)`,
    })
    .from(distributionProgramRequiredDocuments)
    .where(and(inArray(distributionProgramRequiredDocuments.workflowId, workflowIds), eq(distributionProgramRequiredDocuments.isRequired, 1)))
    .groupBy(distributionProgramRequiredDocuments.workflowId);

  const requiredCountByWorkflowId = new Map<number, number>();
  for (const row of requiredRows) {
    requiredCountByWorkflowId.set(Number(row.workflowId || 0), Number(row.count || 0));
  }

  for (const programId of clean) {
    const workflowId = workflowIdByProgramId.get(programId) || 0;
    result.set(programId, requiredCountByWorkflowId.get(workflowId) || 0);
  }

  return result;
}

function withConditions(conditions: SQL[]) {
  if (conditions.length === 0) {
    return sql`1 = 1`;
  }
  if (conditions.length === 1) {
    return conditions[0];
  }
  return and(...conditions) as SQL;
}

function isTierEligible(agentTier: DistributionTier | null, minTier: DistributionTier) {
  if (!agentTier) return false;
  return tierRank[agentTier] >= tierRank[minTier];
}

function toPercent(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(1));
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

function deriveTrackFromLegacyProgramValues(row: {
  commissionModel?: unknown;
  defaultCommissionPercent?: unknown;
  defaultCommissionAmount?: unknown;
}): ProgramCommissionTrack {
  const model = String(row.commissionModel || '')
    .trim()
    .toLowerCase();
  const defaultPercent = Math.max(0, toNumberOrNull(row.defaultCommissionPercent) ?? 0);
  const defaultAmount = Math.max(0, toNumberOrNull(row.defaultCommissionAmount) ?? 0);

  if (model === 'flat_percentage' || model === 'tiered_percentage') {
    return {
      type: 'percentage',
      value: defaultPercent,
      basis: 'sale_price',
    };
  }

  if (model === 'hybrid' && defaultPercent > 0) {
    return {
      type: 'percentage',
      value: defaultPercent,
      basis: 'sale_price',
    };
  }

  return {
    type: 'flat',
    value: defaultAmount,
    basis: null,
  };
}

function resolveReferrerCommissionTrackFromProgramRow(row: {
  referrerCommissionType?: unknown;
  referrerCommissionValue?: unknown;
  referrerCommissionBasis?: unknown;
  commissionModel?: unknown;
  defaultCommissionPercent?: unknown;
  defaultCommissionAmount?: unknown;
}): ProgramCommissionTrack {
  const legacyTrack = deriveTrackFromLegacyProgramValues(row);
  const type = normalizeCommissionType(row.referrerCommissionType, legacyTrack.type);
  const value = Math.max(0, toNumberOrNull(row.referrerCommissionValue) ?? legacyTrack.value);
  const basis = normalizeCommissionBasis(row.referrerCommissionBasis, type, legacyTrack.basis || 'sale_price');
  return {
    type,
    value,
    basis,
  };
}

function resolvePlatformCommissionTrackFromProgramRow(
  row: {
    platformCommissionType?: unknown;
    platformCommissionValue?: unknown;
    platformCommissionBasis?: unknown;
  },
  fallbackTrack: ProgramCommissionTrack,
): ProgramCommissionTrack {
  const type = normalizeCommissionType(row.platformCommissionType, fallbackTrack.type);
  const value = Math.max(0, toNumberOrNull(row.platformCommissionValue) ?? fallbackTrack.value);
  const basis = normalizeCommissionBasis(row.platformCommissionBasis, type, fallbackTrack.basis || 'sale_price');
  return {
    type,
    value,
    basis,
  };
}

function toLegacyProgramCommissionFields(track: ProgramCommissionTrack) {
  if (track.type === 'percentage') {
    return {
      commissionModel: 'flat_percentage' as const,
      defaultCommissionPercent: track.value,
      defaultCommissionAmount: null as number | null,
    };
  }
  return {
    commissionModel: 'fixed_amount' as const,
    defaultCommissionPercent: null as number | null,
    defaultCommissionAmount: Math.round(track.value),
  };
}

function estimateCommissionAmountFromTrack(track: ProgramCommissionTrack, baseAmount: number) {
  const normalizedBase = Math.max(0, Math.round(baseAmount));
  if (track.type === 'percentage') {
    return Math.max(0, Math.round((normalizedBase * Math.max(0, track.value)) / 100));
  }
  return Math.max(0, Math.round(track.value));
}

type DealCommissionSnapshot = {
  commissionBaseAmount: number | null;
  referrerCommissionType: ProgramCommissionType;
  referrerCommissionValue: number;
  referrerCommissionBasis: ProgramCommissionBasis | null;
  referrerCommissionAmount: number;
  platformCommissionType: ProgramCommissionType;
  platformCommissionValue: number;
  platformCommissionBasis: ProgramCommissionBasis | null;
  platformCommissionAmount: number;
  snapshotVersion: number;
  snapshotSource: DealSnapshotSource;
};

async function ensureDealCommissionSnapshotAtSubmissionGate(
  db: any,
  input: {
    dealId: number;
    programId: number;
    dealAmount?: unknown;
    commissionBaseAmount?: unknown;
    referrerCommissionType?: unknown;
    referrerCommissionValue?: unknown;
    referrerCommissionBasis?: unknown;
    referrerCommissionAmount?: unknown;
    platformCommissionType?: unknown;
    platformCommissionValue?: unknown;
    platformCommissionBasis?: unknown;
    platformCommissionAmount?: unknown;
    snapshotVersion?: unknown;
    snapshotSource?: unknown;
  },
): Promise<DealCommissionSnapshot> {
  const existingReferrerType = normalizeCommissionType(input.referrerCommissionType, 'flat');
  const existingReferrerValue = Math.max(0, toNumberOrNull(input.referrerCommissionValue) ?? 0);
  const existingPlatformType = normalizeCommissionType(input.platformCommissionType, 'flat');
  const existingPlatformValue = Math.max(0, toNumberOrNull(input.platformCommissionValue) ?? 0);
  const hasExistingSnapshot =
    existingReferrerType &&
    existingReferrerValue > 0 &&
    existingPlatformType &&
    existingPlatformValue > 0;

  if (hasExistingSnapshot) {
    const existingBaseAmount = Math.max(
      0,
      toNumberOrNull(input.commissionBaseAmount) ?? toNumberOrNull(input.dealAmount) ?? 0,
    );
    const existingReferrerTrack: ProgramCommissionTrack = {
      type: existingReferrerType,
      value: existingReferrerValue,
      basis: normalizeCommissionBasis(input.referrerCommissionBasis, existingReferrerType, 'sale_price'),
    };
    const existingPlatformTrack: ProgramCommissionTrack = {
      type: existingPlatformType,
      value: existingPlatformValue,
      basis: normalizeCommissionBasis(input.platformCommissionBasis, existingPlatformType, 'sale_price'),
    };
    const existingReferrerAmount =
      Math.max(0, toNumberOrNull(input.referrerCommissionAmount) ?? 0) ||
      estimateCommissionAmountFromTrack(existingReferrerTrack, existingBaseAmount);
    const existingPlatformAmount =
      Math.max(0, toNumberOrNull(input.platformCommissionAmount) ?? 0) ||
      estimateCommissionAmountFromTrack(existingPlatformTrack, existingBaseAmount);
    const existingSnapshotVersion = Math.max(0, toNumberOrNull(input.snapshotVersion) ?? 0);
    const existingSnapshotSource = String(input.snapshotSource || '')
      .trim()
      .toLowerCase() as DealSnapshotSource | '';
    const normalizedSnapshotSource: DealSnapshotSource =
      existingSnapshotSource === 'backfill' || existingSnapshotSource === 'override'
        ? existingSnapshotSource
        : 'submission_gate';
    if (existingSnapshotVersion !== 1 || !existingSnapshotSource) {
      await db
        .update(distributionDeals)
        .set({
          snapshotVersion: 1,
          snapshotSource: normalizedSnapshotSource,
        })
        .where(eq(distributionDeals.id, input.dealId));
    }
    return {
      commissionBaseAmount: existingBaseAmount > 0 ? existingBaseAmount : null,
      referrerCommissionType: existingReferrerTrack.type,
      referrerCommissionValue: existingReferrerTrack.value,
      referrerCommissionBasis: existingReferrerTrack.basis,
      referrerCommissionAmount: existingReferrerAmount,
      platformCommissionType: existingPlatformTrack.type,
      platformCommissionValue: existingPlatformTrack.value,
      platformCommissionBasis: existingPlatformTrack.basis,
      platformCommissionAmount: existingPlatformAmount,
      snapshotVersion: 1,
      snapshotSource: normalizedSnapshotSource,
    };
  }

  const program = await getProgramById(db, input.programId);
  if (!program) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: `Unable to snapshot commission. Program ${input.programId} was not found.`,
    });
  }

  const referrerTrack = resolveReferrerCommissionTrackFromProgramRow(program);
  const platformTrack = resolvePlatformCommissionTrackFromProgramRow(program, referrerTrack);
  if (referrerTrack.value <= 0) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Referrer commission is not configured. Set referral commission before submission.',
    });
  }
  if (platformTrack.value <= 0) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Platform commission is not configured. Set partner terms before submission.',
    });
  }

  const commissionBaseAmount = Math.max(
    0,
    toNumberOrNull(input.commissionBaseAmount) ??
      toNumberOrNull(input.dealAmount) ??
      toNumberOrNull(program.developmentPriceFrom) ??
      toNumberOrNull(program.developmentPriceTo) ??
      0,
  );
  if ((referrerTrack.type === 'percentage' || platformTrack.type === 'percentage') && commissionBaseAmount <= 0) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Commission base amount is required before submission for percentage commission programs.',
    });
  }

  const referrerCommissionAmount = estimateCommissionAmountFromTrack(referrerTrack, commissionBaseAmount);
  const platformCommissionAmount = estimateCommissionAmountFromTrack(platformTrack, commissionBaseAmount);
  await db
    .update(distributionDeals)
    .set({
      commissionBaseAmount: commissionBaseAmount > 0 ? commissionBaseAmount : null,
      referrerCommissionType: referrerTrack.type,
      referrerCommissionValue: referrerTrack.value,
      referrerCommissionBasis: referrerTrack.basis,
      referrerCommissionAmount,
      platformCommissionType: platformTrack.type,
      platformCommissionValue: platformTrack.value,
      platformCommissionBasis: platformTrack.basis,
      platformCommissionAmount,
      snapshotVersion: 1,
      snapshotSource: 'submission_gate',
    })
    .where(eq(distributionDeals.id, input.dealId));

  return {
    commissionBaseAmount: commissionBaseAmount > 0 ? commissionBaseAmount : null,
    referrerCommissionType: referrerTrack.type,
    referrerCommissionValue: referrerTrack.value,
    referrerCommissionBasis: referrerTrack.basis,
    referrerCommissionAmount,
    platformCommissionType: platformTrack.type,
    platformCommissionValue: platformTrack.value,
    platformCommissionBasis: platformTrack.basis,
    platformCommissionAmount,
    snapshotVersion: 1,
    snapshotSource: 'submission_gate',
  };
}

function extractFirstImageUrl(rawImages: unknown) {
  if (!rawImages) return null;
  if (typeof rawImages === 'string') {
    const trimmed = rawImages.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const first = parsed[0];
          if (typeof first === 'string') return first;
          if (first && typeof first === 'object') {
            const url = (first as any).url || (first as any).src || (first as any).imageUrl;
            return typeof url === 'string' ? url : null;
          }
        }
        if (parsed && typeof parsed === 'object') {
          const url = (parsed as any).url || (parsed as any).src || (parsed as any).imageUrl;
          return typeof url === 'string' ? url : null;
        }
      } catch {
        return null;
      }
    }
    if (trimmed.includes(',')) {
      const [first] = trimmed.split(',');
      return first?.trim() || null;
    }
    return trimmed;
  }
  if (Array.isArray(rawImages)) {
    const first = rawImages[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object') {
      const url = (first as any).url || (first as any).src || (first as any).imageUrl;
      return typeof url === 'string' ? url : null;
    }
  }
  return null;
}

type DevelopmentDocumentRow = {
  name: string | null;
  url: string;
};

function normalizeDevelopmentDocumentRows(
  input: unknown,
  fallbackLabel: string,
): DevelopmentDocumentRow[] {
  const rows: DevelopmentDocumentRow[] = [];
  const seen = new Set<string>();

  const push = (urlValue: unknown, nameValue?: unknown) => {
    const url = String(urlValue || '').trim();
    if (!url || seen.has(url)) return;
    seen.add(url);
    const normalizedName = String(nameValue || '').trim();
    rows.push({
      name: normalizedName || fallbackLabel,
      url,
    });
  };

  const parseEntry = (entry: unknown) => {
    if (!entry) return;
    if (typeof entry === 'string') {
      push(entry, fallbackLabel);
      return;
    }
    if (typeof entry !== 'object') return;
    const item = entry as Record<string, unknown>;
    push(
      item.url ?? item.src ?? item.fileUrl ?? item.href ?? item.path,
      item.name ?? item.title ?? item.label ?? item.fileName,
    );
  };

  if (!input) return rows;

  if (Array.isArray(input)) {
    for (const entry of input) parseEntry(entry);
    return rows;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return rows;
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          for (const entry of parsed) parseEntry(entry);
          return rows;
        }
        parseEntry(parsed);
        return rows;
      } catch {
        // Fall through to comma parsing.
      }
    }
    if (trimmed.includes(',')) {
      for (const value of trimmed.split(',')) parseEntry(value);
      return rows;
    }
    parseEntry(trimmed);
    return rows;
  }

  parseEntry(input);
  return rows;
}

async function getDevelopmentDocumentBank(db: any, developmentId: number) {
  const [row] = await db
    .select({
      id: developments.id,
      name: developments.name,
      videos: developments.videos,
      floorPlans: developments.floorPlans,
      brochures: developments.brochures,
      updatedAt: developments.updatedAt,
    })
    .from(developments)
    .where(eq(developments.id, developmentId))
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Development not found.' });
  }

  const videos = normalizeDevelopmentDocumentRows(row.videos, 'Development Video');
  const floorPlans = normalizeDevelopmentDocumentRows(row.floorPlans, 'Floor Plan');
  const brochures = normalizeDevelopmentDocumentRows(row.brochures, 'Development Brochure');

  return {
    developmentId: Number(row.id),
    developmentName: String(row.name || 'Development'),
    videos,
    floorPlans,
    brochures,
    counts: {
      videos: videos.length,
      floorPlans: floorPlans.length,
      brochures: brochures.length,
      total: videos.length + floorPlans.length + brochures.length,
    },
    updatedAt: row.updatedAt,
  };
}

function formatUserDisplayName(row: {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  if (row.name) return row.name;
  const fullName = [row.firstName, row.lastName].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  return row.email || null;
}

async function getProgramById(db: any, programId: number) {
  const [program] = await db
    .select({
      id: distributionPrograms.id,
      developmentId: distributionPrograms.developmentId,
      isActive: distributionPrograms.isActive,
      commissionModel: distributionPrograms.commissionModel,
      defaultCommissionPercent: distributionPrograms.defaultCommissionPercent,
      defaultCommissionAmount: distributionPrograms.defaultCommissionAmount,
      referrerCommissionType: distributionPrograms.referrerCommissionType,
      referrerCommissionValue: distributionPrograms.referrerCommissionValue,
      referrerCommissionBasis: distributionPrograms.referrerCommissionBasis,
      platformCommissionType: distributionPrograms.platformCommissionType,
      platformCommissionValue: distributionPrograms.platformCommissionValue,
      platformCommissionBasis: distributionPrograms.platformCommissionBasis,
      developmentPriceFrom: developments.priceFrom,
      developmentPriceTo: developments.priceTo,
      tierAccessPolicy: distributionPrograms.tierAccessPolicy,
    })
    .from(distributionPrograms)
    .innerJoin(developments, eq(distributionPrograms.developmentId, developments.id))
    .where(eq(distributionPrograms.id, programId))
    .limit(1);

  return program || null;
}

async function getAgentById(db: any, agentId: number) {
  const [agent] = await db
    .select({
      id: users.id,
      displayName: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, agentId))
    .limit(1);

  return agent || null;
}

async function hasActiveDistributionIdentity(
  db: any,
  userId: number,
  identityType: DistributionIdentityType,
) {
  const [identity] = await db
    .select({ id: distributionIdentities.id })
    .from(distributionIdentities)
    .where(
      and(
        eq(distributionIdentities.userId, userId),
        eq(distributionIdentities.identityType, identityType),
        eq(distributionIdentities.active, 1),
      ),
    )
    .limit(1);

  return Boolean(identity?.id);
}

async function assertDistributionIdentity(
  db: any,
  user: { id: number; role: string },
  identityType: DistributionIdentityType,
) {
  if (user.role === 'super_admin') {
    return;
  }

  const hasIdentity = await hasActiveDistributionIdentity(db, user.id, identityType);
  if (!hasIdentity) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `You need an active distribution ${identityType} identity to access this feature.`,
    });
  }
}

async function getActiveAgentAccessForProgram(db: any, programId: number, agentId: number) {
  const [access] = await db
    .select({
      id: distributionAgentAccess.id,
      minTierRequired: distributionAgentAccess.minTierRequired,
      accessStatus: distributionAgentAccess.accessStatus,
    })
    .from(distributionAgentAccess)
    .where(
      and(
        eq(distributionAgentAccess.programId, programId),
        eq(distributionAgentAccess.agentId, agentId),
      ),
    )
    .limit(1);

  return access || null;
}

async function getPrimaryManagerUserIdForProgram(db: any, programId: number) {
  const [primary] = await db
    .select({
      managerUserId: distributionManagerAssignments.managerUserId,
    })
    .from(distributionManagerAssignments)
    .where(
      and(
        eq(distributionManagerAssignments.programId, programId),
        eq(distributionManagerAssignments.isActive, 1),
        eq(distributionManagerAssignments.isPrimary, 1),
      ),
    )
    .orderBy(desc(distributionManagerAssignments.updatedAt))
    .limit(1);

  if (primary?.managerUserId) {
    return Number(primary.managerUserId);
  }

  const [fallback] = await db
    .select({
      managerUserId: distributionManagerAssignments.managerUserId,
    })
    .from(distributionManagerAssignments)
    .where(
      and(
        eq(distributionManagerAssignments.programId, programId),
        eq(distributionManagerAssignments.isActive, 1),
      ),
    )
    .orderBy(desc(distributionManagerAssignments.updatedAt))
    .limit(1);

  return fallback?.managerUserId ? Number(fallback.managerUserId) : null;
}

async function hasPrimaryActiveManagerAssignment(db: any, programId: number) {
  const [row] = await db
    .select({ assignmentId: distributionManagerAssignments.id })
    .from(distributionManagerAssignments)
    .where(
      and(
        eq(distributionManagerAssignments.programId, programId),
        eq(distributionManagerAssignments.isPrimary, 1),
        eq(distributionManagerAssignments.isActive, 1),
      ),
    )
    .limit(1);
  return Boolean(row?.assignmentId);
}

async function getCurrentTierByAgentIds(db: any, agentIds: number[]) {
  const result = new Map<number, DistributionTier>();
  if (!agentIds.length) {
    return result;
  }

  const currentRows = await db
    .select({
      agentId: distributionAgentTiers.agentId,
      tier: distributionAgentTiers.tier,
      id: distributionAgentTiers.id,
    })
    .from(distributionAgentTiers)
    .where(
      and(
        inArray(distributionAgentTiers.agentId, agentIds),
        isNull(distributionAgentTiers.effectiveTo),
      ),
    )
    .orderBy(desc(distributionAgentTiers.id));

  for (const row of currentRows) {
    if (!result.has(row.agentId)) {
      result.set(row.agentId, row.tier as DistributionTier);
    }
  }

  const unresolvedIds = agentIds.filter(agentId => !result.has(agentId));
  if (!unresolvedIds.length) {
    return result;
  }

  const fallbackRows = await db
    .select({
      agentId: distributionAgentTiers.agentId,
      tier: distributionAgentTiers.tier,
      id: distributionAgentTiers.id,
    })
    .from(distributionAgentTiers)
    .where(inArray(distributionAgentTiers.agentId, unresolvedIds))
    .orderBy(desc(distributionAgentTiers.id));

  for (const row of fallbackRows) {
    if (!result.has(row.agentId)) {
      result.set(row.agentId, row.tier as DistributionTier);
    }
  }

  return result;
}

async function getUserDirectoryByIds(db: any, userIds: number[]) {
  const uniqueIds = Array.from(new Set(userIds.map(id => Number(id)).filter(Boolean)));
  const directory = new Map<
    number,
    {
      displayName: string | null;
      email: string | null;
      role: string | null;
      firstName: string | null;
      lastName: string | null;
    }
  >();

  if (!uniqueIds.length) {
    return directory;
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(inArray(users.id, uniqueIds));

  for (const row of rows) {
    directory.set(Number(row.id), {
      displayName: formatUserDisplayName(row),
      email: row.email,
      role: row.role,
      firstName: row.firstName,
      lastName: row.lastName,
    });
  }

  return directory;
}

async function getLatestViewingValidationByDealIds(db: any, dealIds: number[]) {
  const result = new Map<
    number,
    {
      id: number;
      validationStatus: string;
      validatedAt: string | null;
      attributionLockApplied: boolean;
      attributionLockAt: string | null;
      notes: string | null;
      managerUserId: number;
      updatedAt: string;
    }
  >();

  if (!dealIds.length) {
    return result;
  }

  const rows = await db
    .select({
      id: distributionViewingValidations.id,
      dealId: distributionViewingValidations.dealId,
      validationStatus: distributionViewingValidations.validationStatus,
      validatedAt: distributionViewingValidations.validatedAt,
      attributionLockApplied: distributionViewingValidations.attributionLockApplied,
      attributionLockAt: distributionViewingValidations.attributionLockAt,
      notes: distributionViewingValidations.notes,
      managerUserId: distributionViewingValidations.managerUserId,
      updatedAt: distributionViewingValidations.updatedAt,
    })
    .from(distributionViewingValidations)
    .where(inArray(distributionViewingValidations.dealId, dealIds))
    .orderBy(desc(distributionViewingValidations.id));

  for (const row of rows) {
    if (!result.has(row.dealId)) {
      result.set(row.dealId, {
        id: row.id,
        validationStatus: row.validationStatus,
        validatedAt: row.validatedAt,
        attributionLockApplied: boolFromTinyInt(row.attributionLockApplied),
        attributionLockAt: row.attributionLockAt,
        notes: row.notes,
        managerUserId: row.managerUserId,
        updatedAt: row.updatedAt,
      });
    }
  }

  return result;
}

type ReferralSubmissionSnapshot = {
  prospect: {
    grossMonthlyIncome: number | null;
    grossMonthlyIncomeRange: string | null;
    notes: string | null;
  } | null;
  viewingSchedule: {
    scheduledStartAt: string | null;
    scheduledEndAt: string | null;
    timezone: string | null;
    locationName: string | null;
    notes: string | null;
  } | null;
  documentChecklist: {
    idUploaded: boolean;
    payslipsUploaded: boolean;
    bankStatementsUploaded: boolean;
    additionalRequiredDocuments: string[];
    additionalDocumentsUploaded: boolean;
  } | null;
};

function parseMetadataObject(value: unknown) {
  if (!value) return null;
  if (typeof value === 'object') return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeReferralSubmissionSnapshot(
  rawMetadata: unknown,
): ReferralSubmissionSnapshot | null {
  const metadata = parseMetadataObject(rawMetadata);
  if (!metadata) return null;

  const referralContext = parseMetadataObject(metadata.referralContext) || metadata;
  const prospect = parseMetadataObject(referralContext.prospect);
  const viewingSchedule = parseMetadataObject(referralContext.viewingSchedule);
  const documentChecklist = parseMetadataObject(referralContext.documentChecklist);

  if (!prospect && !viewingSchedule && !documentChecklist) {
    return null;
  }

  return {
    prospect: prospect
      ? {
          grossMonthlyIncome:
            typeof prospect.grossMonthlyIncome === 'number'
              ? prospect.grossMonthlyIncome
              : prospect.grossMonthlyIncome
                ? Number(prospect.grossMonthlyIncome)
                : null,
          grossMonthlyIncomeRange:
            typeof prospect.grossMonthlyIncomeRange === 'string'
              ? prospect.grossMonthlyIncomeRange
              : null,
          notes: typeof prospect.notes === 'string' ? prospect.notes : null,
        }
      : null,
    viewingSchedule: viewingSchedule
      ? {
          scheduledStartAt:
            typeof viewingSchedule.scheduledStartAt === 'string'
              ? viewingSchedule.scheduledStartAt
              : null,
          scheduledEndAt:
            typeof viewingSchedule.scheduledEndAt === 'string'
              ? viewingSchedule.scheduledEndAt
              : null,
          timezone: typeof viewingSchedule.timezone === 'string' ? viewingSchedule.timezone : null,
          locationName:
            typeof viewingSchedule.locationName === 'string' ? viewingSchedule.locationName : null,
          notes: typeof viewingSchedule.notes === 'string' ? viewingSchedule.notes : null,
        }
      : null,
    documentChecklist: documentChecklist
      ? {
          idUploaded: Boolean(documentChecklist.idUploaded),
          payslipsUploaded: Boolean(documentChecklist.payslipsUploaded),
          bankStatementsUploaded: Boolean(documentChecklist.bankStatementsUploaded),
          additionalRequiredDocuments: Array.isArray(documentChecklist.additionalRequiredDocuments)
            ? documentChecklist.additionalRequiredDocuments
                .map(value => String(value || '').trim())
                .filter(Boolean)
            : [],
          additionalDocumentsUploaded: Boolean(documentChecklist.additionalDocumentsUploaded),
        }
      : null,
  };
}

function hasCompleteDocuments(snapshot: ReferralSubmissionSnapshot | null) {
  if (!snapshot?.documentChecklist) return false;
  const checklist = snapshot.documentChecklist;
  const additionalDocsRequired = checklist.additionalRequiredDocuments.length > 0;
  return (
    checklist.idUploaded &&
    checklist.payslipsUploaded &&
    checklist.bankStatementsUploaded &&
    (!additionalDocsRequired || checklist.additionalDocumentsUploaded)
  );
}

type ProgramWorkflowSummary = {
  workflowId: number | null;
  workflowKey: string;
  workflowName: string;
  bankStrategy: 'single' | 'multi_simultaneous' | 'sequential';
  turnaroundHours: number;
  requiredDocumentCount: number;
};

function normalizeDocumentKey(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function isCosmopolitanWorkflowCandidate(value: unknown) {
  const text = String(value || '').toLowerCase();
  return text.includes('cosmopolitan') || text.includes('cosmo');
}

function hasReachedStage(currentStage: DistributionDealStage, targetStage: DistributionDealStage) {
  const currentIndex = DISTRIBUTION_PIPELINE_STAGE_ORDER.indexOf(currentStage);
  const targetIndex = DISTRIBUTION_PIPELINE_STAGE_ORDER.indexOf(targetStage);
  if (currentIndex < 0 || targetIndex < 0) return false;
  return currentIndex >= targetIndex;
}

async function getWorkflowSummaryByProgramIds(db: any, programIds: number[]) {
  const result = new Map<number, ProgramWorkflowSummary>();
  const cleanIds = Array.from(new Set(programIds.map(value => Number(value)).filter(Boolean)));
  if (!cleanIds.length) return result;

  const isMissingWorkflowSchemaError = (error: unknown) => {
    const message = String((error as any)?.message || error || '').toLowerCase();
    if (!message) return false;
    const hasWorkflowTableRef =
      message.includes('distribution_program_workflows') ||
      message.includes('distribution_program_required_documents') ||
      message.includes('distribution_program_workflow_steps');
    const hasMissingSignal =
      message.includes("doesn't exist") ||
      message.includes('does not exist') ||
      message.includes('unknown table') ||
      message.includes('unknown column') ||
      message.includes('no such table');
    return hasWorkflowTableRef || hasMissingSignal;
  };

  try {
    const rows = await db
      .select({
        workflowId: distributionProgramWorkflows.id,
        programId: distributionProgramWorkflows.programId,
        workflowKey: distributionProgramWorkflows.workflowKey,
        workflowName: distributionProgramWorkflows.workflowName,
        bankStrategy: distributionProgramWorkflows.bankStrategy,
        turnaroundHours: distributionProgramWorkflows.turnaroundHours,
        isActive: distributionProgramWorkflows.isActive,
      })
      .from(distributionProgramWorkflows)
      .where(inArray(distributionProgramWorkflows.programId, cleanIds))
      .orderBy(desc(distributionProgramWorkflows.updatedAt));

    const activeRows = rows.filter(row => boolFromTinyInt(row.isActive));
    const workflowIds = activeRows.map(row => Number(row.workflowId)).filter(Boolean);
    const requiredDocCounts = new Map<number, number>();
    if (workflowIds.length) {
      const docRows = await db
        .select({
          workflowId: distributionProgramRequiredDocuments.workflowId,
        })
        .from(distributionProgramRequiredDocuments)
        .where(inArray(distributionProgramRequiredDocuments.workflowId, workflowIds));
      for (const row of docRows) {
        const workflowId = Number(row.workflowId);
        requiredDocCounts.set(workflowId, Number(requiredDocCounts.get(workflowId) || 0) + 1);
      }
    }

    for (const row of activeRows) {
      const workflowId = Number(row.workflowId);
      result.set(Number(row.programId), {
        workflowId,
        workflowKey: String(row.workflowKey || 'default_referral_workflow'),
        workflowName: String(row.workflowName || 'Referral Workflow'),
        bankStrategy: (row.bankStrategy || 'single') as ProgramWorkflowSummary['bankStrategy'],
        turnaroundHours: Number(row.turnaroundHours || 48),
        requiredDocumentCount: Number(requiredDocCounts.get(workflowId) || 0),
      });
    }
  } catch (error) {
    if (!isMissingWorkflowSchemaError(error)) {
      throw error;
    }
    warnSchemaCapabilityOnce(
      'distribution-workflow-schema-missing',
      '[Distribution] Workflow schema tables missing. Falling back to default workflow summary.',
      error,
    );
    return result;
  }

  return result;
}

function resolveFallbackWorkflowSummary(developmentName: string): ProgramWorkflowSummary {
  if (isCosmopolitanWorkflowCandidate(developmentName)) {
    return {
      workflowId: null,
      workflowKey: 'cosmopolitan_jhb_multibank',
      workflowName: 'Cosmopolitan JHB Referral Program',
      bankStrategy: 'multi_simultaneous',
      turnaroundHours: 48,
      requiredDocumentCount: COSMO_FALLBACK_REQUIRED_DOCS.length,
    };
  }

  return {
    workflowId: null,
    workflowKey: 'default_referral_workflow',
    workflowName: `${String(developmentName || 'Development').trim() || 'Development'} Referral Workflow`,
    bankStrategy: 'single',
    turnaroundHours: 72,
    requiredDocumentCount: GENERIC_FALLBACK_REQUIRED_DOCS.length,
  };
}

type ProgramWorkflowDetailInput = {
  deal: DealTimelineDealRow;
  events: Array<{ toStage: string | null; eventAt: string; id: number }>;
  snapshot: ReferralSubmissionSnapshot | null;
};

async function buildProgramWorkflowDetail(db: any, input: ProgramWorkflowDetailInput) {
  const workflowSummaryByProgram = await getWorkflowSummaryByProgramIds(db, [Number(input.deal.programId)]);
  const workflowSummary =
    workflowSummaryByProgram.get(Number(input.deal.programId)) ||
    resolveFallbackWorkflowSummary(input.deal.developmentName);

  const workflowId = workflowSummary.workflowId;
  const stepRows =
    typeof workflowId === 'number' && workflowId > 0
      ? await db
          .select({
            stepKey: distributionProgramWorkflowSteps.stepKey,
            stepLabel: distributionProgramWorkflowSteps.stepLabel,
            stepType: distributionProgramWorkflowSteps.stepType,
            stepOrder: distributionProgramWorkflowSteps.stepOrder,
            isBlocking: distributionProgramWorkflowSteps.isBlocking,
            metadata: distributionProgramWorkflowSteps.metadata,
          })
          .from(distributionProgramWorkflowSteps)
          .where(eq(distributionProgramWorkflowSteps.workflowId, workflowId))
          .orderBy(distributionProgramWorkflowSteps.stepOrder, distributionProgramWorkflowSteps.id)
      : [];

  const requiredDocumentRows =
    typeof workflowId === 'number' && workflowId > 0
      ? await db
          .select({
            documentKey: distributionProgramRequiredDocuments.documentKey,
            documentLabel: distributionProgramRequiredDocuments.documentLabel,
            isRequired: distributionProgramRequiredDocuments.isRequired,
            appliesWhen: distributionProgramRequiredDocuments.appliesWhen,
            displayOrder: distributionProgramRequiredDocuments.displayOrder,
            notes: distributionProgramRequiredDocuments.notes,
          })
          .from(distributionProgramRequiredDocuments)
          .where(eq(distributionProgramRequiredDocuments.workflowId, workflowId))
          .orderBy(
            distributionProgramRequiredDocuments.displayOrder,
            distributionProgramRequiredDocuments.id,
          )
      : [];

  const fallbackSteps =
    workflowSummary.workflowKey === 'cosmopolitan_jhb_multibank'
      ? COSMO_FALLBACK_STEPS
      : GENERIC_FALLBACK_STEPS;
  const fallbackRequiredDocs =
    workflowSummary.workflowKey === 'cosmopolitan_jhb_multibank'
      ? COSMO_FALLBACK_REQUIRED_DOCS
      : GENERIC_FALLBACK_REQUIRED_DOCS;

  const normalizedStepRows =
    stepRows.length > 0
      ? stepRows.map(row => ({
          stepKey: String(row.stepKey || ''),
          stepLabel: String(row.stepLabel || ''),
          stepType: String(row.stepType || 'internal'),
          stepOrder: Number(row.stepOrder || 0),
          isBlocking: boolFromTinyInt(row.isBlocking),
          metadata: row.metadata || null,
        }))
      : fallbackSteps.map(row => ({
          stepKey: row.stepKey,
          stepLabel: row.stepLabel,
          stepType: row.stepType,
          stepOrder: row.stepOrder,
          isBlocking: row.stepType === 'bank' || row.stepType === 'decision',
          metadata: null,
        }));

  const normalizedRequiredDocuments =
    requiredDocumentRows.length > 0
      ? requiredDocumentRows.map(row => ({
          documentKey: String(row.documentKey || ''),
          documentLabel: String(row.documentLabel || ''),
          isRequired: boolFromTinyInt(row.isRequired),
          appliesWhen: row.appliesWhen ? String(row.appliesWhen) : null,
          displayOrder: Number(row.displayOrder || 0),
          notes: row.notes ? String(row.notes) : null,
        }))
      : fallbackRequiredDocs.map(row => ({
          documentKey: row.documentKey,
          documentLabel: row.documentLabel,
          isRequired: row.isRequired,
          appliesWhen: null,
          displayOrder: row.displayOrder,
          notes: null,
        }));

  const documentStatusRows = await db
    .select({
      documentKey: distributionDealDocumentStatuses.documentKey,
      isReceived: distributionDealDocumentStatuses.isReceived,
      receivedAt: distributionDealDocumentStatuses.receivedAt,
      notes: distributionDealDocumentStatuses.notes,
    })
    .from(distributionDealDocumentStatuses)
    .where(eq(distributionDealDocumentStatuses.dealId, Number(input.deal.id)));

  const statusByDocumentKey = new Map<string, (typeof documentStatusRows)[number]>();
  for (const row of documentStatusRows) {
    statusByDocumentKey.set(normalizeDocumentKey(row.documentKey), row);
  }
  const snapshotDocumentStatus = new Map<string, boolean>();
  if (input.snapshot?.documentChecklist) {
    snapshotDocumentStatus.set('id_copy', Boolean(input.snapshot.documentChecklist.idUploaded));
    snapshotDocumentStatus.set(
      'payslips_3_months',
      Boolean(input.snapshot.documentChecklist.payslipsUploaded),
    );
    snapshotDocumentStatus.set(
      'bank_statements_3_months',
      Boolean(input.snapshot.documentChecklist.bankStatementsUploaded),
    );
    const additionalComplete = Boolean(input.snapshot.documentChecklist.additionalDocumentsUploaded);
    for (const requiredDoc of input.snapshot.documentChecklist.additionalRequiredDocuments) {
      const normalizedKey = normalizeDocumentKey(requiredDoc);
      if (normalizedKey) snapshotDocumentStatus.set(normalizedKey, additionalComplete);
    }
  }

  const requiredDocuments = normalizedRequiredDocuments.map(doc => {
    const normalizedKey = normalizeDocumentKey(doc.documentKey);
    const statusRow = statusByDocumentKey.get(normalizedKey);
    const uploaded =
      Boolean(statusRow && boolFromTinyInt(statusRow.isReceived)) ||
      Boolean(snapshotDocumentStatus.get(normalizedKey));
    return {
      ...doc,
      uploaded,
      source: statusRow ? 'manual_status' : snapshotDocumentStatus.has(normalizedKey) ? 'snapshot' : 'none',
      receivedAt: statusRow?.receivedAt || null,
      statusNotes: statusRow?.notes ? String(statusRow.notes) : null,
    };
  });

  const requiredDocRows = requiredDocuments.filter(doc => doc.isRequired);
  const uploadedRequiredDocCount = requiredDocRows.filter(doc => doc.uploaded).length;
  const documentsComplete =
    requiredDocRows.length > 0 && uploadedRequiredDocCount === requiredDocRows.length;

  const bankOutcomeRows = await db
    .select({
      bankCode: distributionDealBankOutcomes.bankCode,
      bankName: distributionDealBankOutcomes.bankName,
      status: distributionDealBankOutcomes.status,
      submittedAt: distributionDealBankOutcomes.submittedAt,
      outcomeAt: distributionDealBankOutcomes.outcomeAt,
      selectedForClient: distributionDealBankOutcomes.selectedForClient,
      selectionRank: distributionDealBankOutcomes.selectionRank,
      notes: distributionDealBankOutcomes.notes,
    })
    .from(distributionDealBankOutcomes)
    .where(eq(distributionDealBankOutcomes.dealId, Number(input.deal.id)))
    .orderBy(distributionDealBankOutcomes.submittedAt, distributionDealBankOutcomes.id);

  const stageMarksSubmission = hasReachedStage(input.deal.currentStage, 'application_submitted');
  const submissionEventAt = [...input.events]
    .filter(event => event.toStage === 'application_submitted')
    .sort((a, b) => Date.parse(String(a.eventAt || '')) - Date.parse(String(b.eventAt || '')))[0]?.eventAt;
  const fallbackSubmittedAt = submissionEventAt || (stageMarksSubmission ? input.deal.updatedAt : null);

  let bankOutcomes = bankOutcomeRows.map(row => ({
    bankCode: String(row.bankCode || ''),
    bankName: String(row.bankName || ''),
    status: (row.status || 'pending') as DistributionBankOutcomeStatus,
    submittedAt: row.submittedAt || fallbackSubmittedAt || null,
    outcomeAt: row.outcomeAt || null,
    selectedForClient: boolFromTinyInt(row.selectedForClient),
    selectionRank: row.selectionRank ? Number(row.selectionRank) : null,
    notes: row.notes ? String(row.notes) : null,
  }));

  if (!bankOutcomes.length && workflowSummary.bankStrategy === 'multi_simultaneous' && stageMarksSubmission) {
    bankOutcomes = COSMO_DEFAULT_BANKS.map(bank => ({
      bankCode: bank.code,
      bankName: bank.name,
      status: 'pending' as DistributionBankOutcomeStatus,
      submittedAt: fallbackSubmittedAt,
      outcomeAt: null,
      selectedForClient: false,
      selectionRank: null,
      notes: null,
    }));
  }

  const approvedBanks = bankOutcomes.filter(bank => bank.status === 'approved');
  const pendingBanks = bankOutcomes.filter(bank => bank.status === 'pending');
  const declinedBanks = bankOutcomes.filter(bank => bank.status === 'declined');
  const selectedBank = bankOutcomes.find(bank => bank.selectedForClient) || null;
  const hasAnyDecision = bankOutcomes.some(bank => bank.status !== 'pending');
  const allBanksResolved = bankOutcomes.length > 0 && pendingBanks.length === 0;

  const submissionTimes = bankOutcomes
    .map(bank => Date.parse(String(bank.submittedAt || '')))
    .filter(value => Number.isFinite(value));
  const submissionStartAtMs =
    submissionTimes.length > 0
      ? Math.min(...submissionTimes)
      : fallbackSubmittedAt
        ? Date.parse(String(fallbackSubmittedAt))
        : NaN;
  const submissionDeadlineAtMs =
    Number.isFinite(submissionStartAtMs) && workflowSummary.turnaroundHours > 0
      ? submissionStartAtMs + workflowSummary.turnaroundHours * 60 * 60 * 1000
      : NaN;
  const nowMs = Date.now();
  const countdown =
    Number.isFinite(submissionDeadlineAtMs) && pendingBanks.length > 0
      ? {
          startedAt: new Date(submissionStartAtMs).toISOString(),
          deadlineAt: new Date(submissionDeadlineAtMs).toISOString(),
          remainingMs: Math.max(0, submissionDeadlineAtMs - nowMs),
          overdue: nowMs > submissionDeadlineAtMs,
        }
      : null;

  const stageEventAtByKey = new Map<string, string>();
  for (const event of [...input.events].sort(
    (a, b) => Date.parse(String(a.eventAt || '')) - Date.parse(String(b.eventAt || '')),
  )) {
    const key = String(event.toStage || '').trim();
    if (!key || stageEventAtByKey.has(key)) continue;
    stageEventAtByKey.set(key, String(event.eventAt || ''));
  }

  const milestones = normalizedStepRows
    .slice()
    .sort((a, b) => a.stepOrder - b.stepOrder)
    .map(step => {
      const key = normalizeDocumentKey(step.stepKey);
      let status: 'pending' | 'in_progress' | 'blocked' | 'complete' = 'pending';
      let detail = '';
      let completedAt: string | null = null;

      if (key === 'qualification') {
        status = 'complete';
        completedAt = input.deal.submittedAt;
        detail = 'Referral submitted';
      } else if (key === 'viewing_completed') {
        if (hasReachedStage(input.deal.currentStage, 'viewing_completed')) {
          status = 'complete';
          completedAt = stageEventAtByKey.get('viewing_completed') || null;
          detail = 'Viewing marked complete';
        }
      } else if (key === 'documents_collected') {
        if (documentsComplete) {
          status = 'complete';
          detail = 'All required documents available';
        } else if (hasReachedStage(input.deal.currentStage, 'viewing_completed')) {
          status = 'blocked';
          detail = `${uploadedRequiredDocCount}/${requiredDocRows.length} required docs uploaded`;
        } else {
          detail = `${uploadedRequiredDocCount}/${requiredDocRows.length} required docs uploaded`;
        }
      } else if (key === 'bank_submission') {
        if (!documentsComplete) {
          status = 'blocked';
          detail = 'Missing required documents';
        } else if (stageMarksSubmission) {
          status = 'complete';
          completedAt = fallbackSubmittedAt || null;
          detail =
            bankOutcomes.length > 0
              ? `${bankOutcomes.length} bank route(s) initiated`
              : 'Submission stage reached';
        }
      } else if (key === 'bank_decision') {
        if (!stageMarksSubmission) {
          status = 'pending';
        } else if (allBanksResolved || hasAnyDecision) {
          status = allBanksResolved ? 'complete' : 'in_progress';
          detail = `${approvedBanks.length} approved, ${declinedBanks.length} declined, ${pendingBanks.length} pending`;
        } else {
          status = 'in_progress';
          detail = 'Awaiting initial bank outcomes';
        }
      } else if (key === 'bank_selected') {
        if (selectedBank) {
          status = 'complete';
          completedAt = selectedBank.outcomeAt || selectedBank.submittedAt || null;
          detail = `${selectedBank.bankName} selected`;
        } else if (approvedBanks.length > 1) {
          status = 'in_progress';
          detail = 'Multiple bank approvals, client selection required';
        } else if (approvedBanks.length === 1) {
          status = 'in_progress';
          detail = `${approvedBanks[0].bankName} approved, pending selection`;
        } else if (allBanksResolved) {
          status = 'blocked';
          detail = 'No approval selected';
        }
      } else if (key in Object.fromEntries(DISTRIBUTION_PIPELINE_STAGE_ORDER.map(s => [s, true]))) {
        const stageKey = key as DistributionDealStage;
        if (hasReachedStage(input.deal.currentStage, stageKey)) {
          status = 'complete';
          completedAt = stageEventAtByKey.get(stageKey) || null;
          detail = 'Reached';
        }
      } else if (key === 'bond_approved') {
        if (hasReachedStage(input.deal.currentStage, 'bond_approved')) {
          status = 'complete';
          completedAt = stageEventAtByKey.get('bond_approved') || null;
          detail = 'Bond approved';
        }
      } else if (key === 'contract_signed') {
        if (hasReachedStage(input.deal.currentStage, 'contract_signed')) {
          status = 'complete';
          completedAt = stageEventAtByKey.get('contract_signed') || null;
          detail = 'Contract signed';
        }
      } else if (key === 'commission_paid') {
        if (input.deal.currentStage === 'commission_paid') {
          status = 'complete';
          completedAt = stageEventAtByKey.get('commission_paid') || input.deal.updatedAt;
          detail = 'Commission paid';
        }
      }

      return {
        stepKey: step.stepKey,
        stepLabel: step.stepLabel,
        stepType: step.stepType,
        stepOrder: step.stepOrder,
        isBlocking: Boolean(step.isBlocking),
        status,
        detail,
        completedAt,
      };
    });

  return {
    summary: workflowSummary,
    requiredDocuments,
    documentsComplete,
    uploadedRequiredDocumentCount: uploadedRequiredDocCount,
    missingRequiredDocumentCount: Math.max(0, requiredDocRows.length - uploadedRequiredDocCount),
    bankOutcomes,
    bankSummary: {
      total: bankOutcomes.length,
      approved: approvedBanks.length,
      declined: declinedBanks.length,
      pending: pendingBanks.length,
      selectedBankCode: selectedBank?.bankCode || null,
      selectedBankName: selectedBank?.bankName || null,
      countdown,
    },
    milestones,
  };
}

async function getReferralSubmissionSnapshotByDealIds(db: any, dealIds: number[]) {
  const result = new Map<number, ReferralSubmissionSnapshot>();
  if (!dealIds.length) return result;

  const rows = await db
    .select({
      id: distributionDealEvents.id,
      dealId: distributionDealEvents.dealId,
      metadata: distributionDealEvents.metadata,
      eventAt: distributionDealEvents.eventAt,
    })
    .from(distributionDealEvents)
    .where(inArray(distributionDealEvents.dealId, dealIds))
    .orderBy(desc(distributionDealEvents.eventAt), desc(distributionDealEvents.id));

  for (const row of rows) {
    if (result.has(row.dealId)) continue;
    const snapshot = normalizeReferralSubmissionSnapshot(row.metadata);
    if (snapshot) {
      result.set(Number(row.dealId), snapshot);
    }
  }

  return result;
}

type DealTimelineDealRow = {
  id: number;
  programId: number;
  developmentId: number;
  developmentName: string;
  buyerName: string;
  buyerEmail: string | null;
  buyerPhone: string | null;
  currentStage: DistributionDealStage;
  commissionStatus: (typeof DISTRIBUTION_COMMISSION_STATUS_VALUES)[number];
  submittedAt: string;
  updatedAt: string;
  closedAt: string | null;
  agentId: number;
  managerUserId: number | null;
  managerName: string | null;
  managerFirstName: string | null;
  managerLastName: string | null;
  managerEmail: string | null;
};

async function buildDealTimelinePayload(db: any, deal: DealTimelineDealRow) {
  const userDirectory = await getUserDirectoryByIds(db, [Number(deal.agentId)]);
  const referralSnapshotsByDeal = await getReferralSubmissionSnapshotByDealIds(db, [Number(deal.id)]);
  const referralSnapshot = referralSnapshotsByDeal.get(Number(deal.id)) || null;

  const events = await db
    .select({
      id: distributionDealEvents.id,
      eventType: distributionDealEvents.eventType,
      fromStage: distributionDealEvents.fromStage,
      toStage: distributionDealEvents.toStage,
      eventAt: distributionDealEvents.eventAt,
      actorUserId: distributionDealEvents.actorUserId,
      notes: distributionDealEvents.notes,
      metadata: distributionDealEvents.metadata,
      actorName: users.name,
      actorFirstName: users.firstName,
      actorLastName: users.lastName,
      actorEmail: users.email,
    })
    .from(distributionDealEvents)
    .leftJoin(users, eq(distributionDealEvents.actorUserId, users.id))
    .where(eq(distributionDealEvents.dealId, deal.id))
    .orderBy(desc(distributionDealEvents.eventAt), desc(distributionDealEvents.id))
    .limit(300);

  const viewings = await db
    .select({
      id: distributionViewings.id,
      scheduledStartAt: distributionViewings.scheduledStartAt,
      scheduledEndAt: distributionViewings.scheduledEndAt,
      timezone: distributionViewings.timezone,
      locationName: distributionViewings.locationName,
      status: distributionViewings.status,
      rescheduleCount: distributionViewings.rescheduleCount,
      notes: distributionViewings.notes,
      updatedAt: distributionViewings.updatedAt,
    })
    .from(distributionViewings)
    .where(eq(distributionViewings.dealId, deal.id))
    .orderBy(desc(distributionViewings.updatedAt))
    .limit(50);

  const validations = await db
    .select({
      id: distributionViewingValidations.id,
      validationStatus: distributionViewingValidations.validationStatus,
      attributionLockApplied: distributionViewingValidations.attributionLockApplied,
      attributionLockAt: distributionViewingValidations.attributionLockAt,
      validatedAt: distributionViewingValidations.validatedAt,
      notes: distributionViewingValidations.notes,
      updatedAt: distributionViewingValidations.updatedAt,
    })
    .from(distributionViewingValidations)
    .where(eq(distributionViewingValidations.dealId, deal.id))
    .orderBy(desc(distributionViewingValidations.updatedAt))
    .limit(100);

  const commissions = await db
    .select({
      id: distributionCommissionEntries.id,
      commissionAmount: distributionCommissionEntries.commissionAmount,
      commissionPercent: distributionCommissionEntries.commissionPercent,
      calculationBaseAmount: distributionCommissionEntries.calculationBaseAmount,
      currency: distributionCommissionEntries.currency,
      triggerStage: distributionCommissionEntries.triggerStage,
      entryStatus: distributionCommissionEntries.entryStatus,
      approvedAt: distributionCommissionEntries.approvedAt,
      paidAt: distributionCommissionEntries.paidAt,
      paymentReference: distributionCommissionEntries.paymentReference,
      notes: distributionCommissionEntries.notes,
      updatedAt: distributionCommissionEntries.updatedAt,
    })
    .from(distributionCommissionEntries)
    .where(eq(distributionCommissionEntries.dealId, deal.id))
    .orderBy(desc(distributionCommissionEntries.updatedAt))
    .limit(100);

  const workflow = await buildProgramWorkflowDetail(db, {
    deal,
    events: events.map(event => ({
      id: Number(event.id),
      toStage: event.toStage || null,
      eventAt: String(event.eventAt || ''),
    })),
    snapshot: referralSnapshot,
  });

  return {
    deal: {
      ...deal,
      agentDisplayName:
        userDirectory.get(Number(deal.agentId))?.displayName || `Referrer #${deal.agentId}`,
      agentEmail: userDirectory.get(Number(deal.agentId))?.email || null,
      managerDisplayName: formatUserDisplayName({
        name: deal.managerName,
        firstName: deal.managerFirstName,
        lastName: deal.managerLastName,
        email: deal.managerEmail,
      }),
    },
    events: events.map(event => ({
      ...event,
      actorDisplayName: formatUserDisplayName({
        name: event.actorName,
        firstName: event.actorFirstName,
        lastName: event.actorLastName,
        email: event.actorEmail,
      }),
    })),
    viewings: viewings.map(viewing => ({
      ...viewing,
      rescheduleCount: Number(viewing.rescheduleCount || 0),
    })),
    validations: validations.map(validation => ({
      ...validation,
      attributionLockApplied: boolFromTinyInt(validation.attributionLockApplied),
    })),
    commissions,
    workflow,
    referralSnapshot,
  };
}

async function assertManagerScope(
  db: any,
  userId: number,
  scope: {
    programId?: number;
    developmentId?: number;
  },
) {
  const conditions: SQL[] = [
    eq(distributionManagerAssignments.managerUserId, userId),
    eq(distributionManagerAssignments.isActive, 1),
  ];

  if (typeof scope.programId === 'number') {
    conditions.push(eq(distributionManagerAssignments.programId, scope.programId));
  }

  if (typeof scope.developmentId === 'number') {
    conditions.push(eq(distributionManagerAssignments.developmentId, scope.developmentId));
  }

  const [assignment] = await db
    .select({ id: distributionManagerAssignments.id })
    .from(distributionManagerAssignments)
    .where(withConditions(conditions))
    .limit(1);

  if (!assignment) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You are not assigned as a manager for this distribution scope.',
    });
  }
}

async function listProgramsForAdmin() {
  return await runDistributionDbOperation('distribution.admin.listPrograms', async () => {
    await assertDistributionSchemaReady('distribution.admin.listPrograms');
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const rows = await db
      .select({
        id: distributionPrograms.id,
        developmentId: distributionPrograms.developmentId,
        developmentName: developments.name,
        city: developments.city,
        province: developments.province,
        isActive: distributionPrograms.isActive,
        isReferralEnabled: distributionPrograms.isReferralEnabled,
        commissionModel: distributionPrograms.commissionModel,
        defaultCommissionPercent: distributionPrograms.defaultCommissionPercent,
        defaultCommissionAmount: distributionPrograms.defaultCommissionAmount,
        referrerCommissionType: distributionPrograms.referrerCommissionType,
        referrerCommissionValue: distributionPrograms.referrerCommissionValue,
        referrerCommissionBasis: distributionPrograms.referrerCommissionBasis,
        platformCommissionType: distributionPrograms.platformCommissionType,
        platformCommissionValue: distributionPrograms.platformCommissionValue,
        platformCommissionBasis: distributionPrograms.platformCommissionBasis,
        tierAccessPolicy: distributionPrograms.tierAccessPolicy,
        updatedBy: distributionPrograms.updatedBy,
        createdAt: distributionPrograms.createdAt,
        updatedAt: distributionPrograms.updatedAt,
      })
      .from(distributionPrograms)
      .innerJoin(developments, eq(distributionPrograms.developmentId, developments.id))
      .orderBy(desc(distributionPrograms.updatedAt));

    return rows.map(row => {
      const referrerCommission = resolveReferrerCommissionTrackFromProgramRow(row);
      const platformCommission = resolvePlatformCommissionTrackFromProgramRow(row, referrerCommission);
      return {
        ...row,
        isActive: boolFromTinyInt(row.isActive),
        isReferralEnabled: boolFromTinyInt(row.isReferralEnabled),
        referrerCommission,
        platformCommission,
      };
    });
  });
}

const upsertProgramInput = z.object({
  developmentId: z.number().int().positive(),
  isReferralEnabled: z.boolean(),
  isActive: z.boolean().default(true),
  commissionModel: z.enum(['flat_percentage', 'tiered_percentage', 'fixed_amount', 'hybrid']),
  defaultCommissionPercent: z.number().min(0).max(100).nullable().optional(),
  defaultCommissionAmount: z.number().int().min(0).nullable().optional(),
  referrerCommissionType: z.enum(DISTRIBUTION_PROGRAM_COMMISSION_TYPE_VALUES).nullable().optional(),
  referrerCommissionValue: z.number().min(0).nullable().optional(),
  referrerCommissionBasis: z
    .enum(DISTRIBUTION_PROGRAM_COMMISSION_BASIS_VALUES)
    .nullable()
    .optional(),
  platformCommissionType: z.enum(DISTRIBUTION_PROGRAM_COMMISSION_TYPE_VALUES).nullable().optional(),
  platformCommissionValue: z.number().min(0).nullable().optional(),
  platformCommissionBasis: z
    .enum(DISTRIBUTION_PROGRAM_COMMISSION_BASIS_VALUES)
    .nullable()
    .optional(),
  tierAccessPolicy: z.enum(['open', 'restricted', 'invite_only']),
});

const upsertBrandPartnershipInput = z.object({
  brandProfileId: z.number().int().positive(),
  status: z.enum(DISTRIBUTION_BRAND_PARTNERSHIP_STATUS_VALUES),
  channelScope: z.array(z.enum(DISTRIBUTION_ACCESS_CHANNEL_SCOPE_VALUES)).optional(),
  reasonCode: z.string().trim().max(80).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

const upsertDevelopmentAccessInput = z.object({
  developmentId: z.number().int().positive(),
  status: z.enum(DISTRIBUTION_DEVELOPMENT_ACCESS_STATUS_VALUES),
  submissionAllowed: z.boolean().optional(),
  excludedByMandate: z.boolean().optional(),
  excludedByExclusivity: z.boolean().optional(),
  reasonCode: z.string().trim().max(80).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

const getBrandPartnershipInput = z.object({
  brandProfileId: z.number().int().positive(),
});

const getDevelopmentAccessInput = z.object({
  developmentId: z.number().int().positive(),
});

const listDevelopmentAccessInput = z
  .object({
    brandProfileId: z.number().int().positive().optional(),
    partnershipStatus: z.array(z.enum(DISTRIBUTION_BRAND_PARTNERSHIP_STATUS_VALUES)).optional(),
    accessStatus: z.array(z.enum(DISTRIBUTION_DEVELOPMENT_ACCESS_STATUS_VALUES)).optional(),
    submitReady: z.boolean().optional(),
    search: z.string().trim().max(200).optional(),
    limit: z.number().int().min(1).max(500).default(200),
  })
  .optional();

async function upsertProgram(
  ctx: { user: { id: number } },
  input: z.infer<typeof upsertProgramInput>,
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [existing] = await db
    .select({ id: distributionPrograms.id })
    .from(distributionPrograms)
    .where(eq(distributionPrograms.developmentId, input.developmentId))
    .limit(1);

  const accessEvaluation = await evaluateDevelopmentDistributionAccess({
    db,
    developmentId: input.developmentId,
    actor: { role: 'admin', userId: ctx.user.id },
    channel: 'admin_catalog',
  });
  const blockerSummary = summarizeDistributionBlockers(accessEvaluation);

  const referrerCommission = resolveReferrerCommissionTrackFromProgramRow({
    referrerCommissionType: input.referrerCommissionType,
    referrerCommissionValue: input.referrerCommissionValue,
    referrerCommissionBasis: input.referrerCommissionBasis,
    commissionModel: input.commissionModel,
    defaultCommissionPercent: toNumberOrNull(input.defaultCommissionPercent),
    defaultCommissionAmount: toNumberOrNull(input.defaultCommissionAmount),
  });
  const platformCommission = resolvePlatformCommissionTrackFromProgramRow(
    {
      platformCommissionType: input.platformCommissionType,
      platformCommissionValue: input.platformCommissionValue,
      platformCommissionBasis: input.platformCommissionBasis,
    },
    referrerCommission,
  );
  const legacyReferrerCommission = toLegacyProgramCommissionFields(referrerCommission);

  if (!existing && blockerSummary.accessBlockers.length > 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Program creation blocked by access requirements: ${blockerSummary.accessBlockers.join(', ')}.`,
    });
  }

  if (input.isReferralEnabled) {
    if (blockerSummary.accessBlockers.length > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Referral enable blocked by access requirements: ${blockerSummary.accessBlockers.join(', ')}.`,
      });
    }

    const hasPrimaryManager = existing?.id
      ? await hasPrimaryActiveManagerAssignment(db, Number(existing.id))
      : false;
    const readiness = getProgramActivationReadiness({
      commissionModel: legacyReferrerCommission.commissionModel,
      defaultCommissionPercent: legacyReferrerCommission.defaultCommissionPercent,
      defaultCommissionAmount: legacyReferrerCommission.defaultCommissionAmount,
      tierAccessPolicy: input.tierAccessPolicy,
      hasPrimaryManager,
    });

    if (!readiness.canEnable) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Referral enable blocked: ${readiness.missingRequirements.join(', ')}.`,
      });
    }
  }

  const payload = {
    developmentId: input.developmentId,
    isReferralEnabled: input.isReferralEnabled ? 1 : 0,
    isActive: input.isActive ? 1 : 0,
    commissionModel: legacyReferrerCommission.commissionModel,
    defaultCommissionPercent: legacyReferrerCommission.defaultCommissionPercent,
    defaultCommissionAmount: legacyReferrerCommission.defaultCommissionAmount,
    referrerCommissionType: referrerCommission.type,
    referrerCommissionValue: referrerCommission.value,
    referrerCommissionBasis: referrerCommission.basis,
    platformCommissionType: platformCommission.type,
    platformCommissionValue: platformCommission.value,
    platformCommissionBasis: platformCommission.basis,
    tierAccessPolicy: input.tierAccessPolicy,
    updatedBy: ctx.user.id,
  };

  if (existing) {
    await db
      .update(distributionPrograms)
      .set({
        ...payload,
      })
      .where(eq(distributionPrograms.id, existing.id));

    return {
      success: true,
      mode: 'updated' as const,
      programId: existing.id,
      accessBlockers: blockerSummary.accessBlockers,
      readinessBlockers: input.isReferralEnabled ? [] : blockerSummary.readinessBlockers,
    };
  }

  const [insertResult] = await db.insert(distributionPrograms).values({
    ...payload,
    createdBy: ctx.user.id,
  });

  return {
    success: true,
    mode: 'created' as const,
    programId: Number((insertResult as any).insertId || 0),
    accessBlockers: blockerSummary.accessBlockers,
    readinessBlockers: input.isReferralEnabled ? [] : blockerSummary.readinessBlockers,
  };
}

const listDealsInput = z.object({
  developmentId: z.number().int().positive().optional(),
  agentId: z.number().int().positive().optional(),
  stage: z.enum(DISTRIBUTION_DEAL_STAGE_VALUES).optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

const commissionOverrideTrackInput = z.object({
  type: z.enum(DISTRIBUTION_PROGRAM_COMMISSION_TYPE_VALUES),
  value: z.number().min(0),
  basis: z.enum(DISTRIBUTION_PROGRAM_COMMISSION_BASIS_VALUES).nullable().optional(),
});

const overrideDealCommissionSnapshotInput = z.object({
  dealId: z.number().int().positive(),
  reason: z.string().trim().min(5).max(2000),
  newReferrerCommission: commissionOverrideTrackInput.optional(),
  newPlatformCommission: commissionOverrideTrackInput.optional(),
});

const developmentDocumentItemInput = z.object({
  url: z.string().trim().min(1).max(2048),
  name: z.string().trim().max(200).nullable().optional(),
});

const setDevelopmentDocumentsInput = z
  .object({
    developmentId: z.number().int().positive(),
    videos: z.array(developmentDocumentItemInput).max(200).optional(),
    floorPlans: z.array(developmentDocumentItemInput).max(200).optional(),
    brochures: z.array(developmentDocumentItemInput).max(200).optional(),
  })
  .refine(
    value =>
      value.videos !== undefined || value.floorPlans !== undefined || value.brochures !== undefined,
    {
      message: 'At least one document category must be provided.',
      path: ['videos'],
    },
  );

async function listDeals(input: z.infer<typeof listDealsInput>) {
  return await runDistributionDbOperation('distribution.admin.listDeals', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const conditions: SQL[] = [];

    if (typeof input.developmentId === 'number') {
      conditions.push(sql`${distributionDeals.developmentId} = ${input.developmentId}`);
    }

    if (typeof input.agentId === 'number') {
      conditions.push(sql`${distributionDeals.agentId} = ${input.agentId}`);
    }

    if (input.stage) {
      conditions.push(sql`${distributionDeals.currentStage} = ${input.stage}`);
    }

    const rows = await db
      .select({
        id: distributionDeals.id,
        developmentId: distributionDeals.developmentId,
        developmentName: developments.name,
        agentId: distributionDeals.agentId,
        currentStage: distributionDeals.currentStage,
        commissionStatus: distributionDeals.commissionStatus,
        submittedAt: distributionDeals.submittedAt,
        updatedAt: distributionDeals.updatedAt,
      })
      .from(distributionDeals)
      .innerJoin(developments, eq(distributionDeals.developmentId, developments.id))
      .where(withConditions(conditions))
      .orderBy(desc(distributionDeals.updatedAt))
      .limit(input.limit);

    const referralSnapshotsByDeal = await getReferralSubmissionSnapshotByDealIds(
      db,
      rows.map(row => Number(row.id)),
    );

    const userDirectory = await getUserDirectoryByIds(
      db,
      rows.map(row => Number(row.agentId)),
    );

    return rows.map(row => ({
      ...row,
      agentDisplayName:
        userDirectory.get(Number(row.agentId))?.displayName || `Referrer #${row.agentId}`,
      documentsComplete: hasCompleteDocuments(referralSnapshotsByDeal.get(Number(row.id)) || null),
    }));
  });
}

async function setDevelopmentDocuments(
  db: any,
  input: z.infer<typeof setDevelopmentDocumentsInput>,
) {
  await getDevelopmentDocumentBank(db, input.developmentId);

  const updatePayload: Record<string, unknown> = {};

  if (input.videos !== undefined) {
    updatePayload.videos = JSON.stringify(
      normalizeDevelopmentDocumentRows(input.videos, 'Development Video'),
    );
  }
  if (input.floorPlans !== undefined) {
    updatePayload.floorPlans = JSON.stringify(
      normalizeDevelopmentDocumentRows(input.floorPlans, 'Floor Plan'),
    );
  }
  if (input.brochures !== undefined) {
    updatePayload.brochures = JSON.stringify(
      normalizeDevelopmentDocumentRows(input.brochures, 'Development Brochure'),
    );
  }

  if (!Object.keys(updatePayload).length) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'No document payload provided.' });
  }

  await db.update(developments).set(updatePayload).where(eq(developments.id, input.developmentId));

  return await getDevelopmentDocumentBank(db, input.developmentId);
}

async function getDealById(db: any, dealId: number) {
  const [deal] = await db
    .select({
      id: distributionDeals.id,
      programId: distributionDeals.programId,
      developmentId: distributionDeals.developmentId,
      agentId: distributionDeals.agentId,
      managerUserId: distributionDeals.managerUserId,
      dealAmount: distributionDeals.dealAmount,
      platformAmount: distributionDeals.platformAmount,
      commissionBaseAmount: distributionDeals.commissionBaseAmount,
      referrerCommissionType: distributionDeals.referrerCommissionType,
      referrerCommissionValue: distributionDeals.referrerCommissionValue,
      referrerCommissionBasis: distributionDeals.referrerCommissionBasis,
      referrerCommissionAmount: distributionDeals.referrerCommissionAmount,
      platformCommissionType: distributionDeals.platformCommissionType,
      platformCommissionValue: distributionDeals.platformCommissionValue,
      platformCommissionBasis: distributionDeals.platformCommissionBasis,
      platformCommissionAmount: distributionDeals.platformCommissionAmount,
      snapshotVersion: distributionDeals.snapshotVersion,
      snapshotSource: distributionDeals.snapshotSource,
      currentStage: distributionDeals.currentStage,
      commissionTriggerStage: distributionDeals.commissionTriggerStage,
      commissionStatus: distributionDeals.commissionStatus,
      attributionLockedAt: distributionDeals.attributionLockedAt,
      closedAt: distributionDeals.closedAt,
    })
    .from(distributionDeals)
    .where(eq(distributionDeals.id, dealId))
    .limit(1);

  return deal || null;
}

async function getViewingByDealId(db: any, dealId: number) {
  const [viewing] = await db
    .select({
      id: distributionViewings.id,
      dealId: distributionViewings.dealId,
      programId: distributionViewings.programId,
      developmentId: distributionViewings.developmentId,
      agentId: distributionViewings.agentId,
      managerUserId: distributionViewings.managerUserId,
      scheduledStartAt: distributionViewings.scheduledStartAt,
      scheduledEndAt: distributionViewings.scheduledEndAt,
      timezone: distributionViewings.timezone,
      locationName: distributionViewings.locationName,
      status: distributionViewings.status,
      rescheduleCount: distributionViewings.rescheduleCount,
      notes: distributionViewings.notes,
      createdAt: distributionViewings.createdAt,
      updatedAt: distributionViewings.updatedAt,
    })
    .from(distributionViewings)
    .where(eq(distributionViewings.dealId, dealId))
    .limit(1);

  return viewing || null;
}

async function getViewingById(db: any, viewingId: number) {
  const [viewing] = await db
    .select({
      id: distributionViewings.id,
      dealId: distributionViewings.dealId,
      programId: distributionViewings.programId,
      developmentId: distributionViewings.developmentId,
      agentId: distributionViewings.agentId,
      managerUserId: distributionViewings.managerUserId,
      scheduledStartAt: distributionViewings.scheduledStartAt,
      scheduledEndAt: distributionViewings.scheduledEndAt,
      timezone: distributionViewings.timezone,
      locationName: distributionViewings.locationName,
      status: distributionViewings.status,
      rescheduleCount: distributionViewings.rescheduleCount,
      notes: distributionViewings.notes,
      createdAt: distributionViewings.createdAt,
      updatedAt: distributionViewings.updatedAt,
    })
    .from(distributionViewings)
    .where(eq(distributionViewings.id, viewingId))
    .limit(1);

  return viewing || null;
}

async function getActiveManagerProgramIdsForUser(db: any, userId: number) {
  const assignments = await db
    .select({ programId: distributionManagerAssignments.programId })
    .from(distributionManagerAssignments)
    .where(
      and(
        eq(distributionManagerAssignments.managerUserId, userId),
        eq(distributionManagerAssignments.isActive, 1),
      ),
    );

  return Array.from(new Set<number>(assignments.map(row => Number(row.programId))));
}

const adminDistributionRouter = router({
  listPrograms: superAdminProcedure.query(async () => {
    assertDistributionEnabled();
    return await listProgramsForAdmin();
  }),

  listAdminHelpRequests: superAdminProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(200).default(50),
          includeResolved: z.boolean().default(false),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      return await runDistributionDbOperation('distribution.admin.listAdminHelpRequests', async () => {
        await assertDistributionSchemaReady('distribution.admin.listPrograms');
        assertDistributionEnabled();
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const limit = input?.limit ?? 50;
        const includeResolved = input?.includeResolved ?? false;

        const rows = await db
          .select({
            id: auditLogs.id,
            createdAt: auditLogs.createdAt,
            actorUserId: auditLogs.userId,
            actorName: users.name,
            actorEmail: users.email,
            targetType: auditLogs.targetType,
            targetId: auditLogs.targetId,
            metadata: auditLogs.metadata,
            developmentName: developments.name,
          })
          .from(auditLogs)
          .innerJoin(users, eq(auditLogs.userId, users.id))
          .leftJoin(
            developments,
            and(eq(auditLogs.targetType, 'development'), eq(auditLogs.targetId, developments.id)),
          )
          .where(eq(auditLogs.action, 'distribution.developer.requestAdminHelp'))
          .orderBy(desc(auditLogs.createdAt))
          .limit(limit);

        const requestIds = rows.map(row => Number(row.id)).filter(value => Number.isFinite(value) && value > 0);
        const resolvedByRequestId = new Map<number, { resolvedAt: string | null; resolvedByEmail: string | null }>();
        if (requestIds.length) {
          const resolvedRows = await db
            .select({
              requestId: auditLogs.targetId,
              createdAt: auditLogs.createdAt,
              resolvedByEmail: users.email,
            })
            .from(auditLogs)
            .innerJoin(users, eq(auditLogs.userId, users.id))
            .where(
              and(
                eq(auditLogs.action, 'distribution.admin.resolveAdminHelpRequest'),
                eq(auditLogs.targetType, 'audit_log'),
                inArray(auditLogs.targetId, requestIds),
              ),
            )
            .orderBy(desc(auditLogs.createdAt))
            .limit(500);

          for (const row of resolvedRows) {
            const requestId = Number(row.requestId || 0);
            if (!requestId || resolvedByRequestId.has(requestId)) continue;
            resolvedByRequestId.set(requestId, {
              resolvedAt: row.createdAt || null,
              resolvedByEmail: row.resolvedByEmail || null,
            });
          }
        }

        const mapped = rows.map(row => {
          const metadata = parseMetadataObject(row.metadata) || {};
          const requestId = Number(row.id);
          const resolution = resolvedByRequestId.get(requestId) || null;
          return {
            id: requestId,
            createdAt: row.createdAt || null,
            actorUserId: Number(row.actorUserId),
            actorName: row.actorName || null,
            actorEmail: row.actorEmail || null,
            targetType: row.targetType ? String(row.targetType) : null,
            targetId: row.targetId != null ? Number(row.targetId) : null,
            developmentName: row.developmentName || null,
            message: typeof (metadata as any).message === 'string' ? String((metadata as any).message) : null,
            missingKeys: Array.isArray((metadata as any).missingKeys)
              ? (metadata as any).missingKeys.map((v: any) => String(v)).filter(Boolean)
              : [],
            resolvedAt: resolution?.resolvedAt || null,
            resolvedByEmail: resolution?.resolvedByEmail || null,
          };
        });

        return includeResolved ? mapped : mapped.filter(row => !row.resolvedAt);
      });
    }),

  resolveAdminHelpRequest: superAdminProcedure
    .input(
      z.object({
        requestId: z.number().int().positive(),
        notes: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await runDistributionDbOperation('distribution.admin.resolveAdminHelpRequest', async () => {
        await assertDistributionSchemaReady('distribution.admin.listPrograms');
        assertDistributionEnabled();
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const [request] = await db
          .select({ id: auditLogs.id })
          .from(auditLogs)
          .where(
            and(
              eq(auditLogs.id, input.requestId),
              eq(auditLogs.action, 'distribution.developer.requestAdminHelp'),
            ),
          )
          .limit(1);

        if (!request) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Help request not found.' });
        }

        await logDistributionAudit({
          userId: Number(ctx.user!.id),
          action: 'distribution.admin.resolveAdminHelpRequest',
          targetType: 'audit_log',
          targetId: input.requestId,
          metadata: {
            notes: input.notes || null,
          },
        });

        return { success: true };
      });
    }),

  listSetupBoard: superAdminProcedure
    .input(
      z
        .object({
          search: z.string().trim().max(200).optional(),
          brandProfileId: z.number().int().positive().optional(),
          includeUnpublished: z.boolean().default(false),
          limit: z.number().int().min(1).max(300).default(200),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      return await runDistributionDbOperation('distribution.admin.listSetupBoard', async () => {
        await assertDistributionSchemaReady('distribution.admin.listDevelopmentCatalog');
        assertDistributionEnabled();
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const limit = input?.limit ?? 200;
        const includeUnpublished = input?.includeUnpublished ?? false;
        const brandProfileId = input?.brandProfileId;
        const search = input?.search?.trim().toLowerCase() || '';

        const conditions: SQL[] = [];
        if (!includeUnpublished) {
          conditions.push(eq(developments.isPublished, 1));
          conditions.push(eq(developments.approvalStatus, 'approved'));
        }
        if (typeof brandProfileId === 'number') {
          conditions.push(
            sql`(${developments.developerBrandProfileId} = ${brandProfileId} OR ${developments.marketingBrandProfileId} = ${brandProfileId})`,
          );
        }
        if (search) {
          const term = `%${search}%`;
          conditions.push(
            sql`(
              LOWER(COALESCE(${developments.name}, '')) LIKE ${term}
              OR LOWER(COALESCE(${developments.city}, '')) LIKE ${term}
              OR LOWER(COALESCE(${developments.province}, '')) LIKE ${term}
            )`,
          );
        }

        const rows = await db
          .select({
            developmentId: developments.id,
            developmentName: developments.name,
            city: developments.city,
            province: developments.province,
            suburb: developments.suburb,
            approvalStatus: developments.approvalStatus,
            isPublished: developments.isPublished,
            developerBrandProfileId: developments.developerBrandProfileId,
            marketingBrandProfileId: developments.marketingBrandProfileId,
            brochures: developments.brochures,
            floorPlans: developments.floorPlans,
            videos: developments.videos,
            updatedAt: developments.updatedAt,
          })
          .from(developments)
          .where(withConditions(conditions))
          .orderBy(desc(developments.updatedAt))
          .limit(limit);

        const developmentIds = rows.map(row => Number(row.developmentId)).filter(Boolean);
        if (!developmentIds.length) return [];

        const programRows = await db
          .select({
            id: distributionPrograms.id,
            developmentId: distributionPrograms.developmentId,
            isReferralEnabled: distributionPrograms.isReferralEnabled,
            isActive: distributionPrograms.isActive,
            commissionModel: distributionPrograms.commissionModel,
            defaultCommissionPercent: distributionPrograms.defaultCommissionPercent,
            defaultCommissionAmount: distributionPrograms.defaultCommissionAmount,
            tierAccessPolicy: distributionPrograms.tierAccessPolicy,
          })
          .from(distributionPrograms)
          .where(inArray(distributionPrograms.developmentId, developmentIds));

        const programByDevelopmentId = new Map<number, (typeof programRows)[number]>();
        for (const row of programRows) {
          programByDevelopmentId.set(Number(row.developmentId), row);
        }

        // Show only developments that have entered the distribution universe (program exists).
        const inUniverse = rows.filter(row => programByDevelopmentId.has(Number(row.developmentId)));
        const programIds: number[] = Array.from(
          new Set(
            inUniverse
              .map(row => Number(programByDevelopmentId.get(Number(row.developmentId))?.id || 0))
              .filter(value => Number.isFinite(value) && value > 0),
          ),
        );

        const primaryManagerByDevelopmentId = new Map<number, number>();
        if (programIds.length > 0) {
          const managerRows = await db
            .select({
              developmentId: distributionManagerAssignments.developmentId,
              managerUserId: distributionManagerAssignments.managerUserId,
            })
            .from(distributionManagerAssignments)
            .where(
              and(
                inArray(distributionManagerAssignments.programId, programIds),
                eq(distributionManagerAssignments.isPrimary, 1),
                eq(distributionManagerAssignments.isActive, 1),
              ),
            );
          for (const row of managerRows) {
            const developmentId = Number(row.developmentId || 0);
            const managerUserId = Number(row.managerUserId || 0);
            if (developmentId > 0 && managerUserId > 0) {
              primaryManagerByDevelopmentId.set(developmentId, managerUserId);
            }
          }
        }

        const checklistCountsByProgramId = await getChecklistRequiredCountsByProgramId(db, programIds);

        const linkedBrandIds: number[] = Array.from(
          new Set(
            inUniverse
              .flatMap(row => [
                Number(row.developerBrandProfileId || 0),
                Number(row.marketingBrandProfileId || 0),
              ])
              .filter(value => Number.isFinite(value) && value > 0),
          ),
        );
        const brandDirectory =
          linkedBrandIds.length > 0
            ? new Map<number, { brandName: string; ownerType: string | null }>(
                (
                  await db
                    .select({
                      id: developerBrandProfiles.id,
                      brandName: developerBrandProfiles.brandName,
                      ownerType: developerBrandProfiles.ownerType,
                    })
                    .from(developerBrandProfiles)
                    .where(inArray(developerBrandProfiles.id, linkedBrandIds))
                ).map(row => [
                  Number(row.id),
                  { brandName: String(row.brandName || ''), ownerType: row.ownerType ? String(row.ownerType) : null },
                ]),
              )
            : new Map<number, { brandName: string; ownerType: string | null }>();

        const evaluated = await Promise.all(
          inUniverse.map(async row => {
            const developmentId = Number(row.developmentId);
            const program = programByDevelopmentId.get(developmentId)!;
            const programId = Number(program.id || 0);
            const requiredChecklistCount = checklistCountsByProgramId.get(programId) || 0;
            const salesPackCount = countDevelopmentCommercialDocs({
              brochures: row.brochures,
              floorPlans: row.floorPlans,
              videos: row.videos,
            });

            const evaluation = await evaluateDevelopmentDistributionAccess({
              db,
              developmentId,
              actor: { role: 'admin', userId: 0 },
              channel: 'admin_catalog',
            });

            const setup = computeDistributionSetupSnapshot({
              evaluation,
              salesPackDocumentCount: salesPackCount,
              submissionChecklistRequiredCount: requiredChecklistCount,
            });

            const providerId =
              Number(row.developerBrandProfileId || 0) || Number(row.marketingBrandProfileId || 0) || 0;
            const provider = providerId ? brandDirectory.get(providerId) || null : null;

            return {
              development: {
                id: developmentId,
                name: String(row.developmentName || ''),
                suburb: row.suburb || null,
                city: row.city || null,
                province: row.province || null,
                isPublished: boolFromTinyInt(row.isPublished),
                approvalStatus: row.approvalStatus || null,
                updatedAt: row.updatedAt || null,
              },
              provider: providerId
                ? {
                    brandProfileId: providerId,
                    brandName: provider?.brandName || 'Provider',
                    providerType: provider?.ownerType === 'developer' ? 'developer_managed' : 'platform_managed',
                  }
                : null,
              program: {
                id: programId,
                isActive: boolFromTinyInt(program.isActive),
                isReferralEnabled: boolFromTinyInt(program.isReferralEnabled),
                tierAccessPolicy: program.tierAccessPolicy || null,
                commissionModel: program.commissionModel || null,
                defaultCommissionPercent: program.defaultCommissionPercent ?? null,
                defaultCommissionAmount: program.defaultCommissionAmount ?? null,
                primaryManagerUserId: primaryManagerByDevelopmentId.get(developmentId) || null,
              },
              setup,
            };
          }),
        );

        // Deterministic ordering: draft -> config -> live, then most recently updated.
        const stateRank: Record<string, number> = {
          added_draft_setup: 1,
          config_required: 2,
          submit_ready_live: 3,
          not_in_program: 0,
        };
        return evaluated.sort((a, b) => {
          const aRank = stateRank[a.setup.setupState] ?? 99;
          const bRank = stateRank[b.setup.setupState] ?? 99;
          if (aRank !== bRank) return aRank - bRank;
          const aUpdated = Date.parse(String(a.development.updatedAt || '')) || 0;
          const bUpdated = Date.parse(String(b.development.updatedAt || '')) || 0;
          return bUpdated - aUpdated;
        });
      });
    }),

  addDevelopmentToDistribution: superAdminProcedure
    .input(
      z.object({
        developmentId: z.number().int().positive(),
        brandProfileId: z.number().int().positive().optional(),
        commission: z.object({
          type: z.enum(DISTRIBUTION_PROGRAM_COMMISSION_TYPE_VALUES),
          value: z.number().min(0),
          basis: z.enum(DISTRIBUTION_PROGRAM_COMMISSION_BASIS_VALUES).nullable().optional(),
        }),
        tierAccessPolicy: z.enum(['open', 'restricted', 'invite_only']).default('restricted'),
        primaryManagerUserId: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await runDistributionDbOperation('distribution.admin.addDevelopmentToDistribution', async () => {
        await assertDistributionSchemaReady('distribution.admin.listDevelopmentCatalog');
        assertDistributionEnabled();
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const [existingDevelopment] = await db
          .select({
            id: developments.id,
            developerBrandProfileId: developments.developerBrandProfileId,
            marketingBrandProfileId: developments.marketingBrandProfileId,
            brochures: developments.brochures,
            floorPlans: developments.floorPlans,
            videos: developments.videos,
          })
          .from(developments)
          .where(eq(developments.id, input.developmentId))
          .limit(1);

        if (!existingDevelopment) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Development not found.' });
        }

        // Optional provider linking: only allowed when no provider link exists yet.
        const alreadyLinked =
          Boolean(existingDevelopment.developerBrandProfileId) ||
          Boolean(existingDevelopment.marketingBrandProfileId);
        if (!alreadyLinked && input.brandProfileId) {
          const [brand] = await db
            .select({ id: developerBrandProfiles.id })
            .from(developerBrandProfiles)
            .where(eq(developerBrandProfiles.id, input.brandProfileId))
            .limit(1);
          if (!brand) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Brand profile not found.' });
          }

          await db
            .update(developments)
            .set({
              developerBrandProfileId: input.brandProfileId,
            })
            .where(eq(developments.id, input.developmentId));
        }

        const evaluationBefore = await evaluateDevelopmentDistributionAccess({
          db,
          developmentId: input.developmentId,
          actor: { role: 'admin', userId: ctx.user.id },
          channel: 'admin_catalog',
        });

        if (!evaluationBefore.brandProfileId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message:
              'Development is missing a provider link. Link a brand profile before adding to distribution.',
          });
        }

        // Ensure partnership (active) + development access (included, submissions off).
        await upsertBrandPartnershipWithAudit({
          db,
          actorUserId: ctx.user.id,
          brandProfileId: evaluationBefore.brandProfileId,
          status: 'active',
          channelScope: ['distribution_network'],
          reasonCode: 'admin_add',
          notes: 'Added to distribution network',
        });

        await upsertDevelopmentAccessWithAudit({
          db,
          actorUserId: ctx.user.id,
          developmentId: input.developmentId,
          status: 'included',
          submissionAllowed: false,
          excludedByMandate: false,
          excludedByExclusivity: false,
          reasonCode: 'admin_add',
          notes: 'Added to distribution network (draft setup)',
        });

        // Ensure program row exists.
        const [existingProgram] = await db
          .select({ id: distributionPrograms.id })
          .from(distributionPrograms)
          .where(eq(distributionPrograms.developmentId, input.developmentId))
          .limit(1);

        const ensuredProgramId =
          existingProgram?.id
            ? Number(existingProgram.id)
            : (
                await ensureDistributionProgramForDevelopment(
                  { developmentId: input.developmentId, actorUserId: ctx.user.id },
                  {
                    findExistingProgramByDevelopmentId: async developmentId => {
                      const [row] = await db
                        .select({ id: distributionPrograms.id })
                        .from(distributionPrograms)
                        .where(eq(distributionPrograms.developmentId, developmentId))
                        .limit(1);
                      return row ? { id: Number(row.id) } : null;
                    },
                    createProgram: async payload => {
                      const [insertResult] = await db.insert(distributionPrograms).values(payload);
                      return { id: Number((insertResult as any).insertId || 0) };
                    },
                  },
                )
              ).programId;

        const commissionValue = Math.max(0, Number(input.commission.value || 0));
        if (commissionValue <= 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Commission value must be greater than zero.',
          });
        }

        const commissionModel =
          input.commission.type === 'percentage' ? ('flat_percentage' as const) : ('fixed_amount' as const);
        const defaultCommissionPercent = input.commission.type === 'percentage' ? commissionValue : null;
        const defaultCommissionAmount =
          input.commission.type === 'flat' ? Math.round(commissionValue) : null;
        const commissionBasis =
          input.commission.type === 'percentage'
            ? (input.commission.basis || 'sale_price')
            : null;

        await db
          .update(distributionPrograms)
          .set({
            isReferralEnabled: 0,
            isActive: 1,
            commissionModel,
            defaultCommissionPercent,
            defaultCommissionAmount,
            referrerCommissionType: input.commission.type,
            referrerCommissionValue: commissionValue,
            referrerCommissionBasis: commissionBasis,
            tierAccessPolicy: input.tierAccessPolicy,
            updatedBy: ctx.user.id,
          })
          .where(eq(distributionPrograms.id, ensuredProgramId));

        if (input.primaryManagerUserId) {
          const [managerUser] = await db
            .select({
              id: users.id,
              role: users.role,
              name: users.name,
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email,
            })
            .from(users)
            .where(eq(users.id, input.primaryManagerUserId))
            .limit(1);

          if (!managerUser) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Manager user not found.' });
          }

          const hasManagerIdentity = await hasActiveDistributionIdentity(
            db,
            Number(managerUser.id),
            'manager',
          );
          if (!hasManagerIdentity && managerUser.role !== 'super_admin') {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Selected user does not have an active distribution manager identity.',
            });
          }

          // Keep a single primary manager per program for operational clarity.
          await db
            .update(distributionManagerAssignments)
            .set({ isPrimary: 0 })
            .where(eq(distributionManagerAssignments.programId, ensuredProgramId));

          await db
            .insert(distributionManagerAssignments)
            .values({
              programId: ensuredProgramId,
              developmentId: input.developmentId,
              managerUserId: input.primaryManagerUserId,
              isPrimary: 1,
              workloadCapacity: 0,
              timezone: null,
              isActive: 1,
            })
            .onDuplicateKeyUpdate({
              set: {
                developmentId: input.developmentId,
                isPrimary: 1,
                isActive: 1,
              },
            });
        }

        const evaluation = await evaluateDevelopmentDistributionAccess({
          db,
          developmentId: input.developmentId,
          actor: { role: 'admin', userId: ctx.user.id },
          channel: 'admin_catalog',
        });

        const salesPackCount = countDevelopmentCommercialDocs({
          brochures: existingDevelopment.brochures,
          floorPlans: existingDevelopment.floorPlans,
          videos: existingDevelopment.videos,
        });

        const checklistCounts = await getChecklistRequiredCountsByProgramId(db, [ensuredProgramId]);
        const setup = computeDistributionSetupSnapshot({
          evaluation,
          salesPackDocumentCount: salesPackCount,
          submissionChecklistRequiredCount: checklistCounts.get(ensuredProgramId) || 0,
        });

        return {
          success: true,
          developmentId: input.developmentId,
          programId: ensuredProgramId,
          setup,
        };
      });
    }),

  ensureDistributionScaffolding: superAdminProcedure
    .input(
      z.object({
        developmentId: z.number().int().positive(),
        brandProfileId: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await runDistributionDbOperation('distribution.admin.ensureDistributionScaffolding', async () => {
        await assertDistributionSchemaReady('distribution.admin.listDevelopmentCatalog');
        assertDistributionEnabled();
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const [development] = await db
          .select({
            id: developments.id,
            developerBrandProfileId: developments.developerBrandProfileId,
            marketingBrandProfileId: developments.marketingBrandProfileId,
            brochures: developments.brochures,
            floorPlans: developments.floorPlans,
            videos: developments.videos,
          })
          .from(developments)
          .where(eq(developments.id, input.developmentId))
          .limit(1);

        if (!development) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Development not found.' });
        }

        // Optional provider linking: only when no provider link exists yet.
        const alreadyLinked =
          Boolean(development.developerBrandProfileId) || Boolean(development.marketingBrandProfileId);
        if (!alreadyLinked && input.brandProfileId) {
          const [brand] = await db
            .select({ id: developerBrandProfiles.id })
            .from(developerBrandProfiles)
            .where(eq(developerBrandProfiles.id, input.brandProfileId))
            .limit(1);
          if (!brand) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Brand profile not found.' });
          }

          await db
            .update(developments)
            .set({ developerBrandProfileId: input.brandProfileId })
            .where(eq(developments.id, input.developmentId));
        }

        const evaluationBefore = await evaluateDevelopmentDistributionAccess({
          db,
          developmentId: input.developmentId,
          actor: { role: 'admin', userId: ctx.user.id },
          channel: 'admin_catalog',
        });

        if (!evaluationBefore.brandProfileId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Development is missing a provider link. Link a brand profile first.',
          });
        }

        await upsertBrandPartnershipWithAudit({
          db,
          actorUserId: ctx.user.id,
          brandProfileId: evaluationBefore.brandProfileId,
          status: 'active',
          channelScope: ['distribution_network'],
          reasonCode: 'admin_backfill',
          notes: 'Backfilled distribution partnership scaffolding',
        });

        await upsertDevelopmentAccessWithAudit({
          db,
          actorUserId: ctx.user.id,
          developmentId: input.developmentId,
          status: 'included',
          submissionAllowed: false,
          excludedByMandate: false,
          excludedByExclusivity: false,
          reasonCode: 'admin_backfill',
          notes: 'Backfilled distribution access scaffolding (draft setup)',
        });

        const evaluationAfter = await evaluateDevelopmentDistributionAccess({
          db,
          developmentId: input.developmentId,
          actor: { role: 'admin', userId: ctx.user.id },
          channel: 'admin_catalog',
        });

        const [program] = await db
          .select({ id: distributionPrograms.id })
          .from(distributionPrograms)
          .where(eq(distributionPrograms.developmentId, input.developmentId))
          .limit(1);

        const programId = Number(program?.id || 0);
        const checklistCounts =
          programId > 0 ? await getChecklistRequiredCountsByProgramId(db, [programId]) : new Map();
        const checklistCount = programId > 0 ? checklistCounts.get(programId) || 0 : 0;

        const salesPackCount = countDevelopmentCommercialDocs({
          brochures: development.brochures,
          floorPlans: development.floorPlans,
          videos: development.videos,
        });

        return {
          success: true,
          developmentId: input.developmentId,
          programId: programId > 0 ? programId : null,
          setup: computeDistributionSetupSnapshot({
            evaluation: evaluationAfter,
            salesPackDocumentCount: salesPackCount,
            submissionChecklistRequiredCount: checklistCount,
          }),
        };
      });
    }),

  makeDevelopmentLive: superAdminProcedure
    .input(z.object({ developmentId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      return await runDistributionDbOperation('distribution.admin.makeDevelopmentLive', async () => {
        await assertDistributionSchemaReady('distribution.admin.listDevelopmentCatalog');
        assertDistributionEnabled();
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const [program] = await db
          .select({
            id: distributionPrograms.id,
            developmentId: distributionPrograms.developmentId,
          })
          .from(distributionPrograms)
          .where(eq(distributionPrograms.developmentId, input.developmentId))
          .limit(1);

        if (!program) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Development is not in distribution yet.' });
        }

        const [development] = await db
          .select({
            brochures: developments.brochures,
            floorPlans: developments.floorPlans,
            videos: developments.videos,
          })
          .from(developments)
          .where(eq(developments.id, input.developmentId))
          .limit(1);

        const evaluation = await evaluateDevelopmentDistributionAccess({
          db,
          developmentId: input.developmentId,
          actor: { role: 'admin', userId: ctx.user.id },
          channel: 'admin_catalog',
        });

        const checklistCounts = await getChecklistRequiredCountsByProgramId(db, [Number(program.id)]);
        const checklistCount = checklistCounts.get(Number(program.id)) || 0;
        const salesPackCount = countDevelopmentCommercialDocs({
          brochures: development?.brochures,
          floorPlans: development?.floorPlans,
          videos: development?.videos,
        });

        const setup = computeDistributionSetupSnapshot({
          evaluation,
          salesPackDocumentCount: salesPackCount,
          submissionChecklistRequiredCount: checklistCount,
        });

        if (!setup.readyToGoLive) {
          const missing = setup.missing
            .map(key => setup.items.find(item => item.key === key)?.label || key)
            .filter(Boolean);
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Cannot go live yet. Missing: ${missing.join(', ')}.`,
          });
        }

        // Enable submissions and live visibility gate.
        await db
          .update(distributionDevelopmentAccess)
          .set({ submissionAllowed: 1, updatedBy: ctx.user.id })
          .where(eq(distributionDevelopmentAccess.developmentId, input.developmentId));

        await db
          .update(distributionPrograms)
          .set({ isReferralEnabled: 1, isActive: 1, updatedBy: ctx.user.id })
          .where(eq(distributionPrograms.id, Number(program.id)));

        const evaluationAfter = await evaluateDevelopmentDistributionAccess({
          db,
          developmentId: input.developmentId,
          actor: { role: 'admin', userId: ctx.user.id },
          channel: 'admin_catalog',
        });

        return {
          success: true,
          developmentId: input.developmentId,
          programId: Number(program.id),
          setup: computeDistributionSetupSnapshot({
            evaluation: evaluationAfter,
            salesPackDocumentCount: salesPackCount,
            submissionChecklistRequiredCount: checklistCount,
          }),
        };
      });
    }),

  takeDevelopmentOffline: superAdminProcedure
    .input(z.object({ developmentId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      return await runDistributionDbOperation('distribution.admin.takeDevelopmentOffline', async () => {
        await assertDistributionSchemaReady('distribution.admin.listDevelopmentCatalog');
        assertDistributionEnabled();
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const [program] = await db
          .select({ id: distributionPrograms.id })
          .from(distributionPrograms)
          .where(eq(distributionPrograms.developmentId, input.developmentId))
          .limit(1);

        if (!program) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Distribution program not found.' });
        }

        await db
          .update(distributionDevelopmentAccess)
          .set({ submissionAllowed: 0, updatedBy: ctx.user.id })
          .where(eq(distributionDevelopmentAccess.developmentId, input.developmentId));

        await db
          .update(distributionPrograms)
          .set({ isReferralEnabled: 0, updatedBy: ctx.user.id })
          .where(eq(distributionPrograms.id, Number(program.id)));

        const [development] = await db
          .select({
            brochures: developments.brochures,
            floorPlans: developments.floorPlans,
            videos: developments.videos,
          })
          .from(developments)
          .where(eq(developments.id, input.developmentId))
          .limit(1);

        const evaluation = await evaluateDevelopmentDistributionAccess({
          db,
          developmentId: input.developmentId,
          actor: { role: 'admin', userId: ctx.user.id },
          channel: 'admin_catalog',
        });

        const checklistCounts = await getChecklistRequiredCountsByProgramId(db, [Number(program.id)]);
        const checklistCount = checklistCounts.get(Number(program.id)) || 0;
        const salesPackCount = countDevelopmentCommercialDocs({
          brochures: development?.brochures,
          floorPlans: development?.floorPlans,
          videos: development?.videos,
        });

        return {
          success: true,
          developmentId: input.developmentId,
          programId: Number(program.id),
          setup: computeDistributionSetupSnapshot({
            evaluation,
            salesPackDocumentCount: salesPackCount,
            submissionChecklistRequiredCount: checklistCount,
          }),
        };
      });
    }),

  setCommission: superAdminProcedure
    .input(
      z.object({
        developmentId: z.number().int().positive(),
        commissionType: z.enum(['flat', 'percentage']),
        commissionValue: z.number().finite().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await runDistributionDbOperation('distribution.admin.setCommission', async () => {
        await assertDistributionSchemaReady('distribution.admin.listPrograms');
        assertDistributionEnabled();
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const [program] = await db
          .select({ id: distributionPrograms.id })
          .from(distributionPrograms)
          .where(eq(distributionPrograms.developmentId, input.developmentId))
          .limit(1);

        if (!program) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Distribution program not found.' });
        }

        const roundedAmount = Math.round(Number(input.commissionValue || 0));
        const isPercentage = input.commissionType === 'percentage';

        await db
          .update(distributionPrograms)
          .set({
            commissionModel: isPercentage ? 'flat_percentage' : 'fixed_amount',
            defaultCommissionPercent: isPercentage ? input.commissionValue : null,
            defaultCommissionAmount: isPercentage ? null : roundedAmount,
            referrerCommissionType: input.commissionType,
            referrerCommissionValue: isPercentage ? input.commissionValue : roundedAmount,
            referrerCommissionBasis: isPercentage ? 'sale_price' : null,
            updatedBy: ctx.user!.id,
          })
          .where(eq(distributionPrograms.id, Number(program.id)));

        await logDistributionAudit({
          userId: Number(ctx.user!.id),
          action: 'distribution.admin.setCommission',
          targetType: 'distribution_program',
          targetId: Number(program.id),
          metadata: {
            developmentId: input.developmentId,
            commissionType: input.commissionType,
            commissionValue: input.commissionValue,
          },
        });

        return { success: true };
      });
    }),

  setTierAccessPolicy: superAdminProcedure
    .input(
      z.object({
        developmentId: z.number().int().positive(),
        tierAccessPolicy: z.enum(['open', 'restricted', 'invite_only']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await runDistributionDbOperation('distribution.admin.setTierAccessPolicy', async () => {
        await assertDistributionSchemaReady('distribution.admin.listPrograms');
        assertDistributionEnabled();
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const [program] = await db
          .select({ id: distributionPrograms.id })
          .from(distributionPrograms)
          .where(eq(distributionPrograms.developmentId, input.developmentId))
          .limit(1);

        if (!program) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Distribution program not found.' });
        }

        await db
          .update(distributionPrograms)
          .set({
            tierAccessPolicy: input.tierAccessPolicy,
            updatedBy: ctx.user!.id,
          })
          .where(eq(distributionPrograms.id, Number(program.id)));

        await logDistributionAudit({
          userId: Number(ctx.user!.id),
          action: 'distribution.admin.setTierAccessPolicy',
          targetType: 'distribution_program',
          targetId: Number(program.id),
          metadata: {
            developmentId: input.developmentId,
            tierAccessPolicy: input.tierAccessPolicy,
          },
        });

        return { success: true };
      });
    }),

  listSubmissionChecklist: superAdminProcedure
    .input(z.object({ programId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return await runDistributionDbOperation('distribution.admin.listSubmissionChecklist', async () => {
        await assertDistributionSchemaReady('distribution.admin.listPrograms');
        assertDistributionEnabled();
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const [workflow] = await db
          .select({
            id: distributionProgramWorkflows.id,
            workflowKey: distributionProgramWorkflows.workflowKey,
            workflowName: distributionProgramWorkflows.workflowName,
          })
          .from(distributionProgramWorkflows)
          .where(eq(distributionProgramWorkflows.programId, input.programId))
          .limit(1);

        if (!workflow) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Program workflow is missing for this program.',
          });
        }

        const rows = await db
          .select({
            id: distributionProgramRequiredDocuments.id,
            documentKey: distributionProgramRequiredDocuments.documentKey,
            documentLabel: distributionProgramRequiredDocuments.documentLabel,
            isRequired: distributionProgramRequiredDocuments.isRequired,
            appliesWhen: distributionProgramRequiredDocuments.appliesWhen,
            displayOrder: distributionProgramRequiredDocuments.displayOrder,
            notes: distributionProgramRequiredDocuments.notes,
            updatedAt: distributionProgramRequiredDocuments.updatedAt,
          })
          .from(distributionProgramRequiredDocuments)
          .where(eq(distributionProgramRequiredDocuments.workflowId, Number(workflow.id)))
          .orderBy(distributionProgramRequiredDocuments.displayOrder, distributionProgramRequiredDocuments.id);

        return {
          workflow: {
            id: Number(workflow.id),
            workflowKey: String(workflow.workflowKey || ''),
            workflowName: String(workflow.workflowName || 'Referral Workflow'),
          },
          items: rows.map(row => ({
            id: Number(row.id),
            documentKey: String(row.documentKey || ''),
            documentLabel: String(row.documentLabel || ''),
            isRequired: boolFromTinyInt(row.isRequired),
            appliesWhen: row.appliesWhen ? String(row.appliesWhen) : null,
            displayOrder: Number(row.displayOrder || 0),
            notes: row.notes ? String(row.notes) : null,
            updatedAt: row.updatedAt || null,
          })),
        };
      });
    }),

  upsertSubmissionChecklistItem: superAdminProcedure
    .input(
      z.object({
        programId: z.number().int().positive(),
        documentKey: z.string().trim().max(80).optional(),
        documentLabel: z.string().trim().min(2).max(160),
        isRequired: z.boolean().default(true),
        displayOrder: z.number().int().min(0).max(1000).optional(),
        notes: z.string().max(2000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await runDistributionDbOperation('distribution.admin.upsertSubmissionChecklistItem', async () => {
        await assertDistributionSchemaReady('distribution.admin.listPrograms');
        assertDistributionEnabled();
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const [workflow] = await db
          .select({ id: distributionProgramWorkflows.id })
          .from(distributionProgramWorkflows)
          .where(eq(distributionProgramWorkflows.programId, input.programId))
          .limit(1);

        if (!workflow) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Program workflow is missing for this program.',
          });
        }

        const documentKey = normalizeDocumentKey(input.documentKey || input.documentLabel);
        if (!documentKey) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Document key is invalid.',
          });
        }

        const displayOrder = Number.isFinite(input.displayOrder as any) ? Number(input.displayOrder) : 0;

        const [insertResult] = await db
          .insert(distributionProgramRequiredDocuments)
          .values({
            workflowId: Number(workflow.id),
            documentKey,
            documentLabel: input.documentLabel.trim(),
            isRequired: input.isRequired ? 1 : 0,
            appliesWhen: null,
            displayOrder,
            notes: input.notes ?? null,
          })
          .onDuplicateKeyUpdate({
            set: {
              documentLabel: input.documentLabel.trim(),
              isRequired: input.isRequired ? 1 : 0,
              displayOrder,
              notes: input.notes ?? null,
              updatedAt: sql`CURRENT_TIMESTAMP`,
            },
          });

        const insertedId = Number((insertResult as any)?.insertId || 0);
        await logDistributionAudit({
          userId: Number(ctx.user!.id),
          action: 'distribution.admin.upsertSubmissionChecklistItem',
          targetType: 'distribution_program_required_document',
          targetId: insertedId || 0,
          metadata: {
            programId: input.programId,
            workflowId: Number(workflow.id),
            documentKey,
          },
        });

        return { success: true, documentKey };
      });
    }),

  deleteSubmissionChecklistItem: superAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      return await runDistributionDbOperation('distribution.admin.deleteSubmissionChecklistItem', async () => {
        await assertDistributionSchemaReady('distribution.admin.listPrograms');
        assertDistributionEnabled();
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        await db
          .delete(distributionProgramRequiredDocuments)
          .where(eq(distributionProgramRequiredDocuments.id, input.id));

        await logDistributionAudit({
          userId: Number(ctx.user!.id),
          action: 'distribution.admin.deleteSubmissionChecklistItem',
          targetType: 'distribution_program_required_document',
          targetId: input.id,
        });

        return { success: true };
      });
    }),

  listDevelopmentCatalog: superAdminProcedure
    .input(
      z
        .object({
          search: z.string().trim().max(200).optional(),
          brandProfileId: z.number().int().positive().optional(),
          includeUnpublished: z.boolean().default(false),
          onlyBrandProfileLinked: z.boolean().default(true),
          limit: z.number().int().min(1).max(500).default(200),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      return await runDistributionDbOperation(
        'distribution.admin.listDevelopmentCatalog',
        async () => {
          await assertDistributionSchemaReady('distribution.admin.listDevelopmentCatalog');
          assertDistributionEnabled();
          const db = await getDb();
          if (!db) throw new Error('Database not available');

      const search = input?.search?.trim().toLowerCase() || '';
      const brandProfileId = input?.brandProfileId;
      const includeUnpublished = input?.includeUnpublished ?? false;
      const onlyBrandProfileLinked = input?.onlyBrandProfileLinked ?? true;
      const limit = input?.limit ?? 200;

      const conditions: SQL[] = [];
      if (!includeUnpublished) {
        conditions.push(eq(developments.isPublished, 1));
        conditions.push(eq(developments.approvalStatus, 'approved'));
      }
      if (onlyBrandProfileLinked) {
        conditions.push(
          sql`(${developments.developerBrandProfileId} IS NOT NULL OR ${developments.marketingBrandProfileId} IS NOT NULL)`,
        );
      }
      if (typeof brandProfileId === 'number') {
        conditions.push(
          sql`(${developments.developerBrandProfileId} = ${brandProfileId} OR ${developments.marketingBrandProfileId} = ${brandProfileId})`,
        );
      }

      if (search) {
        const term = `%${search}%`;
        conditions.push(
          sql`(
            LOWER(COALESCE(${developments.name}, '')) LIKE ${term}
            OR LOWER(COALESCE(${developments.city}, '')) LIKE ${term}
            OR LOWER(COALESCE(${developments.province}, '')) LIKE ${term}
            OR LOWER(COALESCE(${developerBrandProfiles.brandName}, '')) LIKE ${term}
          )`,
        );
      }

      let rows = await db
        .select({
          developmentId: developments.id,
          developmentName: developments.name,
          brandProfileId: developments.developerBrandProfileId,
          marketingBrandProfileId: developments.marketingBrandProfileId,
          brandProfileName: developerBrandProfiles.brandName,
          city: developments.city,
          province: developments.province,
          developmentStatus: developments.status,
          approvalStatus: developments.approvalStatus,
          isPublished: developments.isPublished,
          developmentImages: developments.images,
          developmentVideos: developments.videos,
          developmentFloorPlans: developments.floorPlans,
          developmentBrochures: developments.brochures,
          developmentPriceFrom: developments.priceFrom,
          developmentPriceTo: developments.priceTo,
          developmentUpdatedAt: developments.updatedAt,
          programId: distributionPrograms.id,
          programIsActive: distributionPrograms.isActive,
          isReferralEnabled: distributionPrograms.isReferralEnabled,
          commissionModel: distributionPrograms.commissionModel,
          defaultCommissionPercent: distributionPrograms.defaultCommissionPercent,
          defaultCommissionAmount: distributionPrograms.defaultCommissionAmount,
          referrerCommissionType: distributionPrograms.referrerCommissionType,
          referrerCommissionValue: distributionPrograms.referrerCommissionValue,
          referrerCommissionBasis: distributionPrograms.referrerCommissionBasis,
          platformCommissionType: distributionPrograms.platformCommissionType,
          platformCommissionValue: distributionPrograms.platformCommissionValue,
          platformCommissionBasis: distributionPrograms.platformCommissionBasis,
          tierAccessPolicy: distributionPrograms.tierAccessPolicy,
          programUpdatedAt: distributionPrograms.updatedAt,
        })
        .from(developments)
        .leftJoin(
          developerBrandProfiles,
          eq(developments.developerBrandProfileId, developerBrandProfiles.id),
        )
        .leftJoin(distributionPrograms, eq(distributionPrograms.developmentId, developments.id))
        .where(withConditions(conditions))
        .orderBy(desc(developments.updatedAt))
        .limit(limit);

      // Fallback safety net:
      // If a specific brand is selected and primary filtered query returns no rows,
      // run a direct brand-link query to avoid false-empty states due filter interaction.
      if (!rows.length && typeof brandProfileId === 'number') {
        const fallbackConditions: SQL[] = [
          sql`(${developments.developerBrandProfileId} = ${brandProfileId} OR ${developments.marketingBrandProfileId} = ${brandProfileId})`,
        ];
        if (!includeUnpublished) {
          fallbackConditions.push(eq(developments.isPublished, 1));
          fallbackConditions.push(eq(developments.approvalStatus, 'approved'));
        }
        if (search) {
          const term = `%${search}%`;
          fallbackConditions.push(
            sql`(
              LOWER(COALESCE(${developments.name}, '')) LIKE ${term}
              OR LOWER(COALESCE(${developments.city}, '')) LIKE ${term}
              OR LOWER(COALESCE(${developments.province}, '')) LIKE ${term}
            )`,
          );
        }

        rows = await db
          .select({
            developmentId: developments.id,
            developmentName: developments.name,
            brandProfileId: developments.developerBrandProfileId,
            marketingBrandProfileId: developments.marketingBrandProfileId,
            brandProfileName: developerBrandProfiles.brandName,
            city: developments.city,
            province: developments.province,
            developmentStatus: developments.status,
            approvalStatus: developments.approvalStatus,
            isPublished: developments.isPublished,
            developmentImages: developments.images,
            developmentVideos: developments.videos,
            developmentFloorPlans: developments.floorPlans,
            developmentBrochures: developments.brochures,
            developmentPriceFrom: developments.priceFrom,
            developmentPriceTo: developments.priceTo,
            developmentUpdatedAt: developments.updatedAt,
            programId: distributionPrograms.id,
            programIsActive: distributionPrograms.isActive,
            isReferralEnabled: distributionPrograms.isReferralEnabled,
            commissionModel: distributionPrograms.commissionModel,
            defaultCommissionPercent: distributionPrograms.defaultCommissionPercent,
            defaultCommissionAmount: distributionPrograms.defaultCommissionAmount,
            referrerCommissionType: distributionPrograms.referrerCommissionType,
            referrerCommissionValue: distributionPrograms.referrerCommissionValue,
            referrerCommissionBasis: distributionPrograms.referrerCommissionBasis,
            platformCommissionType: distributionPrograms.platformCommissionType,
            platformCommissionValue: distributionPrograms.platformCommissionValue,
            platformCommissionBasis: distributionPrograms.platformCommissionBasis,
            tierAccessPolicy: distributionPrograms.tierAccessPolicy,
            programUpdatedAt: distributionPrograms.updatedAt,
          })
          .from(developments)
          .leftJoin(
            developerBrandProfiles,
            eq(developments.developerBrandProfileId, developerBrandProfiles.id),
          )
          .leftJoin(distributionPrograms, eq(distributionPrograms.developmentId, developments.id))
          .where(withConditions(fallbackConditions))
          .orderBy(desc(developments.updatedAt))
          .limit(limit);
      }

      const developmentIds: number[] = Array.from(
        new Set(rows.map(row => Number(row.developmentId)).filter(Boolean)),
      );
      const linkedBrandProfileIds: number[] = Array.from(
        new Set(
          rows
            .flatMap(row => [
              Number(row.brandProfileId || 0),
              Number(row.marketingBrandProfileId || 0),
            ])
            .filter(Boolean),
        ),
      );
      const programIds: number[] = Array.from(
        new Set(rows.map(row => Number(row.programId || 0)).filter(Boolean)),
      );

      const brandDirectory =
        linkedBrandProfileIds.length > 0
          ? new Map<number, string>(
              (
                await db
                  .select({
                    id: developerBrandProfiles.id,
                    brandName: developerBrandProfiles.brandName,
                  })
                  .from(developerBrandProfiles)
                  .where(inArray(developerBrandProfiles.id, linkedBrandProfileIds))
              ).map(row => [Number(row.id), String(row.brandName || '')]),
            )
          : new Map<number, string>();

      const unitRows = developmentIds.length
        ? await db
            .select({
              developmentId: unitTypes.developmentId,
              unitTypeName: unitTypes.name,
              unitPriceFrom: unitTypes.priceFrom,
              unitPriceTo: unitTypes.priceTo,
              unitBasePriceFrom: unitTypes.basePriceFrom,
              unitBasePriceTo: unitTypes.basePriceTo,
              unitIsActive: unitTypes.isActive,
            })
            .from(unitTypes)
            .where(inArray(unitTypes.developmentId, developmentIds))
            .orderBy(unitTypes.displayOrder, unitTypes.name)
        : [];

      const managerRows = programIds.length
        ? await db
            .select({
              programId: distributionManagerAssignments.programId,
              assignmentId: distributionManagerAssignments.id,
              managerUserId: distributionManagerAssignments.managerUserId,
              isPrimary: distributionManagerAssignments.isPrimary,
              isActive: distributionManagerAssignments.isActive,
              workloadCapacity: distributionManagerAssignments.workloadCapacity,
              timezone: distributionManagerAssignments.timezone,
              updatedAt: distributionManagerAssignments.updatedAt,
              managerName: users.name,
              managerFirstName: users.firstName,
              managerLastName: users.lastName,
              managerEmail: users.email,
            })
            .from(distributionManagerAssignments)
            .innerJoin(users, eq(distributionManagerAssignments.managerUserId, users.id))
            .where(inArray(distributionManagerAssignments.programId, programIds))
            .orderBy(desc(distributionManagerAssignments.updatedAt))
        : [];

      const unitSummaryByDevelopment = new Map<
        number,
        {
          priceFrom: number | null;
          priceTo: number | null;
          unitTypes: Array<{
            name: string;
            isActive: boolean;
            priceFrom: number | null;
            priceTo: number | null;
          }>;
        }
      >();

      for (const row of unitRows) {
        const developmentId = Number(row.developmentId);
        const current =
          unitSummaryByDevelopment.get(developmentId) ||
          ({
            priceFrom: null,
            priceTo: null,
            unitTypes: [],
          } as const);

        const unitPriceFrom =
          toNumberOrNull(row.unitPriceFrom) ?? toNumberOrNull(row.unitBasePriceFrom);
        const unitPriceTo =
          toNumberOrNull(row.unitPriceTo) ?? toNumberOrNull(row.unitBasePriceTo) ?? unitPriceFrom;

        const nextMin =
          current.priceFrom === null
            ? unitPriceFrom
            : unitPriceFrom === null
              ? current.priceFrom
              : Math.min(current.priceFrom, unitPriceFrom);
        const nextMax =
          current.priceTo === null
            ? unitPriceTo
            : unitPriceTo === null
              ? current.priceTo
              : Math.max(current.priceTo, unitPriceTo);

        const next = {
          priceFrom: nextMin,
          priceTo: nextMax,
          unitTypes: [
            ...current.unitTypes,
            {
              name: String(row.unitTypeName || 'Unit'),
              isActive: boolFromTinyInt(row.unitIsActive),
              priceFrom: unitPriceFrom,
              priceTo: unitPriceTo,
            },
          ],
        };
        unitSummaryByDevelopment.set(developmentId, next);
      }

      const managerByProgram = new Map<
        number,
        {
          hasPrimaryManager: boolean;
          assignments: Array<{
            assignmentId: number;
            managerUserId: number;
            managerDisplayName: string | null;
            managerEmail: string | null;
            isPrimary: boolean;
            isActive: boolean;
            workloadCapacity: number;
            timezone: string | null;
            updatedAt: string;
          }>;
        }
      >();
      for (const row of managerRows) {
        const programId = Number(row.programId);
        const current =
          managerByProgram.get(programId) ||
          ({
            hasPrimaryManager: false,
            assignments: [],
          } as const);
        const isPrimary = boolFromTinyInt(row.isPrimary);
        const isActive = boolFromTinyInt(row.isActive);
        const next = {
          hasPrimaryManager: current.hasPrimaryManager || (isPrimary && isActive),
          assignments: [
            ...current.assignments,
            {
              assignmentId: Number(row.assignmentId),
              managerUserId: Number(row.managerUserId),
              managerDisplayName: formatUserDisplayName({
                name: row.managerName,
                firstName: row.managerFirstName,
                lastName: row.managerLastName,
                email: row.managerEmail,
              }),
              managerEmail: row.managerEmail,
              isPrimary,
              isActive,
              workloadCapacity: Number(row.workloadCapacity || 0),
              timezone: row.timezone || null,
              updatedAt: row.updatedAt,
            },
          ],
        };
        managerByProgram.set(programId, next);
      }

          const catalogRows = rows.map(row => {
            const developmentId = Number(row.developmentId);
            const published = boolFromTinyInt(row.isPublished);
            const unitSummary = unitSummaryByDevelopment.get(developmentId);
            const fallbackPriceFrom = toNumberOrNull(row.developmentPriceFrom);
            const fallbackPriceTo = toNumberOrNull(row.developmentPriceTo);
            const priceFrom = unitSummary?.priceFrom ?? fallbackPriceFrom;
            const priceTo = unitSummary?.priceTo ?? fallbackPriceTo;
            const hasProgram = Boolean(row.programId);
            const programId = Number(row.programId || 0);
            const managerInfo = managerByProgram.get(programId);
            const hasPrimaryManager = Boolean(managerInfo?.hasPrimaryManager);
            const referrerCommission = resolveReferrerCommissionTrackFromProgramRow(row);
            const platformCommission = resolvePlatformCommissionTrackFromProgramRow(
              row,
              referrerCommission,
            );
            const referrerLegacyCommission = toLegacyProgramCommissionFields(referrerCommission);
            const videos = normalizeDevelopmentDocumentRows(row.developmentVideos, 'Development Video');
            const floorPlans = normalizeDevelopmentDocumentRows(row.developmentFloorPlans, 'Floor Plan');
            const brochures = normalizeDevelopmentDocumentRows(
              row.developmentBrochures,
              'Development Brochure',
            );

            const activationReadiness = hasProgram
              ? getProgramActivationReadiness({
                  commissionModel: referrerLegacyCommission.commissionModel,
                  defaultCommissionPercent: referrerLegacyCommission.defaultCommissionPercent,
                  defaultCommissionAmount: referrerLegacyCommission.defaultCommissionAmount,
                  tierAccessPolicy: row.tierAccessPolicy as 'open' | 'restricted' | 'invite_only',
                  hasPrimaryManager,
                })
              : null;

            const networkStatus = hasProgram
              ? boolFromTinyInt(row.isReferralEnabled)
                ? 'in_network_enabled'
                : 'in_network_disabled'
              : 'not_in_network';

            return {
              developmentId,
              developmentName: row.developmentName,
              brandProfileId:
                row.brandProfileId || row.marketingBrandProfileId
                  ? Number(row.brandProfileId || row.marketingBrandProfileId)
                  : null,
              brandLinkType:
                row.brandProfileId || row.marketingBrandProfileId
                  ? row.brandProfileId
                    ? ('developer' as const)
                    : ('marketing' as const)
                  : null,
              brandProfileName:
                (row.brandProfileId || row.marketingBrandProfileId
                  ? brandDirectory.get(Number(row.brandProfileId || row.marketingBrandProfileId))
                  : null) ||
                row.brandProfileName ||
                null,
              city: row.city,
              province: row.province,
              imageUrl: extractFirstImageUrl(row.developmentImages),
              isPublished: published,
              approvalStatus: row.approvalStatus,
              developmentStatus: row.developmentStatus,
              publishedEligible: published && row.approvalStatus === 'approved',
              priceFrom,
              priceTo,
              unitTypes: unitSummary?.unitTypes || [],
              documentCounts: {
                videos: videos.length,
                floorPlans: floorPlans.length,
                brochures: brochures.length,
                total: videos.length + floorPlans.length + brochures.length,
              },
              networkStatus,
              program: hasProgram
                ? {
                    id: programId,
                    isActive: boolFromTinyInt(row.programIsActive),
                    isReferralEnabled: boolFromTinyInt(row.isReferralEnabled),
                    commissionModel: referrerLegacyCommission.commissionModel,
                    defaultCommissionPercent: referrerLegacyCommission.defaultCommissionPercent,
                    defaultCommissionAmount: referrerLegacyCommission.defaultCommissionAmount,
                    referrerCommission,
                    platformCommission,
                    tierAccessPolicy: row.tierAccessPolicy,
                    updatedAt: row.programUpdatedAt,
                    hasPrimaryManager,
                    managerAssignments: managerInfo?.assignments || [],
                    activationReadiness,
                  }
                : null,
              developmentUpdatedAt: row.developmentUpdatedAt,
            };
          });

          return await Promise.all(
            catalogRows.map(async row => {
              const evaluation = await evaluateDevelopmentDistributionAccess({
                db,
                developmentId: Number(row.developmentId),
                actor: { role: 'admin' },
                channel: 'admin_catalog',
              });

              return {
                ...row,
                partnershipStatus: evaluation.brandPartnershipStatus,
                accessStatus: evaluation.developmentAccessStatus,
                inventoryState: evaluation.inventoryState,
                submissionAllowed: evaluation.submissionAllowed,
                excludedByMandate: evaluation.excludedByMandate,
                excludedByExclusivity: evaluation.excludedByExclusivity,
                submitReady: evaluation.submitReady,
                reasons: evaluation.reasons,
                legacyFallbackUsed: evaluation.legacyFallbackUsed,
                readiness: evaluation.readiness,
                brandPartnered: evaluation.brandPartnered,
                developmentIncluded: evaluation.developmentIncluded,
              };
            }),
          );
        },
      );
    }),

  getDevelopmentDocuments: superAdminProcedure
    .input(
      z.object({
        developmentId: z.number().int().positive(),
      }),
    )
    .query(async ({ input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      return await getDevelopmentDocumentBank(db, input.developmentId);
    }),

  setDevelopmentDocuments: superAdminProcedure
    .input(setDevelopmentDocumentsInput)
    .mutation(async ({ input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      return await setDevelopmentDocuments(db, input);
    }),

  debugBrandDevelopments: superAdminProcedure
    .input(
      z.object({
        brandProfileId: z.number().int().positive(),
      }),
    )
    .query(async ({ input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [brand] = await db
        .select({
          id: developerBrandProfiles.id,
          brandName: developerBrandProfiles.brandName,
        })
        .from(developerBrandProfiles)
        .where(eq(developerBrandProfiles.id, input.brandProfileId))
        .limit(1);

      if (!brand) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Brand profile not found.' });
      }

      const [summary] = await db
        .select({
          totalLinked: sql<number>`COUNT(*)`,
          developerLinked: sql<number>`SUM(CASE WHEN ${developments.developerBrandProfileId} = ${input.brandProfileId} THEN 1 ELSE 0 END)`,
          marketingLinked: sql<number>`SUM(CASE WHEN ${developments.marketingBrandProfileId} = ${input.brandProfileId} THEN 1 ELSE 0 END)`,
          publishedApproved: sql<number>`SUM(CASE WHEN ${developments.isPublished} = 1 AND ${developments.approvalStatus} = 'approved' THEN 1 ELSE 0 END)`,
          unpublishedOrUnapproved: sql<number>`SUM(CASE WHEN NOT (${developments.isPublished} = 1 AND ${developments.approvalStatus} = 'approved') THEN 1 ELSE 0 END)`,
        })
        .from(developments)
        .where(
          sql`(${developments.developerBrandProfileId} = ${input.brandProfileId} OR ${developments.marketingBrandProfileId} = ${input.brandProfileId})`,
        );

      const samples = await db
        .select({
          id: developments.id,
          name: developments.name,
          city: developments.city,
          province: developments.province,
          isPublished: developments.isPublished,
          approvalStatus: developments.approvalStatus,
          developerBrandProfileId: developments.developerBrandProfileId,
          marketingBrandProfileId: developments.marketingBrandProfileId,
          updatedAt: developments.updatedAt,
        })
        .from(developments)
        .where(
          sql`(${developments.developerBrandProfileId} = ${input.brandProfileId} OR ${developments.marketingBrandProfileId} = ${input.brandProfileId})`,
        )
        .orderBy(desc(developments.updatedAt))
        .limit(20);

      return {
        brandId: Number(brand.id),
        brandName: String(brand.brandName || ''),
        totalLinked: Number(summary?.totalLinked || 0),
        developerLinked: Number(summary?.developerLinked || 0),
        marketingLinked: Number(summary?.marketingLinked || 0),
        publishedApproved: Number(summary?.publishedApproved || 0),
        unpublishedOrUnapproved: Number(summary?.unpublishedOrUnapproved || 0),
        samples: samples.map(row => ({
          ...row,
          isPublished: boolFromTinyInt(row.isPublished),
          linkType:
            Number(row.developerBrandProfileId || 0) === input.brandProfileId
              ? ('developer' as const)
              : Number(row.marketingBrandProfileId || 0) === input.brandProfileId
                ? ('marketing' as const)
                : ('unknown' as const),
        })),
      };
    }),

  upsertBrandPartnership: superAdminProcedure
    .input(upsertBrandPartnershipInput)
    .mutation(async ({ ctx, input }) => {
      return await runDistributionDbOperation(
        'distribution.admin.upsertBrandPartnership',
        async () => {
          await assertDistributionSchemaReady('distribution.admin.upsertBrandPartnership');
          assertDistributionEnabled();
          const db = await getDb();
          if (!db) throw new Error('Database not available');

          const result = await upsertBrandPartnershipWithAudit({
            db,
            actorUserId: ctx.user.id,
            brandProfileId: input.brandProfileId,
            status: input.status,
            channelScope: input.channelScope,
            reasonCode: input.reasonCode,
            notes: input.notes,
          });

          return {
            success: true as const,
            changed: result.changed,
            entity: result.partnership,
            derivedState: {
              childAccessStatusCounts: result.childAccessStatusCounts,
              submissionBlockedByParent: result.submissionBlockedByParent,
              reasons: result.submissionBlockedByParent
                ? [`brand_partnership_${result.partnership.status}`]
                : [],
            },
          };
        },
      );
    }),

  upsertDevelopmentAccess: superAdminProcedure
    .input(upsertDevelopmentAccessInput)
    .mutation(async ({ ctx, input }) => {
      return await runDistributionDbOperation(
        'distribution.admin.upsertDevelopmentAccess',
        async () => {
          await assertDistributionSchemaReady('distribution.admin.upsertDevelopmentAccess');
          assertDistributionEnabled();
          const db = await getDb();
          if (!db) throw new Error('Database not available');

          const result = await upsertDevelopmentAccessWithAudit({
            db,
            actorUserId: ctx.user.id,
            developmentId: input.developmentId,
            status: input.status,
            submissionAllowed: input.submissionAllowed,
            excludedByMandate: input.excludedByMandate,
            excludedByExclusivity: input.excludedByExclusivity,
            reasonCode: input.reasonCode,
            notes: input.notes,
          });

          return {
            success: true as const,
            changed: result.changed,
            entity: result.access,
            derivedState: {
              inventoryState: result.evaluation.inventoryState,
              submitReady: result.evaluation.submitReady,
              reasons: result.evaluation.reasons,
              legacyFallbackUsed: result.evaluation.legacyFallbackUsed,
            },
          };
        },
      );
    }),

  getBrandPartnership: superAdminProcedure
    .input(getBrandPartnershipInput)
    .query(async ({ input }) => {
      return await runDistributionDbOperation(
        'distribution.admin.getBrandPartnership',
        async () => {
          await assertDistributionSchemaReady('distribution.admin.getBrandPartnership');
          assertDistributionEnabled();
          const db = await getDb();
          if (!db) throw new Error('Database not available');

          const result = await getBrandPartnershipDetails(db, input.brandProfileId);
          return {
            success: true as const,
            entity: result.entity,
            brand: result.brand,
            derivedState: result.derivedState,
          };
        },
      );
    }),

  getDevelopmentAccess: superAdminProcedure
    .input(getDevelopmentAccessInput)
    .query(async ({ input }) => {
      return await runDistributionDbOperation(
        'distribution.admin.getDevelopmentAccess',
        async () => {
          await assertDistributionSchemaReady('distribution.admin.getDevelopmentAccess');
          assertDistributionEnabled();
          const db = await getDb();
          if (!db) throw new Error('Database not available');

          const result = await getDevelopmentAccessDetails(db, input.developmentId);
          return {
            success: true as const,
            entity: result.entity,
            development: result.development,
            derivedState: result.evaluation,
          };
        },
      );
    }),

  listDevelopmentAccess: superAdminProcedure
    .input(listDevelopmentAccessInput)
    .query(async ({ input }) => {
      return await runDistributionDbOperation(
        'distribution.admin.listDevelopmentAccess',
        async () => {
          await assertDistributionSchemaReady('distribution.admin.listDevelopmentAccess');
          assertDistributionEnabled();
          const db = await getDb();
          if (!db) throw new Error('Database not available');

          const rows = await listDevelopmentAccessDetails(db, {
            brandProfileId: input?.brandProfileId,
            partnershipStatus: input?.partnershipStatus,
            accessStatus: input?.accessStatus,
            submitReady: input?.submitReady,
            search: input?.search,
            limit: input?.limit,
          });

          return rows.map(row => ({
            development: row.development,
            partnership: row.partnership,
            access: row.access,
            derivedState: row.evaluation,
          }));
        },
      );
    }),

  upsertProgram: superAdminProcedure.input(upsertProgramInput).mutation(async ({ ctx, input }) => {
    assertDistributionEnabled();
    return await upsertProgram(ctx as any, input);
  }),

  ensureProgramForDevelopment: superAdminProcedure
    .input(
      z.object({
        developmentId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await runDistributionDbOperation('distribution.admin.listPrograms', async () => {
        await assertDistributionSchemaReady('distribution.admin.listPrograms');
        assertDistributionEnabled();
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const [development] = await db
          .select({ id: developments.id })
          .from(developments)
          .where(eq(developments.id, input.developmentId))
          .limit(1);

        if (!development) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Development not found.' });
        }

        const accessEvaluation = await evaluateDevelopmentDistributionAccess({
          db,
          developmentId: input.developmentId,
          actor: { role: 'admin', userId: ctx.user.id },
          channel: 'admin_catalog',
        });
        const blockerSummary = summarizeDistributionBlockers(accessEvaluation);

        const ensured = await ensureDistributionProgramForDevelopment(
          {
            developmentId: input.developmentId,
            actorUserId: ctx.user.id,
          },
          {
            findExistingProgramByDevelopmentId: async developmentId => {
              const [row] = await db
                .select({ id: distributionPrograms.id })
                .from(distributionPrograms)
                .where(eq(distributionPrograms.developmentId, developmentId))
                .limit(1);
              return row ? { id: Number(row.id) } : null;
            },
            createProgram: async payload => {
              if (blockerSummary.accessBlockers.length > 0) {
                throw new TRPCError({
                  code: 'BAD_REQUEST',
                  message: `Program creation blocked by access requirements: ${blockerSummary.accessBlockers.join(', ')}.`,
                });
              }
              const [insertResult] = await db.insert(distributionPrograms).values(payload);
              return { id: Number((insertResult as any).insertId || 0) };
            },
          },
        );

        return {
          success: true,
          mode: ensured.created ? ('created' as const) : ('existing' as const),
          programId: ensured.programId,
          accessBlockers: blockerSummary.accessBlockers,
          accessState: {
            inventoryState: accessEvaluation.inventoryState,
            partnershipStatus: accessEvaluation.brandPartnershipStatus,
            accessStatus: accessEvaluation.developmentAccessStatus,
            submissionAllowed: accessEvaluation.submissionAllowed,
            legacyFallbackUsed: accessEvaluation.legacyFallbackUsed,
          },
        };
      });
    }),

  setProgramReferralEnabled: superAdminProcedure
    .input(
      z.object({
        programId: z.number().int().positive(),
        isReferralEnabled: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await runDistributionDbOperation('distribution.admin.listPrograms', async () => {
        await assertDistributionSchemaReady('distribution.admin.listPrograms');
        assertDistributionEnabled();
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const [program] = await db
          .select({
            id: distributionPrograms.id,
            developmentId: distributionPrograms.developmentId,
            commissionModel: distributionPrograms.commissionModel,
            defaultCommissionPercent: distributionPrograms.defaultCommissionPercent,
            defaultCommissionAmount: distributionPrograms.defaultCommissionAmount,
            referrerCommissionType: distributionPrograms.referrerCommissionType,
            referrerCommissionValue: distributionPrograms.referrerCommissionValue,
            referrerCommissionBasis: distributionPrograms.referrerCommissionBasis,
            tierAccessPolicy: distributionPrograms.tierAccessPolicy,
          })
          .from(distributionPrograms)
          .where(eq(distributionPrograms.id, input.programId))
          .limit(1);

        if (!program) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Distribution program not found.' });
        }

        const accessEvaluation = await evaluateDevelopmentDistributionAccess({
          db,
          developmentId: Number(program.developmentId),
          actor: { role: 'admin', userId: ctx.user.id },
          channel: 'admin_catalog',
        });
        const blockerSummary = summarizeDistributionBlockers(accessEvaluation);

        const referrerCommission = resolveReferrerCommissionTrackFromProgramRow(program);
        const referrerLegacyCommission = toLegacyProgramCommissionFields(referrerCommission);
        const hasPrimaryManager = await hasPrimaryActiveManagerAssignment(db, Number(program.id));
        const readiness = getProgramActivationReadiness({
          commissionModel: referrerLegacyCommission.commissionModel,
          defaultCommissionPercent: referrerLegacyCommission.defaultCommissionPercent,
          defaultCommissionAmount: referrerLegacyCommission.defaultCommissionAmount,
          tierAccessPolicy: program.tierAccessPolicy as 'open' | 'restricted' | 'invite_only',
          hasPrimaryManager,
        });

        if (input.isReferralEnabled && blockerSummary.accessBlockers.length > 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Referral enable blocked by access requirements: ${blockerSummary.accessBlockers.join(', ')}.`,
          });
        }

        if (input.isReferralEnabled && !readiness.canEnable) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Referral enable blocked by readiness requirements: ${readiness.missingRequirements.join(', ')}.`,
          });
        }

        if (input.isReferralEnabled) {
          const [development] = await db
            .select({
              brochures: developments.brochures,
              floorPlans: developments.floorPlans,
              videos: developments.videos,
            })
            .from(developments)
            .where(eq(developments.id, Number(program.developmentId)))
            .limit(1);

          const salesPackCount = countDevelopmentCommercialDocs({
            brochures: development?.brochures,
            floorPlans: development?.floorPlans,
            videos: development?.videos,
          });
          if (salesPackCount <= 0) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Referral enable blocked: Sales Pack requires at least 1 document (brochure, floor plan, or video).',
            });
          }

          const checklistCounts = await getChecklistRequiredCountsByProgramId(db, [Number(program.id)]);
          const checklistCount = checklistCounts.get(Number(program.id)) || 0;
          if (checklistCount <= 0) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Referral enable blocked: Submission checklist requires at least 1 required item.',
            });
          }
        }

        await db
          .update(distributionPrograms)
          .set({
            isReferralEnabled: input.isReferralEnabled ? 1 : 0,
            updatedBy: ctx.user.id,
          })
          .where(eq(distributionPrograms.id, input.programId));

        return {
          success: true,
          programId: input.programId,
          isReferralEnabled: input.isReferralEnabled,
          activationReadiness: readiness,
          accessBlockers: blockerSummary.accessBlockers,
          readinessBlockers: readiness.missingRequirements,
        };
      });
    }),

  setProgramActive: superAdminProcedure
    .input(
      z.object({
        programId: z.number().int().positive(),
        isActive: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const program = await getProgramById(db, input.programId);
      if (!program) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Distribution program not found.' });
      }

      await db
        .update(distributionPrograms)
        .set({
          isActive: input.isActive ? 1 : 0,
          updatedBy: ctx.user.id,
        })
        .where(eq(distributionPrograms.id, input.programId));

      return {
        success: true,
        programId: input.programId,
        isActive: input.isActive,
      };
    }),

  assignManagerToDevelopment: superAdminProcedure
    .input(
      z.object({
        programId: z.number().int().positive(),
        managerUserId: z.number().int().positive(),
        isPrimary: z.boolean().default(false),
        workloadCapacity: z.number().int().min(0).default(0),
        timezone: z.string().max(64).nullable().optional(),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const program = await getProgramById(db, input.programId);
      if (!program) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Distribution program not found.' });
      }

      const [managerUser] = await db
        .select({
          id: users.id,
          role: users.role,
          name: users.name,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, input.managerUserId))
        .limit(1);

      if (!managerUser) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Manager user not found.' });
      }

      const hasManagerIdentity = await hasActiveDistributionIdentity(
        db,
        Number(managerUser.id),
        'manager',
      );
      if (!hasManagerIdentity && managerUser.role !== 'super_admin') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Selected user does not have an active distribution manager identity.',
        });
      }

      if (input.isPrimary) {
        await db
          .update(distributionManagerAssignments)
          .set({ isPrimary: 0 })
          .where(eq(distributionManagerAssignments.programId, input.programId));
      }

      await db
        .insert(distributionManagerAssignments)
        .values({
          programId: input.programId,
          developmentId: program.developmentId,
          managerUserId: input.managerUserId,
          isPrimary: input.isPrimary ? 1 : 0,
          workloadCapacity: input.workloadCapacity,
          timezone: input.timezone ?? null,
          isActive: input.isActive ? 1 : 0,
        })
        .onDuplicateKeyUpdate({
          set: {
            developmentId: program.developmentId,
            isPrimary: input.isPrimary ? 1 : 0,
            workloadCapacity: input.workloadCapacity,
            timezone: input.timezone ?? null,
            isActive: input.isActive ? 1 : 0,
          },
        });

      return {
        success: true,
        programId: input.programId,
        developmentId: program.developmentId,
        managerUserId: input.managerUserId,
        managerDisplayName: formatUserDisplayName(managerUser),
      };
    }),

  unassignManager: superAdminProcedure
    .input(
      z.object({
        programId: z.number().int().positive(),
        managerUserId: z.number().int().positive(),
        hardDelete: z.boolean().default(false),
      }),
    )
    .mutation(async ({ input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      if (input.hardDelete) {
        await db
          .delete(distributionManagerAssignments)
          .where(
            and(
              eq(distributionManagerAssignments.programId, input.programId),
              eq(distributionManagerAssignments.managerUserId, input.managerUserId),
            ),
          );

        return {
          success: true,
          mode: 'hard_deleted' as const,
          programId: input.programId,
          managerUserId: input.managerUserId,
        };
      }

      await db
        .update(distributionManagerAssignments)
        .set({ isActive: 0 })
        .where(
          and(
            eq(distributionManagerAssignments.programId, input.programId),
            eq(distributionManagerAssignments.managerUserId, input.managerUserId),
          ),
        );

      return {
        success: true,
        mode: 'soft_deactivated' as const,
        programId: input.programId,
        managerUserId: input.managerUserId,
      };
    }),

  listManagersForDevelopment: superAdminProcedure
    .input(
      z
        .object({
          programId: z.number().int().positive().optional(),
          developmentId: z.number().int().positive().optional(),
          includeInactive: z.boolean().default(false),
        })
        .refine(value => value.programId || value.developmentId, {
          message: 'programId or developmentId is required.',
        }),
    )
    .query(async ({ input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const conditions: SQL[] = [];

      if (typeof input.programId === 'number') {
        conditions.push(eq(distributionManagerAssignments.programId, input.programId));
      }

      if (typeof input.developmentId === 'number') {
        conditions.push(eq(distributionManagerAssignments.developmentId, input.developmentId));
      }

      if (!input.includeInactive) {
        conditions.push(eq(distributionManagerAssignments.isActive, 1));
      }

      const rows = await db
        .select({
          assignmentId: distributionManagerAssignments.id,
          programId: distributionManagerAssignments.programId,
          developmentId: distributionManagerAssignments.developmentId,
          developmentName: developments.name,
          managerUserId: distributionManagerAssignments.managerUserId,
          isPrimary: distributionManagerAssignments.isPrimary,
          workloadCapacity: distributionManagerAssignments.workloadCapacity,
          timezone: distributionManagerAssignments.timezone,
          isActive: distributionManagerAssignments.isActive,
          createdAt: distributionManagerAssignments.createdAt,
          updatedAt: distributionManagerAssignments.updatedAt,
          managerRole: users.role,
          managerName: users.name,
          managerFirstName: users.firstName,
          managerLastName: users.lastName,
          managerEmail: users.email,
        })
        .from(distributionManagerAssignments)
        .innerJoin(
          distributionPrograms,
          eq(distributionManagerAssignments.programId, distributionPrograms.id),
        )
        .innerJoin(developments, eq(distributionManagerAssignments.developmentId, developments.id))
        .innerJoin(users, eq(distributionManagerAssignments.managerUserId, users.id))
        .where(withConditions(conditions))
        .orderBy(desc(distributionManagerAssignments.updatedAt));

      return rows.map(row => ({
        assignmentId: row.assignmentId,
        programId: row.programId,
        developmentId: row.developmentId,
        developmentName: row.developmentName,
        managerUserId: row.managerUserId,
        managerRole: row.managerRole,
        managerDisplayName: formatUserDisplayName({
          name: row.managerName,
          firstName: row.managerFirstName,
          lastName: row.managerLastName,
          email: row.managerEmail,
        }),
        managerEmail: row.managerEmail,
        isPrimary: boolFromTinyInt(row.isPrimary),
        workloadCapacity: row.workloadCapacity,
        timezone: row.timezone,
        isActive: boolFromTinyInt(row.isActive),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));
    }),

  listManagerAssignmentTargets: superAdminProcedure
    .input(
      z
        .object({
          includeInactivePrograms: z.boolean().default(false),
          limit: z.number().int().min(1).max(500).default(200),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      return await runDistributionDbOperation(
        'distribution.admin.listManagerAssignmentTargets',
        async () => {
          assertDistributionEnabled();
          const db = await getDb();
          if (!db) throw new Error('Database not available');

          const conditions: SQL[] = [];
          if (!input?.includeInactivePrograms) {
            conditions.push(eq(distributionPrograms.isActive, 1));
          }

          const rows = await db
            .select({
              programId: distributionPrograms.id,
              developmentId: developments.id,
              developmentName: developments.name,
              city: developments.city,
              province: developments.province,
              isProgramActive: distributionPrograms.isActive,
              isReferralEnabled: distributionPrograms.isReferralEnabled,
              updatedAt: distributionPrograms.updatedAt,
            })
            .from(distributionPrograms)
            .innerJoin(developments, eq(distributionPrograms.developmentId, developments.id))
            .where(withConditions(conditions))
            .orderBy(desc(distributionPrograms.updatedAt))
            .limit(input?.limit ?? 200);

          return rows.map(row => ({
            ...row,
            isProgramActive: boolFromTinyInt(row.isProgramActive),
            isReferralEnabled: boolFromTinyInt(row.isReferralEnabled),
          }));
        },
      );
    }),

  listManagerCandidates: superAdminProcedure
    .input(
      z.object({
        search: z.string().trim().min(1).max(200).optional(),
        limit: z.number().int().min(1).max(200).default(50),
      }),
    )
    .query(async ({ input }) => {
      return await runDistributionDbOperation('distribution.admin.listManagerCandidates', async () => {
        assertDistributionEnabled();
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const conditions: SQL[] = [
          eq(distributionIdentities.identityType, 'manager'),
          eq(distributionIdentities.active, 1),
        ];
        if (input.search) {
          const term = `%${input.search.toLowerCase()}%`;
          conditions.push(
            sql`(
              LOWER(COALESCE(${users.name}, '')) LIKE ${term}
              OR LOWER(COALESCE(${users.firstName}, '')) LIKE ${term}
              OR LOWER(COALESCE(${users.lastName}, '')) LIKE ${term}
              OR LOWER(COALESCE(${users.email}, '')) LIKE ${term}
            )`,
          );
        }

        const rows = await db
          .select({
            id: users.id,
            role: users.role,
            name: users.name,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          })
          .from(distributionIdentities)
          .innerJoin(users, eq(distributionIdentities.userId, users.id))
          .where(withConditions(conditions))
          .orderBy(desc(users.id))
          .limit(input.limit);

        return rows.map(row => ({
          id: row.id,
          role: row.role,
          email: row.email,
          displayName: formatUserDisplayName(row),
        }));
      });
    }),

  listAgentCandidates: superAdminProcedure
    .input(
      z.object({
        search: z.string().trim().min(1).max(200).optional(),
        limit: z.number().int().min(1).max(200).default(100),
        includeNonApproved: z.boolean().default(false),
      }),
    )
    .query(async ({ input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const conditions: SQL[] = [
        eq(distributionIdentities.identityType, 'referrer'),
        eq(distributionIdentities.active, 1),
      ];
      if (input.search) {
        const term = `%${input.search.toLowerCase()}%`;
        conditions.push(
          sql`(
            LOWER(COALESCE(${distributionIdentities.displayName}, '')) LIKE ${term}
            OR LOWER(COALESCE(${users.name}, '')) LIKE ${term}
            OR LOWER(COALESCE(${users.firstName}, '')) LIKE ${term}
            OR LOWER(COALESCE(${users.lastName}, '')) LIKE ${term}
            OR LOWER(COALESCE(${users.email}, '')) LIKE ${term}
          )`,
        );
      }

      const rows = await db
        .select({
          userId: users.id,
          role: users.role,
          status: distributionIdentities.active,
          displayName: distributionIdentities.displayName,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          userName: users.name,
        })
        .from(distributionIdentities)
        .innerJoin(users, eq(distributionIdentities.userId, users.id))
        .where(withConditions(conditions))
        .orderBy(desc(users.id))
        .limit(input.limit);

      return rows.map(row => ({
        agentId: row.userId,
        userId: row.userId,
        role: row.role,
        status: boolFromTinyInt(row.status) ? 'active' : 'inactive',
        email: row.email,
        displayName:
          row.displayName ||
          [row.firstName, row.lastName].filter(Boolean).join(' ') ||
          row.userName ||
          row.email,
      }));
    }),

  listReferrerApplications: superAdminProcedure
    .input(
      z
        .object({
          status: z.enum(REFERRER_APPLICATION_STATUS_VALUES).optional(),
          limit: z.number().int().min(1).max(500).default(200),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      return await runDistributionDbOperation(
        'distribution.admin.listReferrerApplications',
        async () => {
          assertDistributionEnabled();
          const db = await getDb();
          if (!db) throw new Error('Database not available');

          const conditions: SQL[] = [];
          if (input?.status) {
            conditions.push(eq(distributionReferrerApplications.status, input.status));
          }

          const rows = await db
            .select({
              id: distributionReferrerApplications.id,
              requestedIdentity: distributionReferrerApplications.requestedIdentity,
              fullName: distributionReferrerApplications.fullName,
              email: distributionReferrerApplications.email,
              phone: distributionReferrerApplications.phone,
              notes: distributionReferrerApplications.notes,
              status: distributionReferrerApplications.status,
              userId: distributionReferrerApplications.userId,
              reviewedBy: distributionReferrerApplications.reviewedBy,
              reviewedAt: distributionReferrerApplications.reviewedAt,
              reviewNotes: distributionReferrerApplications.reviewNotes,
              createdAt: distributionReferrerApplications.createdAt,
              updatedAt: distributionReferrerApplications.updatedAt,
            })
            .from(distributionReferrerApplications)
            .where(withConditions(conditions))
            .orderBy(desc(distributionReferrerApplications.createdAt))
            .limit(input?.limit ?? 200);

          const directory = await getUserDirectoryByIds(
            db,
            rows.flatMap(row => [Number(row.userId || 0), Number(row.reviewedBy || 0)]),
          );

          return rows.map(row => ({
            approvalSource:
              row.status === 'approved'
                ? typeof row.reviewNotes === 'string' &&
                  row.reviewNotes.includes('Approved via manager invite completion.')
                  ? ('manager_invite_completion' as const)
                  : row.reviewedBy
                    ? ('admin_review' as const)
                    : ('unknown' as const)
                : null,
            ...row,
            userDisplayName: row.userId
              ? (directory.get(Number(row.userId))?.displayName ?? null)
              : null,
            reviewedByDisplayName: row.reviewedBy
              ? (directory.get(Number(row.reviewedBy))?.displayName ?? null)
              : null,
          }));
        },
      );
    }),

  reviewReferrerApplication: superAdminProcedure
    .input(
      z.object({
        applicationId: z.number().int().positive(),
        decision: z.enum(['approved', 'rejected']),
        notes: z.string().max(2000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [application] = await db
        .select({
          id: distributionReferrerApplications.id,
          requestedIdentity: distributionReferrerApplications.requestedIdentity,
          fullName: distributionReferrerApplications.fullName,
          email: distributionReferrerApplications.email,
          status: distributionReferrerApplications.status,
        })
        .from(distributionReferrerApplications)
        .where(eq(distributionReferrerApplications.id, input.applicationId))
        .limit(1);

      if (!application) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Referrer application not found.' });
      }

      if (application.status !== 'pending') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Application is already ${application.status}.`,
        });
      }

      if (input.decision === 'rejected') {
        await db
          .update(distributionReferrerApplications)
          .set({
            status: 'rejected',
            reviewedBy: ctx.user.id,
            reviewedAt: sql`CURRENT_TIMESTAMP`,
            reviewNotes: input.notes ?? null,
          })
          .where(eq(distributionReferrerApplications.id, input.applicationId));

        return { success: true, applicationId: input.applicationId, status: 'rejected' as const };
      }

      const [user] = await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(eq(users.email, application.email))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message:
            'No user account exists for this email yet. Ask applicant to register/login first, then approve.',
        });
      }

      await db
        .insert(distributionIdentities)
        .values({
          userId: Number(user.id),
          identityType: application.requestedIdentity as DistributionIdentityType,
          active: 1,
          displayName: application.fullName || application.email,
        })
        .onDuplicateKeyUpdate({
          set: {
            active: 1,
            displayName: application.fullName || application.email,
          },
        });

      await db
        .update(distributionReferrerApplications)
        .set({
          status: 'approved',
          userId: Number(user.id),
          reviewedBy: ctx.user.id,
          reviewedAt: sql`CURRENT_TIMESTAMP`,
          reviewNotes: input.notes ?? null,
        })
        .where(eq(distributionReferrerApplications.id, input.applicationId));

      return {
        success: true,
        applicationId: input.applicationId,
        status: 'approved' as const,
        userId: Number(user.id),
      };
    }),

  listTeamRegistrations: superAdminProcedure
    .input(
      z
        .object({
          status: z.enum(TEAM_REGISTRATION_STATUS_VALUES).optional(),
          requestedArea: z.enum(TEAM_REGISTRATION_AREA_VALUES).optional(),
          limit: z.number().int().min(1).max(500).default(200),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      return await runDistributionDbOperation('distribution.admin.listTeamRegistrations', async () => {
        await assertDistributionSchemaReady('distribution.admin.listTeamRegistrations');
        assertDistributionEnabled();
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const conditions: SQL[] = [];
        if (input?.status) {
          conditions.push(eq(platformTeamRegistrations.status, input.status));
        }
        if (input?.requestedArea) {
          conditions.push(eq(platformTeamRegistrations.requestedArea, input.requestedArea));
        }

        const rows = await db
          .select({
            id: platformTeamRegistrations.id,
            fullName: platformTeamRegistrations.fullName,
            email: platformTeamRegistrations.email,
            phone: platformTeamRegistrations.phone,
            company: platformTeamRegistrations.company,
            currentRole: platformTeamRegistrations.currentRole,
            requestedArea: platformTeamRegistrations.requestedArea,
            notes: platformTeamRegistrations.notes,
            status: platformTeamRegistrations.status,
            userId: platformTeamRegistrations.userId,
            reviewedBy: platformTeamRegistrations.reviewedBy,
            reviewedAt: platformTeamRegistrations.reviewedAt,
            reviewNotes: platformTeamRegistrations.reviewNotes,
            createdAt: platformTeamRegistrations.createdAt,
            updatedAt: platformTeamRegistrations.updatedAt,
          })
          .from(platformTeamRegistrations)
          .where(withConditions(conditions))
          .orderBy(desc(platformTeamRegistrations.createdAt))
          .limit(input?.limit ?? 200);

        const directory = await getUserDirectoryByIds(
          db,
          rows.flatMap(row => [Number(row.userId || 0), Number(row.reviewedBy || 0)]),
        );

        const registrationUserIds: number[] = Array.from(
          new Set<number>(rows.map(row => Number(row.userId || 0)).filter(id => id > 0)),
        );
        const managerIdentityByUserId = new Map<number, boolean>();
        if (registrationUserIds.length) {
          const identityRows = await db
            .select({
              userId: distributionIdentities.userId,
              active: distributionIdentities.active,
            })
            .from(distributionIdentities)
            .where(
              and(
                inArray(distributionIdentities.userId, registrationUserIds),
                eq(distributionIdentities.identityType, 'manager'),
              ),
            );
          for (const row of identityRows) {
            managerIdentityByUserId.set(Number(row.userId), boolFromTinyInt(row.active));
          }
        }

        return rows.map(row => ({
          ...row,
          userDisplayName: row.userId
            ? (directory.get(Number(row.userId))?.displayName ?? null)
            : null,
          reviewedByDisplayName: row.reviewedBy
            ? (directory.get(Number(row.reviewedBy))?.displayName ?? null)
            : null,
          managerAccessActive: row.userId
            ? (managerIdentityByUserId.get(Number(row.userId)) ?? null)
            : null,
        }));
      });
    }),

  reviewTeamRegistration: superAdminProcedure
    .input(
      z.object({
        registrationId: z.number().int().positive(),
        decision: z.enum(['approved', 'rejected']),
        notes: z.string().max(2000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [registration] = await db
        .select({
          id: platformTeamRegistrations.id,
          requestedArea: platformTeamRegistrations.requestedArea,
          fullName: platformTeamRegistrations.fullName,
          email: platformTeamRegistrations.email,
          status: platformTeamRegistrations.status,
        })
        .from(platformTeamRegistrations)
        .where(eq(platformTeamRegistrations.id, input.registrationId))
        .limit(1);

      if (!registration) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team registration not found.' });
      }

      if (registration.status !== 'pending') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Registration is already ${registration.status}.`,
        });
      }

      if (input.decision === 'rejected') {
        await db
          .update(platformTeamRegistrations)
          .set({
            status: 'rejected',
            reviewedBy: ctx.user.id,
            reviewedAt: sql`CURRENT_TIMESTAMP`,
            reviewNotes: input.notes ?? null,
          })
          .where(eq(platformTeamRegistrations.id, input.registrationId));

        return { success: true, registrationId: input.registrationId, status: 'rejected' as const };
      }

      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, registration.email))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message:
            'No user account exists for this email yet. Ask applicant to register/login first, then approve.',
        });
      }

      let identityCreated = false;
      if (registration.requestedArea === 'distribution_manager') {
        await db
          .insert(distributionIdentities)
          .values({
            userId: Number(user.id),
            identityType: 'manager',
            active: 1,
            displayName: registration.fullName || registration.email,
          })
          .onDuplicateKeyUpdate({
            set: {
              active: 1,
              displayName: registration.fullName || registration.email,
            },
          });
        identityCreated = true;
      }

      await db
        .update(platformTeamRegistrations)
        .set({
          status: 'approved',
          userId: Number(user.id),
          reviewedBy: ctx.user.id,
          reviewedAt: sql`CURRENT_TIMESTAMP`,
          reviewNotes: input.notes ?? null,
        })
        .where(eq(platformTeamRegistrations.id, input.registrationId));

      return {
        success: true,
        registrationId: input.registrationId,
        status: 'approved' as const,
        userId: Number(user.id),
        identityCreated,
      };
    }),

  createManagerInvite: superAdminProcedure
    .input(
      z.object({
        fullName: z.string().trim().min(2).max(200),
        email: z.string().trim().email().max(320),
        phone: z.string().trim().max(50).optional(),
        company: z.string().trim().max(200).optional(),
        currentRole: z.string().trim().max(150).optional(),
        notes: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await runDistributionDbOperation('distribution.admin.createManagerInvite', async () => {
        await assertDistributionSchemaReady('distribution.admin.createManagerInvite');
        assertDistributionEnabled();
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const normalizedEmail = input.email.trim().toLowerCase();
        const [existingPending] = await db
          .select({
            id: platformTeamRegistrations.id,
            email: platformTeamRegistrations.email,
            status: platformTeamRegistrations.status,
          })
          .from(platformTeamRegistrations)
          .where(
            and(
              eq(platformTeamRegistrations.email, normalizedEmail),
              eq(platformTeamRegistrations.requestedArea, 'distribution_manager'),
              eq(platformTeamRegistrations.status, 'pending'),
            ),
          )
          .limit(1);

        const baseNotes = [input.notes?.trim(), `Invited by user #${ctx.user.id}`]
          .filter(Boolean)
          .join('\n');

        if (existingPending) {
          return {
            success: true,
            mode: 'existing_pending' as const,
            registrationId: Number(existingPending.id),
            email: normalizedEmail,
            inviteUrl: buildDistributionManagerInviteUrl(ENV.appUrl, {
              registrationId: Number(existingPending.id),
              email: normalizedEmail,
            }),
          };
        }

        const [insertResult] = await db.insert(platformTeamRegistrations).values({
          fullName: input.fullName.trim(),
          email: normalizedEmail,
          phone: input.phone?.trim() || null,
          company: input.company?.trim() || null,
          currentRole: input.currentRole?.trim() || null,
          requestedArea: 'distribution_manager',
          notes: baseNotes || null,
          status: 'pending',
        });

        let registrationId = Number((insertResult as any).insertId || 0);
        if (!registrationId) {
          const [insertedRow] = await db
            .select({ id: platformTeamRegistrations.id })
            .from(platformTeamRegistrations)
            .where(
              and(
                eq(platformTeamRegistrations.email, normalizedEmail),
                eq(platformTeamRegistrations.requestedArea, 'distribution_manager'),
              ),
            )
            .orderBy(desc(platformTeamRegistrations.id))
            .limit(1);
          registrationId = Number(insertedRow?.id || 0);
        }

        if (!registrationId) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message:
              'Manager invite was created but registration ID could not be resolved. Please retry.',
          });
        }

        return {
          success: true,
          mode: 'created' as const,
          registrationId,
          email: normalizedEmail,
          inviteUrl: buildDistributionManagerInviteUrl(ENV.appUrl, {
            registrationId,
            email: normalizedEmail,
          }),
        };
      });
    }),

  resendManagerInvite: superAdminProcedure
    .input(
      z.object({
        registrationId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await runDistributionDbOperation('distribution.admin.resendManagerInvite', async () => {
        assertDistributionEnabled();
        const db = await getDb();
        if (!db) throw new Error('Database not available');

      const [registration] = await db
        .select({
          id: platformTeamRegistrations.id,
          email: platformTeamRegistrations.email,
          requestedArea: platformTeamRegistrations.requestedArea,
          status: platformTeamRegistrations.status,
          notes: platformTeamRegistrations.notes,
        })
        .from(platformTeamRegistrations)
        .where(eq(platformTeamRegistrations.id, input.registrationId))
        .limit(1);

      if (!registration) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Manager invite not found.' });
      }
      if (registration.requestedArea !== 'distribution_manager') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Registration is not a manager invite.',
        });
      }
      if (registration.status !== 'pending') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Only pending invites can be resent. Current status: ${registration.status}.`,
        });
      }

      const resendMarker = `Invite resent by user #${ctx.user.id} at ${new Date().toISOString()}`;
      const nextNotes = [registration.notes, resendMarker].filter(Boolean).join('\n');
      await db
        .update(platformTeamRegistrations)
        .set({
          notes: nextNotes,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        } as any)
        .where(eq(platformTeamRegistrations.id, input.registrationId));

        const normalizedEmail = String(registration.email || '').toLowerCase();
        return {
          success: true,
          registrationId: Number(registration.id),
          email: normalizedEmail,
          inviteUrl: buildDistributionManagerInviteUrl(ENV.appUrl, {
            registrationId: Number(registration.id),
            email: normalizedEmail,
          }),
        };
      });
    }),

  setManagerAccess: superAdminProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        active: z.boolean(),
        notes: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found.' });
      }

      const managerDisplayName = formatUserDisplayName(user) || user.email || `User #${user.id}`;
      await db
        .insert(distributionIdentities)
        .values({
          userId: Number(user.id),
          identityType: 'manager',
          active: input.active ? 1 : 0,
          displayName: managerDisplayName,
        })
        .onDuplicateKeyUpdate({
          set: {
            active: input.active ? 1 : 0,
            displayName: managerDisplayName,
          },
        });

      if (!input.active) {
        await db
          .update(distributionManagerAssignments)
          .set({
            isActive: 0,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          } as any)
          .where(eq(distributionManagerAssignments.managerUserId, Number(user.id)));
      }

      if (input.notes?.trim()) {
        await db
          .update(platformTeamRegistrations)
          .set({
            reviewNotes: `[manager_access:${input.active ? 'enabled' : 'disabled'}] by user #${ctx.user.id}: ${input.notes.trim()}`,
            reviewedBy: ctx.user.id,
            reviewedAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(
            and(
              eq(platformTeamRegistrations.userId, Number(user.id)),
              eq(platformTeamRegistrations.requestedArea, 'distribution_manager'),
            ),
          );
      }

      return {
        success: true,
        userId: Number(user.id),
        active: input.active,
      };
    }),

  upsertAgentTier: superAdminProcedure
    .input(
      z.object({
        agentId: z.number().int().positive(),
        tier: z.enum(DISTRIBUTION_TIER_VALUES),
        score: z.number().int().min(0).default(0),
        windowDays: z.number().int().min(1).max(365).default(90),
        reason: z.string().max(1000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const agent = await getAgentById(db, input.agentId);
      if (!agent) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Referrer user not found.' });
      }
      const hasReferrerIdentity = await hasActiveDistributionIdentity(
        db,
        input.agentId,
        'referrer',
      );
      if (!hasReferrerIdentity && agent.role !== 'super_admin') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Selected user does not have an active distribution referrer identity.',
        });
      }

      const [current] = await db
        .select({
          id: distributionAgentTiers.id,
          tier: distributionAgentTiers.tier,
          score: distributionAgentTiers.score,
          windowDays: distributionAgentTiers.windowDays,
          reason: distributionAgentTiers.reason,
        })
        .from(distributionAgentTiers)
        .where(
          and(
            eq(distributionAgentTiers.agentId, input.agentId),
            isNull(distributionAgentTiers.effectiveTo),
          ),
        )
        .orderBy(desc(distributionAgentTiers.id))
        .limit(1);

      const normalizedReason = input.reason ?? null;

      if (
        current &&
        current.tier === input.tier &&
        current.score === input.score &&
        current.windowDays === input.windowDays &&
        (current.reason ?? null) === normalizedReason
      ) {
        return {
          success: true,
          mode: 'unchanged' as const,
          agentId: input.agentId,
          tier: input.tier,
        };
      }

      if (current) {
        await db
          .update(distributionAgentTiers)
          .set({ effectiveTo: sql`CURRENT_TIMESTAMP` })
          .where(eq(distributionAgentTiers.id, current.id));
      }

      await db.insert(distributionAgentTiers).values({
        agentId: input.agentId,
        tier: input.tier,
        score: input.score,
        windowDays: input.windowDays,
        reason: normalizedReason,
        assignedBy: ctx.user.id,
      });

      return {
        success: true,
        mode: current ? ('updated' as const) : ('created' as const),
        agentId: input.agentId,
        tier: input.tier,
      };
    }),

  listAgentTiers: superAdminProcedure
    .input(
      z.object({
        agentId: z.number().int().positive().optional(),
        onlyCurrent: z.boolean().default(true),
        limit: z.number().int().min(1).max(500).default(100),
      }),
    )
    .query(async ({ input }) => {
      return await runDistributionDbOperation('distribution.admin.listAgentTiers', async () => {
        assertDistributionEnabled();
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const conditions: SQL[] = [];

        if (typeof input.agentId === 'number') {
          conditions.push(eq(distributionAgentTiers.agentId, input.agentId));
        }

        if (input.onlyCurrent) {
          conditions.push(isNull(distributionAgentTiers.effectiveTo));
        }

        const rows = await db
          .select({
            id: distributionAgentTiers.id,
            agentId: distributionAgentTiers.agentId,
            tier: distributionAgentTiers.tier,
            score: distributionAgentTiers.score,
            windowDays: distributionAgentTiers.windowDays,
            effectiveFrom: distributionAgentTiers.effectiveFrom,
            effectiveTo: distributionAgentTiers.effectiveTo,
            reason: distributionAgentTiers.reason,
            assignedBy: distributionAgentTiers.assignedBy,
            createdAt: distributionAgentTiers.createdAt,
            updatedAt: distributionAgentTiers.updatedAt,
          })
          .from(distributionAgentTiers)
          .where(withConditions(conditions))
          .orderBy(desc(distributionAgentTiers.id))
          .limit(input.limit);

        const userDirectory = await getUserDirectoryByIds(
          db,
          rows.map(row => Number(row.agentId)),
        );

        return rows.map(row => ({
          ...row,
          agentDisplayName:
            userDirectory.get(Number(row.agentId))?.displayName || `Referrer #${row.agentId}`,
          agentEmail: userDirectory.get(Number(row.agentId))?.email || null,
        }));
      });
    }),

  grantAgentAccess: superAdminProcedure
    .input(
      z.object({
        programId: z.number().int().positive(),
        agentId: z.number().int().positive(),
        minTierRequired: z.enum(DISTRIBUTION_TIER_VALUES).default('tier_1'),
        accessStatus: z.enum(ACCESS_MUTABLE_STATUSES).default('active'),
        notes: z.string().max(2000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const program = await getProgramById(db, input.programId);
      if (!program) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Distribution program not found.' });
      }

      const agent = await getAgentById(db, input.agentId);
      if (!agent) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Referrer user not found.' });
      }
      const hasReferrerIdentity = await hasActiveDistributionIdentity(
        db,
        input.agentId,
        'referrer',
      );
      if (!hasReferrerIdentity && agent.role !== 'super_admin') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Selected user does not have an active distribution referrer identity.',
        });
      }

      const tierMap = await getCurrentTierByAgentIds(db, [input.agentId]);
      const currentTier = (tierMap.get(input.agentId) || null) as DistributionTier | null;
      const tierEligible = isTierEligible(currentTier, input.minTierRequired as DistributionTier);

      if (input.accessStatus === 'active' && !tierEligible) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Agent tier does not meet the minimum tier required for active access. Set status to paused or raise tier.',
        });
      }

      await db
        .insert(distributionAgentAccess)
        .values({
          programId: input.programId,
          developmentId: program.developmentId,
          agentId: input.agentId,
          minTierRequired: input.minTierRequired,
          accessStatus: input.accessStatus,
          grantedBy: ctx.user.id,
          notes: input.notes ?? null,
          revokedAt: null,
        })
        .onDuplicateKeyUpdate({
          set: {
            developmentId: program.developmentId,
            minTierRequired: input.minTierRequired,
            accessStatus: input.accessStatus,
            grantedBy: ctx.user.id,
            grantedAt: sql`CURRENT_TIMESTAMP`,
            revokedAt: null,
            notes: input.notes ?? null,
          },
        });

      return {
        success: true,
        programId: input.programId,
        developmentId: program.developmentId,
        agentId: input.agentId,
        currentTier,
        minTierRequired: input.minTierRequired,
        tierEligible,
        accessStatus: input.accessStatus,
      };
    }),

  revokeAgentAccess: superAdminProcedure
    .input(
      z.object({
        programId: z.number().int().positive(),
        agentId: z.number().int().positive(),
        reason: z.string().max(2000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const program = await getProgramById(db, input.programId);
      if (!program) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Distribution program not found.' });
      }

      const agent = await getAgentById(db, input.agentId);
      if (!agent) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Referrer user not found.' });
      }
      const hasReferrerIdentity = await hasActiveDistributionIdentity(
        db,
        input.agentId,
        'referrer',
      );
      if (!hasReferrerIdentity && agent.role !== 'super_admin') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Selected user does not have an active distribution referrer identity.',
        });
      }

      await db
        .insert(distributionAgentAccess)
        .values({
          programId: input.programId,
          developmentId: program.developmentId,
          agentId: input.agentId,
          minTierRequired: 'tier_1',
          accessStatus: 'revoked',
          grantedBy: ctx.user.id,
          notes: input.reason ?? null,
          revokedAt: sql`CURRENT_TIMESTAMP`,
        })
        .onDuplicateKeyUpdate({
          set: {
            developmentId: program.developmentId,
            accessStatus: 'revoked',
            grantedBy: ctx.user.id,
            revokedAt: sql`CURRENT_TIMESTAMP`,
            notes: input.reason ?? null,
          },
        });

      return {
        success: true,
        programId: input.programId,
        developmentId: program.developmentId,
        agentId: input.agentId,
        accessStatus: 'revoked' as const,
      };
    }),

  listAgentAccess: superAdminProcedure
    .input(
      z.object({
        programId: z.number().int().positive().optional(),
        developmentId: z.number().int().positive().optional(),
        agentId: z.number().int().positive().optional(),
        accessStatus: z.enum(['active', 'paused', 'revoked']).optional(),
        includeRevoked: z.boolean().default(true),
        limit: z.number().int().min(1).max(500).default(200),
      }),
    )
    .query(async ({ input }) => {
      return await runDistributionDbOperation('distribution.admin.listAgentAccess', async () => {
        assertDistributionEnabled();
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const conditions: SQL[] = [];

        if (typeof input.programId === 'number') {
          conditions.push(eq(distributionAgentAccess.programId, input.programId));
        }
        if (typeof input.developmentId === 'number') {
          conditions.push(eq(distributionAgentAccess.developmentId, input.developmentId));
        }
        if (typeof input.agentId === 'number') {
          conditions.push(eq(distributionAgentAccess.agentId, input.agentId));
        }

        if (input.accessStatus) {
          conditions.push(eq(distributionAgentAccess.accessStatus, input.accessStatus));
        } else if (!input.includeRevoked) {
          conditions.push(sql`${distributionAgentAccess.accessStatus} <> 'revoked'`);
        }

        const rows = await db
          .select({
            id: distributionAgentAccess.id,
            programId: distributionAgentAccess.programId,
            developmentId: distributionAgentAccess.developmentId,
            developmentName: developments.name,
            agentId: distributionAgentAccess.agentId,
            minTierRequired: distributionAgentAccess.minTierRequired,
            accessStatus: distributionAgentAccess.accessStatus,
            grantedBy: distributionAgentAccess.grantedBy,
            grantedAt: distributionAgentAccess.grantedAt,
            revokedAt: distributionAgentAccess.revokedAt,
            notes: distributionAgentAccess.notes,
            updatedAt: distributionAgentAccess.updatedAt,
            programIsActive: distributionPrograms.isActive,
          })
          .from(distributionAgentAccess)
          .innerJoin(
            distributionPrograms,
            eq(distributionAgentAccess.programId, distributionPrograms.id),
          )
          .innerJoin(developments, eq(distributionAgentAccess.developmentId, developments.id))
          .where(withConditions(conditions))
          .orderBy(desc(distributionAgentAccess.updatedAt))
          .limit(input.limit);

        const uniqueAgentIds = Array.from(new Set<number>(rows.map(row => Number(row.agentId))));
        const tierByAgentId = await getCurrentTierByAgentIds(db, uniqueAgentIds);
        const userDirectory = await getUserDirectoryByIds(db, uniqueAgentIds);

        return rows.map(row => {
          const currentTier = (tierByAgentId.get(row.agentId) || null) as DistributionTier | null;
          const minTierRequired = row.minTierRequired as DistributionTier;
          const user = userDirectory.get(Number(row.agentId));

          return {
            id: row.id,
            programId: row.programId,
            developmentId: row.developmentId,
            developmentName: row.developmentName,
            agentId: row.agentId,
            agentDisplayName: user?.displayName || `Referrer #${row.agentId}`,
            agentEmail: user?.email || null,
            minTierRequired,
            currentTier,
            tierEligible: isTierEligible(currentTier, minTierRequired),
            accessStatus: row.accessStatus,
            programIsActive: boolFromTinyInt(row.programIsActive),
            grantedBy: row.grantedBy,
            grantedAt: row.grantedAt,
            revokedAt: row.revokedAt,
            notes: row.notes,
            updatedAt: row.updatedAt,
          };
        });
      });
    }),

  transitionDealStage: superAdminProcedure
    .input(
      z.object({
        dealId: z.number().int().positive(),
        toStage: z.enum(DISTRIBUTION_DEAL_STAGE_VALUES),
        notes: z.string().max(2000).nullable().optional(),
        force: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const deal = await getDealById(db, input.dealId);
      if (!deal) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Distribution deal not found.' });
      }

      const fromStage = deal.currentStage as DistributionDealStage;
      const toStage = input.toStage as DistributionDealStage;

      if (fromStage === toStage) {
        return {
          success: true,
          mode: 'unchanged' as const,
          dealId: deal.id,
          stage: fromStage,
          commissionStatus: deal.commissionStatus,
        };
      }

      const isAllowed =
        input.force || toStage === 'cancelled' || isForwardStageTransition(fromStage, toStage);

      if (!isAllowed) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid stage transition. Use force=true for supervised override transitions.',
        });
      }

      const commissionStatus = deriveCommissionStatus(
        toStage,
        deal.commissionTriggerStage as 'contract_signed' | 'bond_approved',
      );

      const updatePayload: Record<string, unknown> = {
        currentStage: toStage,
        commissionStatus,
      };

      let commissionDeal = deal;
      if (toStage !== 'cancelled' && hasReachedStage(toStage, 'application_submitted')) {
        const snapshot = await ensureDealCommissionSnapshotAtSubmissionGate(db, {
          dealId: Number(deal.id),
          programId: Number(deal.programId),
          dealAmount: deal.dealAmount,
          commissionBaseAmount: deal.commissionBaseAmount,
          referrerCommissionType: deal.referrerCommissionType,
          referrerCommissionValue: deal.referrerCommissionValue,
          referrerCommissionBasis: deal.referrerCommissionBasis,
          referrerCommissionAmount: deal.referrerCommissionAmount,
          platformCommissionType: deal.platformCommissionType,
          platformCommissionValue: deal.platformCommissionValue,
          platformCommissionBasis: deal.platformCommissionBasis,
          platformCommissionAmount: deal.platformCommissionAmount,
          snapshotVersion: deal.snapshotVersion,
          snapshotSource: deal.snapshotSource,
        });
        commissionDeal = {
          ...deal,
          ...snapshot,
        };

        if (!hasLockedCommissionSnapshot(commissionDeal)) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message:
              'Commission snapshot is not locked. Resolve commission snapshot before advancing this deal stage.',
          });
        }
      }

      if (toStage === 'cancelled' || toStage === 'commission_paid') {
        updatePayload.closedAt = sql`CURRENT_TIMESTAMP`;
      } else if (input.force && deal.closedAt) {
        updatePayload.closedAt = null;
      }

      await db
        .update(distributionDeals)
        .set(updatePayload)
        .where(eq(distributionDeals.id, deal.id));

      await ensureCommissionEntryForDeal({
        deal: {
          id: Number(commissionDeal.id),
          programId: Number(commissionDeal.programId),
          developmentId: Number(commissionDeal.developmentId),
          agentId: Number(commissionDeal.agentId),
          dealAmount: toNumberOrNull(commissionDeal.dealAmount),
          platformAmount: toNumberOrNull(commissionDeal.platformAmount),
          commissionBaseAmount: toNumberOrNull(commissionDeal.commissionBaseAmount),
          referrerCommissionType: commissionDeal.referrerCommissionType as ProgramCommissionType | null,
          referrerCommissionValue: toNumberOrNull(commissionDeal.referrerCommissionValue),
          referrerCommissionBasis: commissionDeal.referrerCommissionBasis as ProgramCommissionBasis | null,
          referrerCommissionAmount: toNumberOrNull(commissionDeal.referrerCommissionAmount),
          platformCommissionType: commissionDeal.platformCommissionType as ProgramCommissionType | null,
          platformCommissionValue: toNumberOrNull(commissionDeal.platformCommissionValue),
          platformCommissionBasis: commissionDeal.platformCommissionBasis as ProgramCommissionBasis | null,
          platformCommissionAmount: toNumberOrNull(commissionDeal.platformCommissionAmount),
          commissionTriggerStage: commissionDeal.commissionTriggerStage as
            | 'contract_signed'
            | 'bond_approved',
        },
        transitionToStage: toStage,
        actorUserId: ctx.user.id,
        source: 'admin.transitionDealStage',
        deps: {
          findExistingEntry: async (dealId, triggerStage) => {
            const [row] = await db
              .select({ id: distributionCommissionEntries.id })
              .from(distributionCommissionEntries)
              .where(
                and(
                  eq(distributionCommissionEntries.dealId, dealId),
                  eq(distributionCommissionEntries.triggerStage, triggerStage),
                ),
              )
              .limit(1);
            return row ? { id: Number(row.id) } : null;
          },
          getProgramDefaults: async programId => {
            const [program] = await db
              .select({
                commissionModel: distributionPrograms.commissionModel,
                defaultCommissionPercent: distributionPrograms.defaultCommissionPercent,
                defaultCommissionAmount: distributionPrograms.defaultCommissionAmount,
                referrerCommissionType: distributionPrograms.referrerCommissionType,
                referrerCommissionValue: distributionPrograms.referrerCommissionValue,
                referrerCommissionBasis: distributionPrograms.referrerCommissionBasis,
                platformCommissionType: distributionPrograms.platformCommissionType,
                platformCommissionValue: distributionPrograms.platformCommissionValue,
                platformCommissionBasis: distributionPrograms.platformCommissionBasis,
              })
              .from(distributionPrograms)
              .where(eq(distributionPrograms.id, programId))
              .limit(1);
            return program || null;
          },
          insertEntry: async payload => {
            await db.insert(distributionCommissionEntries).values(payload);
          },
          insertLedgerEntry: async payload => {
            await db.insert(distributionCommissionLedger).values({
              distributionDealId: payload.distributionDealId,
              recipientId: payload.recipientId,
              role: payload.role,
              percentage:
                typeof payload.percentage === 'number' ? payload.percentage.toString() : null,
              calculatedAmount: payload.calculatedAmount,
              currency: payload.currency,
              calculationHash: payload.calculationHash,
              calculationInput: payload.calculationInput as any,
            });
          },
          setDealCommissionPending: async dealId => {
            await db
              .update(distributionDeals)
              .set({ commissionStatus: 'pending' })
              .where(eq(distributionDeals.id, dealId));
          },
          insertCommissionCreatedEvent: async ({ dealId, toStage, actorUserId, metadata }) => {
            await db.insert(distributionDealEvents).values({
              dealId,
              fromStage,
              toStage,
              eventType: 'system',
              actorUserId,
              metadata: metadata as any,
              notes: 'Commission entry created from stage transition.',
            });
          },
        },
      });

      await db.insert(distributionDealEvents).values({
        dealId: deal.id,
        fromStage,
        toStage,
        eventType: input.force ? 'override' : 'stage_transition',
        actorUserId: ctx.user.id,
        metadata: {
          force: input.force,
          previousCommissionStatus: deal.commissionStatus,
          nextCommissionStatus: commissionStatus,
          commissionSnapshotLocked:
            toStage !== 'cancelled' && hasReachedStage(toStage, 'application_submitted'),
        } as any,
        notes: input.notes ?? null,
      });

      await logDistributionAudit({
        userId: Number(ctx.user!.id),
        action: 'distribution.admin.transitionDealStage',
        targetType: 'distribution_deal',
        targetId: Number(deal.id),
        metadata: {
          fromStage,
          toStage,
          force: input.force,
          previousCommissionStatus: deal.commissionStatus,
          nextCommissionStatus: commissionStatus,
          commissionSnapshotLocked:
            toStage !== 'cancelled' && hasReachedStage(toStage, 'application_submitted'),
        },
      });

      return {
        success: true,
        mode: input.force ? ('override' as const) : ('transitioned' as const),
        dealId: deal.id,
        stage: toStage,
        commissionStatus,
      };
    }),

  listDeals: superAdminProcedure.input(listDealsInput).query(async ({ input }) => {
    assertDistributionEnabled();
    return await listDeals(input);
  }),

  listCommissionEntries: superAdminProcedure
    .input(
      z
        .object({
          programId: z.number().int().positive().optional(),
          developmentId: z.number().int().positive().optional(),
          agentId: z.number().int().positive().optional(),
          dealId: z.number().int().positive().optional(),
          entryStatus: z.enum(COMMISSION_ENTRY_STATUS_VALUES).optional(),
          limit: z.number().int().min(1).max(500).default(200),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      return await runDistributionDbOperation(
        'distribution.admin.listCommissionEntries',
        async () => {
          assertDistributionEnabled();
          const db = await getDb();
          if (!db) throw new Error('Database not available');

          const limit = input?.limit ?? 200;
          const conditions: SQL[] = [];

          if (typeof input?.programId === 'number') {
            conditions.push(eq(distributionCommissionEntries.programId, input.programId));
          }
          if (typeof input?.developmentId === 'number') {
            conditions.push(eq(distributionCommissionEntries.developmentId, input.developmentId));
          }
          if (typeof input?.agentId === 'number') {
            conditions.push(eq(distributionCommissionEntries.agentId, input.agentId));
          }
          if (typeof input?.dealId === 'number') {
            conditions.push(eq(distributionCommissionEntries.dealId, input.dealId));
          }
          if (input?.entryStatus) {
            conditions.push(eq(distributionCommissionEntries.entryStatus, input.entryStatus));
          }

          const rows = await db
            .select({
              id: distributionCommissionEntries.id,
              dealId: distributionCommissionEntries.dealId,
              programId: distributionCommissionEntries.programId,
              developmentId: distributionCommissionEntries.developmentId,
              developmentName: developments.name,
              agentId: distributionCommissionEntries.agentId,
              calculationBaseAmount: distributionCommissionEntries.calculationBaseAmount,
              commissionPercent: distributionCommissionEntries.commissionPercent,
              commissionAmount: distributionCommissionEntries.commissionAmount,
              currency: distributionCommissionEntries.currency,
              triggerStage: distributionCommissionEntries.triggerStage,
              entryStatus: distributionCommissionEntries.entryStatus,
              approvedAt: distributionCommissionEntries.approvedAt,
              approvedBy: distributionCommissionEntries.approvedBy,
              paidAt: distributionCommissionEntries.paidAt,
              paidBy: distributionCommissionEntries.paidBy,
              paymentReference: distributionCommissionEntries.paymentReference,
              notes: distributionCommissionEntries.notes,
              createdAt: distributionCommissionEntries.createdAt,
              updatedAt: distributionCommissionEntries.updatedAt,
              dealStage: distributionDeals.currentStage,
              dealCommissionStatus: distributionDeals.commissionStatus,
              dealReferrerCommissionAmount: distributionDeals.referrerCommissionAmount,
              dealPlatformCommissionAmount: distributionDeals.platformCommissionAmount,
              buyerName: distributionDeals.buyerName,
            })
            .from(distributionCommissionEntries)
            .innerJoin(
              distributionDeals,
              eq(distributionCommissionEntries.dealId, distributionDeals.id),
            )
            .innerJoin(developments, eq(distributionCommissionEntries.developmentId, developments.id))
            .where(withConditions(conditions))
            .orderBy(desc(distributionCommissionEntries.updatedAt))
            .limit(limit);

          const userDirectory = await getUserDirectoryByIds(
            db,
            rows.map(row => Number(row.agentId)),
          );

          return rows.map(row => ({
            ...row,
            agentDisplayName:
              userDirectory.get(Number(row.agentId))?.displayName || `Referrer #${row.agentId}`,
            agentEmail: userDirectory.get(Number(row.agentId))?.email || null,
            marginAmount:
              Math.max(0, Number(row.dealPlatformCommissionAmount || 0)) -
              Math.max(0, Number(row.commissionAmount || 0)),
          }));
        },
      );
    }),

  overrideDealCommissionSnapshot: superAdminProcedure
    .input(overrideDealCommissionSnapshotInput)
    .mutation(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      if (!input.newReferrerCommission && !input.newPlatformCommission) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Provide at least one commission track override.',
        });
      }

      const scopedDeal = await getDealById(db, input.dealId);
      if (!scopedDeal) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Distribution deal not found.' });
      }
      const dealStage = scopedDeal.currentStage as DistributionDealStage;
      if (!hasReachedStage(dealStage, 'application_submitted')) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Deal commission can only be overridden after submission gate is reached.',
        });
      }
      if (dealStage === 'cancelled') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Cancelled deals cannot be overridden.',
        });
      }

      const lockedSnapshot = await ensureDealCommissionSnapshotAtSubmissionGate(db, {
        dealId: Number(scopedDeal.id),
        programId: Number(scopedDeal.programId),
        dealAmount: scopedDeal.dealAmount,
        commissionBaseAmount: scopedDeal.commissionBaseAmount,
        referrerCommissionType: scopedDeal.referrerCommissionType,
        referrerCommissionValue: scopedDeal.referrerCommissionValue,
        referrerCommissionBasis: scopedDeal.referrerCommissionBasis,
        referrerCommissionAmount: scopedDeal.referrerCommissionAmount,
        platformCommissionType: scopedDeal.platformCommissionType,
        platformCommissionValue: scopedDeal.platformCommissionValue,
        platformCommissionBasis: scopedDeal.platformCommissionBasis,
        platformCommissionAmount: scopedDeal.platformCommissionAmount,
        snapshotVersion: scopedDeal.snapshotVersion,
        snapshotSource: scopedDeal.snapshotSource,
      });

      const currentVersion = Math.max(0, Number(lockedSnapshot.snapshotVersion || 0));
      const nextVersion = Math.max(2, currentVersion + 1);
      const commissionBaseAmount = Math.max(
        0,
        toNumberOrNull(lockedSnapshot.commissionBaseAmount) ??
          toNumberOrNull(scopedDeal.dealAmount) ??
          0,
      );

      const resolveTrack = (
        existing: ProgramCommissionTrack,
        overrideInput: z.infer<typeof commissionOverrideTrackInput> | undefined,
      ): ProgramCommissionTrack => {
        if (!overrideInput) return existing;
        const type = normalizeCommissionType(overrideInput.type, existing.type);
        const value = Math.max(0, Number(overrideInput.value || 0));
        if (value <= 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Override commission value must be greater than 0.',
          });
        }
        const basis = normalizeCommissionBasis(overrideInput.basis, type, 'sale_price');
        if (type === 'percentage' && commissionBaseAmount <= 0) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Percentage overrides require a commission base amount on the deal.',
          });
        }
        return { type, value, basis };
      };

      const referrerTrack = resolveTrack(
        {
          type: lockedSnapshot.referrerCommissionType,
          value: Math.max(0, Number(lockedSnapshot.referrerCommissionValue || 0)),
          basis: lockedSnapshot.referrerCommissionBasis,
        },
        input.newReferrerCommission,
      );
      const platformTrack = resolveTrack(
        {
          type: lockedSnapshot.platformCommissionType,
          value: Math.max(0, Number(lockedSnapshot.platformCommissionValue || 0)),
          basis: lockedSnapshot.platformCommissionBasis,
        },
        input.newPlatformCommission,
      );

      const referrerCommissionAmount = estimateCommissionAmountFromTrack(
        referrerTrack,
        commissionBaseAmount,
      );
      const platformCommissionAmount = estimateCommissionAmountFromTrack(
        platformTrack,
        commissionBaseAmount,
      );

      const previousSnapshot = {
        commissionBaseAmount: lockedSnapshot.commissionBaseAmount,
        referrerCommissionType: lockedSnapshot.referrerCommissionType,
        referrerCommissionValue: lockedSnapshot.referrerCommissionValue,
        referrerCommissionBasis: lockedSnapshot.referrerCommissionBasis,
        referrerCommissionAmount: lockedSnapshot.referrerCommissionAmount,
        platformCommissionType: lockedSnapshot.platformCommissionType,
        platformCommissionValue: lockedSnapshot.platformCommissionValue,
        platformCommissionBasis: lockedSnapshot.platformCommissionBasis,
        platformCommissionAmount: lockedSnapshot.platformCommissionAmount,
        snapshotVersion: currentVersion,
        snapshotSource: lockedSnapshot.snapshotSource,
      };
      const nextSnapshot = {
        commissionBaseAmount: commissionBaseAmount > 0 ? commissionBaseAmount : null,
        referrerCommissionType: referrerTrack.type,
        referrerCommissionValue: referrerTrack.value,
        referrerCommissionBasis: referrerTrack.basis,
        referrerCommissionAmount,
        platformCommissionType: platformTrack.type,
        platformCommissionValue: platformTrack.value,
        platformCommissionBasis: platformTrack.basis,
        platformCommissionAmount,
        snapshotVersion: nextVersion,
        snapshotSource: 'override' as const,
      };

      const [overrideInsert] = await db.insert(distributionCommissionOverrides).values({
        dealId: Number(scopedDeal.id),
        actorUserId: Number(ctx.user.id),
        reason: input.reason.trim(),
        previousSnapshot: previousSnapshot as any,
        nextSnapshot: nextSnapshot as any,
      });
      const overrideId = Number((overrideInsert as any).insertId || 0);

      await db
        .update(distributionDeals)
        .set({
          commissionBaseAmount: nextSnapshot.commissionBaseAmount,
          referrerCommissionType: nextSnapshot.referrerCommissionType,
          referrerCommissionValue: nextSnapshot.referrerCommissionValue,
          referrerCommissionBasis: nextSnapshot.referrerCommissionBasis,
          referrerCommissionAmount: nextSnapshot.referrerCommissionAmount,
          platformCommissionType: nextSnapshot.platformCommissionType,
          platformCommissionValue: nextSnapshot.platformCommissionValue,
          platformCommissionBasis: nextSnapshot.platformCommissionBasis,
          platformCommissionAmount: nextSnapshot.platformCommissionAmount,
          snapshotVersion: nextSnapshot.snapshotVersion,
          snapshotSource: nextSnapshot.snapshotSource,
        })
        .where(eq(distributionDeals.id, Number(scopedDeal.id)));

      const dealCommissionEntries = await db
        .select({
          id: distributionCommissionEntries.id,
          entryStatus: distributionCommissionEntries.entryStatus,
        })
        .from(distributionCommissionEntries)
        .where(eq(distributionCommissionEntries.dealId, Number(scopedDeal.id)));

      const nonPendingEntries = dealCommissionEntries.filter(entry => entry.entryStatus !== 'pending');
      const recalcNeeded = nonPendingEntries.length > 0;
      const recalculatedEntries = recalcNeeded
        ? 0
        : dealCommissionEntries.filter(entry => entry.entryStatus === 'pending').length;
      if (!recalcNeeded && recalculatedEntries > 0) {
        await db
          .update(distributionCommissionEntries)
          .set({
            calculationBaseAmount: commissionBaseAmount,
            commissionPercent: referrerTrack.type === 'percentage' ? referrerTrack.value : null,
            commissionAmount: referrerCommissionAmount,
            updatedBy: Number(ctx.user.id),
          })
          .where(
            and(
              eq(distributionCommissionEntries.dealId, Number(scopedDeal.id)),
              eq(distributionCommissionEntries.entryStatus, 'pending'),
            ),
          );
      }

      await db.insert(distributionDealEvents).values({
        dealId: Number(scopedDeal.id),
        fromStage: dealStage,
        toStage: dealStage,
        eventType: 'override',
        actorUserId: Number(ctx.user.id),
        metadata: {
          source: 'admin.overrideDealCommissionSnapshot',
          overrideId,
          reason: input.reason.trim(),
          previousSnapshotVersion: currentVersion,
          nextSnapshotVersion: nextVersion,
          recalcNeeded,
          recalculatedEntries,
        } as any,
        notes: input.reason.trim(),
      });

      return {
        success: true,
        dealId: Number(scopedDeal.id),
        overrideId,
        snapshotVersion: nextVersion,
        recalcNeeded,
        recalculatedEntries,
      };
    }),

  updateCommissionEntryStatus: superAdminProcedure
    .input(
      z.object({
        entryId: z.number().int().positive(),
        entryStatus: z.enum(COMMISSION_ENTRY_STATUS_VALUES),
        notes: z.string().max(2000).nullable().optional(),
        paymentReference: z.string().max(100).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [entry] = await db
        .select({
          id: distributionCommissionEntries.id,
          dealId: distributionCommissionEntries.dealId,
          entryStatus: distributionCommissionEntries.entryStatus,
          approvedAt: distributionCommissionEntries.approvedAt,
          approvedBy: distributionCommissionEntries.approvedBy,
          paidAt: distributionCommissionEntries.paidAt,
          paidBy: distributionCommissionEntries.paidBy,
          paymentReference: distributionCommissionEntries.paymentReference,
        })
        .from(distributionCommissionEntries)
        .where(eq(distributionCommissionEntries.id, input.entryId))
        .limit(1);

      if (!entry) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Commission entry not found.' });
      }

      const deal = await getDealById(db, entry.dealId);
      if (!deal) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Linked distribution deal not found for this commission entry.',
        });
      }

      const nextStatus = input.entryStatus;
      const updatePayload: Record<string, unknown> = {
        entryStatus: nextStatus,
      };

      if (typeof input.notes !== 'undefined') {
        updatePayload.notes = input.notes;
      }

      if (nextStatus === 'approved') {
        updatePayload.approvedAt = entry.approvedAt ?? sql`CURRENT_TIMESTAMP`;
        updatePayload.approvedBy = entry.approvedBy ?? ctx.user.id;
        updatePayload.paidAt = null;
        updatePayload.paidBy = null;
        if (typeof input.paymentReference !== 'undefined') {
          updatePayload.paymentReference = input.paymentReference;
        } else {
          updatePayload.paymentReference = null;
        }
      } else if (nextStatus === 'paid') {
        updatePayload.approvedAt = entry.approvedAt ?? sql`CURRENT_TIMESTAMP`;
        updatePayload.approvedBy = entry.approvedBy ?? ctx.user.id;
        updatePayload.paidAt = sql`CURRENT_TIMESTAMP`;
        updatePayload.paidBy = ctx.user.id;
        updatePayload.paymentReference =
          input.paymentReference ?? entry.paymentReference ?? `DIST-PAYOUT-${entry.id}`;
      } else if (nextStatus === 'pending') {
        updatePayload.paidAt = null;
        updatePayload.paidBy = null;
        if (typeof input.paymentReference !== 'undefined') {
          updatePayload.paymentReference = input.paymentReference;
        } else {
          updatePayload.paymentReference = null;
        }
      } else if (nextStatus === 'cancelled') {
        if (typeof input.paymentReference !== 'undefined') {
          updatePayload.paymentReference = input.paymentReference;
        }
      }

      await db
        .update(distributionCommissionEntries)
        .set(updatePayload)
        .where(eq(distributionCommissionEntries.id, entry.id));

      const nextDealCommissionStatus =
        nextStatus === 'approved' ? 'approved' : nextStatus === 'pending' ? 'pending' : nextStatus;
      const nextDealStage: DistributionDealStage =
        nextStatus === 'paid'
          ? 'commission_paid'
          : nextStatus === 'cancelled'
            ? 'cancelled'
            : (deal.currentStage as DistributionDealStage);

      const dealUpdatePayload: Record<string, unknown> = {
        commissionStatus: nextDealCommissionStatus,
      };
      if (nextStatus === 'paid' || nextStatus === 'cancelled') {
        dealUpdatePayload.currentStage = nextDealStage;
        dealUpdatePayload.closedAt = sql`CURRENT_TIMESTAMP`;
      }

      await db
        .update(distributionDeals)
        .set(dealUpdatePayload)
        .where(eq(distributionDeals.id, deal.id));

      await db.insert(distributionDealEvents).values({
        dealId: deal.id,
        fromStage: deal.currentStage as DistributionDealStage,
        toStage: nextDealStage,
        eventType: 'override',
        actorUserId: ctx.user.id,
        metadata: {
          source: 'admin.updateCommissionEntryStatus',
          entryId: entry.id,
          previousEntryStatus: entry.entryStatus,
          nextEntryStatus: nextStatus,
          previousDealCommissionStatus: deal.commissionStatus,
          nextDealCommissionStatus,
        } as any,
        notes: input.notes ?? null,
      });

      await logDistributionAudit({
        userId: Number(ctx.user!.id),
        action: 'distribution.admin.updateCommissionEntryStatus',
        targetType: 'distribution_deal',
        targetId: Number(deal.id),
        metadata: {
          entryId: Number(entry.id),
          previousEntryStatus: entry.entryStatus,
          nextEntryStatus: nextStatus,
          previousDealStage: deal.currentStage,
          nextDealStage,
          previousDealCommissionStatus: deal.commissionStatus,
          nextDealCommissionStatus,
          paymentReference:
            typeof updatePayload.paymentReference === 'string'
              ? updatePayload.paymentReference
              : null,
        },
      });

      return {
        success: true,
        entryId: entry.id,
        entryStatus: nextStatus,
        dealId: deal.id,
        dealStage: nextDealStage,
        dealCommissionStatus: nextDealCommissionStatus,
      };
    }),
});

const managerDistributionRouter = router({
  myAssignments: protectedProcedure.query(async ({ ctx }) => {
    assertDistributionEnabled();
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    await assertDistributionIdentity(db, ctx.user!, 'manager');

    const conditions: SQL[] = [];

    if (ctx.user!.role !== 'super_admin') {
      conditions.push(eq(distributionManagerAssignments.managerUserId, ctx.user!.id));
      conditions.push(eq(distributionManagerAssignments.isActive, 1));
    }

    const rows = await db
      .select({
        assignmentId: distributionManagerAssignments.id,
        managerUserId: distributionManagerAssignments.managerUserId,
        programId: distributionManagerAssignments.programId,
        developmentId: distributionManagerAssignments.developmentId,
        developmentName: developments.name,
        isPrimary: distributionManagerAssignments.isPrimary,
        workloadCapacity: distributionManagerAssignments.workloadCapacity,
        timezone: distributionManagerAssignments.timezone,
        isActive: distributionManagerAssignments.isActive,
        updatedAt: distributionManagerAssignments.updatedAt,
      })
      .from(distributionManagerAssignments)
      .innerJoin(
        distributionPrograms,
        eq(distributionManagerAssignments.programId, distributionPrograms.id),
      )
      .innerJoin(developments, eq(distributionManagerAssignments.developmentId, developments.id))
      .where(withConditions(conditions))
      .orderBy(desc(distributionManagerAssignments.updatedAt));

    return rows.map(row => ({
      ...row,
      isPrimary: boolFromTinyInt(row.isPrimary),
      isActive: boolFromTinyInt(row.isActive),
    }));
  }),

  getDevelopmentDocuments: protectedProcedure
    .input(
      z.object({
        developmentId: z.number().int().positive(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      await assertDistributionIdentity(db, ctx.user!, 'manager');

      if (ctx.user!.role !== 'super_admin') {
        await assertManagerScope(db, ctx.user!.id, {
          developmentId: input.developmentId,
        });
      }

      return await getDevelopmentDocumentBank(db, input.developmentId);
    }),

  setDevelopmentDocuments: protectedProcedure
    .input(setDevelopmentDocumentsInput)
    .mutation(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      await assertDistributionIdentity(db, ctx.user!, 'manager');

      // V1: managers are view-only for the development sales pack.
      if (ctx.user!.role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Managers cannot edit the sales pack in v1. Ask the provider or an admin.',
        });
      }

      if (ctx.user!.role !== 'super_admin') {
        await assertManagerScope(db, ctx.user!.id, {
          developmentId: input.developmentId,
        });
      }

      const result = await setDevelopmentDocuments(db, input);
      await logDistributionAudit({
        userId: Number(ctx.user!.id),
        action: 'distribution.manager.setDevelopmentDocuments',
        targetType: 'development',
        targetId: Number(input.developmentId),
        metadata: {
          brochureCount: Array.isArray(input.brochures) ? input.brochures.length : undefined,
          floorPlanCount: Array.isArray(input.floorPlans) ? input.floorPlans.length : undefined,
          videoCount: Array.isArray(input.videos) ? input.videos.length : undefined,
        },
      });
      return result;
    }),

  listAgentsForDevelopment: protectedProcedure
    .input(
      z
        .object({
          programId: z.number().int().positive().optional(),
          developmentId: z.number().int().positive().optional(),
          includeRevoked: z.boolean().default(false),
          limit: z.number().int().min(1).max(500).default(200),
        })
        .refine(value => value.programId || value.developmentId, {
          message: 'programId or developmentId is required.',
        }),
    )
    .query(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      await assertDistributionIdentity(db, ctx.user!, 'manager');

      if (ctx.user!.role !== 'super_admin') {
        await assertManagerScope(db, ctx.user!.id, {
          programId: input.programId,
          developmentId: input.developmentId,
        });
      }

      const conditions: SQL[] = [];

      if (typeof input.programId === 'number') {
        conditions.push(eq(distributionAgentAccess.programId, input.programId));
      }
      if (typeof input.developmentId === 'number') {
        conditions.push(eq(distributionAgentAccess.developmentId, input.developmentId));
      }
      if (!input.includeRevoked) {
        conditions.push(sql`${distributionAgentAccess.accessStatus} <> 'revoked'`);
      }

      const rows = await db
        .select({
          id: distributionAgentAccess.id,
          programId: distributionAgentAccess.programId,
          developmentId: distributionAgentAccess.developmentId,
          developmentName: developments.name,
          agentId: distributionAgentAccess.agentId,
          minTierRequired: distributionAgentAccess.minTierRequired,
          accessStatus: distributionAgentAccess.accessStatus,
          grantedAt: distributionAgentAccess.grantedAt,
          revokedAt: distributionAgentAccess.revokedAt,
          notes: distributionAgentAccess.notes,
          programIsActive: distributionPrograms.isActive,
        })
        .from(distributionAgentAccess)
        .innerJoin(
          distributionPrograms,
          eq(distributionAgentAccess.programId, distributionPrograms.id),
        )
        .innerJoin(developments, eq(distributionAgentAccess.developmentId, developments.id))
        .where(withConditions(conditions))
        .orderBy(desc(distributionAgentAccess.updatedAt))
        .limit(input.limit);

      const uniqueAgentIds = Array.from(new Set<number>(rows.map(row => Number(row.agentId))));
      const tierByAgentId = await getCurrentTierByAgentIds(db, uniqueAgentIds);
      const userDirectory = await getUserDirectoryByIds(db, uniqueAgentIds);

      return rows.map(row => {
        const currentTier = (tierByAgentId.get(row.agentId) || null) as DistributionTier | null;
        const minTierRequired = row.minTierRequired as DistributionTier;
        const user = userDirectory.get(Number(row.agentId));

        return {
          ...row,
          agentDisplayName: user?.displayName || `Referrer #${row.agentId}`,
          agentEmail: user?.email || null,
          minTierRequired,
          currentTier,
          tierEligible: isTierEligible(currentTier, minTierRequired),
          programIsActive: boolFromTinyInt(row.programIsActive),
        };
      });
    }),

  listViewings: protectedProcedure
    .input(
      z.object({
        programId: z.number().int().positive().optional(),
        developmentId: z.number().int().positive().optional(),
        status: z.enum(DISTRIBUTION_VIEWING_STATUS_VALUES).optional(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        includePast: z.boolean().default(false),
        limit: z.number().int().min(1).max(500).default(200),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      await assertDistributionIdentity(db, ctx.user!, 'manager');

      const conditions: SQL[] = [];
      if (typeof input.programId === 'number') {
        conditions.push(eq(distributionViewings.programId, input.programId));
      }
      if (typeof input.developmentId === 'number') {
        conditions.push(eq(distributionViewings.developmentId, input.developmentId));
      }
      if (input.status) {
        conditions.push(eq(distributionViewings.status, input.status));
      }
      if (input.from) {
        conditions.push(sql`${distributionViewings.scheduledStartAt} >= ${input.from}`);
      }
      if (input.to) {
        conditions.push(sql`${distributionViewings.scheduledStartAt} <= ${input.to}`);
      }
      if (!input.includePast) {
        conditions.push(sql`${distributionViewings.scheduledStartAt} >= CURRENT_TIMESTAMP`);
      }

      if (ctx.user!.role !== 'super_admin') {
        if (typeof input.programId === 'number' || typeof input.developmentId === 'number') {
          await assertManagerScope(db, ctx.user!.id, {
            programId: input.programId,
            developmentId: input.developmentId,
          });
        } else {
          const scopedProgramIds: number[] = await getActiveManagerProgramIdsForUser(
            db,
            ctx.user!.id,
          );
          if (!scopedProgramIds.length) {
            return [];
          }
          conditions.push(inArray(distributionViewings.programId, scopedProgramIds as number[]));
        }
      }

      const rows = await db
        .select({
          id: distributionViewings.id,
          dealId: distributionViewings.dealId,
          programId: distributionViewings.programId,
          developmentId: distributionViewings.developmentId,
          developmentName: developments.name,
          agentId: distributionViewings.agentId,
          managerUserId: distributionViewings.managerUserId,
          managerName: users.name,
          managerFirstName: users.firstName,
          managerLastName: users.lastName,
          managerEmail: users.email,
          buyerName: distributionDeals.buyerName,
          buyerEmail: distributionDeals.buyerEmail,
          buyerPhone: distributionDeals.buyerPhone,
          dealStage: distributionDeals.currentStage,
          scheduledStartAt: distributionViewings.scheduledStartAt,
          scheduledEndAt: distributionViewings.scheduledEndAt,
          timezone: distributionViewings.timezone,
          locationName: distributionViewings.locationName,
          status: distributionViewings.status,
          rescheduleCount: distributionViewings.rescheduleCount,
          notes: distributionViewings.notes,
          createdAt: distributionViewings.createdAt,
          updatedAt: distributionViewings.updatedAt,
        })
        .from(distributionViewings)
        .innerJoin(distributionDeals, eq(distributionViewings.dealId, distributionDeals.id))
        .innerJoin(developments, eq(distributionViewings.developmentId, developments.id))
        .innerJoin(users, eq(distributionViewings.managerUserId, users.id))
        .where(withConditions(conditions))
        .orderBy(sql`${distributionViewings.scheduledStartAt} asc`)
        .limit(input.limit);

      const userDirectory = await getUserDirectoryByIds(
        db,
        rows.map(row => Number(row.agentId)),
      );

      return rows.map(row => ({
        ...row,
        agentDisplayName:
          userDirectory.get(Number(row.agentId))?.displayName || `Referrer #${row.agentId}`,
        agentEmail: userDirectory.get(Number(row.agentId))?.email || null,
        managerDisplayName: formatUserDisplayName({
          name: row.managerName,
          firstName: row.managerFirstName,
          lastName: row.managerLastName,
          email: row.managerEmail,
        }),
        canValidate:
          row.status === 'scheduled' &&
          (row.dealStage === 'viewing_scheduled' || row.dealStage === 'viewing_completed'),
      }));
    }),

  scheduleViewing: protectedProcedure
    .input(
      z.object({
        dealId: z.number().int().positive(),
        scheduledStartAt: z.string().datetime(),
        scheduledEndAt: z.string().datetime().nullable().optional(),
        timezone: z.string().max(64).optional(),
        locationName: z.string().max(255).nullable().optional(),
        notes: z.string().max(2000).nullable().optional(),
        managerUserId: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      await assertDistributionIdentity(db, ctx.user!, 'manager');

      const deal = await getDealById(db, input.dealId);
      if (!deal) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Distribution deal not found.' });
      }
      if (deal.currentStage === 'cancelled' || deal.currentStage === 'commission_paid') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot schedule viewing for closed deals.',
        });
      }

      let managerUserId = Number(input.managerUserId || deal.managerUserId || ctx.user!.id);
      if (ctx.user!.role !== 'super_admin') {
        await assertManagerScope(db, ctx.user!.id, {
          programId: deal.programId,
          developmentId: deal.developmentId,
        });
        if (managerUserId !== ctx.user!.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Managers can only schedule viewings assigned to themselves.',
          });
        }
      } else if (input.managerUserId) {
        const [managerAssignment] = await db
          .select({ id: distributionManagerAssignments.id })
          .from(distributionManagerAssignments)
          .where(
            and(
              eq(distributionManagerAssignments.programId, deal.programId),
              eq(distributionManagerAssignments.managerUserId, managerUserId),
              eq(distributionManagerAssignments.isActive, 1),
            ),
          )
          .limit(1);
        if (!managerAssignment) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Selected manager is not actively assigned to this program.',
          });
        }
      }

      const startAt = parseIsoDateOrThrow(input.scheduledStartAt, 'scheduledStartAt');
      const endAt = input.scheduledEndAt
        ? parseIsoDateOrThrow(input.scheduledEndAt, 'scheduledEndAt')
        : null;
      if (endAt && endAt.getTime() <= startAt.getTime()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'scheduledEndAt must be after scheduledStartAt.',
        });
      }

      const existingViewing = await getViewingByDealId(db, deal.id);
      if (existingViewing?.status === 'completed') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Viewing already completed for this deal.',
        });
      }

      const nextRescheduleCount = existingViewing
        ? Number(existingViewing.rescheduleCount || 0) + 1
        : 0;
      if (nextRescheduleCount > VIEWING_RESCHEDULE_LIMIT) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Reschedule limit reached (${VIEWING_RESCHEDULE_LIMIT}).`,
        });
      }

      await db
        .insert(distributionViewings)
        .values({
          dealId: deal.id,
          programId: deal.programId,
          developmentId: deal.developmentId,
          agentId: deal.agentId,
          managerUserId,
          scheduledStartAt: normalizeDateForSql(startAt),
          scheduledEndAt: endAt ? normalizeDateForSql(endAt) : null,
          timezone: input.timezone || 'Africa/Johannesburg',
          locationName: input.locationName ?? null,
          status: 'scheduled',
          rescheduleCount: nextRescheduleCount,
          scheduledByUserId: ctx.user!.id,
          lastRescheduledBy: existingViewing ? ctx.user!.id : null,
          notes: input.notes ?? null,
        })
        .onDuplicateKeyUpdate({
          set: {
            managerUserId,
            scheduledStartAt: normalizeDateForSql(startAt),
            scheduledEndAt: endAt ? normalizeDateForSql(endAt) : null,
            timezone: input.timezone || 'Africa/Johannesburg',
            locationName: input.locationName ?? null,
            status: 'scheduled',
            rescheduleCount: nextRescheduleCount,
            lastRescheduledBy: ctx.user!.id,
            notes: input.notes ?? null,
          },
        });

      if (deal.managerUserId !== managerUserId) {
        await db
          .update(distributionDeals)
          .set({ managerUserId })
          .where(eq(distributionDeals.id, deal.id));
      }

      await db.insert(distributionDealEvents).values({
        dealId: deal.id,
        fromStage: deal.currentStage,
        toStage: deal.currentStage,
        eventType: 'note',
        actorUserId: ctx.user!.id,
        metadata: {
          source: 'manager.scheduleViewing',
          scheduledStartAt: normalizeDateForSql(startAt),
          timezone: input.timezone || 'Africa/Johannesburg',
          rescheduleCount: nextRescheduleCount,
          managerUserId,
        } as any,
        notes: input.notes ?? null,
      });

      const viewing = await getViewingByDealId(db, deal.id);
      await logDistributionAudit({
        userId: Number(ctx.user!.id),
        action: 'distribution.manager.scheduleViewing',
        targetType: 'distribution_deal',
        targetId: Number(deal.id),
        metadata: {
          scheduledStartAt: normalizeDateForSql(startAt),
          scheduledEndAt: endAt ? normalizeDateForSql(endAt) : null,
          timezone: input.timezone || 'Africa/Johannesburg',
          managerUserId,
          rescheduleCount: nextRescheduleCount,
        },
      });
      return {
        success: true,
        dealId: deal.id,
        viewing,
      };
    }),

  listValidationQueue: protectedProcedure
    .input(
      z.object({
        programId: z.number().int().positive().optional(),
        developmentId: z.number().int().positive().optional(),
        validationStatus: z.enum(VIEWING_VALIDATION_STATUS_VALUES).optional(),
        limit: z.number().int().min(1).max(500).default(200),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      await assertDistributionIdentity(db, ctx.user!, 'manager');

      const conditions: SQL[] = [
        sql`${distributionDeals.currentStage} <> 'commission_paid'`,
        sql`${distributionDeals.currentStage} <> 'cancelled'`,
      ];

      if (typeof input.programId === 'number') {
        conditions.push(eq(distributionDeals.programId, input.programId));
      }

      if (typeof input.developmentId === 'number') {
        conditions.push(eq(distributionDeals.developmentId, input.developmentId));
      }

      if (ctx.user!.role !== 'super_admin') {
        if (typeof input.programId === 'number' || typeof input.developmentId === 'number') {
          await assertManagerScope(db, ctx.user!.id, {
            programId: input.programId,
            developmentId: input.developmentId,
          });
        } else {
          const assignments = await db
            .select({ programId: distributionManagerAssignments.programId })
            .from(distributionManagerAssignments)
            .where(
              and(
                eq(distributionManagerAssignments.managerUserId, ctx.user!.id),
                eq(distributionManagerAssignments.isActive, 1),
              ),
            );

          const scopedProgramIds: number[] = Array.from(
            new Set(assignments.map(row => Number(row.programId))),
          );
          if (!scopedProgramIds.length) {
            return [];
          }

          conditions.push(inArray(distributionDeals.programId, scopedProgramIds));
        }
      }

      const deals = await db
        .select({
          dealId: distributionDeals.id,
          programId: distributionDeals.programId,
          developmentId: distributionDeals.developmentId,
          developmentName: developments.name,
          agentId: distributionDeals.agentId,
          buyerName: distributionDeals.buyerName,
          buyerEmail: distributionDeals.buyerEmail,
          buyerPhone: distributionDeals.buyerPhone,
          currentStage: distributionDeals.currentStage,
          managerUserId: distributionDeals.managerUserId,
          submittedAt: distributionDeals.submittedAt,
          updatedAt: distributionDeals.updatedAt,
        })
        .from(distributionDeals)
        .innerJoin(developments, eq(distributionDeals.developmentId, developments.id))
        .where(withConditions(conditions))
        .orderBy(desc(distributionDeals.updatedAt))
        .limit(input.limit);

      const userDirectory = await getUserDirectoryByIds(
        db,
        deals.map(deal => Number(deal.agentId)),
      );

      const latestValidationByDeal = await getLatestViewingValidationByDealIds(
        db,
        deals.map(deal => Number(deal.dealId)),
      );

      const rows = deals
        .map(deal => {
          const validation = latestValidationByDeal.get(deal.dealId);
          const validationStatus = (validation?.validationStatus ||
            'pending') as (typeof VIEWING_VALIDATION_STATUS_VALUES)[number];

          return {
            ...deal,
            agentDisplayName: userDirectory.get(Number(deal.agentId))?.displayName || null,
            agentEmail: userDirectory.get(Number(deal.agentId))?.email || null,
            validationStatus,
            validationAt: validation?.validatedAt || null,
            validationNotes: validation?.notes || null,
            attributionLockApplied: Boolean(validation?.attributionLockApplied),
            canValidate:
              deal.currentStage === 'viewing_scheduled' ||
              deal.currentStage === 'viewing_completed',
          };
        })
        .filter(row =>
          input.validationStatus ? row.validationStatus === input.validationStatus : true,
        );

      return rows;
    }),

  validateViewing: protectedProcedure
    .input(
      z.object({
        dealId: z.number().int().positive(),
        outcome: z.enum([
          'completed_proceeding',
          'completed_not_proceeding',
          'no_show',
          'cancelled',
        ]),
        notes: z.string().max(2000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      await assertDistributionIdentity(db, ctx.user!, 'manager');

      const [deal] = await db
        .select({
          id: distributionDeals.id,
          programId: distributionDeals.programId,
          developmentId: distributionDeals.developmentId,
          agentId: distributionDeals.agentId,
          managerUserId: distributionDeals.managerUserId,
          currentStage: distributionDeals.currentStage,
          attributionLockedAt: distributionDeals.attributionLockedAt,
        })
        .from(distributionDeals)
        .where(eq(distributionDeals.id, input.dealId))
        .limit(1);

      if (!deal) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Distribution deal not found.' });
      }

      if (ctx.user!.role !== 'super_admin') {
        await assertManagerScope(db, ctx.user!.id, {
          programId: deal.programId,
          developmentId: deal.developmentId,
        });
      }

      const nextStage: (typeof DISTRIBUTION_DEAL_STAGE_VALUES)[number] =
        input.outcome === 'completed_proceeding' ? 'viewing_completed' : 'cancelled';
      const attributionLockAt = deal.attributionLockedAt ?? null;
      const attributionLockApplied = Boolean(attributionLockAt);

      // Attribution lock is now set at booking (submitDeal). No lock logic here.
      await db.insert(distributionViewingValidations).values({
        dealId: deal.id,
        developmentId: deal.developmentId,
        managerUserId: ctx.user!.id,
        agentId: deal.agentId,
        validationStatus: input.outcome,
        validatedAt: sql`CURRENT_TIMESTAMP`,
        attributionLockApplied: attributionLockApplied ? 1 : 0,
        attributionLockAt,
        notes: input.notes ?? null,
      });

      const viewingStatus: (typeof DISTRIBUTION_VIEWING_STATUS_VALUES)[number] =
        input.outcome === 'no_show'
          ? 'no_show'
          : input.outcome === 'cancelled'
            ? 'cancelled'
            : 'completed';

      await db
        .update(distributionViewings)
        .set({
          status: viewingStatus,
          managerUserId: ctx.user!.id,
        })
        .where(eq(distributionViewings.dealId, deal.id));

      const dealUpdate: Record<string, unknown> = {
        currentStage: nextStage,
        managerUserId: deal.managerUserId ?? ctx.user!.id,
      };
      // Attribution lock cleanup: no longer set here (set at booking)

      await db.update(distributionDeals).set(dealUpdate).where(eq(distributionDeals.id, deal.id));

      const resolvedAttributionLockAt =
        (dealUpdate.attributionLockedAt as string | null | undefined) ?? attributionLockAt;
      const resolvedAttributionLockApplied = Boolean(resolvedAttributionLockAt);

      await db.insert(distributionDealEvents).values({
        dealId: deal.id,
        fromStage: deal.currentStage,
        toStage: nextStage,
        eventType: 'validation',
        actorUserId: ctx.user!.id,
        metadata: {
          outcome: input.outcome,
          validationStatus: input.outcome,
          attributionLockApplied: resolvedAttributionLockApplied,
          attributionLockAt: resolvedAttributionLockAt,
          nextStage,
        } as any,
        notes: input.notes ?? null,
      });

      await logDistributionAudit({
        userId: Number(ctx.user!.id),
        action: 'distribution.manager.validateViewing',
        targetType: 'distribution_deal',
        targetId: Number(deal.id),
        metadata: {
          outcome: input.outcome,
          fromStage: deal.currentStage,
          toStage: nextStage,
          attributionLockApplied: resolvedAttributionLockApplied,
          attributionLockAt: resolvedAttributionLockAt,
        },
      });

      return {
        success: true,
        dealId: deal.id,
        outcome: input.outcome,
        stage: nextStage,
        attributionLocked: resolvedAttributionLockApplied,
      };
    }),

  listPipeline: protectedProcedure.input(listDealsInput).query(async ({ ctx, input }) => {
    assertDistributionEnabled();
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    await assertDistributionIdentity(db, ctx.user!, 'manager');

    const conditions: SQL[] = [];

    if (typeof input.developmentId === 'number') {
      conditions.push(eq(distributionDeals.developmentId, input.developmentId));
    }

    if (typeof input.agentId === 'number') {
      conditions.push(eq(distributionDeals.agentId, input.agentId));
    }

    if (input.stage) {
      conditions.push(eq(distributionDeals.currentStage, input.stage));
    }

    if (ctx.user!.role !== 'super_admin') {
      if (typeof input.developmentId === 'number') {
        await assertManagerScope(db, ctx.user!.id, {
          developmentId: input.developmentId,
        });
      } else {
        const assignments = await db
          .select({ programId: distributionManagerAssignments.programId })
          .from(distributionManagerAssignments)
          .where(
            and(
              eq(distributionManagerAssignments.managerUserId, ctx.user!.id),
              eq(distributionManagerAssignments.isActive, 1),
            ),
          );

        const scopedProgramIds: number[] = Array.from(
          new Set(assignments.map(row => Number(row.programId))),
        );
        if (!scopedProgramIds.length) {
          return [];
        }

        conditions.push(inArray(distributionDeals.programId, scopedProgramIds));
      }
    }

    const rows = await db
      .select({
        id: distributionDeals.id,
        developmentId: distributionDeals.developmentId,
        developmentName: developments.name,
        agentId: distributionDeals.agentId,
        buyerName: distributionDeals.buyerName,
        buyerEmail: distributionDeals.buyerEmail,
        currentStage: distributionDeals.currentStage,
        commissionStatus: distributionDeals.commissionStatus,
        submittedAt: distributionDeals.submittedAt,
        updatedAt: distributionDeals.updatedAt,
      })
      .from(distributionDeals)
      .innerJoin(developments, eq(distributionDeals.developmentId, developments.id))
      .where(withConditions(conditions))
      .orderBy(desc(distributionDeals.updatedAt))
      .limit(input.limit);

    const referralSnapshotsByDeal = await getReferralSubmissionSnapshotByDealIds(
      db,
      rows.map(row => Number(row.id)),
    );

    const userDirectory = await getUserDirectoryByIds(
      db,
      rows.map(row => Number(row.agentId)),
    );

    return rows.map(row => ({
      ...row,
      agentDisplayName:
        userDirectory.get(Number(row.agentId))?.displayName || `Referrer #${row.agentId}`,
      agentEmail: userDirectory.get(Number(row.agentId))?.email || null,
      documentsComplete: hasCompleteDocuments(referralSnapshotsByDeal.get(Number(row.id)) || null),
    }));
  }),

  // ── Manager-controlled deal stage progression ──
  // Operator controls all forward transitions after viewing completion.
  listSubmissionQueue: protectedProcedure
    .input(
      z.object({
        programId: z.number().int().positive().optional(),
        developmentId: z.number().int().positive().optional(),
        limit: z.number().int().min(1).max(500).default(200),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      await assertDistributionIdentity(db, ctx.user!, 'manager');

      const conditions: SQL[] = [eq(distributionDeals.currentStage, 'application_submitted')];

      if (typeof input.programId === 'number') {
        conditions.push(eq(distributionDeals.programId, input.programId));
      }
      if (typeof input.developmentId === 'number') {
        conditions.push(eq(distributionDeals.developmentId, input.developmentId));
      }

      if (ctx.user!.role !== 'super_admin') {
        if (typeof input.programId === 'number' || typeof input.developmentId === 'number') {
          await assertManagerScope(db, ctx.user!.id, {
            programId: input.programId,
            developmentId: input.developmentId,
          });
        } else {
          const assignments = await db
            .select({ programId: distributionManagerAssignments.programId })
            .from(distributionManagerAssignments)
            .where(
              and(
                eq(distributionManagerAssignments.managerUserId, ctx.user!.id),
                eq(distributionManagerAssignments.isActive, 1),
              ),
            );

          const scopedProgramIds: number[] = Array.from(
            new Set(assignments.map(row => Number(row.programId))),
          );
          if (!scopedProgramIds.length) {
            return [];
          }
          conditions.push(inArray(distributionDeals.programId, scopedProgramIds));
        }
      }

      const rows = await db
        .select({
          id: distributionDeals.id,
          programId: distributionDeals.programId,
          developmentId: distributionDeals.developmentId,
          developmentName: developments.name,
          agentId: distributionDeals.agentId,
          buyerName: distributionDeals.buyerName,
          buyerEmail: distributionDeals.buyerEmail,
          buyerPhone: distributionDeals.buyerPhone,
          commissionStatus: distributionDeals.commissionStatus,
          submittedAt: distributionDeals.submittedAt,
          updatedAt: distributionDeals.updatedAt,
        })
        .from(distributionDeals)
        .innerJoin(developments, eq(distributionDeals.developmentId, developments.id))
        .where(withConditions(conditions))
        .orderBy(desc(distributionDeals.updatedAt))
        .limit(input.limit);

      const userDirectory = await getUserDirectoryByIds(
        db,
        rows.map(row => Number(row.agentId)),
      );
      const referralSnapshotsByDeal = await getReferralSubmissionSnapshotByDealIds(
        db,
        rows.map(row => Number(row.id)),
      );

      const now = Date.now();
      return rows.map(row => {
        const updatedAtMs = Date.parse(String(row.updatedAt || ''));
        const hoursInQueue = Number.isFinite(updatedAtMs)
          ? Math.max(0, Math.floor((now - updatedAtMs) / (1000 * 60 * 60)))
          : null;
        return {
          ...row,
          currentStage: 'application_submitted' as const,
          agentDisplayName:
            userDirectory.get(Number(row.agentId))?.displayName || `Referrer #${row.agentId}`,
          agentEmail: userDirectory.get(Number(row.agentId))?.email || null,
          documentsComplete: hasCompleteDocuments(referralSnapshotsByDeal.get(Number(row.id)) || null),
          hoursInQueue,
          atRisk: typeof hoursInQueue === 'number' ? hoursInQueue >= 48 : false,
        };
      });
    }),

  listSubmissionDecisionAudit: protectedProcedure
    .input(
      z.object({
        programId: z.number().int().positive().optional(),
        developmentId: z.number().int().positive().optional(),
        limit: z.number().int().min(1).max(200).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      await assertDistributionIdentity(db, ctx.user!, 'manager');

      const conditions: SQL[] = [
        eq(distributionDealEvents.eventType, 'stage_transition'),
        inArray(distributionDealEvents.toStage, ['contract_signed', 'cancelled']),
      ];

      if (typeof input.programId === 'number') {
        conditions.push(eq(distributionDeals.programId, input.programId));
      }
      if (typeof input.developmentId === 'number') {
        conditions.push(eq(distributionDeals.developmentId, input.developmentId));
      }

      if (ctx.user!.role !== 'super_admin') {
        if (typeof input.programId === 'number' || typeof input.developmentId === 'number') {
          await assertManagerScope(db, ctx.user!.id, {
            programId: input.programId,
            developmentId: input.developmentId,
          });
        } else {
          const assignments = await db
            .select({ programId: distributionManagerAssignments.programId })
            .from(distributionManagerAssignments)
            .where(
              and(
                eq(distributionManagerAssignments.managerUserId, ctx.user!.id),
                eq(distributionManagerAssignments.isActive, 1),
              ),
            );

          const scopedProgramIds: number[] = Array.from(
            new Set(assignments.map(row => Number(row.programId))),
          );
          if (!scopedProgramIds.length) {
            return [];
          }
          conditions.push(inArray(distributionDeals.programId, scopedProgramIds));
        }
      }

      const rows = await db
        .select({
          id: distributionDealEvents.id,
          dealId: distributionDealEvents.dealId,
          programId: distributionDeals.programId,
          developmentId: distributionDeals.developmentId,
          developmentName: developments.name,
          buyerName: distributionDeals.buyerName,
          fromStage: distributionDealEvents.fromStage,
          toStage: distributionDealEvents.toStage,
          eventType: distributionDealEvents.eventType,
          eventAt: distributionDealEvents.eventAt,
          notes: distributionDealEvents.notes,
          metadata: distributionDealEvents.metadata,
          actorUserId: distributionDealEvents.actorUserId,
          actorName: users.name,
          actorFirstName: users.firstName,
          actorLastName: users.lastName,
          actorEmail: users.email,
        })
        .from(distributionDealEvents)
        .innerJoin(distributionDeals, eq(distributionDealEvents.dealId, distributionDeals.id))
        .innerJoin(developments, eq(distributionDeals.developmentId, developments.id))
        .leftJoin(users, eq(distributionDealEvents.actorUserId, users.id))
        .where(withConditions(conditions))
        .orderBy(desc(distributionDealEvents.eventAt), desc(distributionDealEvents.id))
        .limit(Math.min(600, Math.max(input.limit * 3, input.limit)));

      const filteredRows = rows.filter(row => {
        const metadata = parseMetadataObject(row.metadata);
        const source = String(metadata?.source || '').trim();
        return source === 'manager.advanceDealStage';
      });

      return filteredRows.slice(0, input.limit).map(row => {
        const metadata = parseMetadataObject(row.metadata);
        const rejectionReason =
          typeof metadata?.rejectionReason === 'string' ? metadata.rejectionReason : null;
        const decision = row.toStage === 'cancelled' ? 'rejected' : 'approved';
        return {
          ...row,
          decision,
          rejectionReason,
          actorDisplayName: formatUserDisplayName({
            name: row.actorName,
            firstName: row.actorFirstName,
            lastName: row.actorLastName,
            email: row.actorEmail,
          }),
        };
      });
    }),

  dealTimeline: protectedProcedure
    .input(
      z.object({
        dealId: z.number().int().positive(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      await assertDistributionIdentity(db, ctx.user!, 'manager');

      const scopedDeal = await getDealById(db, input.dealId);
      if (!scopedDeal) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Distribution deal not found.' });
      }

      if (ctx.user!.role !== 'super_admin') {
        await assertManagerScope(db, ctx.user!.id, {
          programId: Number(scopedDeal.programId),
          developmentId: Number(scopedDeal.developmentId),
        });
      }

      const [deal] = await db
        .select({
          id: distributionDeals.id,
          programId: distributionDeals.programId,
          developmentId: distributionDeals.developmentId,
          developmentName: developments.name,
          buyerName: distributionDeals.buyerName,
          buyerEmail: distributionDeals.buyerEmail,
          buyerPhone: distributionDeals.buyerPhone,
          currentStage: distributionDeals.currentStage,
          commissionStatus: distributionDeals.commissionStatus,
          submittedAt: distributionDeals.submittedAt,
          updatedAt: distributionDeals.updatedAt,
          closedAt: distributionDeals.closedAt,
          agentId: distributionDeals.agentId,
          managerUserId: distributionDeals.managerUserId,
          managerName: users.name,
          managerFirstName: users.firstName,
          managerLastName: users.lastName,
          managerEmail: users.email,
        })
        .from(distributionDeals)
        .innerJoin(developments, eq(distributionDeals.developmentId, developments.id))
        .leftJoin(users, eq(distributionDeals.managerUserId, users.id))
        .where(eq(distributionDeals.id, input.dealId))
        .limit(1);

      if (!deal) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Distribution deal not found.' });
      }

      return await buildDealTimelinePayload(db, deal as DealTimelineDealRow);
    }),

  advanceDealStage: protectedProcedure
    .input(
      z.object({
        dealId: z.number().int().positive(),
        toStage: z.enum([
          'application_submitted',
          'contract_signed',
          'bond_approved',
          'commission_pending',
          'cancelled',
        ]),
        notes: z.string().max(2000).nullable().optional(),
        rejectionReason: z.string().max(2000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      await assertDistributionIdentity(db, ctx.user!, 'manager');

      const [deal] = await db
        .select({
          id: distributionDeals.id,
          programId: distributionDeals.programId,
          developmentId: distributionDeals.developmentId,
          agentId: distributionDeals.agentId,
          dealAmount: distributionDeals.dealAmount,
          platformAmount: distributionDeals.platformAmount,
          commissionBaseAmount: distributionDeals.commissionBaseAmount,
          referrerCommissionType: distributionDeals.referrerCommissionType,
          referrerCommissionValue: distributionDeals.referrerCommissionValue,
          referrerCommissionBasis: distributionDeals.referrerCommissionBasis,
          referrerCommissionAmount: distributionDeals.referrerCommissionAmount,
          platformCommissionType: distributionDeals.platformCommissionType,
          platformCommissionValue: distributionDeals.platformCommissionValue,
          platformCommissionBasis: distributionDeals.platformCommissionBasis,
          platformCommissionAmount: distributionDeals.platformCommissionAmount,
          snapshotVersion: distributionDeals.snapshotVersion,
          snapshotSource: distributionDeals.snapshotSource,
          currentStage: distributionDeals.currentStage,
          attributionLockedAt: distributionDeals.attributionLockedAt,
          commissionTriggerStage: distributionDeals.commissionTriggerStage,
          commissionStatus: distributionDeals.commissionStatus,
          managerUserId: distributionDeals.managerUserId,
          submittedAt: distributionDeals.submittedAt,
        })
        .from(distributionDeals)
        .where(eq(distributionDeals.id, input.dealId))
        .limit(1);

      if (!deal) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Distribution deal not found.' });
      }

      if (ctx.user!.role !== 'super_admin') {
        await assertManagerScope(db, ctx.user!.id, {
          programId: deal.programId,
          developmentId: deal.developmentId,
        });
      }

      const fromStage = deal.currentStage as DistributionDealStage;
      const toStage = input.toStage as DistributionDealStage;

      // ── Viewing expiry check ──
      // If deal is still at viewing_scheduled and TTL expired → auto-cancel
      if (fromStage === 'viewing_scheduled' && deal.submittedAt) {
        const bookingDate = new Date(deal.submittedAt);
        const expiryDate = new Date(
          bookingDate.getTime() + VIEWING_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
        );
        if (new Date() > expiryDate) {
          await db
            .update(distributionDeals)
            .set({
              currentStage: 'cancelled',
              closedAt: sql`CURRENT_TIMESTAMP`,
            })
            .where(eq(distributionDeals.id, deal.id));
          await db.insert(distributionDealEvents).values({
            dealId: deal.id,
            fromStage: 'viewing_scheduled',
            toStage: 'cancelled',
            eventType: 'system',
            actorUserId: null,
            metadata: {
              reason: 'viewing_expired',
              expiryDays: VIEWING_EXPIRY_DAYS,
            } as any,
            notes: `Auto-cancelled: viewing not completed within ${VIEWING_EXPIRY_DAYS} days.`,
          });
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: `Deal expired: viewing not completed within ${VIEWING_EXPIRY_DAYS} days. Deal auto-cancelled.`,
          });
        }
      }

      // ── Attribution null-check ──
      // Protect legacy anomalies: if lock missing on non-initial stage, reject progression.
      if (!deal.attributionLockedAt && fromStage !== 'viewing_scheduled') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Attribution lock missing. Cannot progress deal without valid attribution lock.',
        });
      }

      // ── Post-accrual cancellation guard ──
      // Once fees accrue, manager cannot cancel. Requires admin override.
      if (toStage === 'cancelled' && ACCRUAL_PROTECTED_STAGES.includes(fromStage)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot cancel after fee accrual. Requires admin override with ledger reversal.',
        });
      }

      // ── Cancellation requires rejection reason ──
      if (toStage === 'cancelled' && !input.rejectionReason) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Rejection reason is required when cancelling a deal.',
        });
      }

      // ── Validate transition ──
      const allowedNextStages = MANAGER_STAGE_TRANSITIONS[fromStage] || [];
      if (!allowedNextStages.includes(toStage)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Invalid transition from ${fromStage} to ${toStage} for manager workflow.`,
        });
      }

      const commissionStatus = deriveCommissionStatus(
        toStage,
        deal.commissionTriggerStage as 'contract_signed' | 'bond_approved',
      );

      const updatePayload: Record<string, unknown> = {
        currentStage: toStage,
        commissionStatus,
      };

      let commissionDeal = deal;
      if (toStage !== 'cancelled' && hasReachedStage(toStage, 'application_submitted')) {
        const snapshot = await ensureDealCommissionSnapshotAtSubmissionGate(db, {
          dealId: Number(deal.id),
          programId: Number(deal.programId),
          dealAmount: deal.dealAmount,
          commissionBaseAmount: deal.commissionBaseAmount,
          referrerCommissionType: deal.referrerCommissionType,
          referrerCommissionValue: deal.referrerCommissionValue,
          referrerCommissionBasis: deal.referrerCommissionBasis,
          referrerCommissionAmount: deal.referrerCommissionAmount,
          platformCommissionType: deal.platformCommissionType,
          platformCommissionValue: deal.platformCommissionValue,
          platformCommissionBasis: deal.platformCommissionBasis,
          platformCommissionAmount: deal.platformCommissionAmount,
          snapshotVersion: deal.snapshotVersion,
          snapshotSource: deal.snapshotSource,
        });
        commissionDeal = {
          ...deal,
          ...snapshot,
        };

        if (!hasLockedCommissionSnapshot(commissionDeal)) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message:
              'Commission snapshot is not locked. Resolve commission snapshot before advancing this deal stage.',
          });
        }
      }

      if (toStage === 'cancelled') {
        updatePayload.closedAt = sql`CURRENT_TIMESTAMP`;
      }

      await db
        .update(distributionDeals)
        .set(updatePayload)
        .where(eq(distributionDeals.id, deal.id));

      await ensureCommissionEntryForDeal({
        deal: {
          id: Number(commissionDeal.id),
          programId: Number(commissionDeal.programId),
          developmentId: Number(commissionDeal.developmentId),
          agentId: Number(commissionDeal.agentId),
          dealAmount: toNumberOrNull(commissionDeal.dealAmount),
          platformAmount: toNumberOrNull(commissionDeal.platformAmount),
          commissionBaseAmount: toNumberOrNull(commissionDeal.commissionBaseAmount),
          referrerCommissionType: commissionDeal.referrerCommissionType as ProgramCommissionType | null,
          referrerCommissionValue: toNumberOrNull(commissionDeal.referrerCommissionValue),
          referrerCommissionBasis: commissionDeal.referrerCommissionBasis as ProgramCommissionBasis | null,
          referrerCommissionAmount: toNumberOrNull(commissionDeal.referrerCommissionAmount),
          platformCommissionType: commissionDeal.platformCommissionType as ProgramCommissionType | null,
          platformCommissionValue: toNumberOrNull(commissionDeal.platformCommissionValue),
          platformCommissionBasis: commissionDeal.platformCommissionBasis as ProgramCommissionBasis | null,
          platformCommissionAmount: toNumberOrNull(commissionDeal.platformCommissionAmount),
          commissionTriggerStage: commissionDeal.commissionTriggerStage as
            | 'contract_signed'
            | 'bond_approved',
        },
        transitionToStage: toStage,
        actorUserId: ctx.user!.id,
        source: 'manager.advanceDealStage',
        deps: {
          findExistingEntry: async (dealId, triggerStage) => {
            const [row] = await db
              .select({ id: distributionCommissionEntries.id })
              .from(distributionCommissionEntries)
              .where(
                and(
                  eq(distributionCommissionEntries.dealId, dealId),
                  eq(distributionCommissionEntries.triggerStage, triggerStage),
                ),
              )
              .limit(1);
            return row ? { id: Number(row.id) } : null;
          },
          getProgramDefaults: async programId => {
            const [program] = await db
              .select({
                commissionModel: distributionPrograms.commissionModel,
                defaultCommissionPercent: distributionPrograms.defaultCommissionPercent,
                defaultCommissionAmount: distributionPrograms.defaultCommissionAmount,
                referrerCommissionType: distributionPrograms.referrerCommissionType,
                referrerCommissionValue: distributionPrograms.referrerCommissionValue,
                referrerCommissionBasis: distributionPrograms.referrerCommissionBasis,
                platformCommissionType: distributionPrograms.platformCommissionType,
                platformCommissionValue: distributionPrograms.platformCommissionValue,
                platformCommissionBasis: distributionPrograms.platformCommissionBasis,
              })
              .from(distributionPrograms)
              .where(eq(distributionPrograms.id, programId))
              .limit(1);
            return program || null;
          },
          insertEntry: async payload => {
            await db.insert(distributionCommissionEntries).values(payload);
          },
          insertLedgerEntry: async payload => {
            await db.insert(distributionCommissionLedger).values({
              distributionDealId: payload.distributionDealId,
              recipientId: payload.recipientId,
              role: payload.role,
              percentage:
                typeof payload.percentage === 'number' ? payload.percentage.toString() : null,
              calculatedAmount: payload.calculatedAmount,
              currency: payload.currency,
              calculationHash: payload.calculationHash,
              calculationInput: payload.calculationInput as any,
            });
          },
          setDealCommissionPending: async dealId => {
            await db
              .update(distributionDeals)
              .set({ commissionStatus: 'pending' })
              .where(eq(distributionDeals.id, dealId));
          },
          insertCommissionCreatedEvent: async ({ dealId, toStage, actorUserId, metadata }) => {
            await db.insert(distributionDealEvents).values({
              dealId,
              fromStage,
              toStage,
              eventType: 'system',
              actorUserId,
              metadata: metadata as any,
              notes: 'Commission entry created from stage transition.',
            });
          },
        },
      });

      await db.insert(distributionDealEvents).values({
        dealId: deal.id,
        fromStage,
        toStage,
        eventType: 'stage_transition',
        actorUserId: ctx.user!.id,
        metadata: {
          source: 'manager.advanceDealStage',
          previousCommissionStatus: deal.commissionStatus,
          nextCommissionStatus: commissionStatus,
          commissionSnapshotLocked:
            toStage !== 'cancelled' && hasReachedStage(toStage, 'application_submitted'),
          rejectionReason: input.rejectionReason ?? null,
        } as any,
        notes: input.notes ?? null,
      });

      await logDistributionAudit({
        userId: Number(ctx.user!.id),
        action: 'distribution.manager.advanceDealStage',
        targetType: 'distribution_deal',
        targetId: Number(deal.id),
        metadata: {
          fromStage,
          toStage,
          previousCommissionStatus: deal.commissionStatus,
          nextCommissionStatus: commissionStatus,
          rejectionReason: input.rejectionReason ?? null,
          commissionSnapshotLocked:
            toStage !== 'cancelled' && hasReachedStage(toStage, 'application_submitted'),
        },
      });

      return {
        success: true,
        dealId: deal.id,
        stage: toStage,
        commissionStatus,
      };
    }),
});

const referrerDistributionRouter = router({
  status: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    if (!ENV.distributionNetworkEnabled) {
      return {
        hasIdentity: false,
        hasAccess: false,
        accessCount: 0,
      };
    }

    const agentId = Number(ctx.user!.id);
    const hasIdentity = await hasActiveDistributionIdentity(db, agentId, 'referrer');
    if (!hasIdentity) {
      return {
        hasIdentity: false,
        hasAccess: false,
        accessCount: 0,
      };
    }

      const [accessCountRow] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(distributionAgentAccess)
        .innerJoin(
          distributionPrograms,
          eq(distributionAgentAccess.programId, distributionPrograms.id),
        )
        .where(
          and(
            eq(distributionAgentAccess.agentId, agentId),
            eq(distributionPrograms.isActive, 1),
            eq(distributionPrograms.isReferralEnabled, 1),
            sql`${distributionAgentAccess.accessStatus} <> 'revoked'`,
          ),
        );

    const accessCount = Number(accessCountRow?.count || 0);
    return {
      hasIdentity: true,
      hasAccess: accessCount > 0,
      accessCount,
    };
  }),

  myAccess: protectedProcedure
    .input(
      z
        .object({
          includePaused: z.boolean().default(true),
          includeRevoked: z.boolean().default(false),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await assertDistributionIdentity(db, ctx.user!, 'referrer');
      const agentId = Number(ctx.user!.id);

      const includePaused = input?.includePaused ?? true;
      const includeRevoked = input?.includeRevoked ?? false;

      const conditions: SQL[] = [
        eq(distributionAgentAccess.agentId, agentId),
        eq(distributionPrograms.isActive, 1),
        eq(distributionPrograms.isReferralEnabled, 1),
      ];

      if (!includeRevoked) {
        conditions.push(sql`${distributionAgentAccess.accessStatus} <> 'revoked'`);
      }

      if (!includePaused) {
        conditions.push(eq(distributionAgentAccess.accessStatus, 'active'));
      }

      const rows = await db
        .select({
          id: distributionAgentAccess.id,
          programId: distributionAgentAccess.programId,
          developmentId: distributionAgentAccess.developmentId,
          developmentName: developments.name,
          suburb: developments.suburb,
          city: developments.city,
          province: developments.province,
          address: developments.address,
          description: developments.description,
          amenities: developments.amenities,
          features: developments.features,
          developmentImages: developments.images,
          developmentVideos: developments.videos,
          developmentFloorPlans: developments.floorPlans,
          developmentBrochures: developments.brochures,
          developmentStatus: developments.status,
          priceFrom: developments.priceFrom,
          priceTo: developments.priceTo,
          minTierRequired: distributionAgentAccess.minTierRequired,
          accessStatus: distributionAgentAccess.accessStatus,
          notes: distributionAgentAccess.notes,
          grantedAt: distributionAgentAccess.grantedAt,
          revokedAt: distributionAgentAccess.revokedAt,
          programIsActive: distributionPrograms.isActive,
          isReferralEnabled: distributionPrograms.isReferralEnabled,
          commissionModel: distributionPrograms.commissionModel,
          defaultCommissionPercent: distributionPrograms.defaultCommissionPercent,
          defaultCommissionAmount: distributionPrograms.defaultCommissionAmount,
          referrerCommissionType: distributionPrograms.referrerCommissionType,
          referrerCommissionValue: distributionPrograms.referrerCommissionValue,
          referrerCommissionBasis: distributionPrograms.referrerCommissionBasis,
          tierAccessPolicy: distributionPrograms.tierAccessPolicy,
        })
        .from(distributionAgentAccess)
        .innerJoin(
          distributionPrograms,
          eq(distributionAgentAccess.programId, distributionPrograms.id),
        )
        .innerJoin(developments, eq(distributionAgentAccess.developmentId, developments.id))
        .where(withConditions(conditions))
        .orderBy(desc(distributionAgentAccess.updatedAt));

      const workflowSummaryByProgram = await getWorkflowSummaryByProgramIds(
        db,
        rows.map(row => Number(row.programId)),
      );

      const tierByAgentId = await getCurrentTierByAgentIds(db, [agentId]);
      const currentTier = (tierByAgentId.get(agentId) || null) as DistributionTier | null;
      const developmentIds: number[] = Array.from(
        new Set(
          rows
            .map(row => Number(row.developmentId))
            .filter(value => Number.isFinite(value) && value > 0),
        ),
      );
      const unitTypeRows = developmentIds.length
        ? await db
            .select({
              developmentId: unitTypes.developmentId,
              name: unitTypes.name,
              displayOrder: unitTypes.displayOrder,
              bedrooms: unitTypes.bedrooms,
              bathrooms: unitTypes.bathrooms,
              unitSize: unitTypes.unitSize,
              yardSize: unitTypes.yardSize,
              priceFrom: unitTypes.priceFrom,
              priceTo: unitTypes.priceTo,
              basePriceFrom: unitTypes.basePriceFrom,
              basePriceTo: unitTypes.basePriceTo,
              isActive: unitTypes.isActive,
            })
            .from(unitTypes)
            .where(and(inArray(unitTypes.developmentId, developmentIds), eq(unitTypes.isActive, 1)))
            .orderBy(unitTypes.displayOrder, unitTypes.name)
        : [];

      const unitTypesByDevelopment = new Map<
        number,
        Array<{
          name: string;
          isActive: boolean;
          bedrooms: number | null;
          bathrooms: number | null;
          unitSize: number | null;
          yardSize: number | null;
          priceFrom: number | null;
          priceTo: number | null;
        }>
      >();
      for (const row of unitTypeRows) {
        const developmentId = Number(row.developmentId);
        const current = unitTypesByDevelopment.get(developmentId) || [];
        const name = String(row.name || '').trim();
        if (!name) continue;
        const resolvedPriceFrom =
          toNumberOrNull(row.priceFrom) ?? toNumberOrNull(row.basePriceFrom) ?? null;
        const resolvedPriceTo =
          toNumberOrNull(row.priceTo) ??
          toNumberOrNull(row.basePriceTo) ??
          resolvedPriceFrom ??
          null;
        current.push({
          name,
          isActive: boolFromTinyInt(row.isActive),
          bedrooms: toNumberOrNull(row.bedrooms),
          bathrooms: toNumberOrNull(row.bathrooms),
          unitSize: toNumberOrNull(row.unitSize),
          yardSize: toNumberOrNull(row.yardSize),
          priceFrom: resolvedPriceFrom,
          priceTo: resolvedPriceTo,
        });
        unitTypesByDevelopment.set(developmentId, current);
      }

      return rows.map(row => {
        const minTierRequired = row.minTierRequired as DistributionTier;
        const developmentId = Number(row.developmentId);
        const workflowSummary =
          workflowSummaryByProgram.get(Number(row.programId)) ||
          resolveFallbackWorkflowSummary(String(row.developmentName || ''));
        const referrerCommission = resolveReferrerCommissionTrackFromProgramRow(row);
        const referrerLegacyCommission = toLegacyProgramCommissionFields(referrerCommission);
        const baseAmount =
          Math.max(
            0,
            toNumberOrNull(row.priceFrom) ?? toNumberOrNull(row.priceTo) ?? 0,
          ) || 0;
        const estimatedAmount = estimateCommissionAmountFromTrack(referrerCommission, baseAmount);

        return {
          ...row,
          agentId,
          currentTier,
          minTierRequired,
          tierEligible: isTierEligible(currentTier, minTierRequired),
          programIsActive: boolFromTinyInt(row.programIsActive),
          isReferralEnabled: boolFromTinyInt(row.isReferralEnabled),
          suburb: row.suburb || null,
          address: row.address || null,
          description: row.description || null,
          amenities: row.amenities || null,
          features: row.features || null,
          imageUrl: extractFirstImageUrl(row.developmentImages),
          videos: row.developmentVideos || null,
          floorPlans: row.developmentFloorPlans || null,
          brochures: row.developmentBrochures || null,
          developmentStatus: row.developmentStatus || null,
          unitTypes: unitTypesByDevelopment.get(developmentId) || [],
          priceFrom: row.priceFrom ? Number(row.priceFrom) : null,
          priceTo: row.priceTo ? Number(row.priceTo) : null,
          commissionModel: referrerLegacyCommission.commissionModel,
          defaultCommissionPercent: referrerLegacyCommission.defaultCommissionPercent,
          defaultCommissionAmount: referrerLegacyCommission.defaultCommissionAmount,
          referrerCommission: {
            ...referrerCommission,
            estimatedAmount,
          },
          workflowSummary,
        };
      });
    }),

  listSubmissionChecklist: protectedProcedure
    .input(z.object({ programId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await assertDistributionIdentity(db, ctx.user!, 'referrer');
      const agentId = Number(ctx.user!.id);

      const [accessRow] = await db
        .select({ id: distributionAgentAccess.id })
        .from(distributionAgentAccess)
        .innerJoin(distributionPrograms, eq(distributionAgentAccess.programId, distributionPrograms.id))
        .where(
          and(
            eq(distributionAgentAccess.agentId, agentId),
            eq(distributionAgentAccess.programId, input.programId),
            eq(distributionPrograms.isActive, 1),
            eq(distributionPrograms.isReferralEnabled, 1),
            sql`${distributionAgentAccess.accessStatus} <> 'revoked'`,
          ),
        )
        .limit(1);

      if (!accessRow) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to this program.' });
      }

      const [workflow] = await db
        .select({
          id: distributionProgramWorkflows.id,
          workflowKey: distributionProgramWorkflows.workflowKey,
          workflowName: distributionProgramWorkflows.workflowName,
        })
        .from(distributionProgramWorkflows)
        .where(eq(distributionProgramWorkflows.programId, input.programId))
        .limit(1);

      if (!workflow) {
        // Scaffolding should exist, but keep the UI resilient.
        return {
          workflow: {
            id: 0,
            workflowKey: 'referral_default',
            workflowName: 'Referral Workflow',
          },
          items: [],
        };
      }

      const rows = await db
        .select({
          id: distributionProgramRequiredDocuments.id,
          documentKey: distributionProgramRequiredDocuments.documentKey,
          documentLabel: distributionProgramRequiredDocuments.documentLabel,
          isRequired: distributionProgramRequiredDocuments.isRequired,
          appliesWhen: distributionProgramRequiredDocuments.appliesWhen,
          displayOrder: distributionProgramRequiredDocuments.displayOrder,
          notes: distributionProgramRequiredDocuments.notes,
          updatedAt: distributionProgramRequiredDocuments.updatedAt,
        })
        .from(distributionProgramRequiredDocuments)
        .where(eq(distributionProgramRequiredDocuments.workflowId, Number(workflow.id)))
        .orderBy(distributionProgramRequiredDocuments.displayOrder, distributionProgramRequiredDocuments.id);

      return {
        workflow: {
          id: Number(workflow.id),
          workflowKey: String(workflow.workflowKey || ''),
          workflowName: String(workflow.workflowName || 'Referral Workflow'),
        },
        items: rows.map(row => ({
          id: Number(row.id),
          documentKey: String(row.documentKey || ''),
          documentLabel: String(row.documentLabel || ''),
          isRequired: boolFromTinyInt(row.isRequired),
          appliesWhen: row.appliesWhen ? String(row.appliesWhen) : null,
          displayOrder: Number(row.displayOrder || 0),
          notes: row.notes ? String(row.notes) : null,
          updatedAt: row.updatedAt || null,
        })),
      };
    }),

  myViewings: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(DISTRIBUTION_VIEWING_STATUS_VALUES).optional(),
          includePast: z.boolean().default(false),
          limit: z.number().int().min(1).max(500).default(100),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await assertDistributionIdentity(db, ctx.user!, 'referrer');
      const agentId = Number(ctx.user!.id);

      const status = input?.status;
      const includePast = input?.includePast ?? false;
      const limit = input?.limit ?? 100;
      const conditions: SQL[] = [eq(distributionViewings.agentId, agentId)];
      if (status) {
        conditions.push(eq(distributionViewings.status, status));
      }
      if (!includePast) {
        conditions.push(sql`${distributionViewings.scheduledStartAt} >= CURRENT_TIMESTAMP`);
      }

      const rows = await db
        .select({
          id: distributionViewings.id,
          dealId: distributionViewings.dealId,
          programId: distributionViewings.programId,
          developmentId: distributionViewings.developmentId,
          developmentName: developments.name,
          managerUserId: distributionViewings.managerUserId,
          managerName: users.name,
          managerFirstName: users.firstName,
          managerLastName: users.lastName,
          managerEmail: users.email,
          buyerName: distributionDeals.buyerName,
          buyerEmail: distributionDeals.buyerEmail,
          buyerPhone: distributionDeals.buyerPhone,
          dealStage: distributionDeals.currentStage,
          scheduledStartAt: distributionViewings.scheduledStartAt,
          scheduledEndAt: distributionViewings.scheduledEndAt,
          timezone: distributionViewings.timezone,
          locationName: distributionViewings.locationName,
          status: distributionViewings.status,
          rescheduleCount: distributionViewings.rescheduleCount,
          notes: distributionViewings.notes,
          updatedAt: distributionViewings.updatedAt,
        })
        .from(distributionViewings)
        .innerJoin(distributionDeals, eq(distributionViewings.dealId, distributionDeals.id))
        .innerJoin(developments, eq(distributionViewings.developmentId, developments.id))
        .innerJoin(users, eq(distributionViewings.managerUserId, users.id))
        .where(withConditions(conditions))
        .orderBy(sql`${distributionViewings.scheduledStartAt} asc`)
        .limit(limit);

      const lockDeadline = dateHoursFromNow(VIEWING_RESCHEDULE_LOCK_HOURS).getTime();
      return rows.map(row => {
        const scheduledStartMs = Date.parse(String(row.scheduledStartAt || ''));
        const canReschedule =
          row.status === 'scheduled' &&
          Number(row.rescheduleCount || 0) < VIEWING_RESCHEDULE_LIMIT &&
          Number.isFinite(scheduledStartMs) &&
          scheduledStartMs >= lockDeadline;

        return {
          ...row,
          managerDisplayName: formatUserDisplayName({
            name: row.managerName,
            firstName: row.managerFirstName,
            lastName: row.managerLastName,
            email: row.managerEmail,
          }),
          canReschedule,
          rescheduleLimit: VIEWING_RESCHEDULE_LIMIT,
          rescheduleLockHours: VIEWING_RESCHEDULE_LOCK_HOURS,
        };
      });
    }),

  rescheduleViewing: protectedProcedure
    .input(
      z.object({
        viewingId: z.number().int().positive(),
        scheduledStartAt: z.string().datetime(),
        scheduledEndAt: z.string().datetime().nullable().optional(),
        timezone: z.string().max(64).optional(),
        notes: z.string().max(2000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await assertDistributionIdentity(db, ctx.user!, 'referrer');
      const agentId = Number(ctx.user!.id);

      const viewing = await getViewingById(db, input.viewingId);
      if (!viewing || Number(viewing.agentId) !== Number(agentId)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to reschedule this viewing.',
        });
      }
      if (viewing.status !== 'scheduled') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only scheduled viewings can be rescheduled.',
        });
      }

      const currentRescheduleCount = Number(viewing.rescheduleCount || 0);
      if (currentRescheduleCount >= VIEWING_RESCHEDULE_LIMIT) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Reschedule limit reached (${VIEWING_RESCHEDULE_LIMIT}).`,
        });
      }

      const nowLockBoundary = dateHoursFromNow(VIEWING_RESCHEDULE_LOCK_HOURS).getTime();
      const currentStartMs = Date.parse(String(viewing.scheduledStartAt || ''));
      if (!Number.isFinite(currentStartMs) || currentStartMs < nowLockBoundary) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Rescheduling is locked within ${VIEWING_RESCHEDULE_LOCK_HOURS} hours of the appointment.`,
        });
      }

      const nextStartAt = parseIsoDateOrThrow(input.scheduledStartAt, 'scheduledStartAt');
      if (nextStartAt.getTime() < nowLockBoundary) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `New viewing time must be at least ${VIEWING_RESCHEDULE_LOCK_HOURS} hours from now.`,
        });
      }
      const nextEndAt = input.scheduledEndAt
        ? parseIsoDateOrThrow(input.scheduledEndAt, 'scheduledEndAt')
        : null;
      if (nextEndAt && nextEndAt.getTime() <= nextStartAt.getTime()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'scheduledEndAt must be after scheduledStartAt.',
        });
      }

      const nextRescheduleCount = currentRescheduleCount + 1;
      await db
        .update(distributionViewings)
        .set({
          scheduledStartAt: normalizeDateForSql(nextStartAt),
          scheduledEndAt: nextEndAt ? normalizeDateForSql(nextEndAt) : null,
          timezone: input.timezone || viewing.timezone || 'Africa/Johannesburg',
          rescheduleCount: nextRescheduleCount,
          lastRescheduledBy: ctx.user!.id,
          notes: input.notes ?? viewing.notes ?? null,
        })
        .where(eq(distributionViewings.id, viewing.id));

      await db.insert(distributionDealEvents).values({
        dealId: viewing.dealId,
        fromStage: null,
        toStage: 'viewing_scheduled',
        eventType: 'note',
        actorUserId: ctx.user!.id,
        metadata: {
          source: 'referrer.rescheduleViewing',
          viewingId: viewing.id,
          rescheduleCount: nextRescheduleCount,
          scheduledStartAt: normalizeDateForSql(nextStartAt),
        } as any,
        notes: input.notes ?? null,
      });

      return {
        success: true,
        viewingId: viewing.id,
        rescheduleCount: nextRescheduleCount,
      };
    }),

  submitDeal: protectedProcedure
    .input(
      z.object({
        programId: z.number().int().positive(),
        buyerName: z.string().trim().min(2).max(200),
        buyerEmail: z.string().email().max(320).nullable().optional(),
        buyerPhone: z.string().trim().max(50).nullable().optional(),
        externalRef: z.string().trim().max(100).nullable().optional(),
        notes: z.string().max(2000).nullable().optional(),
        referralContext: z
          .object({
            prospect: z
              .object({
                grossMonthlyIncome: z.number().nonnegative().nullable().optional(),
                grossMonthlyIncomeRange: z.string().trim().max(100).nullable().optional(),
                notes: z.string().max(2000).nullable().optional(),
              })
              .optional(),
            viewingSchedule: z
              .object({
                scheduledStartAt: z.string().datetime(),
                scheduledEndAt: z.string().datetime().nullable().optional(),
                timezone: z.string().max(64).optional(),
                locationName: z.string().max(255).nullable().optional(),
                notes: z.string().max(2000).nullable().optional(),
              })
              .optional(),
            documentChecklist: z
              .object({
                idUploaded: z.boolean().optional(),
                payslipsUploaded: z.boolean().optional(),
                bankStatementsUploaded: z.boolean().optional(),
                additionalRequiredDocuments: z.array(z.string().trim().max(120)).optional(),
                additionalDocumentsUploaded: z.boolean().optional(),
              })
              .optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await assertDistributionIdentity(db, ctx.user!, 'referrer');
      const agentId = Number(ctx.user!.id);

      const program = await getProgramById(db, input.programId);
      if (!program) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Distribution program not found.' });
      }
      if (!boolFromTinyInt(program.isActive)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Selected program is inactive.',
        });
      }

      const access = await getActiveAgentAccessForProgram(db, input.programId, agentId);
      if (!access || access.accessStatus !== 'active') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have active distribution access to this program.',
        });
      }

      const currentTier = (await getCurrentTierByAgentIds(db, [agentId])).get(agentId) || null;
      const minTierRequired = access.minTierRequired as DistributionTier;
      if (!isTierEligible(currentTier as DistributionTier | null, minTierRequired)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Your current tier does not meet program access requirements.',
        });
      }

      await assertDevelopmentSubmissionEligible({
        db,
        developmentId: Number(program.developmentId),
        actor: { role: 'referrer', userId: agentId },
        channel: 'submission',
      });

      const referrerCommissionTrack = resolveReferrerCommissionTrackFromProgramRow(program);
      const platformCommissionTrack = resolvePlatformCommissionTrackFromProgramRow(
        program,
        referrerCommissionTrack,
      );
      const commissionBaseAmountPreview =
        Math.max(
          0,
          toNumberOrNull(program.developmentPriceFrom) ??
            toNumberOrNull(program.developmentPriceTo) ??
            0,
        ) || 0;
      const referrerCommissionEstimate = estimateCommissionAmountFromTrack(
        referrerCommissionTrack,
        commissionBaseAmountPreview,
      );
      const platformCommissionEstimate = estimateCommissionAmountFromTrack(
        platformCommissionTrack,
        commissionBaseAmountPreview,
      );
      const managerUserId = await getPrimaryManagerUserIdForProgram(db, input.programId);
      const normalizedExternalRef = input.externalRef?.trim() || null;
      const normalizedReferralContext = input.referralContext
        ? {
            prospect: input.referralContext.prospect
              ? {
                  grossMonthlyIncome:
                    typeof input.referralContext.prospect.grossMonthlyIncome === 'number'
                      ? input.referralContext.prospect.grossMonthlyIncome
                      : null,
                  grossMonthlyIncomeRange:
                    input.referralContext.prospect.grossMonthlyIncomeRange?.trim() || null,
                  notes: input.referralContext.prospect.notes ?? null,
                }
              : null,
            viewingSchedule: input.referralContext.viewingSchedule
              ? {
                  scheduledStartAt: input.referralContext.viewingSchedule.scheduledStartAt,
                  scheduledEndAt: input.referralContext.viewingSchedule.scheduledEndAt ?? null,
                  timezone: input.referralContext.viewingSchedule.timezone || 'Africa/Johannesburg',
                  locationName: input.referralContext.viewingSchedule.locationName ?? null,
                  notes: input.referralContext.viewingSchedule.notes ?? null,
                }
              : null,
            documentChecklist: input.referralContext.documentChecklist
              ? {
                  idUploaded: Boolean(input.referralContext.documentChecklist.idUploaded),
                  payslipsUploaded: Boolean(
                    input.referralContext.documentChecklist.payslipsUploaded,
                  ),
                  bankStatementsUploaded: Boolean(
                    input.referralContext.documentChecklist.bankStatementsUploaded,
                  ),
                  additionalRequiredDocuments: (
                    input.referralContext.documentChecklist.additionalRequiredDocuments || []
                  )
                    .map(doc => String(doc || '').trim())
                    .filter(Boolean),
                  additionalDocumentsUploaded: Boolean(
                    input.referralContext.documentChecklist.additionalDocumentsUploaded,
                  ),
                }
              : null,
          }
        : null;

      const scheduledViewingStartAt = normalizedReferralContext?.viewingSchedule?.scheduledStartAt
        ? parseIsoDateOrThrow(
            normalizedReferralContext.viewingSchedule.scheduledStartAt,
            'referralContext.viewingSchedule.scheduledStartAt',
          )
        : null;
      const scheduledViewingEndAt = normalizedReferralContext?.viewingSchedule?.scheduledEndAt
        ? parseIsoDateOrThrow(
            normalizedReferralContext.viewingSchedule.scheduledEndAt,
            'referralContext.viewingSchedule.scheduledEndAt',
          )
        : null;
      if (scheduledViewingStartAt && scheduledViewingEndAt) {
        if (scheduledViewingEndAt.getTime() <= scheduledViewingStartAt.getTime()) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message:
              'referralContext.viewingSchedule.scheduledEndAt must be after scheduledStartAt.',
          });
        }
      }
      if (scheduledViewingStartAt && !managerUserId) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'No active manager assigned for this program. Unable to schedule viewing.',
        });
      }

      // ── Deterministic duplicate check: email OR phone per development ──
      // Excludes closed deals so historical wins do not permanently block re-referrals.
      if (input.buyerEmail || input.buyerPhone) {
        const orConditions: SQL[] = [];
        if (input.buyerEmail) {
          orConditions.push(
            sql`LOWER(${distributionDeals.buyerEmail}) = LOWER(${input.buyerEmail.trim()})`,
          );
        }
        if (input.buyerPhone) {
          const normalizedPhone = input.buyerPhone.replace(/[\s\-()]/g, '');
          orConditions.push(
            sql`REPLACE(REPLACE(REPLACE(REPLACE(${distributionDeals.buyerPhone},' ',''),'-',''),'(',''),')','') = ${normalizedPhone}`,
          );
        }

        const [existingDeal] = await db
          .select({ id: distributionDeals.id, agentId: distributionDeals.agentId })
          .from(distributionDeals)
          .where(
            and(
              eq(distributionDeals.developmentId, program.developmentId),
              sql`${distributionDeals.currentStage} NOT IN ('cancelled', 'commission_paid')`,
              sql`(${sql.join(orConditions, sql` OR `)})`,
            ),
          )
          .limit(1);

        if (existingDeal) {
          throw new TRPCError({
            code: 'CONFLICT',
            message:
              'A deal already exists for this buyer on the same development. First valid submission wins.',
          });
        }
      }

      let insertedDealId = 0;
      try {
        const [insertResult] = await db.insert(distributionDeals).values({
          programId: input.programId,
          developmentId: program.developmentId,
          agentId,
          managerUserId,
          externalRef: normalizedExternalRef,
          buyerName: input.buyerName.trim(),
          buyerEmail: input.buyerEmail ?? null,
          buyerPhone: input.buyerPhone ?? null,
          commissionBaseAmount: commissionBaseAmountPreview,
          referrerCommissionType: referrerCommissionTrack.type,
          referrerCommissionValue: referrerCommissionTrack.value,
          referrerCommissionBasis: referrerCommissionTrack.basis,
          referrerCommissionAmount: referrerCommissionEstimate,
          platformCommissionType: platformCommissionTrack.type,
          platformCommissionValue: platformCommissionTrack.value,
          platformCommissionBasis: platformCommissionTrack.basis,
          platformCommissionAmount: platformCommissionEstimate,
          snapshotVersion: 1,
          snapshotSource: 'submission_gate',
          currentStage: 'application_submitted',
          commissionStatus: 'not_ready',
        });
        insertedDealId = Number((insertResult as any).insertId || 0);
      } catch (error: any) {
        if (
          String(error?.message || '')
            .toLowerCase()
            .includes('ux_distribution_deal_external_ref')
        ) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'externalRef already exists for another deal.',
          });
        }
        throw error;
      }

      if (insertedDealId > 0) {
        // ── Attribution lock at booking (viewing_booked) ──
        // Deal ownership starts at submission. No path bypasses booked viewing.
        await db
          .update(distributionDeals)
          .set({
            attributionLockedAt: sql`CURRENT_TIMESTAMP`,
            attributionLockedBy: ctx.user!.id,
          })
          .where(eq(distributionDeals.id, insertedDealId));

        if (scheduledViewingStartAt && managerUserId) {
          await db.insert(distributionViewings).values({
            dealId: insertedDealId,
            programId: input.programId,
            developmentId: program.developmentId,
            agentId,
            managerUserId,
            scheduledStartAt: normalizeDateForSql(scheduledViewingStartAt),
            scheduledEndAt: scheduledViewingEndAt
              ? normalizeDateForSql(scheduledViewingEndAt)
              : null,
            timezone: normalizedReferralContext?.viewingSchedule?.timezone || 'Africa/Johannesburg',
            locationName: normalizedReferralContext?.viewingSchedule?.locationName ?? null,
            status: 'scheduled',
            rescheduleCount: 0,
            scheduledByUserId: ctx.user!.id,
            notes: normalizedReferralContext?.viewingSchedule?.notes ?? input.notes ?? null,
          });
        }

        await db.insert(distributionDealEvents).values({
          dealId: insertedDealId,
          fromStage: null,
          toStage: 'application_submitted',
          eventType: 'system',
          actorUserId: ctx.user!.id,
          metadata: {
            submittedVia: 'referrer.submitDeal',
            managerAssigned: managerUserId,
            programId: input.programId,
            attributionLockedAtBooking: true,
            viewingScheduled: Boolean(scheduledViewingStartAt),
            referrerCommissionPreview: {
              type: referrerCommissionTrack.type,
              value: referrerCommissionTrack.value,
              basis: referrerCommissionTrack.basis,
              estimatedAmount: referrerCommissionEstimate,
              baseAmount: commissionBaseAmountPreview,
            },
            platformCommissionPreview: {
              type: platformCommissionTrack.type,
              value: platformCommissionTrack.value,
              basis: platformCommissionTrack.basis,
              estimatedAmount: platformCommissionEstimate,
              baseAmount: commissionBaseAmountPreview,
            },
            commissionSnapshotLocked: true,
            commissionSnapshotSource: 'submission_gate',
            referralContext: normalizedReferralContext,
          } as any,
          notes: input.notes ?? null,
        });

        await logDistributionAudit({
          userId: Number(ctx.user!.id),
          action: 'distribution.referrer.submitDeal',
          targetType: 'distribution_deal',
          targetId: insertedDealId,
          metadata: {
            programId: Number(input.programId),
            developmentId: Number(program.developmentId),
            stage: 'application_submitted',
            commissionSnapshotLocked: true,
            commissionBaseAmount: commissionBaseAmountPreview,
            referrerCommissionAmount: referrerCommissionEstimate,
            platformCommissionAmount: platformCommissionEstimate,
          },
        });
      }

      return {
        success: true,
        dealId: insertedDealId,
        stage: 'application_submitted' as const,
      };
    }),

  advanceDealStage: protectedProcedure
    .input(
      z.object({
        dealId: z.number().int().positive(),
        toStage: z.enum(['cancelled']), // Referrer: cancel-only. Forward progression is manager-controlled.
        notes: z.string().max(2000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await assertDistributionIdentity(db, ctx.user!, 'referrer');
      const agentId = Number(ctx.user!.id);

      const deal = await getDealById(db, input.dealId);
      if (!deal || Number(deal.agentId) !== Number(agentId)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to transition this deal.',
        });
      }

      const fromStage = deal.currentStage as DistributionDealStage;
      const toStage = 'cancelled' as DistributionDealStage;

      // Referrer: cancel-only. All forward progression is manager-controlled.
      if (input.toStage !== 'cancelled') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Referrer can only cancel deals. Forward progression is manager-controlled.',
        });
      }

      if (fromStage === 'cancelled') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Deal is already cancelled.',
        });
      }

      await db
        .update(distributionDeals)
        .set({
          currentStage: toStage,
          commissionStatus: 'cancelled',
          closedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(distributionDeals.id, deal.id));

      await db.insert(distributionDealEvents).values({
        dealId: deal.id,
        fromStage,
        toStage,
        eventType: 'stage_transition',
        actorUserId: ctx.user!.id,
        metadata: {
          source: 'referrer.advanceDealStage',
          previousCommissionStatus: deal.commissionStatus,
          nextCommissionStatus: 'cancelled',
          cancelledByReferrer: true,
        } as any,
        notes: input.notes ?? null,
      });

      return {
        success: true,
        dealId: deal.id,
        stage: toStage,
        commissionStatus: 'cancelled' as const,
      };
    }),

  myPipeline: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(500).default(200),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const limit = input?.limit ?? 200;
      await assertDistributionIdentity(db, ctx.user!, 'referrer');
      const agentId = Number(ctx.user!.id);

      const deals = await db
        .select({
          id: distributionDeals.id,
          programId: distributionDeals.programId,
          developmentId: distributionDeals.developmentId,
          developmentName: developments.name,
          developmentPriceFrom: developments.priceFrom,
          developmentPriceTo: developments.priceTo,
          buyerName: distributionDeals.buyerName,
          buyerEmail: distributionDeals.buyerEmail,
          buyerPhone: distributionDeals.buyerPhone,
          dealAmount: distributionDeals.dealAmount,
          currentStage: distributionDeals.currentStage,
          commissionStatus: distributionDeals.commissionStatus,
          commissionBaseAmount: distributionDeals.commissionBaseAmount,
          referrerCommissionType: distributionDeals.referrerCommissionType,
          referrerCommissionValue: distributionDeals.referrerCommissionValue,
          referrerCommissionBasis: distributionDeals.referrerCommissionBasis,
          referrerCommissionAmount: distributionDeals.referrerCommissionAmount,
          programCommissionModel: distributionPrograms.commissionModel,
          programDefaultCommissionPercent: distributionPrograms.defaultCommissionPercent,
          programDefaultCommissionAmount: distributionPrograms.defaultCommissionAmount,
          programReferrerCommissionType: distributionPrograms.referrerCommissionType,
          programReferrerCommissionValue: distributionPrograms.referrerCommissionValue,
          programReferrerCommissionBasis: distributionPrograms.referrerCommissionBasis,
          managerUserId: distributionDeals.managerUserId,
          managerName: users.name,
          managerFirstName: users.firstName,
          managerLastName: users.lastName,
          managerEmail: users.email,
          submittedAt: distributionDeals.submittedAt,
          updatedAt: distributionDeals.updatedAt,
        })
        .from(distributionDeals)
        .innerJoin(developments, eq(distributionDeals.developmentId, developments.id))
        .innerJoin(distributionPrograms, eq(distributionDeals.programId, distributionPrograms.id))
        .leftJoin(users, eq(distributionDeals.managerUserId, users.id))
        .where(eq(distributionDeals.agentId, agentId))
        .orderBy(desc(distributionDeals.updatedAt))
        .limit(limit);

      const latestValidationByDeal = await getLatestViewingValidationByDealIds(
        db,
        deals.map(deal => Number(deal.id)),
      );
      const referralSnapshotsByDeal = await getReferralSubmissionSnapshotByDealIds(
        db,
        deals.map(deal => Number(deal.id)),
      );
      const workflowSummaryByProgram = await getWorkflowSummaryByProgramIds(
        db,
        deals.map(deal => Number(deal.programId)),
      );

      const stageCounts = Object.fromEntries(
        DISTRIBUTION_PIPELINE_STAGE_ORDER.map(stage => [stage, 0]),
      ) as Record<(typeof DISTRIBUTION_PIPELINE_STAGE_ORDER)[number], number>;

      const rows = deals.map(deal => {
        const stage = deal.currentStage as (typeof DISTRIBUTION_PIPELINE_STAGE_ORDER)[number];
        stageCounts[stage] = (stageCounts[stage] || 0) + 1;

        const validation = latestValidationByDeal.get(deal.id);
        const workflowSummary =
          workflowSummaryByProgram.get(Number(deal.programId)) ||
          resolveFallbackWorkflowSummary(String(deal.developmentName || ''));
        const referrerCommissionType = deal.referrerCommissionType
          ? normalizeCommissionType(deal.referrerCommissionType)
          : null;
        const referrerCommissionValue = Math.max(0, toNumberOrNull(deal.referrerCommissionValue) ?? 0);
        const commissionBaseAmount = Math.max(
          0,
          toNumberOrNull(deal.commissionBaseAmount) ??
            toNumberOrNull(deal.dealAmount) ??
            toNumberOrNull(deal.developmentPriceFrom) ??
            toNumberOrNull(deal.developmentPriceTo) ??
            0,
        );
        const referrerCommissionAmount = toNumberOrNull(deal.referrerCommissionAmount);
        const snapshotCommissionEstimate =
          typeof referrerCommissionAmount === 'number'
            ? referrerCommissionAmount
            : referrerCommissionType === 'percentage'
              ? Math.max(0, Math.round((commissionBaseAmount * referrerCommissionValue) / 100))
              : referrerCommissionType === 'flat'
                ? Math.max(0, Math.round(referrerCommissionValue))
                : null;
        const fallbackTrack = resolveReferrerCommissionTrackFromProgramRow({
          commissionModel: deal.programCommissionModel,
          defaultCommissionPercent: deal.programDefaultCommissionPercent,
          defaultCommissionAmount: deal.programDefaultCommissionAmount,
          referrerCommissionType: deal.programReferrerCommissionType,
          referrerCommissionValue: deal.programReferrerCommissionValue,
          referrerCommissionBasis: deal.programReferrerCommissionBasis,
        });
        const commissionEstimate =
          snapshotCommissionEstimate ?? estimateCommissionAmountFromTrack(fallbackTrack, commissionBaseAmount);
        return {
          id: deal.id,
          programId: deal.programId,
          developmentId: deal.developmentId,
          developmentName: deal.developmentName,
          buyerName: deal.buyerName,
          buyerEmail: deal.buyerEmail,
          buyerPhone: deal.buyerPhone,
          currentStage: deal.currentStage,
          commissionStatus: deal.commissionStatus,
          commissionBaseAmount: deal.commissionBaseAmount,
          referrerCommissionType: deal.referrerCommissionType,
          referrerCommissionValue: deal.referrerCommissionValue,
          referrerCommissionBasis: deal.referrerCommissionBasis,
          referrerCommissionAmount: deal.referrerCommissionAmount,
          managerUserId: deal.managerUserId,
          managerName: deal.managerName,
          managerFirstName: deal.managerFirstName,
          managerLastName: deal.managerLastName,
          managerEmail: deal.managerEmail,
          submittedAt: deal.submittedAt,
          updatedAt: deal.updatedAt,
          managerDisplayName: formatUserDisplayName({
            name: deal.managerName,
            firstName: deal.managerFirstName,
            lastName: deal.managerLastName,
            email: deal.managerEmail,
          }),
          validationStatus: validation?.validationStatus || null,
          validationAt: validation?.validatedAt || null,
          validationNotes: validation?.notes || null,
          attributionLockApplied: Boolean(validation?.attributionLockApplied),
          documentsComplete: hasCompleteDocuments(
            referralSnapshotsByDeal.get(Number(deal.id)) || null,
          ),
          commissionEstimate,
          workflowSummary,
        };
      });

      return {
        stageOrder: DISTRIBUTION_PIPELINE_STAGE_ORDER,
        stageCounts,
        deals: rows,
      };
    }),

  recentActivity: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await assertDistributionIdentity(db, ctx.user!, 'referrer');
      const agentId = Number(ctx.user!.id);
      const limit = input?.limit ?? 20;

      const rows = await db
        .select({
          id: distributionDealEvents.id,
          dealId: distributionDealEvents.dealId,
          eventType: distributionDealEvents.eventType,
          fromStage: distributionDealEvents.fromStage,
          toStage: distributionDealEvents.toStage,
          eventAt: distributionDealEvents.eventAt,
          notes: distributionDealEvents.notes,
          actorUserId: distributionDealEvents.actorUserId,
          actorName: users.name,
          actorFirstName: users.firstName,
          actorLastName: users.lastName,
          actorEmail: users.email,
          developmentName: developments.name,
          buyerName: distributionDeals.buyerName,
          currentStage: distributionDeals.currentStage,
        })
        .from(distributionDealEvents)
        .innerJoin(distributionDeals, eq(distributionDealEvents.dealId, distributionDeals.id))
        .innerJoin(developments, eq(distributionDeals.developmentId, developments.id))
        .leftJoin(users, eq(distributionDealEvents.actorUserId, users.id))
        .where(eq(distributionDeals.agentId, agentId))
        .orderBy(desc(distributionDealEvents.eventAt), desc(distributionDealEvents.id))
        .limit(limit);

      return rows.map(row => ({
        ...row,
        actorDisplayName: formatUserDisplayName({
          name: row.actorName,
          firstName: row.actorFirstName,
          lastName: row.actorLastName,
          email: row.actorEmail,
        }),
      }));
    }),

  dealTimeline: protectedProcedure
    .input(
      z.object({
        dealId: z.number().int().positive(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      await assertDistributionIdentity(db, ctx.user!, 'referrer');

      const [deal] = await db
        .select({
          id: distributionDeals.id,
          programId: distributionDeals.programId,
          developmentId: distributionDeals.developmentId,
          developmentName: developments.name,
          buyerName: distributionDeals.buyerName,
          buyerEmail: distributionDeals.buyerEmail,
          buyerPhone: distributionDeals.buyerPhone,
          currentStage: distributionDeals.currentStage,
          commissionStatus: distributionDeals.commissionStatus,
          submittedAt: distributionDeals.submittedAt,
          updatedAt: distributionDeals.updatedAt,
          closedAt: distributionDeals.closedAt,
          agentId: distributionDeals.agentId,
          managerUserId: distributionDeals.managerUserId,
          managerName: users.name,
          managerFirstName: users.firstName,
          managerLastName: users.lastName,
          managerEmail: users.email,
        })
        .from(distributionDeals)
        .innerJoin(developments, eq(distributionDeals.developmentId, developments.id))
        .leftJoin(users, eq(distributionDeals.managerUserId, users.id))
        .where(
          and(eq(distributionDeals.id, input.dealId), eq(distributionDeals.agentId, ctx.user!.id)),
        )
        .limit(1);

      if (!deal) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Distribution deal not found in your referral scope.',
        });
      }

      return await buildDealTimelinePayload(db, deal as DealTimelineDealRow);
    }),

  myCommissionEntries: protectedProcedure
    .input(
      z
        .object({
          entryStatus: z.enum(COMMISSION_ENTRY_STATUS_VALUES).optional(),
          limit: z.number().int().min(1).max(500).default(200),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await assertDistributionIdentity(db, ctx.user!, 'referrer');
      const agentId = Number(ctx.user!.id);
      const limit = input?.limit ?? 200;
      const conditions: SQL[] = [eq(distributionCommissionEntries.agentId, agentId)];

      if (input?.entryStatus) {
        conditions.push(eq(distributionCommissionEntries.entryStatus, input.entryStatus));
      }

      return await db
        .select({
          id: distributionCommissionEntries.id,
          dealId: distributionCommissionEntries.dealId,
          programId: distributionCommissionEntries.programId,
          developmentId: distributionCommissionEntries.developmentId,
          developmentName: developments.name,
          commissionAmount: distributionCommissionEntries.commissionAmount,
          commissionPercent: distributionCommissionEntries.commissionPercent,
          calculationBaseAmount: distributionCommissionEntries.calculationBaseAmount,
          currency: distributionCommissionEntries.currency,
          triggerStage: distributionCommissionEntries.triggerStage,
          entryStatus: distributionCommissionEntries.entryStatus,
          approvedAt: distributionCommissionEntries.approvedAt,
          paidAt: distributionCommissionEntries.paidAt,
          paymentReference: distributionCommissionEntries.paymentReference,
          notes: distributionCommissionEntries.notes,
          updatedAt: distributionCommissionEntries.updatedAt,
          dealStage: distributionDeals.currentStage,
          buyerName: distributionDeals.buyerName,
        })
        .from(distributionCommissionEntries)
        .innerJoin(
          distributionDeals,
          eq(distributionCommissionEntries.dealId, distributionDeals.id),
        )
        .innerJoin(developments, eq(distributionCommissionEntries.developmentId, developments.id))
        .where(withConditions(conditions))
        .orderBy(desc(distributionCommissionEntries.updatedAt))
        .limit(limit);
    }),
});

const developerDistributionRouter = router({
  getSetupSnapshot: protectedProcedure
    .input(z.object({ developmentId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const role = ctx.user!.role;
      if (role !== 'property_developer' && role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only developers or super admins can access distribution setup.',
        });
      }

      // Scope the development to the developer user when not in super-admin mode.
      let developmentRow:
        | {
            brochures: unknown;
            floorPlans: unknown;
            videos: unknown;
          }
        | null = null;

      if (role === 'property_developer') {
        const devRows = await db
          .select({ id: developers.id })
          .from(developers)
          .where(eq(developers.userId, ctx.user!.id));
        const developerIds: number[] = Array.from(
          new Set(
            devRows
              .map(r => Number((r as any)?.id || 0))
              .filter(value => Number.isFinite(value) && value > 0),
          ),
        );
        if (!developerIds.length) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Developer profile not found.' });
        }

        const [row] = await db
          .select({
            brochures: developments.brochures,
            floorPlans: developments.floorPlans,
            videos: developments.videos,
          })
          .from(developments)
          .where(and(eq(developments.id, input.developmentId), inArray(developments.developerId, developerIds)))
          .limit(1);
        developmentRow = row || null;
      } else {
        const [row] = await db
          .select({
            brochures: developments.brochures,
            floorPlans: developments.floorPlans,
            videos: developments.videos,
          })
          .from(developments)
          .where(eq(developments.id, input.developmentId))
          .limit(1);
        developmentRow = row || null;
      }

      if (!developmentRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Development not found.' });
      }

      const [program] = await db
        .select({ id: distributionPrograms.id })
        .from(distributionPrograms)
        .where(eq(distributionPrograms.developmentId, input.developmentId))
        .limit(1);

      const evaluation = await evaluateDevelopmentDistributionAccess({
        db,
        developmentId: input.developmentId,
        actor: { role: 'developer', userId: ctx.user!.id },
        channel: 'developer_settings',
      });

      const salesPackCount = countDevelopmentCommercialDocs({
        brochures: developmentRow.brochures,
        floorPlans: developmentRow.floorPlans,
        videos: developmentRow.videos,
      });

      const programId = Number(program?.id || 0);
      const checklistCounts = programId > 0 ? await getChecklistRequiredCountsByProgramId(db, [programId]) : new Map();
      const checklistCount = programId > 0 ? checklistCounts.get(programId) || 0 : 0;

      return {
        developmentId: input.developmentId,
        programId: programId > 0 ? programId : null,
        setup: computeDistributionSetupSnapshot({
          evaluation,
          salesPackDocumentCount: salesPackCount,
          submissionChecklistRequiredCount: checklistCount,
        }),
      };
    }),

  listSubmissionChecklist: protectedProcedure
    .input(z.object({ developmentId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const role = ctx.user!.role;
      if (role !== 'property_developer' && role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only developers or super admins can access submission requirements.',
        });
      }

      if (role === 'property_developer') {
        const devRows = await db
          .select({ id: developers.id })
          .from(developers)
          .where(eq(developers.userId, ctx.user!.id));
        const developerIds: number[] = Array.from(
          new Set(
            devRows
              .map(r => Number((r as any)?.id || 0))
              .filter(value => Number.isFinite(value) && value > 0),
          ),
        );
        if (!developerIds.length) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Developer profile not found.' });
        }

        const [owned] = await db
          .select({ id: developments.id })
          .from(developments)
          .where(and(eq(developments.id, input.developmentId), inArray(developments.developerId, developerIds)))
          .limit(1);
        if (!owned) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Development not found.' });
        }
      }

      const [program] = await db
        .select({ id: distributionPrograms.id })
        .from(distributionPrograms)
        .where(eq(distributionPrograms.developmentId, input.developmentId))
        .limit(1);

      if (!program) {
        return { programId: null as number | null, items: [] as any[] };
      }

      const [workflow] = await db
        .select({ id: distributionProgramWorkflows.id })
        .from(distributionProgramWorkflows)
        .where(eq(distributionProgramWorkflows.programId, Number(program.id)))
        .limit(1);

      if (!workflow) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Program workflow is missing for this program.',
        });
      }

      const items = await db
        .select({
          id: distributionProgramRequiredDocuments.id,
          documentKey: distributionProgramRequiredDocuments.documentKey,
          documentLabel: distributionProgramRequiredDocuments.documentLabel,
          isRequired: distributionProgramRequiredDocuments.isRequired,
          displayOrder: distributionProgramRequiredDocuments.displayOrder,
          notes: distributionProgramRequiredDocuments.notes,
          updatedAt: distributionProgramRequiredDocuments.updatedAt,
        })
        .from(distributionProgramRequiredDocuments)
        .where(eq(distributionProgramRequiredDocuments.workflowId, Number(workflow.id)))
        .orderBy(desc(distributionProgramRequiredDocuments.isRequired), desc(distributionProgramRequiredDocuments.displayOrder), desc(distributionProgramRequiredDocuments.id));

      return {
        programId: Number(program.id),
        items: items.map(row => ({
          ...row,
          isRequired: boolFromTinyInt(row.isRequired),
        })),
      };
    }),

  upsertSubmissionChecklistItem: protectedProcedure
    .input(
      z.object({
        developmentId: z.number().int().positive(),
        documentKey: z.string().trim().max(80).optional(),
        documentLabel: z.string().trim().min(2).max(160),
        isRequired: z.boolean().default(true),
        displayOrder: z.number().int().min(0).max(1000).default(0),
        notes: z.string().trim().max(2000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const role = ctx.user!.role;
      if (role !== 'property_developer' && role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only developers or super admins can update submission requirements.',
        });
      }

      if (role === 'property_developer') {
        const devRows = await db
          .select({ id: developers.id })
          .from(developers)
          .where(eq(developers.userId, ctx.user!.id));
        const developerIds: number[] = Array.from(
          new Set(
            devRows
              .map(r => Number((r as any)?.id || 0))
              .filter(value => Number.isFinite(value) && value > 0),
          ),
        );
        if (!developerIds.length) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Developer profile not found.' });
        }

        const [owned] = await db
          .select({ id: developments.id })
          .from(developments)
          .where(and(eq(developments.id, input.developmentId), inArray(developments.developerId, developerIds)))
          .limit(1);
        if (!owned) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Development not found.' });
        }
      }

      const [program] = await db
        .select({ id: distributionPrograms.id })
        .from(distributionPrograms)
        .where(eq(distributionPrograms.developmentId, input.developmentId))
        .limit(1);

      if (!program) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Development is not in distribution yet.',
        });
      }

      const [workflow] = await db
        .select({ id: distributionProgramWorkflows.id })
        .from(distributionProgramWorkflows)
        .where(eq(distributionProgramWorkflows.programId, Number(program.id)))
        .limit(1);

      if (!workflow) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Program workflow is missing for this program.',
        });
      }

      const documentKey = normalizeDocumentKey(input.documentKey || input.documentLabel);
      if (!documentKey) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Document key is invalid.',
        });
      }

      const displayOrder = Number.isFinite(input.displayOrder as any) ? Number(input.displayOrder) : 0;

      const [insertResult] = await db
        .insert(distributionProgramRequiredDocuments)
        .values({
          workflowId: Number(workflow.id),
          documentKey,
          documentLabel: input.documentLabel.trim(),
          isRequired: input.isRequired ? 1 : 0,
          appliesWhen: null,
          displayOrder,
          notes: input.notes ?? null,
        })
        .onDuplicateKeyUpdate({
          set: {
            documentLabel: input.documentLabel.trim(),
            isRequired: input.isRequired ? 1 : 0,
            displayOrder,
            notes: input.notes ?? null,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          },
        });

      const insertedId = Number((insertResult as any)?.insertId || 0);
      await logDistributionAudit({
        userId: Number(ctx.user!.id),
        action: 'distribution.developer.upsertSubmissionChecklistItem',
        targetType: 'distribution_program_required_document',
        targetId: insertedId || 0,
        metadata: {
          developmentId: input.developmentId,
          programId: Number(program.id),
          workflowId: Number(workflow.id),
          documentKey,
        },
      });

      return { success: true, documentKey };
    }),

  deleteSubmissionChecklistItem: protectedProcedure
    .input(
      z.object({
        developmentId: z.number().int().positive(),
        id: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const role = ctx.user!.role;
      if (role !== 'property_developer' && role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only developers or super admins can update submission requirements.',
        });
      }

      if (role === 'property_developer') {
        const devRows = await db
          .select({ id: developers.id })
          .from(developers)
          .where(eq(developers.userId, ctx.user!.id));
        const developerIds: number[] = Array.from(
          new Set(
            devRows
              .map(r => Number((r as any)?.id || 0))
              .filter(value => Number.isFinite(value) && value > 0),
          ),
        );
        if (!developerIds.length) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Developer profile not found.' });
        }

        const [owned] = await db
          .select({ id: developments.id })
          .from(developments)
          .where(and(eq(developments.id, input.developmentId), inArray(developments.developerId, developerIds)))
          .limit(1);
        if (!owned) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Development not found.' });
        }
      }

      const [program] = await db
        .select({ id: distributionPrograms.id })
        .from(distributionPrograms)
        .where(eq(distributionPrograms.developmentId, input.developmentId))
        .limit(1);

      if (!program) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Development is not in distribution yet.',
        });
      }

      const [workflow] = await db
        .select({ id: distributionProgramWorkflows.id })
        .from(distributionProgramWorkflows)
        .where(eq(distributionProgramWorkflows.programId, Number(program.id)))
        .limit(1);

      if (!workflow) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Program workflow is missing for this program.',
        });
      }

      // Ensure the item belongs to this workflow before deleting.
      const [doc] = await db
        .select({ id: distributionProgramRequiredDocuments.id })
        .from(distributionProgramRequiredDocuments)
        .where(
          and(
            eq(distributionProgramRequiredDocuments.id, input.id),
            eq(distributionProgramRequiredDocuments.workflowId, Number(workflow.id)),
          ),
        )
        .limit(1);

      if (!doc) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Checklist item not found.' });
      }

      await db
        .delete(distributionProgramRequiredDocuments)
        .where(eq(distributionProgramRequiredDocuments.id, input.id));

      await logDistributionAudit({
        userId: Number(ctx.user!.id),
        action: 'distribution.developer.deleteSubmissionChecklistItem',
        targetType: 'distribution_program_required_document',
        targetId: input.id,
        metadata: {
          developmentId: input.developmentId,
          programId: Number(program.id),
          workflowId: Number(workflow.id),
        },
      });

      return { success: true };
    }),

  getDevelopmentDocuments: protectedProcedure
    .input(z.object({ developmentId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const role = ctx.user!.role;
      if (role !== 'property_developer' && role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only developers or super admins can access development documents.',
        });
      }

      if (role === 'property_developer') {
        const devRows = await db
          .select({ id: developers.id })
          .from(developers)
          .where(eq(developers.userId, ctx.user!.id));
        const developerIds: number[] = Array.from(
          new Set(
            devRows
              .map(r => Number((r as any)?.id || 0))
              .filter(value => Number.isFinite(value) && value > 0),
          ),
        );
        if (!developerIds.length) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Developer profile not found.' });
        }

        const [owned] = await db
          .select({ id: developments.id })
          .from(developments)
          .where(and(eq(developments.id, input.developmentId), inArray(developments.developerId, developerIds)))
          .limit(1);
        if (!owned) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Development not found.' });
        }
      }

      return await getDevelopmentDocumentBank(db, input.developmentId);
    }),

  setDevelopmentDocuments: protectedProcedure
    .input(setDevelopmentDocumentsInput)
    .mutation(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const role = ctx.user!.role;
      if (role !== 'property_developer' && role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only developers or super admins can edit development documents.',
        });
      }

      if (role === 'property_developer') {
        const devRows = await db
          .select({ id: developers.id })
          .from(developers)
          .where(eq(developers.userId, ctx.user!.id));
        const developerIds: number[] = Array.from(
          new Set(
            devRows
              .map(r => Number((r as any)?.id || 0))
              .filter(value => Number.isFinite(value) && value > 0),
          ),
        );
        if (!developerIds.length) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Developer profile not found.' });
        }

        const [owned] = await db
          .select({ id: developments.id })
          .from(developments)
          .where(and(eq(developments.id, input.developmentId), inArray(developments.developerId, developerIds)))
          .limit(1);
        if (!owned) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Development not found.' });
        }
      }

      const result = await setDevelopmentDocuments(db, input);
      await logDistributionAudit({
        userId: Number(ctx.user!.id),
        action: 'distribution.developer.setDevelopmentDocuments',
        targetType: 'development',
        targetId: Number(input.developmentId),
        metadata: {
          brochureCount: Array.isArray(input.brochures) ? input.brochures.length : undefined,
          floorPlanCount: Array.isArray(input.floorPlans) ? input.floorPlans.length : undefined,
          videoCount: Array.isArray(input.videos) ? input.videos.length : undefined,
        },
      });

      return result;
    }),

  requestAdminHelp: protectedProcedure
    .input(
      z.object({
        developmentId: z.number().int().positive(),
        missingKeys: z.array(z.string().trim().max(80)).max(20).optional(),
        message: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const role = ctx.user!.role;
      if (role !== 'property_developer' && role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only developers or super admins can request admin help.',
        });
      }

      if (role === 'property_developer') {
        const devRows = await db
          .select({ id: developers.id })
          .from(developers)
          .where(eq(developers.userId, ctx.user!.id));
        const developerIds: number[] = Array.from(
          new Set(
            devRows
              .map(r => Number((r as any)?.id || 0))
              .filter(value => Number.isFinite(value) && value > 0),
          ),
        );
        if (!developerIds.length) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Developer profile not found.' });
        }

        const [owned] = await db
          .select({ id: developments.id })
          .from(developments)
          .where(and(eq(developments.id, input.developmentId), inArray(developments.developerId, developerIds)))
          .limit(1);
        if (!owned) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Development not found.' });
        }
      }

      await logDistributionAudit({
        userId: Number(ctx.user!.id),
        action: 'distribution.developer.requestAdminHelp',
        targetType: 'development',
        targetId: Number(input.developmentId),
        metadata: {
          missingKeys: input.missingKeys || [],
          message: input.message || null,
        },
      });

      return { success: true };
    }),

  dashboard: protectedProcedure
    .input(
      z
        .object({
          dealLimit: z.number().int().min(100).max(5000).default(1000),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const role = ctx.user!.role;
      if (role !== 'property_developer' && role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only developers or super admins can access developer distribution analytics.',
        });
      }

      const dealLimit = input?.dealLimit ?? 1000;
      let developerIds: number[] = [];

      if (role === 'property_developer') {
        const rows = await db
          .select({ id: developers.id })
          .from(developers)
          .where(eq(developers.userId, ctx.user!.id));
        developerIds = Array.from(new Set(rows.map(row => Number(row.id)).filter(Boolean)));
      }

      const programConditions: SQL[] = [];
      if (role === 'property_developer') {
        if (!developerIds.length) {
          return {
            scope: 'developer' as const,
            developerIds,
            metrics: {
              totalPrograms: 0,
              activePrograms: 0,
              referralEnabledPrograms: 0,
              totalDeals: 0,
              closedDeals: 0,
              commissionPaidAmount: 0,
              commissionPendingAmount: 0,
              conversionRate: 0,
            },
            stageOrder: DISTRIBUTION_PIPELINE_STAGE_ORDER,
            stageCounts: Object.fromEntries(
              DISTRIBUTION_PIPELINE_STAGE_ORDER.map(stage => [stage, 0]),
            ) as Record<(typeof DISTRIBUTION_PIPELINE_STAGE_ORDER)[number], number>,
            developments: [],
            topAgents: [],
            truncated: false,
          };
        }
        programConditions.push(inArray(developments.developerId, developerIds));
      }

      const programRows = await db
        .select({
          programId: distributionPrograms.id,
          developmentId: distributionPrograms.developmentId,
          developmentName: developments.name,
          city: developments.city,
          province: developments.province,
          isActive: distributionPrograms.isActive,
          isReferralEnabled: distributionPrograms.isReferralEnabled,
        })
        .from(distributionPrograms)
        .innerJoin(developments, eq(distributionPrograms.developmentId, developments.id))
        .where(withConditions(programConditions))
        .orderBy(desc(distributionPrograms.updatedAt));

      const programs = programRows.map(row => ({
        ...row,
        isActive: boolFromTinyInt(row.isActive),
        isReferralEnabled: boolFromTinyInt(row.isReferralEnabled),
      }));

      if (!programs.length) {
        return {
          scope: role === 'property_developer' ? ('developer' as const) : ('global' as const),
          developerIds,
          metrics: {
            totalPrograms: 0,
            activePrograms: 0,
            referralEnabledPrograms: 0,
            totalDeals: 0,
            closedDeals: 0,
            commissionPaidAmount: 0,
            commissionPendingAmount: 0,
            conversionRate: 0,
          },
          stageOrder: DISTRIBUTION_PIPELINE_STAGE_ORDER,
          stageCounts: Object.fromEntries(
            DISTRIBUTION_PIPELINE_STAGE_ORDER.map(stage => [stage, 0]),
          ) as Record<(typeof DISTRIBUTION_PIPELINE_STAGE_ORDER)[number], number>,
          developments: [],
          topAgents: [],
          truncated: false,
        };
      }

      const programIds = Array.from(new Set(programs.map(program => Number(program.programId))));
      const dealProgramConditions = programIds.map(
        programId => sql`${distributionDeals.programId} = ${programId}`,
      );
      const commissionProgramConditions = programIds.map(
        programId => sql`${distributionCommissionEntries.programId} = ${programId}`,
      );

      const dealRows = await db
        .select({
          id: distributionDeals.id,
          programId: distributionDeals.programId,
          developmentId: distributionDeals.developmentId,
          agentId: distributionDeals.agentId,
          currentStage: distributionDeals.currentStage,
        })
        .from(distributionDeals)
        .where(withConditions(dealProgramConditions))
        .orderBy(desc(distributionDeals.updatedAt))
        .limit(dealLimit);

      const userDirectory = await getUserDirectoryByIds(
        db,
        dealRows.map(row => Number(row.agentId)),
      );

      const commissionRows = await db
        .select({
          programId: distributionCommissionEntries.programId,
          developmentId: distributionCommissionEntries.developmentId,
          agentId: distributionCommissionEntries.agentId,
          commissionAmount: distributionCommissionEntries.commissionAmount,
          entryStatus: distributionCommissionEntries.entryStatus,
        })
        .from(distributionCommissionEntries)
        .where(withConditions(commissionProgramConditions));

      const stageCounts = Object.fromEntries(
        DISTRIBUTION_PIPELINE_STAGE_ORDER.map(stage => [stage, 0]),
      ) as Record<(typeof DISTRIBUTION_PIPELINE_STAGE_ORDER)[number], number>;

      const developmentMap = new Map<
        number,
        {
          programId: number;
          developmentId: number;
          developmentName: string;
          city: string;
          province: string;
          isActive: boolean;
          isReferralEnabled: boolean;
          totalDeals: number;
          closedDeals: number;
          commissionPaidAmount: number;
          commissionPendingAmount: number;
        }
      >();

      for (const program of programs) {
        developmentMap.set(Number(program.developmentId), {
          programId: Number(program.programId),
          developmentId: Number(program.developmentId),
          developmentName: program.developmentName,
          city: program.city,
          province: program.province,
          isActive: program.isActive,
          isReferralEnabled: program.isReferralEnabled,
          totalDeals: 0,
          closedDeals: 0,
          commissionPaidAmount: 0,
          commissionPendingAmount: 0,
        });
      }

      const agentMap = new Map<
        number,
        {
          agentId: number;
          agentDisplayName: string;
          agentEmail: string | null;
          totalDeals: number;
          closedDeals: number;
          commissionPaidAmount: number;
          commissionPendingAmount: number;
        }
      >();

      for (const deal of dealRows) {
        const stage = deal.currentStage as (typeof DISTRIBUTION_PIPELINE_STAGE_ORDER)[number];
        stageCounts[stage] = (stageCounts[stage] || 0) + 1;

        const isClosed = stage === 'commission_paid' || stage === 'cancelled';
        const development = developmentMap.get(Number(deal.developmentId));
        if (development) {
          development.totalDeals += 1;
          if (isClosed) {
            development.closedDeals += 1;
          }
        }

        const existingAgent = agentMap.get(Number(deal.agentId));
        const agentDisplayName = userDirectory.get(Number(deal.agentId))?.displayName || null;
        if (existingAgent) {
          existingAgent.totalDeals += 1;
          if (isClosed) {
            existingAgent.closedDeals += 1;
          }
        } else {
          agentMap.set(Number(deal.agentId), {
            agentId: Number(deal.agentId),
            agentDisplayName: agentDisplayName || `Referrer #${deal.agentId}`,
            agentEmail: userDirectory.get(Number(deal.agentId))?.email || null,
            totalDeals: 1,
            closedDeals: isClosed ? 1 : 0,
            commissionPaidAmount: 0,
            commissionPendingAmount: 0,
          });
        }
      }

      for (const commission of commissionRows) {
        const amount = Number(commission.commissionAmount || 0);
        const isPaid = commission.entryStatus === 'paid';
        const isPendingLike =
          commission.entryStatus === 'pending' || commission.entryStatus === 'approved';

        const development = developmentMap.get(Number(commission.developmentId));
        if (development) {
          if (isPaid) {
            development.commissionPaidAmount += amount;
          } else if (isPendingLike) {
            development.commissionPendingAmount += amount;
          }
        }

        const agent = agentMap.get(Number(commission.agentId));
        if (agent) {
          if (isPaid) {
            agent.commissionPaidAmount += amount;
          } else if (isPendingLike) {
            agent.commissionPendingAmount += amount;
          }
        }
      }

      const developmentsSummary = Array.from(developmentMap.values())
        .map(row => ({
          ...row,
          conversionRate: toPercent(row.closedDeals, row.totalDeals),
        }))
        .sort((a, b) => b.totalDeals - a.totalDeals);

      const topAgents = Array.from(agentMap.values())
        .map(row => ({
          ...row,
          conversionRate: toPercent(row.closedDeals, row.totalDeals),
        }))
        .sort((a, b) => {
          if (b.closedDeals !== a.closedDeals) return b.closedDeals - a.closedDeals;
          if (b.totalDeals !== a.totalDeals) return b.totalDeals - a.totalDeals;
          return b.commissionPaidAmount - a.commissionPaidAmount;
        })
        .slice(0, 10);

      const totalDeals = dealRows.length;
      const closedDeals = dealRows.filter(
        deal => deal.currentStage === 'commission_paid' || deal.currentStage === 'cancelled',
      ).length;
      const commissionPaidAmount = developmentsSummary.reduce(
        (sum, row) => sum + row.commissionPaidAmount,
        0,
      );
      const commissionPendingAmount = developmentsSummary.reduce(
        (sum, row) => sum + row.commissionPendingAmount,
        0,
      );

      return {
        scope: role === 'property_developer' ? ('developer' as const) : ('global' as const),
        developerIds,
        metrics: {
          totalPrograms: programs.length,
          activePrograms: programs.filter(program => program.isActive).length,
          referralEnabledPrograms: programs.filter(program => program.isReferralEnabled).length,
          totalDeals,
          closedDeals,
          commissionPaidAmount,
          commissionPendingAmount,
          conversionRate: toPercent(closedDeals, totalDeals),
        },
        stageOrder: DISTRIBUTION_PIPELINE_STAGE_ORDER,
        stageCounts,
        developments: developmentsSummary,
        topAgents,
        truncated: dealRows.length >= dealLimit,
      };
    }),

  listDeals: protectedProcedure
    .input(
      z
        .object({
          developmentId: z.number().int().positive().optional(),
          stage: z.enum(DISTRIBUTION_DEAL_STAGE_VALUES).optional(),
          commissionStatus: z.enum(DISTRIBUTION_COMMISSION_STATUS_VALUES).optional(),
          from: z.string().datetime().optional(),
          to: z.string().datetime().optional(),
          limit: z.number().int().min(1).max(1000).default(300),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const role = ctx.user!.role;
      if (role !== 'property_developer' && role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only developers or super admins can list developer distribution deals.',
        });
      }

      const limit = input?.limit ?? 300;
      const conditions: SQL[] = [];

      if (role === 'property_developer') {
        const rows = await db
          .select({ id: developers.id })
          .from(developers)
          .where(eq(developers.userId, ctx.user!.id));
        const developerIds = Array.from(new Set(rows.map(row => Number(row.id)).filter(Boolean)));
        if (!developerIds.length) {
          return [];
        }
        const scopeConditions = developerIds.map(
          developerId => sql`${developments.developerId} = ${developerId}`,
        );
        conditions.push(sql`(${sql.join(scopeConditions, sql` OR `)})`);
      }

      if (typeof input?.developmentId === 'number') {
        conditions.push(eq(distributionDeals.developmentId, input.developmentId));
      }
      if (input?.stage) {
        conditions.push(eq(distributionDeals.currentStage, input.stage));
      }
      if (input?.commissionStatus) {
        conditions.push(eq(distributionDeals.commissionStatus, input.commissionStatus));
      }
      if (input?.from) {
        const fromDate = parseIsoDateOrThrow(input.from, 'from');
        conditions.push(sql`${distributionDeals.submittedAt} >= ${normalizeDateForSql(fromDate)}`);
      }
      if (input?.to) {
        const toDate = parseIsoDateOrThrow(input.to, 'to');
        conditions.push(sql`${distributionDeals.submittedAt} <= ${normalizeDateForSql(toDate)}`);
      }

      const rows = await db
        .select({
          id: distributionDeals.id,
          programId: distributionDeals.programId,
          developmentId: distributionDeals.developmentId,
          developmentName: developments.name,
          city: developments.city,
          province: developments.province,
          buyerName: distributionDeals.buyerName,
          buyerEmail: distributionDeals.buyerEmail,
          buyerPhone: distributionDeals.buyerPhone,
          currentStage: distributionDeals.currentStage,
          commissionStatus: distributionDeals.commissionStatus,
          submittedAt: distributionDeals.submittedAt,
          updatedAt: distributionDeals.updatedAt,
          closedAt: distributionDeals.closedAt,
          agentId: distributionDeals.agentId,
          managerUserId: distributionDeals.managerUserId,
          managerName: users.name,
          managerFirstName: users.firstName,
          managerLastName: users.lastName,
          managerEmail: users.email,
        })
        .from(distributionDeals)
        .innerJoin(developments, eq(distributionDeals.developmentId, developments.id))
        .leftJoin(users, eq(distributionDeals.managerUserId, users.id))
        .where(withConditions(conditions))
        .orderBy(desc(distributionDeals.updatedAt))
        .limit(limit);

      const userDirectory = await getUserDirectoryByIds(
        db,
        rows.map(row => Number(row.agentId)),
      );

      return rows.map(row => ({
        ...row,
        agentDisplayName:
          userDirectory.get(Number(row.agentId))?.displayName || `Referrer #${row.agentId}`,
        agentEmail: userDirectory.get(Number(row.agentId))?.email || null,
        managerDisplayName: formatUserDisplayName({
          name: row.managerName,
          firstName: row.managerFirstName,
          lastName: row.managerLastName,
          email: row.managerEmail,
        }),
      }));
    }),

  dealTimeline: protectedProcedure
    .input(
      z.object({
        dealId: z.number().int().positive(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const role = ctx.user!.role;
      if (role !== 'property_developer' && role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only developers or super admins can access developer distribution timeline.',
        });
      }

      const scopeConditions: SQL[] = [eq(distributionDeals.id, input.dealId)];
      if (role === 'property_developer') {
        const rows = await db
          .select({ id: developers.id })
          .from(developers)
          .where(eq(developers.userId, ctx.user!.id));
        const developerIds = Array.from(new Set(rows.map(row => Number(row.id)).filter(Boolean)));
        if (!developerIds.length) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'No developer profile scope found.' });
        }
        const developerScopeConditions = developerIds.map(
          developerId => sql`${developments.developerId} = ${developerId}`,
        );
        scopeConditions.push(sql`(${sql.join(developerScopeConditions, sql` OR `)})`);
      }

      const [deal] = await db
        .select({
          id: distributionDeals.id,
          programId: distributionDeals.programId,
          developmentId: distributionDeals.developmentId,
          developmentName: developments.name,
          buyerName: distributionDeals.buyerName,
          buyerEmail: distributionDeals.buyerEmail,
          buyerPhone: distributionDeals.buyerPhone,
          currentStage: distributionDeals.currentStage,
          commissionStatus: distributionDeals.commissionStatus,
          submittedAt: distributionDeals.submittedAt,
          updatedAt: distributionDeals.updatedAt,
          closedAt: distributionDeals.closedAt,
          agentId: distributionDeals.agentId,
          managerUserId: distributionDeals.managerUserId,
          managerName: users.name,
          managerFirstName: users.firstName,
          managerLastName: users.lastName,
          managerEmail: users.email,
        })
        .from(distributionDeals)
        .innerJoin(developments, eq(distributionDeals.developmentId, developments.id))
        .leftJoin(users, eq(distributionDeals.managerUserId, users.id))
        .where(withConditions(scopeConditions))
        .limit(1);

      if (!deal) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Distribution deal not found in your developer scope.',
        });
      }
      const userDirectory = await getUserDirectoryByIds(db, [Number(deal.agentId)]);

      const events = await db
        .select({
          id: distributionDealEvents.id,
          eventType: distributionDealEvents.eventType,
          fromStage: distributionDealEvents.fromStage,
          toStage: distributionDealEvents.toStage,
          eventAt: distributionDealEvents.eventAt,
          actorUserId: distributionDealEvents.actorUserId,
          notes: distributionDealEvents.notes,
          metadata: distributionDealEvents.metadata,
          actorName: users.name,
          actorFirstName: users.firstName,
          actorLastName: users.lastName,
          actorEmail: users.email,
        })
        .from(distributionDealEvents)
        .leftJoin(users, eq(distributionDealEvents.actorUserId, users.id))
        .where(eq(distributionDealEvents.dealId, deal.id))
        .orderBy(desc(distributionDealEvents.eventAt), desc(distributionDealEvents.id))
        .limit(300);

      const viewings = await db
        .select({
          id: distributionViewings.id,
          scheduledStartAt: distributionViewings.scheduledStartAt,
          scheduledEndAt: distributionViewings.scheduledEndAt,
          timezone: distributionViewings.timezone,
          locationName: distributionViewings.locationName,
          status: distributionViewings.status,
          rescheduleCount: distributionViewings.rescheduleCount,
          notes: distributionViewings.notes,
          updatedAt: distributionViewings.updatedAt,
        })
        .from(distributionViewings)
        .where(eq(distributionViewings.dealId, deal.id))
        .orderBy(desc(distributionViewings.updatedAt))
        .limit(50);

      const validations = await db
        .select({
          id: distributionViewingValidations.id,
          validationStatus: distributionViewingValidations.validationStatus,
          attributionLockApplied: distributionViewingValidations.attributionLockApplied,
          attributionLockAt: distributionViewingValidations.attributionLockAt,
          validatedAt: distributionViewingValidations.validatedAt,
          notes: distributionViewingValidations.notes,
          updatedAt: distributionViewingValidations.updatedAt,
        })
        .from(distributionViewingValidations)
        .where(eq(distributionViewingValidations.dealId, deal.id))
        .orderBy(desc(distributionViewingValidations.updatedAt))
        .limit(100);

      const commissions = await db
        .select({
          id: distributionCommissionEntries.id,
          commissionAmount: distributionCommissionEntries.commissionAmount,
          commissionPercent: distributionCommissionEntries.commissionPercent,
          calculationBaseAmount: distributionCommissionEntries.calculationBaseAmount,
          currency: distributionCommissionEntries.currency,
          triggerStage: distributionCommissionEntries.triggerStage,
          entryStatus: distributionCommissionEntries.entryStatus,
          approvedAt: distributionCommissionEntries.approvedAt,
          paidAt: distributionCommissionEntries.paidAt,
          paymentReference: distributionCommissionEntries.paymentReference,
          notes: distributionCommissionEntries.notes,
          updatedAt: distributionCommissionEntries.updatedAt,
        })
        .from(distributionCommissionEntries)
        .where(eq(distributionCommissionEntries.dealId, deal.id))
        .orderBy(desc(distributionCommissionEntries.updatedAt))
        .limit(100);

      return {
        deal: {
          ...deal,
          agentDisplayName:
            userDirectory.get(Number(deal.agentId))?.displayName || `Referrer #${deal.agentId}`,
          agentEmail: userDirectory.get(Number(deal.agentId))?.email || null,
          managerDisplayName: formatUserDisplayName({
            name: deal.managerName,
            firstName: deal.managerFirstName,
            lastName: deal.managerLastName,
            email: deal.managerEmail,
          }),
        },
        events: events.map(event => ({
          ...event,
          actorDisplayName: formatUserDisplayName({
            name: event.actorName,
            firstName: event.actorFirstName,
            lastName: event.actorLastName,
            email: event.actorEmail,
          }),
        })),
        viewings: viewings.map(viewing => ({
          ...viewing,
          rescheduleCount: Number(viewing.rescheduleCount || 0),
        })),
        validations: validations.map(validation => ({
          ...validation,
          attributionLockApplied: boolFromTinyInt(validation.attributionLockApplied),
        })),
        commissions,
      };
    }),
});

/**
 * Distribution Network Router (V1 + Step 3 surface)
 */
export const distributionRouter = router({
  getModuleStatus: superAdminProcedure.query(() => ({
    enabled: ENV.distributionNetworkEnabled,
    version: 'v1-step3',
    submodules: DISTRIBUTION_SUBMODULES,
  })),

  listSubmodules: superAdminProcedure.query(() => {
    assertDistributionEnabled();
    return DISTRIBUTION_SUBMODULES;
  }),

  getSubmoduleSummary: superAdminProcedure
    .input(
      z.object({
        slug: z.enum(submoduleSlugs),
      }),
    )
    .query(({ input }) => {
      assertDistributionEnabled();
      const module = DISTRIBUTION_SUBMODULES.find(item => item.slug === input.slug);
      if (!module) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Unknown submodule: ${input.slug}`,
        });
      }

      return {
        ...module,
        phase: 'step3',
        metrics: {
          total: 0,
          pending: 0,
          completed: 0,
        },
      };
    }),

  // Compatibility endpoints used by existing flagged UI
  listPrograms: superAdminProcedure.query(async () => {
    assertDistributionEnabled();
    return await listProgramsForAdmin();
  }),

  upsertProgram: superAdminProcedure.input(upsertProgramInput).mutation(async ({ ctx, input }) => {
    assertDistributionEnabled();
    return await upsertProgram(ctx as any, input);
  }),

  listDeals: superAdminProcedure.input(listDealsInput).query(async ({ input }) => {
    assertDistributionEnabled();
    return await listDeals(input);
  }),

  submitReferrerApplication: publicProcedure
    .input(
      z.object({
        fullName: z.string().trim().min(2).max(200),
        email: z.string().trim().email().max(320),
        phone: z.string().trim().max(50).optional(),
        notes: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const normalizedEmail = input.email.trim().toLowerCase();
      const [existingPending] = await db
        .select({ id: distributionReferrerApplications.id })
        .from(distributionReferrerApplications)
        .where(
          and(
            eq(distributionReferrerApplications.email, normalizedEmail),
            eq(distributionReferrerApplications.status, 'pending'),
          ),
        )
        .limit(1);

      if (existingPending) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An application for this email is already pending review.',
        });
      }

      const [insertResult] = await db.insert(distributionReferrerApplications).values({
        requestedIdentity: 'referrer',
        fullName: input.fullName.trim(),
        email: normalizedEmail,
        phone: input.phone?.trim() || null,
        notes: input.notes?.trim() || null,
        status: 'pending',
      });

      return {
        success: true,
        applicationId: Number((insertResult as any).insertId || 0),
        status: 'pending' as const,
      };
    }),

  submitTeamRegistration: publicProcedure
    .input(
      z.object({
        fullName: z.string().trim().min(2).max(200),
        email: z.string().trim().email().max(320),
        phone: z.string().trim().max(50).optional(),
        company: z.string().trim().max(200).optional(),
        currentRole: z.string().trim().max(150).optional(),
        requestedArea: z.enum(TEAM_REGISTRATION_AREA_VALUES).default('distribution_manager'),
        notes: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const normalizedEmail = input.email.trim().toLowerCase();
      const [existingPending] = await db
        .select({ id: platformTeamRegistrations.id })
        .from(platformTeamRegistrations)
        .where(
          and(
            eq(platformTeamRegistrations.email, normalizedEmail),
            eq(platformTeamRegistrations.status, 'pending'),
          ),
        )
        .limit(1);

      if (existingPending) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A team registration for this email is already pending review.',
        });
      }

      const [insertResult] = await db.insert(platformTeamRegistrations).values({
        fullName: input.fullName.trim(),
        email: normalizedEmail,
        phone: input.phone?.trim() || null,
        company: input.company?.trim() || null,
        currentRole: input.currentRole?.trim() || null,
        requestedArea: input.requestedArea,
        notes: input.notes?.trim() || null,
        status: 'pending',
      });

      return {
        success: true,
        registrationId: Number((insertResult as any).insertId || 0),
        status: 'pending' as const,
      };
    }),

  getManagerInvite: publicProcedure
    .input(
      z.object({
        registrationId: z.number().int().positive(),
        email: z.string().trim().email().max(320),
      }),
    )
    .query(async ({ input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const normalizedEmail = input.email.trim().toLowerCase();
      const [registration] = await db
        .select({
          id: platformTeamRegistrations.id,
          fullName: platformTeamRegistrations.fullName,
          email: platformTeamRegistrations.email,
          phone: platformTeamRegistrations.phone,
          company: platformTeamRegistrations.company,
          currentRole: platformTeamRegistrations.currentRole,
          requestedArea: platformTeamRegistrations.requestedArea,
          status: platformTeamRegistrations.status,
          createdAt: platformTeamRegistrations.createdAt,
        })
        .from(platformTeamRegistrations)
        .where(eq(platformTeamRegistrations.id, input.registrationId))
        .limit(1);

      if (!registration) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Manager invite not found.' });
      }
      if (registration.requestedArea !== 'distribution_manager') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invite is not for a distribution manager.',
        });
      }
      if ((registration.email || '').toLowerCase() !== normalizedEmail) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Invite email does not match.' });
      }

      return {
        id: Number(registration.id),
        fullName: registration.fullName || '',
        email: registration.email,
        phone: registration.phone || '',
        company: registration.company || '',
        currentRole: registration.currentRole || '',
        status: registration.status,
        canComplete: registration.status === 'pending',
        createdAt: registration.createdAt,
      };
    }),

  completeManagerInviteRegistration: publicProcedure
    .input(
      z.object({
        registrationId: z.number().int().positive(),
        email: z.string().trim().email().max(320),
        fullName: z.string().trim().min(2).max(200),
        phone: z.string().trim().max(50).optional(),
        currentRole: z.string().trim().max(150).optional(),
        profileImageUrl: z.string().trim().url().max(1000).optional(),
        password: z
          .string()
          .min(8)
          .regex(/[a-z]/)
          .regex(/[A-Z]/)
          .regex(/\d/)
          .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>?/]/),
      }),
    )
    .mutation(async ({ input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const normalizedEmail = input.email.trim().toLowerCase();
      const [registration] = await db
        .select({
          id: platformTeamRegistrations.id,
          email: platformTeamRegistrations.email,
          requestedArea: platformTeamRegistrations.requestedArea,
          status: platformTeamRegistrations.status,
          notes: platformTeamRegistrations.notes,
        })
        .from(platformTeamRegistrations)
        .where(eq(platformTeamRegistrations.id, input.registrationId))
        .limit(1);

      if (!registration) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Manager invite not found.' });
      }
      if (registration.requestedArea !== 'distribution_manager') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invite is not for a distribution manager.',
        });
      }
      if ((registration.email || '').toLowerCase() !== normalizedEmail) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Invite email does not match.' });
      }
      if (registration.status !== 'pending') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Invite is already ${registration.status}.`,
        });
      }

      const [existingUser] = await db
        .select({
          id: users.id,
          email: users.email,
          passwordHash: users.passwordHash,
        })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      let userId: number;
      if (existingUser) {
        userId = Number(existingUser.id);
        const { firstName, lastName } = splitFullName(input.fullName);
        const updatePayload: Record<string, unknown> = {
          name: input.fullName.trim(),
          firstName,
          lastName,
          phone: input.phone?.trim() || null,
          emailVerified: 1,
        };
        if (!existingUser.passwordHash) {
          updatePayload.passwordHash = await authService.hashPassword(input.password);
        }
        await db
          .update(users)
          .set(updatePayload as any)
          .where(eq(users.id, userId));
      } else {
        userId = await authService.register(
          normalizedEmail,
          input.password,
          input.fullName.trim(),
          'visitor',
        );
        const { firstName, lastName } = splitFullName(input.fullName);
        await db
          .update(users)
          .set({
            name: input.fullName.trim(),
            firstName,
            lastName,
            phone: input.phone?.trim() || null,
            emailVerified: 1,
          } as any)
          .where(eq(users.id, userId));
      }

      await db
        .insert(distributionIdentities)
        .values({
          userId,
          identityType: 'manager',
          active: 1,
          displayName: input.fullName.trim(),
        })
        .onDuplicateKeyUpdate({
          set: {
            active: 1,
            displayName: input.fullName.trim(),
          },
        });

      const registrationNotes = [
        registration.notes,
        input.profileImageUrl ? `Manager profile image: ${input.profileImageUrl}` : null,
      ]
        .filter(Boolean)
        .join('\n')
        .trim();

      await db
        .update(platformTeamRegistrations)
        .set({
          fullName: input.fullName.trim(),
          phone: input.phone?.trim() || null,
          currentRole: input.currentRole?.trim() || null,
          notes: registrationNotes || null,
          status: 'approved',
          userId,
          reviewedAt: sql`CURRENT_TIMESTAMP`,
          reviewNotes: 'Approved via manager invite completion.',
        })
        .where(eq(platformTeamRegistrations.id, input.registrationId));

      return {
        success: true,
        registrationId: input.registrationId,
        userId,
        redirectPath: '/login',
      };
    }),

  admin: adminDistributionRouter,
  manager: managerDistributionRouter,
  referrer: referrerDistributionRouter,
  agent: referrerDistributionRouter,
  qualification: distributionQualificationRouter,
  developer: developerDistributionRouter,
});
