import { and, eq, inArray } from 'drizzle-orm';
import {
  distributionBrandPartnerships,
  distributionDevelopmentAccess,
  distributionPrograms,
} from '../../drizzle/schema';
import { getDb } from '../db';
import {
  getDevelopmentSalesProjection,
  type DevelopmentSalesModeProjection,
  type DevelopmentSalesProjection,
  getDevelopmentSalesWorkspaceReference,
  listDevelopmentSalesWorkspaceReferences,
  type DevelopmentSalesWorkspaceReference,
} from './distributionDeveloperReadPort';
import { evaluateDevelopmentDistributionAccess } from './distributionAccessPolicy';
import {
  listPartnerAccessibleDevelopmentIds,
  type DistributionPartnerActor,
} from './distributionPartnerProgramAccessService';
import { listDevelopmentRequiredDocumentsOrEmpty } from './distributionRequiredDocumentsService';
import {
  CHECKFIT_V1_DISCLAIMERS,
  CHECKFIT_V1_POLICY,
  resolveCheckfitV1Rate,
} from './checkfitV1Service';
import type { DistributionUnitMedia } from '../../shared/distributionUnitMedia';

type ProgramPromotion = {
  headline?: string | null;
  description?: string | null;
  highlightBullets?: string[];
};

export type PartnerAffordabilityAssumptions = {
  policyVersion: typeof CHECKFIT_V1_POLICY.version;
  available: boolean;
  annualInterestRate: number | null;
  rateSource: typeof CHECKFIT_V1_POLICY.rateSourceKey;
  rateSourceLabel: string;
  rateUpdatedAt: string | null;
  termMonths: number;
  repaymentAllowanceRatio: number;
  disclaimers: string[];
};

function partnerAffordabilityAssumptions(
  rate: Awaited<ReturnType<typeof resolveCheckfitV1Rate>>,
): PartnerAffordabilityAssumptions {
  return {
    policyVersion: CHECKFIT_V1_POLICY.version,
    available: rate !== null,
    annualInterestRate: rate?.annualInterestRate ?? null,
    rateSource: CHECKFIT_V1_POLICY.rateSourceKey,
    rateSourceLabel: CHECKFIT_V1_POLICY.rateSourceLabel,
    rateUpdatedAt: rate?.rateUpdatedAt ?? null,
    termMonths: CHECKFIT_V1_POLICY.termMonths,
    repaymentAllowanceRatio: CHECKFIT_V1_POLICY.repaymentAllowanceRatio,
    disclaimers: [...CHECKFIT_V1_DISCLAIMERS],
  };
}

const PAYOUT_TRIGGER_LABELS: Record<string, string> = {
  attorney_instruction: 'Attorney instruction',
  attorney_signing: 'Attorney signing',
  bond_approval: 'Home finance approval',
  transfer_registration: 'Transfer registration',
  occupation: 'Occupation',
  custom: 'Custom program trigger',
};

type PartnerProgramTermsInput = {
  actor: DistributionPartnerActor;
  cataloguePublisherId?: number;
  developmentIds?: number[];
  /** Retained for older callers; inactive opportunities are never exposed. */
  includeDisabled?: boolean;
};

type PartnerMode = 'sale' | 'rent';
type PartnerModeProjection = {
  availableCount: number;
  priceFrom: number;
  priceTo: number;
  priceBasis: 'purchase_price' | 'monthly_rent';
};

function partnerModes(
  modes: Partial<Record<'for_sale' | 'for_rent', DevelopmentSalesModeProjection>>,
): Partial<Record<PartnerMode, PartnerModeProjection>> {
  const mapped: Partial<Record<PartnerMode, PartnerModeProjection>> = {};
  if (modes.for_sale) mapped.sale = modes.for_sale;
  if (modes.for_rent) mapped.rent = modes.for_rent;
  return mapped;
}

function hasMarketableMode(
  modes: Partial<Record<'for_sale' | 'for_rent', DevelopmentSalesModeProjection>>,
) {
  return Object.values(modes).some(
    mode => Boolean(mode && mode.availableCount > 0 && mode.priceFrom > 0 && mode.priceTo >= mode.priceFrom),
  );
}

function parsePromotion(value: unknown): ProgramPromotion {
  const parsed =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const bullets = Array.isArray(parsed.highlightBullets)
    ? parsed.highlightBullets.filter(
        (bullet): bullet is string => typeof bullet === 'string' && Boolean(bullet.trim()),
      )
    : [];
  return {
    headline: typeof parsed.headline === 'string' ? parsed.headline : null,
    description: typeof parsed.description === 'string' ? parsed.description : null,
    highlightBullets: bullets,
  };
}

function formatPayout(program: typeof distributionPrograms.$inferSelect) {
  const currency = program.currencyCode || 'ZAR';
  const amount = Number(program.referrerCommissionValue ?? program.defaultCommissionAmount ?? 0);
  const percent = Number(program.referrerCommissionValue ?? program.defaultCommissionPercent ?? 0);
  const payoutType = program.referrerCommissionType;
  if (payoutType === 'flat' && Number.isFinite(amount) && amount > 0) {
    return `${currency === 'ZAR' ? 'R' : `${currency} `}${Math.round(amount).toLocaleString('en-ZA')} referral payout`;
  }
  if (payoutType === 'percentage' && Number.isFinite(percent) && percent > 0) {
    const basis = program.referrerCommissionBasis?.replace(/_/g, ' ');
    return basis
      ? `${percent}% referral payout of ${basis}`
      : 'Percentage referral payout basis not configured';
  }
  return 'Referral payout terms not configured';
}

async function getPublisherScopedDevelopmentIds(
  developmentIds: number[],
  cataloguePublisherId: number,
) {
  const allowed = new Set<number>();
  for (let offset = 0; offset < developmentIds.length; offset += 200) {
    const pageIds = developmentIds.slice(offset, offset + 200);
    const references = await listDevelopmentSalesWorkspaceReferences({
      developmentIds: pageIds,
      limit: 200,
    });
    for (const reference of references) {
      if (reference.publisherId === cataloguePublisherId) allowed.add(reference.developmentId);
    }
  }
  return allowed;
}

export type PartnerProgramTermsItem = {
  developmentId: number;
  developmentName: string;
  developmentFactsAvailable: true;
  city: string;
  province: string;
  suburb: null;
  address: null;
  description: string | null;
  amenities: null;
  features: null;
  imageUrl: string | null;
  campaign: DevelopmentSalesProjection['campaign'];
  inventory: {
    phaseScope: DevelopmentSalesProjection['inventory']['phaseScope'];
    modes: Partial<Record<PartnerMode, PartnerModeProjection>>;
  };
  contacts: DevelopmentSalesProjection['contacts'];
  programPromotion: ProgramPromotion;
  brand: null;
  program: {
    programId: number;
    isActive: boolean;
    isReferralEnabled: boolean;
    submissionAllowed: boolean;
    tierAccessPolicy: string | null;
    commissionModel: string;
    defaultCommissionPercent: number | null;
    defaultCommissionAmount: number | null;
    referrerCommissionType: string | null;
    referrerCommissionValue: number | null;
    referrerCommissionBasis: string | null;
    currencyCode: string | null;
    payoutMilestone: string | null;
    payoutMilestoneNotes: string | null;
  };
  unitTypes: Array<{
    id: string;
    name: string;
    description: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    size: number | null;
    yardSize: number | null;
    imageUrl: string | null;
    media: DistributionUnitMedia;
    modes: Partial<Record<PartnerMode, PartnerModeProjection>>;
  }>;
  requiredDocuments: Array<{
    templateId: number;
    documentCode: string;
    documentLabel: string;
    category: 'client_required_document';
    isRequired: boolean;
    sortOrder: number;
  }>;
  sourceDocuments: Array<{
    templateId: number;
    documentCode: string;
    documentLabel: string;
    fileUrl: string;
    fileName: string | null;
    sortOrder: number;
  }>;
  affordability: PartnerAffordabilityAssumptions;
  developerProjectionRevision: string;
  developerProjectionObservedAt: string;
  computed: {
    commissionDisplay: string;
    payoutTriggerDisplay: string;
    payoutTriggerNotes: string | null;
    requiredDocsSummary: string;
  };
  opportunity: {
    status: 'ready' | 'pending_setup' | 'blocked';
    distributionActive: true;
    partnerEntitled: true;
    campaignVisibility: 'visible';
    openForReferral: boolean;
    marketability: 'marketable' | 'not_marketable';
    reasonCodes: string[];
    nextAction: 'submit_referral' | 'upload_docs' | 'contact_manager' | 'not_available';
    friendlyMessage: string;
  };
};

async function projectionAndReference(developmentId: number) {
  const [projection, reference] = await Promise.all([
    getDevelopmentSalesProjection(developmentId),
    getDevelopmentSalesWorkspaceReference(developmentId),
  ]);
  if (!projection || !reference || projection.campaign.visible !== true) return null;
  if (!reference.publisherId || !projection.publisherId) return null;
  if (projection.publisherId !== reference.publisherId) return null;
  return { projection, reference };
}

/**
 * Builds partner catalogue details only after Distribution has confirmed the
 * actor holds an active referrer identity and the programme and development
 * are part of the published referral network (active referral-enabled
 * programme on an included development). Inventory facts always come from the
 * current projection.
 */
export async function listPartnerProgramTerms(
  input: PartnerProgramTermsInput,
): Promise<{ items: PartnerProgramTermsItem[] }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  if (input.developmentIds?.length === 0) return { items: [] };

  const rate = await resolveCheckfitV1Rate(db);
  const affordability = partnerAffordabilityAssumptions(rate);

  const accessibleIds: number[] = await listPartnerAccessibleDevelopmentIds({
    db,
    actor: input.actor,
    requestedDevelopmentIds: input.developmentIds,
  });
  const uniqueIds = [...new Set<number>(accessibleIds)].slice(0, 200);
  if (!uniqueIds.length) return { items: [] };

  const publisherScopedIds: Set<number> = input.cataloguePublisherId
    ? await getPublisherScopedDevelopmentIds(uniqueIds, input.cataloguePublisherId)
    : new Set(uniqueIds);
  if (!publisherScopedIds.size) return { items: [] };

  const programRows = await db
    .select()
    .from(distributionPrograms)
    .where(
      and(
        inArray(distributionPrograms.developmentId, [...publisherScopedIds]),
        eq(distributionPrograms.isActive, 1),
      ),
    );
  if (!programRows.length) return { items: [] };

  const programByDevelopmentId = new Map<number, (typeof programRows)[number]>(
    programRows.map(program => [Number(program.developmentId), program]),
  );
  const accessRows = await db
    .select({
      developmentId: distributionDevelopmentAccess.developmentId,
      status: distributionDevelopmentAccess.status,
      submissionAllowed: distributionDevelopmentAccess.submissionAllowed,
      excludedByMandate: distributionDevelopmentAccess.excludedByMandate,
      excludedByExclusivity: distributionDevelopmentAccess.excludedByExclusivity,
      promotion: distributionDevelopmentAccess.brochureConfigJson,
      partnershipStatus: distributionBrandPartnerships.status,
    })
    .from(distributionDevelopmentAccess)
    .innerJoin(
      distributionBrandPartnerships,
      eq(distributionDevelopmentAccess.brandPartnershipId, distributionBrandPartnerships.id),
    )
    .where(inArray(distributionDevelopmentAccess.developmentId, [...programByDevelopmentId.keys()]));
  const accessByDevelopmentId = new Map<number, (typeof accessRows)[number]>(
    accessRows.map(row => [Number(row.developmentId), row]),
  );

  const items = await Promise.all(
    [...programByDevelopmentId.entries()].map(async ([developmentId, program]) => {
      const access = accessByDevelopmentId.get(developmentId);
      if (
        !access ||
        access.status !== 'included' ||
        access.partnershipStatus !== 'active' ||
        Number(access.excludedByMandate) === 1 ||
        Number(access.excludedByExclusivity) === 1
      ) {
        return null;
      }

      const source = await projectionAndReference(developmentId);
      if (!source) return null;
      const { projection } = source;
      const evaluation = await evaluateDevelopmentDistributionAccess({
        db,
        developmentId,
        actor: { role: 'admin' },
        channel: 'admin_catalog',
        developerProjection: projection,
        developerWorkspaceReference: source.reference,
      });
      const inventoryIsScoped = projection.inventory.phaseScope !== 'unscoped-hidden';
      const modes = inventoryIsScoped ? partnerModes(projection.inventory.modes) : {};
      const marketable = inventoryIsScoped && hasMarketableMode(projection.inventory.modes);
      const documentTemplates = await listDevelopmentRequiredDocumentsOrEmpty(db, developmentId);
      const requiredDocuments = documentTemplates.filter(
        document => document.isActive && document.category === 'client_required_document',
      );
      const sourceDocuments = documentTemplates.flatMap(document => {
        if (
          !document.isActive ||
          document.isRequired ||
          document.category !== 'developer_document' ||
          !document.templateFileUrl
        ) {
          return [];
        }
        return [
          {
            templateId: document.id,
            documentCode: document.documentCode,
            documentLabel: document.documentLabel,
            fileUrl: document.templateFileUrl,
            fileName: document.templateFileName,
            sortOrder: document.sortOrder,
          },
        ];
      });
      const openForReferral = evaluation.submitReady;
      const friendlyMessage = !marketable
        ? 'This campaign is visible, but no priced sale or rental inventory is currently available.'
        : evaluation.opportunity.friendlyMessage;
      const promotion = parsePromotion(access.promotion);

      return {
        developmentId,
        developmentName: projection.campaign.name,
        developmentFactsAvailable: true as const,
        city: projection.campaign.city,
        province: projection.campaign.province,
        suburb: null,
        address: null,
        description: projection.campaign.description || projection.campaign.tagline,
        amenities: null,
        features: null,
        imageUrl: projection.campaign.images[0] || null,
        campaign: projection.campaign,
        inventory: {
          phaseScope: projection.inventory.phaseScope,
          modes,
        },
        contacts: projection.contacts,
        programPromotion: promotion,
        brand: null,
        program: {
          programId: Number(program.id),
          isActive: Number(program.isActive) === 1,
          isReferralEnabled: Number(program.isReferralEnabled) === 1,
          submissionAllowed: Number(access.submissionAllowed) === 1,
          tierAccessPolicy: program.tierAccessPolicy || null,
          commissionModel: String(program.commissionModel),
          defaultCommissionPercent:
            program.defaultCommissionPercent === null ? null : Number(program.defaultCommissionPercent),
          defaultCommissionAmount:
            program.defaultCommissionAmount === null ? null : Number(program.defaultCommissionAmount),
          referrerCommissionType: program.referrerCommissionType || null,
          referrerCommissionValue:
            program.referrerCommissionValue === null ? null : Number(program.referrerCommissionValue),
          referrerCommissionBasis: program.referrerCommissionBasis || null,
          currencyCode: program.currencyCode || null,
          payoutMilestone: program.payoutMilestone || null,
          payoutMilestoneNotes: program.payoutMilestoneNotes || null,
        },
        unitTypes: inventoryIsScoped ? projection.inventory.unitTypes.map(unitType => ({
          id: unitType.id,
          name: unitType.name,
          description: unitType.description,
          bedrooms: unitType.bedrooms,
          bathrooms: unitType.bathrooms,
          size: unitType.size,
          yardSize: unitType.yardSize,
          imageUrl: unitType.imageUrl,
          media: unitType.media,
          modes: partnerModes(unitType.modes),
        })) : [],
        requiredDocuments: requiredDocuments.map(document => ({
          templateId: document.id,
          documentCode: document.documentCode,
          documentLabel: document.documentLabel,
          category: 'client_required_document' as const,
          isRequired: document.isRequired,
          sortOrder: document.sortOrder,
        })),
        sourceDocuments,
        affordability,
        developerProjectionRevision: projection.revision,
        developerProjectionObservedAt: projection.observedAt,
        computed: {
          commissionDisplay: formatPayout(program),
          payoutTriggerDisplay: program.payoutMilestone
            ? PAYOUT_TRIGGER_LABELS[String(program.payoutMilestone)] || 'Custom program trigger'
            : 'Not configured',
          payoutTriggerNotes: String(program.payoutMilestoneNotes || '').trim() || null,
          requiredDocsSummary: requiredDocuments.length
            ? `${requiredDocuments.filter(document => document.isRequired).length} required referral documents`
            : 'No referral documents required',
        },
        opportunity: {
          status: evaluation.opportunity.status,
          distributionActive: true as const,
          partnerEntitled: true as const,
          campaignVisibility: 'visible' as const,
          openForReferral,
          marketability: marketable ? ('marketable' as const) : ('not_marketable' as const),
          reasonCodes: evaluation.opportunity.reasonCodes,
          nextAction: evaluation.opportunity.nextAction,
          friendlyMessage,
        },
      } satisfies PartnerProgramTermsItem;
    }),
  );

  return {
    items: items.filter((item): item is PartnerProgramTermsItem => item !== null),
  };
}

export async function getPartnerProgramTermsByDevelopmentId(
  developmentId: number,
  actor: DistributionPartnerActor,
) {
  const result = await listPartnerProgramTerms({ actor, developmentIds: [developmentId] });
  return result.items.find(item => item.developmentId === developmentId) || null;
}
