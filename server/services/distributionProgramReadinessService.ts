import { and, eq } from 'drizzle-orm';
import {
  distributionManagerAssignments,
  distributionPrograms,
  distributionReferralIntakePolicyReleases,
} from '../../drizzle/schema';
import { getDb } from '../db';
import { getDevelopmentRequiredDocumentSummary } from './distributionRequiredDocumentsService';
import { getDistributionReferralEvidenceStorageStatus } from './distributionReferralEvidenceStorage';
import {
  DISTRIBUTION_REFERRAL_EVIDENCE_MAX_UPLOAD_BYTES,
  distributionReferralIntakePolicyConfigurationSchema,
} from '../../shared/distributionReferralIntake';
import { distributionReferralEvidenceRetentionScheduler } from './distributionReferralEvidenceRetentionScheduler';

export type ProgramReadinessBlockerCode =
  | 'PROGRAM_MISSING'
  | 'PROGRAM_INACTIVE'
  | 'COMMISSION_MISSING'
  | 'PAYOUT_MILESTONE_MISSING'
  | 'CURRENCY_MISSING'
  | 'MANAGER_MISSING'
  | 'REQUIRED_DOCS_MISSING'
  | 'REFERRAL_INTAKE_POLICY_NOT_PUBLISHED'
  | 'PRIVATE_EVIDENCE_STORAGE_UNAVAILABLE'
  | 'PRIVATE_EVIDENCE_WORKFLOW_UNAVAILABLE'
  | 'INTAKE_POLICY_NOT_SUPPORTED'
  | 'CREDIT_REPORT_WORKFLOW_UNAVAILABLE'
  | 'INTAKE_RETENTION_UNSUPPORTED'
  | 'PRIVATE_EVIDENCE_RETENTION_SCHEDULER_DISABLED'
  | 'DEAL_DOCUMENT_WORKFLOW_UNAVAILABLE'
  | 'PROGRAM_VALIDATION_ERROR';

export type ProgramReadiness = {
  developmentId: number;
  programId: number | null;
  canEnableReferral: boolean;
  blockers: Array<{
    code: ProgramReadinessBlockerCode;
    message: string;
  }>;
  state: {
    programExists: boolean;
    isActive: boolean;
    isReferralEnabled: boolean;
    commissionModel: string | null;
    defaultCommissionPercent: number | null;
    defaultCommissionAmount: number | null;
    payoutMilestone: string | null;
    currencyCode: string | null;
    tierAccessPolicy: string | null;
    hasActivePrimaryManager: boolean;
    requiredDocsCount: number;
    requiredRequiredDocsCount: number;
    activeIntakePolicyVersion: number | null;
    hasActiveIntakePolicy: boolean;
    intakePolicySupportsMvp: boolean;
    creditReportWorkflowConfigured: boolean;
    privateEvidenceRetentionScheduled: boolean;
    privateEvidenceStorageConfigured: boolean;
    privateEvidenceStorageAdapter: 'local' | 's3';
  };
};

function toNumberOrNull(value: unknown) {
  if (value === null || typeof value === 'undefined') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function boolFromTinyInt(value: unknown) {
  return Number(value || 0) === 1;
}

export async function getProgramReadinessByDevelopmentId(
  developmentId: number,
): Promise<ProgramReadiness> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [program] = await db
    .select({
      id: distributionPrograms.id,
      isActive: distributionPrograms.isActive,
      isReferralEnabled: distributionPrograms.isReferralEnabled,
      commissionModel: distributionPrograms.commissionModel,
      defaultCommissionPercent: distributionPrograms.defaultCommissionPercent,
      defaultCommissionAmount: distributionPrograms.defaultCommissionAmount,
      payoutMilestone: distributionPrograms.payoutMilestone,
      currencyCode: distributionPrograms.currencyCode,
      tierAccessPolicy: distributionPrograms.tierAccessPolicy,
    })
    .from(distributionPrograms)
    .where(eq(distributionPrograms.developmentId, developmentId))
    .limit(1);

  const [managerRow] = await db
    .select({ id: distributionManagerAssignments.id })
    .from(distributionManagerAssignments)
    .where(
      and(
        eq(distributionManagerAssignments.developmentId, developmentId),
        eq(distributionManagerAssignments.isActive, 1),
        eq(distributionManagerAssignments.isPrimary, 1),
      ),
    )
    .limit(1);

  const [activeIntakePolicy] = program
    ? await db
        .select({
          policyVersion: distributionReferralIntakePolicyReleases.policyVersion,
          configuration: distributionReferralIntakePolicyReleases.configuration,
        })
        .from(distributionReferralIntakePolicyReleases)
        .where(
          and(
            eq(distributionReferralIntakePolicyReleases.programId, program.id),
            eq(distributionReferralIntakePolicyReleases.status, 'active'),
          ),
        )
        .limit(1)
    : [];

  const parsedPolicy = activeIntakePolicy
    ? distributionReferralIntakePolicyConfigurationSchema.safeParse(activeIntakePolicy.configuration)
    : null;
  const policyConfiguration = parsedPolicy?.success ? parsedPolicy.data : null;
  const retentionSupported = Boolean(
    policyConfiguration &&
      policyConfiguration.retention.abandonedIntake.startsFrom === 'draft_created' &&
      (policyConfiguration.retention.identityEvidence.startsFrom === 'evidence_captured' ||
        policyConfiguration.retention.identityEvidence.startsFrom === 'referral_submitted') &&
      policyConfiguration.retention.activeReferral.startsFrom === 'referral_submitted' &&
      policyConfiguration.retention.closedReferral.startsFrom === 'referral_closed',
  );
  const policySupportsMvp = Boolean(
    policyConfiguration &&
      policyConfiguration.signatureMethod === 'in_app_acknowledgement' &&
      policyConfiguration.creditReport.enabled === false &&
      policyConfiguration.identityEvidence.maxFileBytes <= DISTRIBUTION_REFERRAL_EVIDENCE_MAX_UPLOAD_BYTES &&
      policyConfiguration.identityEvidence.authorizedRoles.length > 0 &&
      retentionSupported,
  );

  const docsSummary = await getDevelopmentRequiredDocumentSummary(db, developmentId);
  const evidenceStorage = getDistributionReferralEvidenceStorageStatus();
  const retentionScheduler = distributionReferralEvidenceRetentionScheduler.getStatus();

  const state: ProgramReadiness['state'] = {
    programExists: Boolean(program),
    isActive: program ? boolFromTinyInt(program.isActive) : false,
    isReferralEnabled: program ? boolFromTinyInt(program.isReferralEnabled) : false,
    commissionModel: program?.commissionModel
      ? String(program.commissionModel) === 'fixed_amount'
        ? 'flat_amount'
        : String(program.commissionModel)
      : null,
    defaultCommissionPercent: program ? toNumberOrNull(program.defaultCommissionPercent) : null,
    defaultCommissionAmount: program ? toNumberOrNull(program.defaultCommissionAmount) : null,
    payoutMilestone: program?.payoutMilestone ? String(program.payoutMilestone) : null,
    currencyCode: program?.currencyCode ? String(program.currencyCode) : null,
    tierAccessPolicy: program?.tierAccessPolicy ? String(program.tierAccessPolicy) : null,
    hasActivePrimaryManager: Boolean(managerRow?.id),
    requiredDocsCount: docsSummary.requiredDocsCount,
    requiredRequiredDocsCount: docsSummary.requiredRequiredDocsCount,
    activeIntakePolicyVersion: activeIntakePolicy ? Number(activeIntakePolicy.policyVersion) : null,
    hasActiveIntakePolicy: Boolean(activeIntakePolicy),
    intakePolicySupportsMvp: policySupportsMvp,
    creditReportWorkflowConfigured: Boolean(policyConfiguration?.creditReport.enabled),
    privateEvidenceRetentionScheduled:
      retentionScheduler.enabled && retentionScheduler.timerActive,
    privateEvidenceStorageConfigured: evidenceStorage.configured,
    privateEvidenceStorageAdapter: evidenceStorage.adapter,
  };

  const blockers: ProgramReadiness['blockers'] = [];

  if (!state.programExists) {
    blockers.push({
      code: 'PROGRAM_MISSING',
      message: 'Create a partner program for this development before enabling referrals.',
    });
  } else {
    if (!state.isActive) {
      blockers.push({
        code: 'PROGRAM_INACTIVE',
        message: 'Activate the program before enabling referrals.',
      });
    }

    if (!state.commissionModel) {
      blockers.push({
        code: 'COMMISSION_MISSING',
        message: 'Select a referral payout model and default value.',
      });
    } else if (state.commissionModel === 'flat_percentage') {
      if (!state.defaultCommissionPercent || state.defaultCommissionPercent <= 0) {
        blockers.push({
          code: 'COMMISSION_MISSING',
          message: 'Set a referral payout percentage greater than 0.',
        });
      }
    } else if (state.commissionModel === 'flat_amount') {
      if (!state.defaultCommissionAmount || state.defaultCommissionAmount <= 0) {
        blockers.push({
          code: 'COMMISSION_MISSING',
          message: 'Set a referral payout amount greater than 0.',
        });
      }
    } else {
      blockers.push({
        code: 'PROGRAM_VALIDATION_ERROR',
        message:
          'This referral payout model is not supported for referral enablement yet. Use a percentage or fixed amount.',
      });
    }

    if (!state.payoutMilestone) {
      blockers.push({
        code: 'PAYOUT_MILESTONE_MISSING',
        message: 'Choose when payout is triggered for this program.',
      });
    }

    if (!state.currencyCode) {
      blockers.push({
        code: 'CURRENCY_MISSING',
        message: 'Set a currency code for payouts.',
      });
    }

    if (!state.hasActivePrimaryManager) {
      blockers.push({
        code: 'MANAGER_MISSING',
        message: 'Assign an active primary manager to this development.',
      });
    }
  }

  if (state.requiredDocsCount < 1 || state.requiredRequiredDocsCount < 1) {
    blockers.push({
      code: 'REQUIRED_DOCS_MISSING',
      message: 'Add at least one active required document template for this development.',
    });
  }

  if (state.programExists && !state.hasActiveIntakePolicy) {
    blockers.push({
      code: 'REFERRAL_INTAKE_POLICY_NOT_PUBLISHED',
      message: 'Complete and publish this development’s referral intake policy.',
    });
  }

  if (state.programExists && state.hasActiveIntakePolicy && !state.intakePolicySupportsMvp) {
    blockers.push({
      code: 'INTAKE_POLICY_NOT_SUPPORTED',
      message:
        'This policy is incomplete or uses a referral evidence, acknowledgement, or upload rule that the current intake workflow cannot safely enforce.',
    });
  }

  if (state.programExists && state.creditReportWorkflowConfigured) {
    blockers.push({
      code: 'CREDIT_REPORT_WORKFLOW_UNAVAILABLE',
      message:
        'Credit-report authorization remains separate and is not supported in this referral intake flow yet.',
    });
  }

  if (state.programExists && policyConfiguration && !retentionSupported) {
    blockers.push({
      code: 'INTAKE_RETENTION_UNSUPPORTED',
      message:
        'Select the supported retention anchors for draft expiry, identity evidence, and closed referrals before enabling this program.',
    });
  }

  if (state.programExists && !state.privateEvidenceStorageConfigured) {
    blockers.push({
      code: 'PRIVATE_EVIDENCE_STORAGE_UNAVAILABLE',
      message:
        evidenceStorage.message || 'Configure private evidence storage before accepting referrals.',
    });
  }

  if (state.programExists && !state.privateEvidenceRetentionScheduled) {
    blockers.push({
      code: 'PRIVATE_EVIDENCE_RETENTION_SCHEDULER_DISABLED',
      message:
        'Enable the private evidence retention scheduler and confirm it is running before accepting referrals.',
    });
  }

  if (state.programExists) {
    blockers.push({
      code: 'DEAL_DOCUMENT_WORKFLOW_UNAVAILABLE',
      message:
        'Supporting referral documents still use an external-file URL workflow. Complete private upload, review, access control, and retention handling before accepting referrals.',
    });
  }

  return {
    developmentId,
    programId: program ? Number(program.id) : null,
    canEnableReferral: blockers.length === 0,
    blockers,
    state,
  };
}
