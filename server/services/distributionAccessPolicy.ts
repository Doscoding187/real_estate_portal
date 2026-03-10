import { TRPCError } from '@trpc/server';
import { and, eq, sql } from 'drizzle-orm';

import {
  developments,
  distributionManagerAssignments,
  distributionPrograms,
  DISTRIBUTION_BRAND_PARTNERSHIP_STATUS_VALUES,
  DISTRIBUTION_DEVELOPMENT_ACCESS_STATUS_VALUES,
} from '../../drizzle/schema';
import { getDb } from '../db';
import { getProgramActivationReadiness } from './distributionProgramService';
import {
  getBrandPartnershipByBrandProfileId,
  getDevelopmentAccessByDevelopmentId,
  type DistributionBrandPartnershipRow,
  type DistributionDevelopmentAccessRow,
} from './distributionAccessRepository';

type DbHandle = NonNullable<Awaited<ReturnType<typeof getDb>>>;

const DISTRIBUTION_INVENTORY_STATE_VALUES = [
  'hidden',
  'listed',
  'accessible',
  'ready',
  'enabled',
] as const;

type BrandPartnershipStatus = (typeof DISTRIBUTION_BRAND_PARTNERSHIP_STATUS_VALUES)[number];
type DevelopmentAccessStatus = (typeof DISTRIBUTION_DEVELOPMENT_ACCESS_STATUS_VALUES)[number];
type DistributionInventoryState = (typeof DISTRIBUTION_INVENTORY_STATE_VALUES)[number];

type ActorRole = 'admin' | 'manager' | 'referrer' | 'public';
type DistributionAccessChannel = 'admin_catalog' | 'submission';

export type DevelopmentDistributionAccessEvaluation = {
  brandProfileId: number | null;
  brandPartnershipId: number | null;
  brandPartnershipStatus: BrandPartnershipStatus | null;
  developmentAccessId: number | null;
  developmentAccessStatus: DevelopmentAccessStatus | null;
  developmentVisible: boolean;
  brandPartnered: boolean;
  developmentIncluded: boolean;
  submissionAllowed: boolean;
  excludedByMandate: boolean;
  excludedByExclusivity: boolean;
  programExists: boolean;
  programActive: boolean;
  referralEnabled: boolean;
  readiness: {
    configured: boolean;
    ready: boolean;
    reasons: string[];
  };
  inventoryState: DistributionInventoryState;
  submitReady: boolean;
  reasons: string[];
  legacyFallbackUsed: boolean;
};

export type DistributionBlockerSummary = {
  accessBlockers: string[];
  readinessBlockers: string[];
  programBlockers: string[];
};

function boolFromTinyInt(value: unknown) {
  return Number(value || 0) === 1;
}

function deriveLegacyFallback(input: {
  brandProfileId: number | null;
  developmentVisible: boolean;
  programExists: boolean;
  programActive: boolean;
  referralEnabled: boolean;
}) {
  if (!input.brandProfileId) {
    return {
      partnershipStatus: null,
      accessStatus: null,
      submissionAllowed: false,
      legacyFallbackUsed: false,
      fallbackReason: null,
    };
  }

  if (input.programExists) {
    return {
      partnershipStatus: 'active' as const,
      accessStatus: 'included' as const,
      submissionAllowed: input.programActive && input.referralEnabled,
      legacyFallbackUsed: true,
      fallbackReason: 'legacy_fallback_program_present',
    };
  }

  if (input.developmentVisible) {
    return {
      partnershipStatus: 'pending' as const,
      accessStatus: 'listed' as const,
      submissionAllowed: false,
      legacyFallbackUsed: true,
      fallbackReason: 'legacy_fallback_brand_linked_visible',
    };
  }

  return {
    partnershipStatus: null,
    accessStatus: null,
    submissionAllowed: false,
    legacyFallbackUsed: false,
    fallbackReason: null,
  };
}

// Brand profile visibility is not partnership truth.
// Development inclusion is not readiness truth.
// Only enabled developments may accept submissions.
export function deriveInventoryState(input: {
  developmentVisible: boolean;
  brandPartnershipStatus: BrandPartnershipStatus | null;
  developmentAccessStatus: DevelopmentAccessStatus | null;
  submissionAllowed: boolean;
  readinessReady: boolean;
  referralEnabled: boolean;
  excludedByMandate: boolean;
  excludedByExclusivity: boolean;
}): DistributionInventoryState {
  if (!input.developmentVisible) return 'hidden';

  if (
    input.brandPartnershipStatus !== 'active' ||
    input.developmentAccessStatus === null ||
    input.developmentAccessStatus === 'listed' ||
    input.developmentAccessStatus === 'excluded' ||
    input.developmentAccessStatus === 'paused' ||
    input.excludedByMandate ||
    input.excludedByExclusivity
  ) {
    return 'listed';
  }

  if (input.developmentAccessStatus === 'included' && !input.readinessReady) {
    return 'accessible';
  }

  if (
    input.developmentAccessStatus === 'included' &&
    input.readinessReady &&
    (!input.submissionAllowed || !input.referralEnabled)
  ) {
    return 'ready';
  }

  if (
    input.developmentAccessStatus === 'included' &&
    input.readinessReady &&
    input.submissionAllowed &&
    input.referralEnabled
  ) {
    return 'enabled';
  }

  return 'listed';
}

function buildReasons(input: {
  brandProfileId: number | null;
  partnership: DistributionBrandPartnershipRow | null;
  access: DistributionDevelopmentAccessRow | null;
  developmentVisible: boolean;
  programExists: boolean;
  programActive: boolean;
  referralEnabled: boolean;
  readiness: { configured: boolean; ready: boolean; reasons: string[] };
  legacyFallbackUsed: boolean;
  fallbackReason: string | null;
}) {
  const reasons: string[] = [];

  if (!input.brandProfileId) reasons.push('missing_brand_profile_link');
  if (!input.developmentVisible) reasons.push('development_not_visible');

  if (!input.partnership) {
    reasons.push('missing_brand_partnership_row');
  } else if (input.partnership.status !== 'active') {
    reasons.push(`brand_partnership_${input.partnership.status}`);
  }

  if (!input.access) {
    reasons.push('missing_development_access_row');
  } else {
    if (input.access.status !== 'included') {
      reasons.push(`development_access_${input.access.status}`);
    }
    if (boolFromTinyInt(input.access.excludedByMandate)) reasons.push('excluded_by_mandate');
    if (boolFromTinyInt(input.access.excludedByExclusivity)) reasons.push('excluded_by_exclusivity');
    if (!boolFromTinyInt(input.access.submissionAllowed)) reasons.push('submission_not_allowed');
  }

  if (!input.programExists) {
    reasons.push('missing_program');
  } else {
    if (!input.programActive) reasons.push('program_inactive');
    if (!input.referralEnabled) reasons.push('program_referral_disabled');
  }

  if (!input.readiness.configured) reasons.push('program_not_configured');
  if (!input.readiness.ready) {
    for (const reason of input.readiness.reasons) reasons.push(`readiness_${reason}`);
  }

  if (input.legacyFallbackUsed && input.fallbackReason) reasons.push(input.fallbackReason);

  return Array.from(new Set(reasons));
}

export async function evaluateDevelopmentDistributionAccess(input: {
  db: DbHandle;
  developmentId: number;
  actor?: { role: ActorRole; userId?: number };
  channel?: DistributionAccessChannel;
}): Promise<DevelopmentDistributionAccessEvaluation> {
  const [development] = await input.db
    .select({
      id: developments.id,
      isPublished: developments.isPublished,
      approvalStatus: developments.approvalStatus,
      developerBrandProfileId: developments.developerBrandProfileId,
      marketingBrandProfileId: developments.marketingBrandProfileId,
    })
    .from(developments)
    .where(eq(developments.id, input.developmentId))
    .limit(1);

  if (!development) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Development not found.' });
  }

  const brandProfileId =
    Number(development.developerBrandProfileId || 0) ||
    Number(development.marketingBrandProfileId || 0) ||
    null;
  const developmentVisible =
    brandProfileId !== null &&
    boolFromTinyInt(development.isPublished) &&
    String(development.approvalStatus || '') === 'approved';

  const [program] = await input.db
    .select({
      id: distributionPrograms.id,
      isActive: distributionPrograms.isActive,
      isReferralEnabled: distributionPrograms.isReferralEnabled,
      commissionModel: distributionPrograms.commissionModel,
      defaultCommissionPercent: distributionPrograms.defaultCommissionPercent,
      defaultCommissionAmount: distributionPrograms.defaultCommissionAmount,
      tierAccessPolicy: distributionPrograms.tierAccessPolicy,
      payoutMilestone: distributionPrograms.payoutMilestone,
      currencyCode: distributionPrograms.currencyCode,
    })
    .from(distributionPrograms)
    .where(eq(distributionPrograms.developmentId, input.developmentId))
    .limit(1);

  const programExists = Boolean(program);
  const programActive = boolFromTinyInt(program?.isActive);
  const referralEnabled = boolFromTinyInt(program?.isReferralEnabled);

  const partnership = brandProfileId
    ? await getBrandPartnershipByBrandProfileId(input.db, brandProfileId)
    : null;
  const access = await getDevelopmentAccessByDevelopmentId(input.db, input.developmentId);

  const fallback = deriveLegacyFallback({
    brandProfileId,
    developmentVisible,
    programExists,
    programActive,
    referralEnabled,
  });

  const developmentId = Number(development.id);
  const [managerSummary] =
    programExists
      ? await input.db
          .select({ count: sql<number>`COUNT(*)` })
          .from(distributionManagerAssignments)
          .where(
            and(
              eq(distributionManagerAssignments.developmentId, developmentId),
              eq(distributionManagerAssignments.isPrimary, 1),
              eq(distributionManagerAssignments.isActive, 1),
            ),
          )
          .limit(1)
      : [{ count: 0 as unknown as number }];

  const readiness = program
    ? getProgramActivationReadiness({
        commissionModel: program.commissionModel,
        defaultCommissionPercent:
          program.defaultCommissionPercent === null
            ? null
            : Number(program.defaultCommissionPercent),
        defaultCommissionAmount:
          program.defaultCommissionAmount === null ? null : Number(program.defaultCommissionAmount),
        tierAccessPolicy: program.tierAccessPolicy,
        payoutMilestone: program.payoutMilestone,
        currencyCode: program.currencyCode,
        hasPrimaryManager: Number(managerSummary?.count || 0) > 0,
      })
    : {
        canEnable: false,
        missingRequirements: ['program_missing'],
      };

  const brandPartnershipStatus = (partnership?.status || fallback.partnershipStatus || null) as BrandPartnershipStatus | null;
  const developmentAccessStatus = (access?.status || fallback.accessStatus || null) as DevelopmentAccessStatus | null;
  const submissionAllowed = access
    ? boolFromTinyInt(access.submissionAllowed)
    : fallback.submissionAllowed;
  const excludedByMandate = access ? boolFromTinyInt(access.excludedByMandate) : false;
  const excludedByExclusivity = access ? boolFromTinyInt(access.excludedByExclusivity) : false;
  const legacyFallbackUsed =
    !partnership || !access ? Boolean(fallback.legacyFallbackUsed) : false;
  const fallbackReason =
    !partnership || !access ? (fallback.fallbackReason as string | null) : null;

  const inventoryState = deriveInventoryState({
    developmentVisible,
    brandPartnershipStatus,
    developmentAccessStatus,
    submissionAllowed,
    readinessReady: readiness.canEnable,
    referralEnabled,
    excludedByMandate,
    excludedByExclusivity,
  });

  const reasons = buildReasons({
    brandProfileId,
    partnership,
    access,
    developmentVisible,
    programExists,
    programActive,
    referralEnabled,
    readiness: {
      configured: programExists,
      ready: readiness.canEnable,
      reasons: readiness.missingRequirements,
    },
    legacyFallbackUsed,
    fallbackReason,
  });

  return {
    brandProfileId,
    brandPartnershipId: partnership ? Number(partnership.id) : null,
    brandPartnershipStatus,
    developmentAccessId: access ? Number(access.id) : null,
    developmentAccessStatus,
    developmentVisible,
    brandPartnered: brandPartnershipStatus === 'active',
    developmentIncluded: developmentAccessStatus === 'included',
    submissionAllowed,
    excludedByMandate,
    excludedByExclusivity,
    programExists,
    programActive,
    referralEnabled,
    readiness: {
      configured: programExists,
      ready: readiness.canEnable,
      reasons: readiness.missingRequirements,
    },
    inventoryState,
    submitReady: inventoryState === 'enabled',
    reasons,
    legacyFallbackUsed,
  };
}

export function summarizeDistributionBlockers(
  evaluation: DevelopmentDistributionAccessEvaluation,
): DistributionBlockerSummary {
  const accessBlockers = evaluation.reasons.filter(
    reason =>
      reason.startsWith('missing_brand_') ||
      reason.startsWith('brand_partnership_') ||
      reason.startsWith('missing_development_access_') ||
      reason.startsWith('development_access_') ||
      reason === 'excluded_by_mandate' ||
      reason === 'excluded_by_exclusivity' ||
      reason === 'submission_not_allowed' ||
      reason === 'development_not_visible' ||
      reason === 'missing_brand_profile_link' ||
      reason.startsWith('legacy_fallback_'),
  );
  const readinessBlockers = evaluation.reasons.filter(reason => reason.startsWith('readiness_'));
  const programBlockers = evaluation.reasons.filter(
    reason =>
      reason === 'missing_program' ||
      reason === 'program_inactive' ||
      reason === 'program_referral_disabled' ||
      reason === 'program_not_configured',
  );

  return { accessBlockers, readinessBlockers, programBlockers };
}

export async function assertDevelopmentDistributionAccessible(input: {
  db: DbHandle;
  developmentId: number;
  actor?: { role: ActorRole; userId?: number };
  channel: 'admin_catalog';
}) {
  const evaluation = await evaluateDevelopmentDistributionAccess(input);
  const hasAccessBlocker =
    evaluation.brandPartnershipStatus !== 'active' ||
    evaluation.developmentAccessStatus !== 'included' ||
    evaluation.excludedByMandate ||
    evaluation.excludedByExclusivity;

  if (hasAccessBlocker) {
    const blockers = summarizeDistributionBlockers(evaluation).accessBlockers;
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: `Development is not in network scope: ${blockers.join(', ') || 'unknown_reason'}`,
    });
  }

  return evaluation;
}

export async function assertDevelopmentSubmissionEligible(input: {
  db: DbHandle;
  developmentId: number;
  actor: { role: 'referrer' | 'admin'; userId: number };
  channel: 'submission';
}) {
  const evaluation = await evaluateDevelopmentDistributionAccess(input);
  if (!evaluation.submitReady) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: `Development cannot accept submissions: ${evaluation.reasons.join(', ')}`,
    });
  }
  return evaluation;
}
