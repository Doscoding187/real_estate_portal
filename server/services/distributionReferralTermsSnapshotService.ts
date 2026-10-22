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

/**
 * Capture the Distribution-owned rules that applied when a referral was submitted.
 * Developer projection facts are deliberately supplied by the caller and are never queried here.
 */
export async function buildDistributionReferralTermsSnapshot(input: {
  db: DbExecutor;
  developmentId: number;
  developerProjection: ProjectionTermsSnapshot;
  marketMode: 'sale' | 'rent';
}) {
  const [program] = await input.db
    .select()
    .from(distributionPrograms)
    .where(eq(distributionPrograms.developmentId, input.developmentId))
    .limit(1);

  if (!program) return null;

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
          inArray(developmentRequiredDocuments.documentCode, [...DISTRIBUTION_PROCESS_DOCUMENT_CODES]),
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
    !totalMode
  ) {
    throw new Error(`The current Developer projection has no marketable ${input.marketMode} inventory.`);
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
    version: 1,
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
      referrerCommissionType: program.referrerCommissionType,
      referrerCommissionValue: program.referrerCommissionValue,
      referrerCommissionBasis: program.referrerCommissionBasis,
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
    requiredDocuments: requiredDocuments.map(document => ({
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
