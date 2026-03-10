import { TRPCError } from '@trpc/server';
import { and, eq, sql } from 'drizzle-orm';

import {
  developments,
  distributionManagerAssignments,
  distributionPrograms,
  DISTRIBUTION_BRAND_PARTNERSHIP_STATUS_VALUES,
  DISTRIBUTION_DEVELOPMENT_ACCESS_STATUS_VALUES,
  DISTRIBUTION_INVENTORY_STATE_VALUES,
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

type BrandPartnershipStatus = (typeof DISTRIBUTION_BRAND_PARTNERSHIP_STATUS_VALUES)[number];
type DevelopmentAccessStatus = (typeof DISTRIBUTION_DEVELOPMENT_ACCESS_STATUS_VALUES)[number];
type DistributionInventoryState = (typeof DISTRIBUTION_INVENTORY_STATE_VALUES)[number];

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

type ActorRole = 'admin' | 'manager' | 'referrer' | 'developer' | 'public' | 'agent';
type DistributionAccessChannel =
  | 'admin_catalog'
  | 'referrer_inventory'
  | 'submission'
  | 'developer_settings'
  | 'public';

type EvaluationInput = {
  db: DbHandle;
  developmentId: number;
  actor?: { role: ActorRole; userId?: number };
  channel?: DistributionAccessChannel;
};

function boolFromTinyInt(value: unknown) {
  return Number(value || 0) === 1;
}

function hasAccessBlockers(input: {
  brandPartnershipStatus: BrandPartnershipStatus | null;
  developmentAccessStatus: DevelopmentAccessStatus | null;
  excludedByMandate: boolean;
  excludedByExclusivity: boolean;
}) {
  return (
    input.brandPartnershipStatus !== 'active' ||
    input.developmentAccessStatus !== 'included' ||
    input.excludedByMandate ||
    input.excludedByExclusivity
  );
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

  if (!input.brandProfileId) {
    reasons.push('missing_brand_profile_link');
  }

  if (!input.developmentVisible) {
    reasons.push('development_not_visible');
  }

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
    if (boolFromTinyInt(input.access.excludedByMandate)) {
      reasons.push('excluded_by_mandate');
    }
    if (boolFromTinyInt(input.access.excludedByExclusivity)) {
      reasons.push('excluded_by_exclusivity');
    }
    if (!boolFromTinyInt(input.access.submissionAllowed)) {
      reasons.push('submission_not_allowed');
    }
  }

  if (!input.programExists) {
    reasons.push('missing_program');
  } else {
    if (!input.programActive) {
      reasons.push('program_inactive');
    }
    if (!input.referralEnabled) {
      reasons.push('program_referral_disabled');
    }
  }

  if (!input.readiness.configured) {
    reasons.push('program_not_configured');
  }
  if (!input.readiness.ready) {
    for (const reason of input.readiness.reasons) {
      reasons.push(`readiness_${reason}`);
    }
  }

  if (input.legacyFallbackUsed && input.fallbackReason) {
    reasons.push(input.fallbackReason);
  }

  return Array.from(new Set(reasons));
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
}) {
  if (!input.developmentVisible) {
    return 'hidden';
  }

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

export async function evaluateDevelopmentDistributionAccess(
  input: EvaluationInput,
): Promise<DevelopmentDistributionAccessEvaluation> {
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

  const activeProgramId = Number(program?.id || 0);
  const [managerAssignmentSummary] =
    activeProgramId > 0
      ? await input.db
          .select({ count: sql<number>`COUNT(*)` })
          .from(distributionManagerAssignments)
          .where(
            and(
              eq(distributionManagerAssignments.programId, activeProgramId),
              eq(distributionManagerAssignments.isPrimary, 1),
              eq(distributionManagerAssignments.isActive, 1),
            ),
          )
          .limit(1)
      : [{ count: 0 as unknown as number }];

  const readinessSnapshot = program
    ? getProgramActivationReadiness({
        commissionModel: program.commissionModel,
        defaultCommissionPercent:
          program.defaultCommissionPercent != null
            ? Number(program.defaultCommissionPercent)
            : null,
        defaultCommissionAmount:
          program.defaultCommissionAmount != null ? Number(program.defaultCommissionAmount) : null,
        tierAccessPolicy: program.tierAccessPolicy,
        hasPrimaryManager: Number(managerAssignmentSummary?.count || 0) > 0,
      })
    : { canEnable: false, missingRequirements: ['programMissing'] };

  const readiness = {
    configured: programExists,
    ready: readinessSnapshot.canEnable,
    reasons: readinessSnapshot.missingRequirements,
  };

  const legacyFallbackUsed = (!partnership || !access) && fallback.legacyFallbackUsed;
  const fallbackReason = legacyFallbackUsed ? fallback.fallbackReason : null;

  const brandPartnershipStatus = partnership?.status ?? fallback.partnershipStatus;
  const developmentAccessStatus = access?.status ?? fallback.accessStatus;
  const submissionAllowed =
    (access ? boolFromTinyInt(access.submissionAllowed) : fallback.submissionAllowed) &&
    !hasAccessBlockers({
      brandPartnershipStatus,
      developmentAccessStatus,
      excludedByMandate: boolFromTinyInt(access?.excludedByMandate),
      excludedByExclusivity: boolFromTinyInt(access?.excludedByExclusivity),
    });

  const excludedByMandate = boolFromTinyInt(access?.excludedByMandate);
  const excludedByExclusivity = boolFromTinyInt(access?.excludedByExclusivity);
  const brandPartnered = brandPartnershipStatus === 'active';
  const developmentIncluded = developmentAccessStatus === 'included';

  const inventoryState = deriveInventoryState({
    developmentVisible,
    brandPartnershipStatus,
    developmentAccessStatus,
    submissionAllowed,
    readinessReady: readiness.ready,
    referralEnabled,
    excludedByMandate,
    excludedByExclusivity,
  });

  const submitReady = inventoryState === 'enabled' && programActive;
  const reasons = buildReasons({
    brandProfileId,
    partnership,
    access,
    developmentVisible,
    programExists,
    programActive,
    referralEnabled,
    readiness,
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
    brandPartnered,
    developmentIncluded,
    submissionAllowed,
    excludedByMandate,
    excludedByExclusivity,
    programExists,
    programActive,
    referralEnabled,
    readiness,
    inventoryState,
    submitReady,
    reasons,
    legacyFallbackUsed,
  };
}

export async function assertDevelopmentDistributionAccessible(
  input: EvaluationInput & {
    channel: 'admin_catalog' | 'referrer_inventory' | 'developer_settings';
  },
) {
  const evaluation = await evaluateDevelopmentDistributionAccess(input);

  if (!evaluation.brandPartnered || !evaluation.developmentIncluded) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Development is not in distribution scope: ${evaluation.reasons.join(', ')}.`,
    });
  }

  if (
    evaluation.developmentAccessStatus === 'paused' ||
    evaluation.developmentAccessStatus === 'excluded' ||
    evaluation.excludedByMandate ||
    evaluation.excludedByExclusivity
  ) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Development access is blocked: ${evaluation.reasons.join(', ')}.`,
    });
  }

  return evaluation;
}

export async function assertDevelopmentSubmissionEligible(
  input: EvaluationInput & {
    actor: { role: 'referrer' | 'admin' | 'developer' | 'agent'; userId: number };
    channel: 'submission';
  },
) {
  const evaluation = await evaluateDevelopmentDistributionAccess(input);

  if (!evaluation.submitReady) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Development cannot accept submissions: ${evaluation.reasons.join(', ')}.`,
    });
  }

  return evaluation;
}

export function summarizeDistributionBlockers(
  evaluation: DevelopmentDistributionAccessEvaluation,
): DistributionBlockerSummary {
  const accessBlockers = new Set<string>();
  const readinessBlockers = new Set<string>();
  const programBlockers = new Set<string>();

  if (!evaluation.brandProfileId) {
    accessBlockers.add('missing_brand_profile_link');
  }
  if (
    !evaluation.brandPartnershipId ||
    !evaluation.developmentAccessId ||
    evaluation.legacyFallbackUsed
  ) {
    accessBlockers.add('canonical_access_required');
  }

  for (const reason of evaluation.reasons) {
    if (
      reason === 'development_not_visible' ||
      reason === 'missing_brand_partnership_row' ||
      reason === 'missing_development_access_row' ||
      reason === 'submission_not_allowed' ||
      reason.startsWith('brand_partnership_') ||
      reason.startsWith('development_access_') ||
      reason.startsWith('excluded_by_')
    ) {
      accessBlockers.add(reason);
      continue;
    }

    if (reason === 'program_not_configured' || reason.startsWith('readiness_')) {
      readinessBlockers.add(reason);
      continue;
    }

    if (
      reason === 'missing_program' ||
      reason === 'program_inactive' ||
      reason === 'program_referral_disabled'
    ) {
      programBlockers.add(reason);
    }
  }

  return {
    accessBlockers: Array.from(accessBlockers),
    readinessBlockers: Array.from(readinessBlockers),
    programBlockers: Array.from(programBlockers),
  };
}
