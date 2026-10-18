import { createHash } from 'node:crypto';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import {
  developmentRequiredDocuments,
  distributionProgramWorkflowSteps,
  distributionProgramWorkflows,
  distributionPrograms,
  distributionReferralIntakePolicyReleases,
} from '../../drizzle/schema';
import { DISTRIBUTION_PROCESS_DOCUMENT_CODES } from './distributionRequiredDocumentsService';

type DbExecutor = any;

type SalesModeProjection = {
  availableCount: number;
  priceFrom: number;
  priceTo: number;
  priceBasis: 'purchase_price' | 'monthly_rent';
};

type ProjectionTermsSnapshot = {
  revision: string;
  observedAt: string;
  campaign: {
    visible: boolean;
    name: string;
    tagline: string | null;
    description: string | null;
    developmentType: string;
    city: string;
    province: string;
    images: string[];
  };
  inventory: {
    phaseScope: 'phase-released' | 'development-wide' | 'unscoped-hidden';
    modes: Partial<Record<'for_sale' | 'for_rent', SalesModeProjection>>;
    unitTypes: Array<{
      id: string;
      name: string;
      description: string | null;
      bedrooms: number | null;
      bathrooms: number | null;
      size: number | null;
      imageUrl: string | null;
      modes: Partial<Record<'for_sale' | 'for_rent', SalesModeProjection>>;
    }>;
  };
};

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map(key => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function digest(value: unknown) {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}

export function isValidDistributionReferralTermsSnapshot(
  value: unknown,
  expectedDigest: string | null | undefined,
) {
  if (!expectedDigest) return false;
  let parsedValue = value;
  if (typeof parsedValue === 'string') {
    try {
      parsedValue = JSON.parse(parsedValue);
    } catch {
      return false;
    }
  }
  const snapshot =
    parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)
      ? (parsedValue as Record<string, unknown>)
      : null;
  if (!snapshot || typeof snapshot.digest !== 'string' || snapshot.digest !== expectedDigest) {
    return false;
  }
  const { digest: _storedDigest, ...terms } = snapshot;
  return digest(terms) === expectedDigest;
}

/**
 * Capture the Distribution-owned rules that applied when a referral was submitted.
 * Developer projection facts are deliberately supplied by the caller and are never queried here.
 */
export async function buildDistributionReferralTermsSnapshot(input: {
  db: DbExecutor;
  developmentId: number;
  developerProjection: ProjectionTermsSnapshot;
  marketMode: 'sale' | 'rent';
  intakeEvidenceSnapshot: Record<string, unknown>;
}) {
  const [program] = await input.db
    .select()
    .from(distributionPrograms)
    .where(eq(distributionPrograms.developmentId, input.developmentId))
    .limit(1);

  if (!program) return null;
  const referrerCommissionType =
    program.referrerCommissionType === 'flat' || program.referrerCommissionType === 'percentage'
      ? program.referrerCommissionType
      : null;
  const referrerCommissionValue = Number(program.referrerCommissionValue || 0);
  const referrerCommissionBasis =
    program.referrerCommissionBasis === 'sale_price' ||
    program.referrerCommissionBasis === 'base_price'
      ? program.referrerCommissionBasis
      : null;
  if (referrerCommissionType === 'percentage' && input.marketMode === 'rent') {
    throw new Error(
      'Percentage referral payouts are not configured for rental referrals. Set a fixed referral payout before accepting rental referrals.',
    );
  }
  const currencyCode = String(program.currencyCode || '')
    .trim()
    .toUpperCase();
  const payoutTermsConfigured =
    referrerCommissionType === 'flat' &&
    Number.isFinite(referrerCommissionValue) &&
    referrerCommissionValue > 0
      ? true
      : referrerCommissionType === 'percentage' &&
        Number.isFinite(referrerCommissionValue) &&
        referrerCommissionValue > 0 &&
        (referrerCommissionBasis === 'sale_price' || referrerCommissionBasis === 'base_price') &&
        input.marketMode === 'sale';
  if (
    Number(program.isActive) !== 1 ||
    Number(program.isReferralEnabled) !== 1 ||
    !payoutTermsConfigured ||
    !/^[A-Z]{3}$/.test(currencyCode)
  ) {
    return null;
  }

  const [workflow, activePolicy] = await Promise.all([
    input.db
      .select()
      .from(distributionProgramWorkflows)
      .where(
        and(
          eq(distributionProgramWorkflows.programId, program.id),
          eq(distributionProgramWorkflows.isActive, 1),
        ),
      )
      .limit(1),
    input.db
      .select()
      .from(distributionReferralIntakePolicyReleases)
      .where(
        and(
          eq(distributionReferralIntakePolicyReleases.programId, program.id),
          eq(distributionReferralIntakePolicyReleases.status, 'active'),
        ),
      )
      .orderBy(desc(distributionReferralIntakePolicyReleases.policyVersion))
      .limit(1),
  ]);

  const workflowRow = workflow[0] || null;
  const [workflowSteps, requiredDocuments] = await Promise.all([
    workflowRow
      ? input.db
          .select({
            stepKey: distributionProgramWorkflowSteps.stepKey,
            stepLabel: distributionProgramWorkflowSteps.stepLabel,
            stepType: distributionProgramWorkflowSteps.stepType,
            stepOrder: distributionProgramWorkflowSteps.stepOrder,
            isBlocking: distributionProgramWorkflowSteps.isBlocking,
          })
          .from(distributionProgramWorkflowSteps)
          .where(eq(distributionProgramWorkflowSteps.workflowId, workflowRow.id))
          .orderBy(asc(distributionProgramWorkflowSteps.stepOrder))
      : Promise.resolve([]),
    input.db
      .select({
        templateId: developmentRequiredDocuments.id,
        documentCode: developmentRequiredDocuments.documentCode,
        documentLabel: developmentRequiredDocuments.documentLabel,
        isRequired: developmentRequiredDocuments.isRequired,
        sortOrder: developmentRequiredDocuments.sortOrder,
      })
      .from(developmentRequiredDocuments)
      .where(
        and(
          eq(developmentRequiredDocuments.developmentId, input.developmentId),
          eq(developmentRequiredDocuments.category, 'client_required_document'),
          inArray(developmentRequiredDocuments.documentCode, [
            ...DISTRIBUTION_PROCESS_DOCUMENT_CODES,
          ]),
          eq(developmentRequiredDocuments.isActive, 1),
          eq(developmentRequiredDocuments.isRequired, 1),
        ),
      )
      .orderBy(asc(developmentRequiredDocuments.sortOrder), asc(developmentRequiredDocuments.id)),
  ]);

  const policy = activePolicy[0] || null;
  const capturedAt = new Date().toISOString();
  const projectionMode = input.marketMode === 'sale' ? 'for_sale' : 'for_rent';
  const totalMode = input.developerProjection.inventory.modes[projectionMode];
  if (
    !input.developerProjection.revision ||
    !input.developerProjection.campaign.visible ||
    input.developerProjection.inventory.phaseScope === 'unscoped-hidden' ||
    !totalMode ||
    totalMode.availableCount <= 0 ||
    totalMode.priceFrom <= 0 ||
    totalMode.priceTo < totalMode.priceFrom
  ) {
    throw new Error(
      `The current Developer projection has no marketable ${input.marketMode} inventory.`,
    );
  }

  const developerSalesSnapshot = {
    revision: input.developerProjection.revision,
    observedAt: input.developerProjection.observedAt,
    marketMode: input.marketMode,
    campaign: input.developerProjection.campaign,
    inventory: {
      phaseScope: input.developerProjection.inventory.phaseScope,
      mode: projectionMode,
      total: totalMode,
      unitTypes: input.developerProjection.inventory.unitTypes.flatMap(unitType => {
        const modeTerms = unitType.modes[projectionMode];
        return modeTerms
          ? [
              {
                id: unitType.id,
                name: unitType.name,
                description: unitType.description,
                bedrooms: unitType.bedrooms,
                bathrooms: unitType.bathrooms,
                size: unitType.size,
                imageUrl: unitType.imageUrl,
                ...modeTerms,
              },
            ]
          : [];
      }),
    },
  };
  const terms = {
    version: 2,
    capturedAt,
    developmentId: input.developmentId,
    marketMode: input.marketMode,
    developerProjectionRevision: input.developerProjection.revision,
    developerSalesSnapshot,
    program: {
      programId: Number(program.id),
      termsUpdatedAt: program.updatedAt,
      isActive: Number(program.isActive) === 1,
      isReferralEnabled: Number(program.isReferralEnabled) === 1,
      tierAccessPolicy: program.tierAccessPolicy,
      commissionModel: program.commissionModel,
      defaultCommissionPercent: program.defaultCommissionPercent,
      defaultCommissionAmount: program.defaultCommissionAmount,
      referrerCommissionType,
      referrerCommissionValue,
      referrerCommissionBasis,
      platformCommissionType: program.platformCommissionType,
      platformCommissionValue: program.platformCommissionValue,
      platformCommissionBasis: program.platformCommissionBasis,
      currencyCode: program.currencyCode,
      payoutMilestone: program.payoutMilestone,
      payoutMilestoneNotes: program.payoutMilestoneNotes,
    },
    workflow: workflowRow
      ? {
          workflowId: Number(workflowRow.id),
          workflowKey: workflowRow.workflowKey,
          workflowName: workflowRow.workflowName,
          bankStrategy: workflowRow.bankStrategy,
          turnaroundHours: workflowRow.turnaroundHours,
          updatedAt: workflowRow.updatedAt,
          steps: workflowSteps.map(step => ({
            stepKey: step.stepKey,
            stepLabel: step.stepLabel,
            stepType: step.stepType,
            stepOrder: Number(step.stepOrder),
            isBlocking: Number(step.isBlocking) === 1,
          })),
        }
      : null,
    intakePolicy: policy
      ? {
          releaseId: Number(policy.id),
          policyVersion: Number(policy.policyVersion),
          configurationDigest: policy.configurationDigest,
          configuration: policy.configuration,
          publishedAt: policy.publishedAt,
        }
      : null,
    intakeEvidence: input.intakeEvidenceSnapshot,
    requiredDocuments: requiredDocuments.map(document => ({
      templateId: Number(document.templateId),
      documentCode: document.documentCode,
      documentLabel: document.documentLabel,
      category: 'client_required_document' as const,
      isRequired: Number(document.isRequired) === 1,
      sortOrder: Number(document.sortOrder),
    })),
  };

  return {
    ...terms,
    digest: digest(terms),
  };
}
