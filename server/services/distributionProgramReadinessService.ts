import { and, eq, sql } from 'drizzle-orm';
import {
  developmentRequiredDocuments,
  distributionManagerAssignments,
  distributionPrograms,
} from '../../drizzle/schema';
import { getDb } from '../db';

export type ProgramReadinessBlockerCode =
  | 'PROGRAM_MISSING'
  | 'PROGRAM_INACTIVE'
  | 'COMMISSION_MISSING'
  | 'PAYOUT_MILESTONE_MISSING'
  | 'CURRENCY_MISSING'
  | 'MANAGER_MISSING'
  | 'REQUIRED_DOCS_MISSING'
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

  const [docsRow] = await db
    .select({
      requiredDocsCount:
        sql<number>`COALESCE(SUM(CASE WHEN ${developmentRequiredDocuments.isActive} = 1 THEN 1 ELSE 0 END), 0)`,
      requiredRequiredDocsCount:
        sql<number>`COALESCE(SUM(CASE WHEN ${developmentRequiredDocuments.isActive} = 1 AND ${developmentRequiredDocuments.isRequired} = 1 THEN 1 ELSE 0 END), 0)`,
    })
    .from(developmentRequiredDocuments)
    .where(eq(developmentRequiredDocuments.developmentId, developmentId));

  const state: ProgramReadiness['state'] = {
    programExists: Boolean(program),
    isActive: program ? boolFromTinyInt(program.isActive) : false,
    isReferralEnabled: program ? boolFromTinyInt(program.isReferralEnabled) : false,
    commissionModel: program?.commissionModel ? String(program.commissionModel) : null,
    defaultCommissionPercent: program ? toNumberOrNull(program.defaultCommissionPercent) : null,
    defaultCommissionAmount: program ? toNumberOrNull(program.defaultCommissionAmount) : null,
    payoutMilestone: program?.payoutMilestone ? String(program.payoutMilestone) : null,
    currencyCode: program?.currencyCode ? String(program.currencyCode) : null,
    tierAccessPolicy: program?.tierAccessPolicy ? String(program.tierAccessPolicy) : null,
    hasActivePrimaryManager: Boolean(managerRow?.id),
    requiredDocsCount: Number(docsRow?.requiredDocsCount || 0),
    requiredRequiredDocsCount: Number(docsRow?.requiredRequiredDocsCount || 0),
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
        message: 'Select a commission model and default payout value.',
      });
    } else if (state.commissionModel === 'flat_percentage') {
      if (!state.defaultCommissionPercent || state.defaultCommissionPercent <= 0) {
        blockers.push({
          code: 'COMMISSION_MISSING',
          message: 'Set a default commission percentage greater than 0.',
        });
      }
    } else if (state.commissionModel === 'flat_amount') {
      if (!state.defaultCommissionAmount || state.defaultCommissionAmount <= 0) {
        blockers.push({
          code: 'COMMISSION_MISSING',
          message: 'Set a default commission amount greater than 0.',
        });
      }
    } else {
      blockers.push({
        code: 'PROGRAM_VALIDATION_ERROR',
        message:
          'Commission model is not supported for referral enablement yet. Use flat_percentage or flat_amount.',
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

  return {
    developmentId,
    programId: program ? Number(program.id) : null,
    canEnableReferral: blockers.length === 0,
    blockers,
    state,
  };
}
