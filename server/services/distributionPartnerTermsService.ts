import { and, eq, inArray } from 'drizzle-orm';
import {
  distributionBrandPartnerships,
  distributionDevelopmentAccess,
  distributionPrograms,
} from '../../drizzle/schema';
import { getDb } from '../db';
import {
  listDevelopmentSalesWorkspaceReferences,
  type DevelopmentSalesWorkspaceReference,
} from './developmentSalesWorkspaceService';
import {
  getDevelopmentSalesProjection,
  type DevelopmentSalesProjection,
} from './developmentSalesProjectionService';
import {
  listPartnerAccessibleDevelopmentIds,
  type DistributionPartnerActor,
} from './distributionPartnerProgramAccessService';
import { listDevelopmentRequiredDocumentsOrEmpty } from './distributionRequiredDocumentsService';

type PartnerMode = 'sale' | 'rent';
type DeveloperMode = 'for_sale' | 'for_rent';
type PartnerProgramTermsInput = {
  actor: DistributionPartnerActor;
  cataloguePublisherId?: number;
  developmentIds?: number[];
  /** Kept for older internal callers; partner reads always require active access. */
  includeDisabled?: boolean;
};

type ProjectedMode = {
  availableCount: number;
  priceFrom: number;
  priceTo: number;
  priceBasis: 'purchase_price' | 'monthly_rent';
};

export type PartnerProgramTermsItem = {
  developmentId: number;
  developmentName: string;
  developmentFactsAvailable: true;
  marketStatus: 'launching-soon' | 'selling' | 'sold-out';
  city: string;
  province: string;
  suburb: null;
  address: null;
  description: string | null;
  amenities: null;
  features: null;
  transactionModes: PartnerMode[];
  referralModes: PartnerMode[];
  phaseScope: DevelopmentSalesProjection['inventory']['phaseScope'];
  phases: DevelopmentSalesProjection['inventory']['phases'];
  pricingByMode: {
    sale: ProjectedMode | null;
    rent: ProjectedMode | null;
  };
  priceFrom: number | null;
  priceTo: number | null;
  imageUrl: string | null;
  campaign: {
    tagline: string | null;
    images: string[];
    revision: string;
    observedAt: string;
  };
  brand: { cataloguePublisherId: number; brandName: string } | null;
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
    imageUrl: string | null;
    modes: Partial<Record<PartnerMode, ProjectedMode>>;
  }>;
  teamContacts: DevelopmentSalesProjection['contacts'];
  requiredDocuments: Array<{
    templateId: number;
    documentCode: string;
    documentLabel: string;
    category: 'client_required_document';
    isRequired: boolean;
    sortOrder: number;
  }>;
  /** Downloadable resources can only be fetched through the actor-authorized Distribution command. */
  sourceDocuments: Array<{
    id: number;
    title: string;
    documentType: string;
    category: string;
    version: number;
    downloadable: boolean;
  }>;
  computed: {
    commissionDisplay: string;
    payoutDisplay: string;
    requiredDocsSummary: string;
  };
  opportunity: {
    status: 'ready' | 'pending_setup' | 'blocked';
    distributionActive: true;
    partnerEntitled: true;
    campaignVisibility: 'visible';
    openForReferral: boolean;
    marketability: 'marketable';
    reasonCodes: string[];
    nextAction: 'submit_referral' | 'contact_manager';
    friendlyMessage: string;
  };
};

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanValue(value: unknown): boolean {
  return Number(value || 0) === 1;
}

function toPartnerMode(mode: DeveloperMode): PartnerMode {
  return mode === 'for_sale' ? 'sale' : 'rent';
}

function visibleModes(projection: DevelopmentSalesProjection): PartnerMode[] {
  return (Object.keys(projection.inventory.modes) as DeveloperMode[])
    .filter(mode => {
      const value = projection.inventory.modes[mode];
      return Boolean(value && value.availableCount > 0 && value.priceFrom > 0 && value.priceTo >= value.priceFrom);
    })
    .map(toPartnerMode);
}

function mapMode(value: ProjectedMode | undefined): ProjectedMode | null {
  return value && value.availableCount > 0 ? value : null;
}

function commissionDisplay(input: {
  currencyCode: string | null;
  commissionType: string | null;
  commissionValue: number | null;
  commissionBasis: string | null;
  commissionModel: string;
  defaultPercent: number | null;
  defaultAmount: number | null;
}) {
  const basis = input.commissionBasis ? ` on ${input.commissionBasis.replace(/_/g, ' ')}` : '';
  if (input.commissionType === 'percentage' && input.commissionValue !== null) {
    return `${input.commissionValue}% referral payout${basis}`;
  }
  if (input.commissionType === 'flat' && input.commissionValue !== null) {
    const currency = input.currencyCode === 'ZAR' ? 'R' : `${input.currencyCode || ''} `;
    return `${currency}${Math.round(input.commissionValue).toLocaleString('en-ZA')} referral payout`;
  }
  if (input.commissionModel === 'flat_percentage' && input.defaultPercent !== null) {
    return `${input.defaultPercent}% referral payout; basis requires confirmation`;
  }
  if (input.commissionModel === 'fixed_amount' && input.defaultAmount !== null) {
    const currency = input.currencyCode === 'ZAR' ? 'R' : `${input.currencyCode || ''} `;
    return `${currency}${Math.round(input.defaultAmount).toLocaleString('en-ZA')} referral payout`;
  }
  return 'Referral payout terms require confirmation';
}

function payoutDisplay(milestone: string | null, notes: string | null) {
  const normalizedNotes = String(notes || '').trim();
  if (normalizedNotes) return normalizedNotes;
  if (!milestone) return 'Payout milestone not configured';
  return `Paid after ${milestone.replace(/_/g, ' ')}`;
}

function mapUnitTypes(projection: DevelopmentSalesProjection): PartnerProgramTermsItem['unitTypes'] {
  return projection.inventory.unitTypes.map(unitType => {
    const modes: Partial<Record<PartnerMode, ProjectedMode>> = {};
    for (const mode of ['for_sale', 'for_rent'] as const) {
      const projected = unitType.modes[mode];
      if (projected?.availableCount && projected.priceFrom > 0 && projected.priceTo >= projected.priceFrom) {
        modes[toPartnerMode(mode)] = projected;
      }
    }
    return {
      id: unitType.id,
      name: unitType.name,
      description: unitType.description,
      bedrooms: unitType.bedrooms,
      bathrooms: unitType.bathrooms,
      size: unitType.size,
      imageUrl: unitType.imageUrl,
      modes,
    };
  }).filter(unitType => Object.keys(unitType.modes).length > 0);
}

async function loadWorkspaceReferences(developmentIds: number[]) {
  const uniqueIds = [...new Set(developmentIds)];
  const batches = Array.from({ length: Math.ceil(uniqueIds.length / 100) }, (_, page) =>
    uniqueIds.slice(page * 100, (page + 1) * 100),
  );
  return (await Promise.all(
    batches.map(developmentIdsInBatch =>
      listDevelopmentSalesWorkspaceReferences({
        developmentIds: developmentIdsInBatch,
        limit: 100,
      }),
    ),
  )).flat();
}

export async function listPartnerProgramTerms(
  input: PartnerProgramTermsInput,
): Promise<{ items: PartnerProgramTermsItem[] }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  if (input.developmentIds?.length === 0) return { items: [] };

  const accessibleIds = await listPartnerAccessibleDevelopmentIds({
    db,
    actor: input.actor,
    requestedDevelopmentIds: input.developmentIds,
  });
  if (!accessibleIds.length) return { items: [] };

  const programRows = await db
    .select({
      developmentId: distributionPrograms.developmentId,
      programId: distributionPrograms.id,
      isActive: distributionPrograms.isActive,
      isReferralEnabled: distributionPrograms.isReferralEnabled,
      tierAccessPolicy: distributionPrograms.tierAccessPolicy,
      commissionModel: distributionPrograms.commissionModel,
      defaultCommissionPercent: distributionPrograms.defaultCommissionPercent,
      defaultCommissionAmount: distributionPrograms.defaultCommissionAmount,
      referrerCommissionType: distributionPrograms.referrerCommissionType,
      referrerCommissionValue: distributionPrograms.referrerCommissionValue,
      referrerCommissionBasis: distributionPrograms.referrerCommissionBasis,
      currencyCode: distributionPrograms.currencyCode,
      payoutMilestone: distributionPrograms.payoutMilestone,
      payoutMilestoneNotes: distributionPrograms.payoutMilestoneNotes,
      accessStatus: distributionDevelopmentAccess.status,
      submissionAllowed: distributionDevelopmentAccess.submissionAllowed,
      excludedByMandate: distributionDevelopmentAccess.excludedByMandate,
      excludedByExclusivity: distributionDevelopmentAccess.excludedByExclusivity,
      publisherId: distributionDevelopmentAccess.cataloguePublisherId,
      partnershipStatus: distributionBrandPartnerships.status,
    })
    .from(distributionPrograms)
    .innerJoin(
      distributionDevelopmentAccess,
      eq(distributionDevelopmentAccess.developmentId, distributionPrograms.developmentId),
    )
    .innerJoin(
      distributionBrandPartnerships,
      eq(distributionBrandPartnerships.id, distributionDevelopmentAccess.brandPartnershipId),
    )
    .where(
      and(
        inArray(distributionPrograms.developmentId, accessibleIds),
        eq(distributionPrograms.isActive, 1),
        eq(distributionDevelopmentAccess.status, 'included'),
        eq(distributionDevelopmentAccess.excludedByMandate, 0),
        eq(distributionDevelopmentAccess.excludedByExclusivity, 0),
        eq(distributionBrandPartnerships.status, 'active'),
      ),
    );

  if (!programRows.length) return { items: [] };

  const references = await loadWorkspaceReferences(programRows.map(row => Number(row.developmentId)));
  const referenceById = new Map<number, DevelopmentSalesWorkspaceReference>(
    references.map(reference => [reference.developmentId, reference]),
  );
  const projections = await Promise.all(
    programRows.map(async row => {
      const developmentId = Number(row.developmentId);
      const reference = referenceById.get(developmentId);
      if (!reference || (input.cataloguePublisherId && reference.publisherId !== input.cataloguePublisherId)) {
        return null;
      }
      const projection = await getDevelopmentSalesProjection(developmentId);
      if (
        !projection ||
        !projection.campaign.visible ||
        projection.publisherId === null ||
        projection.publisherId !== reference.publisherId ||
        projection.publisherId !== Number(row.publisherId || 0) ||
        projection.inventory.phaseScope === 'unscoped-hidden' ||
        visibleModes(projection).length === 0
      ) {
        return null;
      }
      return { row, reference, projection };
    }),
  );

  const items: PartnerProgramTermsItem[] = [];
  for (const candidate of projections) {
    if (!candidate) continue;
    const { row, reference, projection } = candidate;
    const modes = visibleModes(projection);
    const sale = mapMode(projection.inventory.modes.for_sale);
    const rent = mapMode(projection.inventory.modes.for_rent);
    const requiredDocuments = (await listDevelopmentRequiredDocumentsOrEmpty(db, reference.developmentId))
      .filter(document => document.isActive)
      .map(document => ({
        templateId: document.id,
        documentCode: document.documentCode,
        documentLabel: document.documentLabel,
        category: 'client_required_document' as const,
        isRequired: document.isRequired,
        sortOrder: document.sortOrder,
      }));
    const programIsActive = booleanValue(row.isActive) && row.accessStatus === 'included' && row.partnershipStatus === 'active';
    const openForReferral =
      programIsActive && booleanValue(row.isReferralEnabled) && booleanValue(row.submissionAllowed);
    const hasFlatRentalPayout =
      (row.referrerCommissionType === 'flat' && (numberOrNull(row.referrerCommissionValue) || 0) > 0) ||
      (row.commissionModel === 'fixed_amount' && (numberOrNull(row.defaultCommissionAmount) || 0) > 0);
    const referralModes = openForReferral
      ? modes.filter(mode => mode === 'sale' || hasFlatRentalPayout)
      : [];
    const refs = commissionDisplay({
      currencyCode: row.currencyCode || null,
      commissionType: row.referrerCommissionType || null,
      commissionValue: numberOrNull(row.referrerCommissionValue),
      commissionBasis: row.referrerCommissionBasis || null,
      commissionModel: String(row.commissionModel || ''),
      defaultPercent: numberOrNull(row.defaultCommissionPercent),
      defaultAmount: numberOrNull(row.defaultCommissionAmount),
    });
    const singleMode = modes.length === 1 ? modes[0] : null;
    const singlePrice = singleMode === 'sale' ? sale : singleMode === 'rent' ? rent : null;
    const requiredCount = requiredDocuments.filter(document => document.isRequired).length;

    items.push({
      developmentId: reference.developmentId,
      developmentName: projection.campaign.name,
      developmentFactsAvailable: true,
      marketStatus: projection.campaign.lifecycle,
      city: projection.campaign.city,
      province: projection.campaign.province,
      suburb: null,
      address: null,
      description: projection.campaign.description,
      amenities: null,
      features: null,
      transactionModes: modes,
      referralModes,
      phaseScope: projection.inventory.phaseScope,
      phases: projection.inventory.phases,
      pricingByMode: { sale, rent },
      priceFrom: singlePrice?.priceFrom ?? null,
      priceTo: singlePrice?.priceTo ?? null,
      imageUrl: projection.campaign.images[0] || null,
      campaign: {
        tagline: projection.campaign.tagline,
        images: projection.campaign.images,
        revision: projection.revision,
        observedAt: projection.observedAt,
      },
      brand: reference.publisherId && reference.publisherName
        ? { cataloguePublisherId: reference.publisherId, brandName: reference.publisherName }
        : null,
      program: {
        programId: Number(row.programId),
        isActive: programIsActive,
        isReferralEnabled: booleanValue(row.isReferralEnabled),
        submissionAllowed: booleanValue(row.submissionAllowed),
        tierAccessPolicy: row.tierAccessPolicy || null,
        commissionModel: String(row.commissionModel || ''),
        defaultCommissionPercent: numberOrNull(row.defaultCommissionPercent),
        defaultCommissionAmount: numberOrNull(row.defaultCommissionAmount),
        referrerCommissionType: row.referrerCommissionType || null,
        referrerCommissionValue: numberOrNull(row.referrerCommissionValue),
        referrerCommissionBasis: row.referrerCommissionBasis || null,
        currencyCode: row.currencyCode || null,
        payoutMilestone: row.payoutMilestone || null,
        payoutMilestoneNotes: row.payoutMilestoneNotes || null,
      },
      unitTypes: mapUnitTypes(projection),
      teamContacts: projection.contacts,
      requiredDocuments,
      sourceDocuments: projection.resources.map(resource => ({
        id: resource.id,
        title: resource.title,
        documentType: resource.documentType,
        category: resource.category,
        version: resource.version,
        downloadable: resource.downloadable,
      })),
      computed: {
        commissionDisplay: refs,
        payoutDisplay: payoutDisplay(row.payoutMilestone || null, row.payoutMilestoneNotes || null),
        requiredDocsSummary: requiredCount
          ? `${requiredCount} required document${requiredCount === 1 ? '' : 's'}`
          : 'No required documents configured',
      },
      opportunity: {
        status: openForReferral && referralModes.length > 0 ? 'ready' : 'pending_setup',
        distributionActive: true,
        partnerEntitled: true,
        campaignVisibility: 'visible',
        openForReferral,
        marketability: 'marketable',
        reasonCodes: !openForReferral
          ? ['REFERRALS_PAUSED']
          : referralModes.length === 0
            ? ['PAYOUT_TERMS_NOT_CONFIGURED_FOR_AVAILABLE_MODES']
            : [],
        nextAction: openForReferral && referralModes.length > 0 ? 'submit_referral' : 'contact_manager',
        friendlyMessage: !openForReferral
          ? 'This program is visible, but referral intake is paused. Contact the program manager.'
          : referralModes.length === 0
            ? 'Marketable inventory is available, but referral payout terms are not configured for it.'
            : referralModes.length < modes.length
              ? 'Sale referrals are open. Rental referrals need a configured flat payout before they can be submitted.'
              : 'Current released inventory is available for this referral program.',
      },
    });
  }

  return { items };
}

export async function getPartnerProgramTermsByDevelopmentId(
  developmentId: number,
  actor: DistributionPartnerActor,
) {
  const result = await listPartnerProgramTerms({ actor, developmentIds: [developmentId] });
  return result.items.find(item => item.developmentId === developmentId) || null;
}
