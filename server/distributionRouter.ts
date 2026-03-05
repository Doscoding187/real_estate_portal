import { TRPCError } from '@trpc/server';
import { and, desc, eq, inArray, isNull, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import {
  DISTRIBUTION_DEAL_STAGE_VALUES,
  DISTRIBUTION_TIER_VALUES,
  DISTRIBUTION_VIEWING_STATUS_VALUES,
  DISTRIBUTION_IDENTITY_TYPE_VALUES,
  developers,
  developerBrandProfiles,
  developments,
  developmentRequiredDocuments,
  distributionAgentAccess,
  distributionAgentTiers,
  distributionCommissionEntries,
  distributionDealDocuments,
  distributionDealEvents,
  distributionDeals,
  distributionIdentities,
  distributionManagerAssignments,
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
import { ensureCommissionEntryForDeal } from './services/distributionCommissionService';
import {
  ensureDistributionProgramForDevelopment,
  getProgramActivationReadiness,
} from './services/distributionProgramService';
import { getProgramReadinessByDevelopmentId } from './services/distributionProgramReadinessService';
import {
  getDealChecklist,
  upsertDealDocumentStatus,
} from './services/distributionDealDocumentsService';
import {
  getPartnerProgramTermsByDevelopmentId,
  listPartnerProgramTerms,
} from './services/distributionPartnerTermsService';
import {
  createReferralDeal,
  getMyReferralDeal,
  listMyReferralDeals,
} from './services/distributionReferralSubmissionService';

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
const REFERRER_APPLICATION_STATUS_VALUES = ['pending', 'approved', 'rejected'] as const;
const TEAM_REGISTRATION_STATUS_VALUES = ['pending', 'approved', 'rejected'] as const;
const TEAM_REGISTRATION_AREA_VALUES = [
  'distribution_manager',
  'agent',
  'agency_operations',
  'developer_operations',
  'other',
] as const;
const VIEWING_RESCHEDULE_LIMIT = 3;
const VIEWING_RESCHEDULE_LOCK_HOURS = 4;
const DISTRIBUTION_IDENTITY_VALUES = [...DISTRIBUTION_IDENTITY_TYPE_VALUES] as const;

type DistributionDealStage = (typeof DISTRIBUTION_DEAL_STAGE_VALUES)[number];
type DistributionTier = (typeof DISTRIBUTION_TIER_VALUES)[number];
type DistributionIdentityType = (typeof DISTRIBUTION_IDENTITY_VALUES)[number];

const AGENT_STAGE_TRANSITIONS: Partial<Record<DistributionDealStage, DistributionDealStage[]>> = {
  viewing_completed: ['application_submitted', 'cancelled'],
  application_submitted: ['contract_signed', 'cancelled'],
  contract_signed: ['bond_approved', 'cancelled'],
  bond_approved: ['commission_pending', 'cancelled'],
};

// Manager-controlled stage transitions (source of truth for operator lifecycle)
const MANAGER_STAGE_TRANSITIONS: Partial<Record<DistributionDealStage, DistributionDealStage[]>> = {
  viewing_completed: ['application_submitted', 'cancelled'],
  application_submitted: ['contract_signed', 'cancelled'],
  contract_signed: ['bond_approved', 'cancelled'],
  bond_approved: ['commission_pending', 'cancelled'],
};

// Stages where fee accrual has begun - cancellation requires admin override
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

function boolFromTinyInt(value: unknown) {
  return Number(value || 0) === 1;
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
      tierAccessPolicy: distributionPrograms.tierAccessPolicy,
    })
    .from(distributionPrograms)
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

async function assertPartnerTermsAccess(db: any, user: { id: number; role: string }) {
  if (user.role === 'agent' || user.role === 'agency_admin') {
    return;
  }

  const hasReferrerIdentity = await hasActiveDistributionIdentity(db, user.id, 'referrer');
  if (hasReferrerIdentity) {
    return;
  }

  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'Partner program terms are available to partner and agent accounts only.',
  });
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
  const program = await getProgramById(db, programId);
  if (!program) {
    return null;
  }

  const [primary] = await db
    .select({
      managerUserId: distributionManagerAssignments.managerUserId,
    })
    .from(distributionManagerAssignments)
    .where(
      and(
        eq(distributionManagerAssignments.developmentId, Number(program.developmentId)),
        eq(distributionManagerAssignments.isActive, 1),
        eq(distributionManagerAssignments.isPrimary, 1),
      ),
    )
    .orderBy(desc(distributionManagerAssignments.assignedAt))
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
        eq(distributionManagerAssignments.developmentId, Number(program.developmentId)),
        eq(distributionManagerAssignments.isActive, 1),
      ),
    )
    .orderBy(desc(distributionManagerAssignments.assignedAt))
    .limit(1);

  return fallback?.managerUserId ? Number(fallback.managerUserId) : null;
}

async function hasPrimaryActiveManagerAssignment(db: any, programId: number) {
  const program = await getProgramById(db, programId);
  if (!program) {
    return false;
  }

  const [row] = await db
    .select({ assignmentId: distributionManagerAssignments.id })
    .from(distributionManagerAssignments)
    .where(
      and(
        eq(distributionManagerAssignments.developmentId, Number(program.developmentId)),
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

  let resolvedDevelopmentId = scope.developmentId;
  if (typeof scope.programId === 'number') {
    const program = await getProgramById(db, scope.programId);
    if (!program) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Distribution program not found.' });
    }
    resolvedDevelopmentId = Number(program.developmentId);
  }

  if (typeof resolvedDevelopmentId === 'number') {
    conditions.push(eq(distributionManagerAssignments.developmentId, resolvedDevelopmentId));
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
      tierAccessPolicy: distributionPrograms.tierAccessPolicy,
      payoutMilestone: distributionPrograms.payoutMilestone,
      payoutMilestoneNotes: distributionPrograms.payoutMilestoneNotes,
      currencyCode: distributionPrograms.currencyCode,
      createdAt: distributionPrograms.createdAt,
      updatedAt: distributionPrograms.updatedAt,
    })
    .from(distributionPrograms)
    .innerJoin(developments, eq(distributionPrograms.developmentId, developments.id))
    .orderBy(desc(distributionPrograms.updatedAt));

  return rows.map(row => ({
    ...row,
    isActive: boolFromTinyInt(row.isActive),
    isReferralEnabled: boolFromTinyInt(row.isReferralEnabled),
  }));
}

const upsertProgramInput = z.object({
  developmentId: z.number().int().positive(),
  isReferralEnabled: z.boolean(),
  isActive: z.boolean().default(true),
  commissionModel: z.enum([
    'flat_percentage',
    'flat_amount',
    'tiered_percentage',
    'fixed_amount',
    'hybrid',
  ]),
  defaultCommissionPercent: z.number().min(0).max(100).nullable().optional(),
  defaultCommissionAmount: z.number().int().min(0).nullable().optional(),
  tierAccessPolicy: z.enum(['open', 'restricted', 'invite_only']),
  payoutMilestone: z.enum([
    'attorney_instruction',
    'attorney_signing',
    'bond_approval',
    'transfer_registration',
    'occupation',
    'custom',
  ]),
  payoutMilestoneNotes: z.string().max(2000).nullable().optional(),
  currencyCode: z
    .string()
    .length(3)
    .transform(value => value.toUpperCase()),
});

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

  if (input.isReferralEnabled) {
    const normalizedCommissionModel =
      input.commissionModel === 'flat_amount' ? 'fixed_amount' : input.commissionModel;
    const hasPrimaryManager = existing?.id
      ? await hasPrimaryActiveManagerAssignment(db, Number(existing.id))
      : false;
    const readiness = getProgramActivationReadiness({
      commissionModel: normalizedCommissionModel as
        | 'flat_percentage'
        | 'tiered_percentage'
        | 'fixed_amount'
        | 'hybrid',
      defaultCommissionPercent: toNumberOrNull(input.defaultCommissionPercent),
      defaultCommissionAmount: toNumberOrNull(input.defaultCommissionAmount),
      tierAccessPolicy: input.tierAccessPolicy,
      payoutMilestone: input.payoutMilestone,
      currencyCode: input.currencyCode,
      hasPrimaryManager,
    });

    if (!readiness.canEnable) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Referral enable blocked: ${readiness.missingRequirements.join(', ')}.`,
      });
    }
  }

  const normalizedCommissionModel =
    input.commissionModel === 'flat_amount' ? 'fixed_amount' : input.commissionModel;
  const payload = {
    developmentId: input.developmentId,
    isReferralEnabled: input.isReferralEnabled ? 1 : 0,
    isActive: input.isActive ? 1 : 0,
    commissionModel: normalizedCommissionModel,
    defaultCommissionPercent:
      input.defaultCommissionPercent === undefined ? null : input.defaultCommissionPercent,
    defaultCommissionAmount:
      input.defaultCommissionAmount === undefined ? null : input.defaultCommissionAmount,
    tierAccessPolicy: input.tierAccessPolicy,
    payoutMilestone: input.payoutMilestone,
    payoutMilestoneNotes:
      input.payoutMilestoneNotes === undefined ? null : input.payoutMilestoneNotes,
    currencyCode: input.currencyCode,
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
  };
}

const listDealsInput = z.object({
  developmentId: z.number().int().positive().optional(),
  agentId: z.number().int().positive().optional(),
  stage: z.enum(DISTRIBUTION_DEAL_STAGE_VALUES).optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

async function listDeals(input: z.infer<typeof listDealsInput>) {
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
}

async function getDealById(db: any, dealId: number) {
  const [deal] = await db
    .select({
      id: distributionDeals.id,
      programId: distributionDeals.programId,
      developmentId: distributionDeals.developmentId,
      agentId: distributionDeals.agentId,
      managerUserId: distributionDeals.managerUserId,
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
    .select({ developmentId: distributionManagerAssignments.developmentId })
    .from(distributionManagerAssignments)
    .where(
      and(
        eq(distributionManagerAssignments.managerUserId, userId),
        eq(distributionManagerAssignments.isActive, 1),
      ),
    );

  const developmentIds = Array.from(
    new Set<number>(assignments.map(row => Number(row.developmentId)).filter(Boolean)),
  );
  if (!developmentIds.length) {
    return [];
  }

  const programs = await db
    .select({ id: distributionPrograms.id })
    .from(distributionPrograms)
    .where(inArray(distributionPrograms.developmentId, developmentIds));

  return Array.from(new Set<number>(programs.map(row => Number(row.id)).filter(Boolean)));
}

const adminDistributionRouter = router({
  listPrograms: superAdminProcedure.query(async () => {
    assertDistributionEnabled();
    return await listProgramsForAdmin();
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
          developmentPriceFrom: developments.priceFrom,
          developmentPriceTo: developments.priceTo,
          developmentUpdatedAt: developments.updatedAt,
          programId: distributionPrograms.id,
          programIsActive: distributionPrograms.isActive,
          isReferralEnabled: distributionPrograms.isReferralEnabled,
          commissionModel: distributionPrograms.commissionModel,
          defaultCommissionPercent: distributionPrograms.defaultCommissionPercent,
          defaultCommissionAmount: distributionPrograms.defaultCommissionAmount,
          tierAccessPolicy: distributionPrograms.tierAccessPolicy,
          payoutMilestone: distributionPrograms.payoutMilestone,
          payoutMilestoneNotes: distributionPrograms.payoutMilestoneNotes,
          currencyCode: distributionPrograms.currencyCode,
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
            developmentPriceFrom: developments.priceFrom,
            developmentPriceTo: developments.priceTo,
            developmentUpdatedAt: developments.updatedAt,
            programId: distributionPrograms.id,
            programIsActive: distributionPrograms.isActive,
            isReferralEnabled: distributionPrograms.isReferralEnabled,
            commissionModel: distributionPrograms.commissionModel,
            defaultCommissionPercent: distributionPrograms.defaultCommissionPercent,
            defaultCommissionAmount: distributionPrograms.defaultCommissionAmount,
            tierAccessPolicy: distributionPrograms.tierAccessPolicy,
            payoutMilestone: distributionPrograms.payoutMilestone,
            payoutMilestoneNotes: distributionPrograms.payoutMilestoneNotes,
            currencyCode: distributionPrograms.currencyCode,
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

      const managerRows = developmentIds.length
        ? await db
            .select({
              developmentId: distributionManagerAssignments.developmentId,
              assignmentId: distributionManagerAssignments.id,
              managerUserId: distributionManagerAssignments.managerUserId,
              isPrimary: distributionManagerAssignments.isPrimary,
              isActive: distributionManagerAssignments.isActive,
              workloadCapacity: distributionManagerAssignments.workloadCapacity,
              timezone: distributionManagerAssignments.timezone,
              assignedAt: distributionManagerAssignments.assignedAt,
              managerName: users.name,
              managerFirstName: users.firstName,
              managerLastName: users.lastName,
              managerEmail: users.email,
            })
            .from(distributionManagerAssignments)
            .innerJoin(users, eq(distributionManagerAssignments.managerUserId, users.id))
            .where(inArray(distributionManagerAssignments.developmentId, developmentIds))
            .orderBy(desc(distributionManagerAssignments.assignedAt))
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

      const managerByDevelopment = new Map<
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
            assignedAt: string;
          }>;
        }
      >();
      for (const row of managerRows) {
        const developmentId = Number(row.developmentId);
        const current =
          managerByDevelopment.get(developmentId) ||
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
              assignedAt: row.assignedAt,
            },
          ],
        };
        managerByDevelopment.set(developmentId, next);
      }

      return rows.map(row => {
        const developmentId = Number(row.developmentId);
        const published = boolFromTinyInt(row.isPublished);
        const unitSummary = unitSummaryByDevelopment.get(developmentId);
        const fallbackPriceFrom = toNumberOrNull(row.developmentPriceFrom);
        const fallbackPriceTo = toNumberOrNull(row.developmentPriceTo);
        const priceFrom = unitSummary?.priceFrom ?? fallbackPriceFrom;
        const priceTo = unitSummary?.priceTo ?? fallbackPriceTo;
        const hasProgram = Boolean(row.programId);
        const programId = Number(row.programId || 0);
        const managerInfo = managerByDevelopment.get(developmentId);
        const hasPrimaryManager = Boolean(managerInfo?.hasPrimaryManager);

        const activationReadiness = hasProgram
          ? getProgramActivationReadiness({
              commissionModel: row.commissionModel as
                | 'flat_percentage'
                | 'tiered_percentage'
                | 'fixed_amount'
                | 'hybrid',
              defaultCommissionPercent: toNumberOrNull(row.defaultCommissionPercent),
              defaultCommissionAmount: toNumberOrNull(row.defaultCommissionAmount),
              tierAccessPolicy: row.tierAccessPolicy as 'open' | 'restricted' | 'invite_only',
              payoutMilestone: row.payoutMilestone as
                | 'attorney_instruction'
                | 'attorney_signing'
                | 'bond_approval'
                | 'transfer_registration'
                | 'occupation'
                | 'custom',
              currencyCode: row.currencyCode ? String(row.currencyCode) : null,
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
          networkStatus,
          program: hasProgram
            ? {
                id: programId,
                isActive: boolFromTinyInt(row.programIsActive),
                isReferralEnabled: boolFromTinyInt(row.isReferralEnabled),
                commissionModel: row.commissionModel,
                defaultCommissionPercent: toNumberOrNull(row.defaultCommissionPercent),
                defaultCommissionAmount: toNumberOrNull(row.defaultCommissionAmount),
                tierAccessPolicy: row.tierAccessPolicy,
                payoutMilestone: row.payoutMilestone,
                payoutMilestoneNotes: row.payoutMilestoneNotes,
                currencyCode: row.currencyCode,
                updatedAt: row.programUpdatedAt,
                hasPrimaryManager,
                managerAssignments: managerInfo?.assignments || [],
                activationReadiness,
              }
            : null,
          developmentUpdatedAt: row.developmentUpdatedAt,
        };
      });
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
            const [insertResult] = await db.insert(distributionPrograms).values(payload);
            return { id: Number((insertResult as any).insertId || 0) };
          },
        },
      );

      return {
        success: true,
        mode: ensured.created ? ('created' as const) : ('existing' as const),
        programId: ensured.programId,
      };
    }),

  setProgramReferralEnabled: superAdminProcedure
    .input(
      z.object({
        developmentId: z.number().int().positive(),
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      if (!input.enabled) {
        await db
          .update(distributionPrograms)
          .set({
            isReferralEnabled: 0,
            updatedBy: ctx.user.id,
          })
          .where(eq(distributionPrograms.developmentId, input.developmentId));

        return {
          success: true,
          developmentId: input.developmentId,
          enabled: false,
        };
      }

      const readiness = await getProgramReadinessByDevelopmentId(input.developmentId);
      if (!readiness.canEnableReferral) {
        const error = new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Program is not ready to enable referrals.',
        }) as TRPCError & {
          data?: {
            errorCode: 'PROGRAM_NOT_READY';
            blockers: typeof readiness.blockers;
            state: typeof readiness.state;
          };
        };
        error.data = {
          errorCode: 'PROGRAM_NOT_READY',
          blockers: readiness.blockers,
          state: readiness.state,
        };
        throw error;
      }

      await db
        .update(distributionPrograms)
        .set({
          isReferralEnabled: 1,
          updatedBy: ctx.user.id,
        })
        .where(eq(distributionPrograms.developmentId, input.developmentId));

      return {
        success: true,
        developmentId: input.developmentId,
        programId: readiness.programId,
        enabled: true,
      };
    }),

  getProgramReadiness: superAdminProcedure
    .input(
      z.object({
        developmentId: z.number().int().positive(),
      }),
    )
    .query(async ({ input }) => {
      assertDistributionEnabled();
      return await getProgramReadinessByDevelopmentId(input.developmentId);
    }),

  getDevelopmentRequiredDocuments: superAdminProcedure
    .input(
      z.object({
        developmentId: z.number().int().positive(),
      }),
    )
    .query(async ({ input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const rows = await db
        .select({
          id: developmentRequiredDocuments.id,
          developmentId: developmentRequiredDocuments.developmentId,
          documentCode: developmentRequiredDocuments.documentCode,
          documentLabel: developmentRequiredDocuments.documentLabel,
          isRequired: developmentRequiredDocuments.isRequired,
          sortOrder: developmentRequiredDocuments.sortOrder,
          isActive: developmentRequiredDocuments.isActive,
        })
        .from(developmentRequiredDocuments)
        .where(eq(developmentRequiredDocuments.developmentId, input.developmentId))
        .orderBy(developmentRequiredDocuments.sortOrder, developmentRequiredDocuments.id);

      return rows.map(row => ({
        id: Number(row.id),
        developmentId: Number(row.developmentId),
        documentCode: String(row.documentCode),
        documentLabel: String(row.documentLabel || ''),
        isRequired: boolFromTinyInt(row.isRequired),
        sortOrder: Number(row.sortOrder || 0),
        isActive: boolFromTinyInt(row.isActive),
      }));
    }),

  setDevelopmentRequiredDocuments: superAdminProcedure
    .input(
      z.object({
        developmentId: z.number().int().positive(),
        documents: z.array(
          z.object({
            id: z.number().int().positive().optional(),
            documentCode: z.enum([
              'id_document',
              'proof_of_address',
              'proof_of_income',
              'bank_statement',
              'pre_approval',
              'signed_offer_to_purchase',
              'sale_agreement',
              'attorney_instruction_letter',
              'transfer_documents',
              'custom',
            ]),
            documentLabel: z.string().trim().min(2).max(160),
            isRequired: z.boolean().default(true),
            sortOrder: z.number().int().min(0).default(0),
            isActive: z.boolean().default(true),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const result = await db.transaction(async tx => {
        const existing = await tx
          .select({
            id: developmentRequiredDocuments.id,
          })
          .from(developmentRequiredDocuments)
          .where(eq(developmentRequiredDocuments.developmentId, input.developmentId));

        const existingIdSet = new Set<number>(existing.map(row => Number(row.id)));
        const retainedIds = new Set<number>();

        for (const document of input.documents) {
          if (document.id && existingIdSet.has(document.id)) {
            retainedIds.add(document.id);
            await tx
              .update(developmentRequiredDocuments)
              .set({
                documentCode: document.documentCode,
                documentLabel: document.documentLabel,
                isRequired: document.isRequired ? 1 : 0,
                sortOrder: document.sortOrder,
                isActive: document.isActive ? 1 : 0,
              })
              .where(
                and(
                  eq(developmentRequiredDocuments.id, document.id),
                  eq(developmentRequiredDocuments.developmentId, input.developmentId),
                ),
              );
            continue;
          }

          const [insertResult] = await tx.insert(developmentRequiredDocuments).values({
            developmentId: input.developmentId,
            documentCode: document.documentCode,
            documentLabel: document.documentLabel,
            isRequired: document.isRequired ? 1 : 0,
            sortOrder: document.sortOrder,
            isActive: document.isActive ? 1 : 0,
          });
          const insertedId = Number((insertResult as any).insertId || 0);
          if (insertedId > 0) retainedIds.add(insertedId);
        }

        const idsToDeactivate = existing
          .map(row => Number(row.id))
          .filter(id => !retainedIds.has(id));
        if (idsToDeactivate.length) {
          await tx
            .update(developmentRequiredDocuments)
            .set({ isActive: 0 })
            .where(inArray(developmentRequiredDocuments.id, idsToDeactivate));
        }

        const rows = await tx
          .select({
            id: developmentRequiredDocuments.id,
            developmentId: developmentRequiredDocuments.developmentId,
            documentCode: developmentRequiredDocuments.documentCode,
            documentLabel: developmentRequiredDocuments.documentLabel,
            isRequired: developmentRequiredDocuments.isRequired,
            sortOrder: developmentRequiredDocuments.sortOrder,
            isActive: developmentRequiredDocuments.isActive,
          })
          .from(developmentRequiredDocuments)
          .where(eq(developmentRequiredDocuments.developmentId, input.developmentId))
          .orderBy(developmentRequiredDocuments.sortOrder, developmentRequiredDocuments.id);

        return rows.map(row => ({
          id: Number(row.id),
          developmentId: Number(row.developmentId),
          documentCode: String(row.documentCode),
          documentLabel: String(row.documentLabel || ''),
          isRequired: boolFromTinyInt(row.isRequired),
          sortOrder: Number(row.sortOrder || 0),
          isActive: boolFromTinyInt(row.isActive),
        }));
      });

      return {
        success: true,
        developmentId: input.developmentId,
        documents: result,
      };
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

      const warnings =
        input.isActive === true
          ? (await getProgramReadinessByDevelopmentId(Number(program.developmentId))).blockers
          : [];

      return {
        success: true,
        programId: input.programId,
        isActive: input.isActive,
        warnings,
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

      await db
        .insert(distributionManagerAssignments)
        .values({
          developmentId: program.developmentId,
          managerUserId: input.managerUserId,
          isPrimary: input.isPrimary ? 1 : 0,
          workloadCapacity: input.workloadCapacity,
          timezone: input.timezone ?? null,
          isActive: input.isActive ? 1 : 0,
          assignedAt: normalizeDateForSql(new Date()),
        })
        .onDuplicateKeyUpdate({
          set: {
            developmentId: program.developmentId,
            isPrimary: input.isPrimary ? 1 : 0,
            workloadCapacity: input.workloadCapacity,
            timezone: input.timezone ?? null,
            isActive: input.isActive ? 1 : 0,
            assignedAt: normalizeDateForSql(new Date()),
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
      const program = await getProgramById(db, input.programId);
      if (!program) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Distribution program not found.' });
      }

      if (input.hardDelete) {
        await db
          .delete(distributionManagerAssignments)
          .where(
            and(
              eq(distributionManagerAssignments.developmentId, Number(program.developmentId)),
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
        .set({ isActive: 0, updatedAt: normalizeDateForSql(new Date()) })
        .where(
          and(
            eq(distributionManagerAssignments.developmentId, Number(program.developmentId)),
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
      let resolvedDevelopmentId = input.developmentId;

      if (typeof input.programId === 'number') {
        const program = await getProgramById(db, input.programId);
        if (!program) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Distribution program not found.' });
        }
        resolvedDevelopmentId = Number(program.developmentId);
      }

      if (typeof resolvedDevelopmentId === 'number') {
        conditions.push(eq(distributionManagerAssignments.developmentId, resolvedDevelopmentId));
      }

      if (!input.includeInactive) {
        conditions.push(eq(distributionManagerAssignments.isActive, 1));
      }

      const rows = await db
        .select({
          assignmentId: distributionManagerAssignments.id,
          programId: distributionPrograms.id,
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
          eq(distributionManagerAssignments.developmentId, distributionPrograms.developmentId),
        )
        .innerJoin(developments, eq(distributionManagerAssignments.developmentId, developments.id))
        .innerJoin(users, eq(distributionManagerAssignments.managerUserId, users.id))
        .where(withConditions(conditions))
        .orderBy(desc(distributionManagerAssignments.assignedAt));

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

  listManagerCandidates: superAdminProcedure
    .input(
      z.object({
        search: z.string().trim().min(1).max(200).optional(),
        limit: z.number().int().min(1).max(200).default(50),
      }),
    )
    .query(async ({ input }) => {
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
          inviteUrl: `${ENV.appUrl}/distribution/manager/onboarding?registrationId=${Number(
            existingPending.id,
          )}&email=${encodeURIComponent(normalizedEmail)}`,
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

      const registrationId = Number((insertResult as any).insertId || 0);
      return {
        success: true,
        mode: 'created' as const,
        registrationId,
        email: normalizedEmail,
        inviteUrl: `${ENV.appUrl}/distribution/manager/onboarding?registrationId=${registrationId}&email=${encodeURIComponent(
          normalizedEmail,
        )}`,
      };
    }),

  resendManagerInvite: superAdminProcedure
    .input(
      z.object({
        registrationId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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
        inviteUrl: `${ENV.appUrl}/distribution/manager/onboarding?registrationId=${Number(
          registration.id,
        )}&email=${encodeURIComponent(normalizedEmail)}`,
      };
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

      if (toStage === 'cancelled' || toStage === 'commission_paid') {
        updatePayload.closedAt = sql`CURRENT_TIMESTAMP`;
      } else if (input.force && deal.closedAt) {
        updatePayload.closedAt = null;
      }

      await db.transaction(async tx => {
        await tx
          .update(distributionDeals)
          .set(updatePayload)
          .where(eq(distributionDeals.id, deal.id));

        await ensureCommissionEntryForDeal({
          deal: {
            id: Number(deal.id),
            programId: Number(deal.programId),
            developmentId: Number(deal.developmentId),
            agentId: Number(deal.agentId),
            commissionTriggerStage: deal.commissionTriggerStage as
              | 'contract_signed'
              | 'bond_approved',
          },
          transitionToStage: toStage,
          actorUserId: ctx.user.id,
          source: 'admin.transitionDealStage',
          deps: {
            findExistingEntry: async (dealId, triggerStage) => {
              const [row] = await tx
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
              const [program] = await tx
                .select({
                  commissionModel: distributionPrograms.commissionModel,
                  defaultCommissionPercent: distributionPrograms.defaultCommissionPercent,
                  defaultCommissionAmount: distributionPrograms.defaultCommissionAmount,
                })
                .from(distributionPrograms)
                .where(eq(distributionPrograms.id, programId))
                .limit(1);
              return program || null;
            },
            insertEntry: async payload => {
              await tx.insert(distributionCommissionEntries).values(payload);
            },
            setDealCommissionPending: async dealId => {
              await tx
                .update(distributionDeals)
                .set({ commissionStatus: 'pending' })
                .where(eq(distributionDeals.id, dealId));
            },
            insertCommissionCreatedEvent: async ({ dealId, toStage, actorUserId, metadata }) => {
              await tx.insert(distributionDealEvents).values({
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

        await tx.insert(distributionDealEvents).values({
          dealId: deal.id,
          fromStage,
          toStage,
          eventType: input.force ? 'override' : 'stage_transition',
          actorUserId: ctx.user.id,
          metadata: {
            force: input.force,
            previousCommissionStatus: deal.commissionStatus,
            nextCommissionStatus: commissionStatus,
          } as any,
          notes: input.notes ?? null,
        });
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
      }));
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

      const nextDealCommissionStatus =
        nextStatus === 'approved' ? 'approved' : nextStatus === 'pending' ? 'pending' : nextStatus;
      const nextDealStage: DistributionDealStage =
        nextStatus === 'paid'
          ? 'commission_paid'
          : nextStatus === 'cancelled'
            ? 'cancelled'
            : (deal.currentStage as DistributionDealStage);

      if (
        entry.entryStatus === nextStatus &&
        typeof input.notes === 'undefined' &&
        typeof input.paymentReference === 'undefined'
      ) {
        return {
          success: true,
          entryId: entry.id,
          entryStatus: entry.entryStatus,
          dealId: deal.id,
          dealStage: deal.currentStage as DistributionDealStage,
          dealCommissionStatus: deal.commissionStatus,
        };
      }

      const dealUpdatePayload: Record<string, unknown> = {
        commissionStatus: nextDealCommissionStatus,
      };
      if (nextStatus === 'paid' || nextStatus === 'cancelled') {
        dealUpdatePayload.currentStage = nextDealStage;
        dealUpdatePayload.closedAt = sql`CURRENT_TIMESTAMP`;
      }

      await db.transaction(async tx => {
        await tx
          .update(distributionCommissionEntries)
          .set(updatePayload)
          .where(eq(distributionCommissionEntries.id, entry.id));

        await tx
          .update(distributionDeals)
          .set(dealUpdatePayload)
          .where(eq(distributionDeals.id, deal.id));

        await tx.insert(distributionDealEvents).values({
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
        programId: distributionPrograms.id,
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
        eq(distributionManagerAssignments.developmentId, distributionPrograms.developmentId),
      )
      .innerJoin(developments, eq(distributionManagerAssignments.developmentId, developments.id))
      .where(withConditions(conditions))
      .orderBy(desc(distributionManagerAssignments.assignedAt));

    return rows.map(row => ({
      ...row,
      isPrimary: boolFromTinyInt(row.isPrimary),
      isActive: boolFromTinyInt(row.isActive),
    }));
  }),

  getAssignedDevelopments: protectedProcedure.query(async ({ ctx }) => {
    assertDistributionEnabled();
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    await assertDistributionIdentity(db, ctx.user!, 'manager');

    const conditions: SQL[] = [eq(distributionManagerAssignments.isActive, 1)];
    if (ctx.user!.role !== 'super_admin') {
      conditions.push(eq(distributionManagerAssignments.managerUserId, ctx.user!.id));
    }

    const rows = await db
      .select({
        developmentId: distributionManagerAssignments.developmentId,
        developmentName: developments.name,
        city: developments.city,
        province: developments.province,
        assignedAt: distributionManagerAssignments.assignedAt,
        isPrimary: distributionManagerAssignments.isPrimary,
      })
      .from(distributionManagerAssignments)
      .innerJoin(developments, eq(distributionManagerAssignments.developmentId, developments.id))
      .where(withConditions(conditions))
      .orderBy(desc(distributionManagerAssignments.assignedAt));

    return rows.map(row => ({
      developmentId: Number(row.developmentId),
      developmentName: String(row.developmentName || `Development #${row.developmentId}`),
      city: row.city || null,
      province: row.province || null,
      assignedAt: row.assignedAt,
      isPrimary: boolFromTinyInt(row.isPrimary),
    }));
  }),

  listDealsForDevelopment: protectedProcedure
    .input(
      z.object({
        developmentId: z.number().int().positive(),
        statusFilter: z.enum(['needs_docs', 'all']).default('needs_docs'),
        limit: z.number().int().min(1).max(500).default(100),
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

      const requiredTemplates = await db
        .select({
          id: developmentRequiredDocuments.id,
        })
        .from(developmentRequiredDocuments)
        .where(
          and(
            eq(developmentRequiredDocuments.developmentId, input.developmentId),
            eq(developmentRequiredDocuments.isActive, 1),
            eq(developmentRequiredDocuments.isRequired, 1),
          ),
        );

      const requiredTemplateIds = requiredTemplates.map(row => Number(row.id));
      const requiredCount = requiredTemplateIds.length;

      const dealRows = await db
        .select({
          dealId: distributionDeals.id,
          externalRef: distributionDeals.externalRef,
          buyerName: distributionDeals.buyerName,
          createdAt: distributionDeals.createdAt,
        })
        .from(distributionDeals)
        .where(eq(distributionDeals.developmentId, input.developmentId))
        .orderBy(desc(distributionDeals.createdAt))
        .limit(input.limit);

      if (!dealRows.length) {
        return [];
      }

      const dealIds = dealRows.map(row => Number(row.dealId));
      const dealDocsRows =
        dealIds.length && requiredTemplateIds.length
          ? await db
              .select({
                dealId: distributionDealDocuments.dealId,
                templateId: distributionDealDocuments.developmentRequiredDocumentId,
                status: distributionDealDocuments.status,
              })
              .from(distributionDealDocuments)
              .where(
                and(
                  inArray(distributionDealDocuments.dealId, dealIds),
                  inArray(
                    distributionDealDocuments.developmentRequiredDocumentId,
                    requiredTemplateIds,
                  ),
                ),
              )
          : [];

      const docStateByDealId = new Map<
        number,
        {
          verifiedTemplateIds: Set<number>;
          hasRejections: boolean;
        }
      >();

      for (const row of dealDocsRows) {
        const dealId = Number(row.dealId);
        const templateId = Number(row.templateId);
        const existing = docStateByDealId.get(dealId) || {
          verifiedTemplateIds: new Set<number>(),
          hasRejections: false,
        };
        if (row.status === 'verified') {
          existing.verifiedTemplateIds.add(templateId);
        }
        if (row.status === 'rejected') {
          existing.hasRejections = true;
        }
        docStateByDealId.set(dealId, existing);
      }

      const rows = dealRows
        .map(row => {
          const dealId = Number(row.dealId);
          const docState = docStateByDealId.get(dealId) || {
            verifiedTemplateIds: new Set<number>(),
            hasRejections: false,
          };
          const verifiedRequiredCount = docState.verifiedTemplateIds.size;
          const needsDocs =
            requiredCount === 0 || verifiedRequiredCount < requiredCount || docState.hasRejections;

          return {
            dealId,
            dealRef: String(row.externalRef || `DEAL-${dealId}`),
            buyerName: row.buyerName || null,
            createdAt: row.createdAt,
            docs: {
              requiredCount,
              verifiedRequiredCount,
              hasRejections: docState.hasRejections,
            },
            needsDocs,
          };
        })
        .filter(row => (input.statusFilter === 'needs_docs' ? row.needsDocs : true))
        .map(({ needsDocs: _needsDocs, ...row }) => row);

      return rows;
    }),

  getDealChecklist: protectedProcedure
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

      return await getDealChecklist(input.dealId, ctx.user!.id, {
        skipAssignmentCheck: ctx.user!.role === 'super_admin',
      });
    }),

  updateDealDocumentStatus: protectedProcedure
    .input(
      z.object({
        dealId: z.number().int().positive(),
        templateId: z.number().int().positive(),
        status: z.enum(['pending', 'received', 'verified', 'rejected']),
        notes: z.string().max(2000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      await assertDistributionIdentity(db, ctx.user!, 'manager');

      return await upsertDealDocumentStatus(
        {
          dealId: input.dealId,
          templateId: input.templateId,
          status: input.status,
          notes: input.notes,
        },
        ctx.user!.id,
        { skipAssignmentCheck: ctx.user!.role === 'super_admin' },
      );
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
              eq(distributionManagerAssignments.developmentId, deal.developmentId),
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

      await db.transaction(async tx => {
        await tx
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
          await tx
            .update(distributionDeals)
            .set({ managerUserId })
            .where(eq(distributionDeals.id, deal.id));
        }

        await tx.insert(distributionDealEvents).values({
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
      });

      const viewing = await getViewingByDealId(db, deal.id);
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
          const scopedProgramIds = await getActiveManagerProgramIdsForUser(db, ctx.user!.id);
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

      const viewingStatus: (typeof DISTRIBUTION_VIEWING_STATUS_VALUES)[number] =
        input.outcome === 'no_show'
          ? 'no_show'
          : input.outcome === 'cancelled'
            ? 'cancelled'
            : 'completed';

      const dealUpdate: Record<string, unknown> = {
        currentStage: nextStage,
        managerUserId: deal.managerUserId ?? ctx.user!.id,
      };
      // Attribution lock cleanup: no longer set here (set at booking)

      const resolvedAttributionLockAt =
        (dealUpdate.attributionLockedAt as string | null | undefined) ?? attributionLockAt;
      const resolvedAttributionLockApplied = Boolean(resolvedAttributionLockAt);

      await db.transaction(async tx => {
        // Attribution lock is now set at booking (submitDeal). No lock logic here.
        await tx.insert(distributionViewingValidations).values({
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

        await tx
          .update(distributionViewings)
          .set({
            status: viewingStatus,
            managerUserId: ctx.user!.id,
          })
          .where(eq(distributionViewings.dealId, deal.id));

        await tx.update(distributionDeals).set(dealUpdate).where(eq(distributionDeals.id, deal.id));

        await tx.insert(distributionDealEvents).values({
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
        const scopedProgramIds = await getActiveManagerProgramIdsForUser(db, ctx.user!.id);
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

  // Manager-controlled deal stage progression
  // Operator controls all forward transitions after viewing completion.
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

      if (fromStage === toStage) {
        return {
          success: true,
          dealId: deal.id,
          stage: fromStage,
          commissionStatus: deal.commissionStatus,
        };
      }

      // Viewing expiry check
      // If deal is still at viewing_scheduled and TTL expired -> auto-cancel
      if (fromStage === 'viewing_scheduled' && deal.submittedAt) {
        const bookingDate = new Date(deal.submittedAt);
        const expiryDate = new Date(
          bookingDate.getTime() + VIEWING_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
        );
        if (new Date() > expiryDate) {
          await db.transaction(async tx => {
            await tx
              .update(distributionDeals)
              .set({
                currentStage: 'cancelled',
                closedAt: sql`CURRENT_TIMESTAMP`,
              })
              .where(eq(distributionDeals.id, deal.id));
            await tx.insert(distributionDealEvents).values({
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
          });
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: `Deal expired: viewing not completed within ${VIEWING_EXPIRY_DAYS} days. Deal auto-cancelled.`,
          });
        }
      }

      // Attribution null-check
      // Protect legacy anomalies: if lock missing on non-initial stage, reject progression.
      if (!deal.attributionLockedAt && fromStage !== 'viewing_scheduled') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Attribution lock missing. Cannot progress deal without valid attribution lock.',
        });
      }

      // Post-accrual cancellation guard
      // Once fees accrue, manager cannot cancel. Requires admin override.
      if (toStage === 'cancelled' && ACCRUAL_PROTECTED_STAGES.includes(fromStage)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot cancel after fee accrual. Requires admin override with ledger reversal.',
        });
      }

      // Cancellation requires rejection reason
      if (toStage === 'cancelled' && !input.rejectionReason) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Rejection reason is required when cancelling a deal.',
        });
      }

      // Validate transition
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

      if (toStage === 'cancelled') {
        updatePayload.closedAt = sql`CURRENT_TIMESTAMP`;
      }

      await db.transaction(async tx => {
        await tx
          .update(distributionDeals)
          .set(updatePayload)
          .where(eq(distributionDeals.id, deal.id));

        await ensureCommissionEntryForDeal({
          deal: {
            id: Number(deal.id),
            programId: Number(deal.programId),
            developmentId: Number(deal.developmentId),
            agentId: Number(deal.agentId),
            commissionTriggerStage: deal.commissionTriggerStage as
              | 'contract_signed'
              | 'bond_approved',
          },
          transitionToStage: toStage,
          actorUserId: ctx.user!.id,
          source: 'manager.advanceDealStage',
          deps: {
            findExistingEntry: async (dealId, triggerStage) => {
              const [row] = await tx
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
              const [program] = await tx
                .select({
                  commissionModel: distributionPrograms.commissionModel,
                  defaultCommissionPercent: distributionPrograms.defaultCommissionPercent,
                  defaultCommissionAmount: distributionPrograms.defaultCommissionAmount,
                })
                .from(distributionPrograms)
                .where(eq(distributionPrograms.id, programId))
                .limit(1);
              return program || null;
            },
            insertEntry: async payload => {
              await tx.insert(distributionCommissionEntries).values(payload);
            },
            setDealCommissionPending: async dealId => {
              await tx
                .update(distributionDeals)
                .set({ commissionStatus: 'pending' })
                .where(eq(distributionDeals.id, dealId));
            },
            insertCommissionCreatedEvent: async ({ dealId, toStage, actorUserId, metadata }) => {
              await tx.insert(distributionDealEvents).values({
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

        await tx.insert(distributionDealEvents).values({
          dealId: deal.id,
          fromStage,
          toStage,
          eventType: 'stage_transition',
          actorUserId: ctx.user!.id,
          metadata: {
            source: 'manager.advanceDealStage',
            previousCommissionStatus: deal.commissionStatus,
            nextCommissionStatus: commissionStatus,
            rejectionReason: input.rejectionReason ?? null,
          } as any,
          notes: input.notes ?? null,
        });
      });

      return {
        success: true,
        dealId: deal.id,
        stage: toStage,
        commissionStatus,
      };
    }),
});

const partnerDistributionRouter = router({
  listEligibleDevelopmentsForSubmission: protectedProcedure
    .input(
      z
        .object({
          brandProfileId: z.number().int().positive().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await assertPartnerTermsAccess(db, ctx.user!);

      return await listPartnerProgramTerms({
        brandProfileId: input?.brandProfileId,
        includeDisabled: false,
      });
    }),

  listProgramTerms: protectedProcedure
    .input(
      z
        .object({
          brandProfileId: z.number().int().positive().optional(),
          developmentIds: z.array(z.number().int().positive()).max(200).optional(),
          includeDisabled: z.boolean().default(false),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await assertPartnerTermsAccess(db, ctx.user!);

      return await listPartnerProgramTerms({
        brandProfileId: input?.brandProfileId,
        developmentIds: input?.developmentIds,
        includeDisabled: input?.includeDisabled ?? false,
      });
    }),

  submitReferral: protectedProcedure
    .input(
      z.object({
        developmentId: z.number().int().positive(),
        buyerName: z.string().trim().max(200).optional(),
        buyerPhone: z.string().trim().max(50).optional(),
        buyerEmail: z.string().email().max(320).optional(),
        notes: z.string().max(2000).nullable().optional(),
        clientReference: z.string().trim().max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await assertPartnerTermsAccess(db, ctx.user!);

      return await createReferralDeal({
        actorUserId: Number(ctx.user!.id),
        actorRole: String(ctx.user!.role || ''),
        developmentId: input.developmentId,
        buyerName: input.buyerName ?? null,
        buyerPhone: input.buyerPhone ?? null,
        buyerEmail: input.buyerEmail ?? null,
        notes: input.notes ?? null,
        clientReference: input.clientReference ?? null,
      });
    }),

  listMyReferrals: protectedProcedure
    .input(
      z
        .object({
          status: z.string().trim().max(64).optional(),
          developmentId: z.number().int().positive().optional(),
          limit: z.number().int().min(1).max(100).default(20),
          cursor: z.string().trim().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await assertPartnerTermsAccess(db, ctx.user!);

      return await listMyReferralDeals({
        actorUserId: Number(ctx.user!.id),
        actorRole: String(ctx.user!.role || ''),
        status: input?.status,
        developmentId: input?.developmentId,
        limit: input?.limit ?? 20,
        cursor: input?.cursor,
      });
    }),

  getReferral: protectedProcedure
    .input(
      z.object({
        dealId: z.number().int().positive(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await assertPartnerTermsAccess(db, ctx.user!);

      return await getMyReferralDeal({
        actorUserId: Number(ctx.user!.id),
        actorRole: String(ctx.user!.role || ''),
        dealId: input.dealId,
      });
    }),

  getProgramTerms: protectedProcedure
    .input(
      z.object({
        developmentId: z.number().int().positive(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertDistributionEnabled();
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await assertPartnerTermsAccess(db, ctx.user!);

      const item = await getPartnerProgramTermsByDevelopmentId(input.developmentId);
      if (!item) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Program terms not found for this development.',
        });
      }

      return item;
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
          developmentStatus: row.developmentStatus || null,
          unitTypes: unitTypesByDevelopment.get(developmentId) || [],
          priceFrom: row.priceFrom ? Number(row.priceFrom) : null,
          priceTo: row.priceTo ? Number(row.priceTo) : null,
        };
      });
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
      await db.transaction(async tx => {
        await tx
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

        await tx.insert(distributionDealEvents).values({
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

      // Deterministic duplicate check: email OR phone per development
      // Excludes cancelled deals to prevent permanent inventory lock.
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
              sql`${distributionDeals.currentStage} != 'cancelled'`,
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
        await db.transaction(async tx => {
          const [insertResult] = await tx.insert(distributionDeals).values({
            programId: input.programId,
            developmentId: program.developmentId,
            agentId,
            managerUserId,
            externalRef: normalizedExternalRef,
            buyerName: input.buyerName.trim(),
            buyerEmail: input.buyerEmail ?? null,
            buyerPhone: input.buyerPhone ?? null,
            currentStage: 'viewing_scheduled',
            commissionStatus: 'not_ready',
          });
          insertedDealId = Number((insertResult as any).insertId || 0);
          if (insertedDealId <= 0) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to create distribution deal.',
            });
          }

          await tx
            .update(distributionDeals)
            .set({
              attributionLockedAt: sql`CURRENT_TIMESTAMP`,
              attributionLockedBy: ctx.user!.id,
            })
            .where(eq(distributionDeals.id, insertedDealId));

          if (scheduledViewingStartAt && managerUserId) {
            await tx.insert(distributionViewings).values({
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

          await tx.insert(distributionDealEvents).values({
            dealId: insertedDealId,
            fromStage: null,
            toStage: 'viewing_scheduled',
            eventType: 'system',
            actorUserId: ctx.user!.id,
            metadata: {
              submittedVia: 'referrer.submitDeal',
              managerAssigned: managerUserId,
              programId: input.programId,
              attributionLockedAtBooking: true,
              viewingScheduled: Boolean(scheduledViewingStartAt),
              referralContext: normalizedReferralContext,
            } as any,
            notes: input.notes ?? null,
          });
        });
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

      return {
        success: true,
        dealId: insertedDealId,
        stage: 'viewing_scheduled' as const,
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
        return {
          success: true,
          dealId: deal.id,
          stage: toStage,
          commissionStatus: 'cancelled' as const,
        };
      }

      await db.transaction(async tx => {
        await tx
          .update(distributionDeals)
          .set({
            currentStage: toStage,
            commissionStatus: 'cancelled',
            closedAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(eq(distributionDeals.id, deal.id));

        await tx.insert(distributionDealEvents).values({
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
          buyerName: distributionDeals.buyerName,
          buyerEmail: distributionDeals.buyerEmail,
          buyerPhone: distributionDeals.buyerPhone,
          currentStage: distributionDeals.currentStage,
          commissionStatus: distributionDeals.commissionStatus,
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

      const stageCounts = Object.fromEntries(
        DISTRIBUTION_PIPELINE_STAGE_ORDER.map(stage => [stage, 0]),
      ) as Record<(typeof DISTRIBUTION_PIPELINE_STAGE_ORDER)[number], number>;

      const rows = deals.map(deal => {
        const stage = deal.currentStage as (typeof DISTRIBUTION_PIPELINE_STAGE_ORDER)[number];
        stageCounts[stage] = (stageCounts[stage] || 0) + 1;

        const validation = latestValidationByDeal.get(deal.id);
        return {
          ...deal,
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
        };
      });

      return {
        stageOrder: DISTRIBUTION_PIPELINE_STAGE_ORDER,
        stageCounts,
        deals: rows,
      };
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
  partner: partnerDistributionRouter,
  referrer: referrerDistributionRouter,
  agent: referrerDistributionRouter,
  developer: developerDistributionRouter,
});
