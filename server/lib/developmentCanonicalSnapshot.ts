import { DEVELOPMENT_WORKFLOW_STEPS } from './developmentWorkflowProgress';
import { buildCanonicalStepDataFromDevelopmentSnapshot } from '../../shared/developmentCanonicalSelectors';
import { normalizeDevelopmentWorkflowState } from '../../shared/developmentWorkflow';

export type CanonicalDevelopmentTransactionType = 'for_sale' | 'for_rent' | 'auction';

export type CanonicalDevelopmentSnapshotInput = {
  dev: Record<string, any>;
  media: Record<string, any>;
  amenities: any[];
  highlights: any[];
  features: any[];
  unitTypes: Array<Record<string, any>>;
  parseJson: <T>(value: unknown, fallback: T) => T;
};

const EDIT_WORKFLOW_STEPS = DEVELOPMENT_WORKFLOW_STEPS.filter(step => step !== 'review_publish');

function parsePersistedCompletedSteps(value: unknown): unknown {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function normalizeCanonicalDevelopmentTransactionType(
  input: unknown,
): CanonicalDevelopmentTransactionType {
  const s = String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');

  if (['for_rent', 'rent', 'to_rent', 'rental', 'rent_to_buy'].includes(s)) return 'for_rent';
  if (['auction', 'auctions'].includes(s)) return 'auction';

  return 'for_sale';
}

export function deriveDevelopmentWorkflowId(dev: Record<string, any>): string {
  const transactionType = normalizeCanonicalDevelopmentTransactionType(dev?.transactionType);
  if (transactionType === 'for_rent') return 'residential_rent';
  if (transactionType === 'auction') return 'residential_auction';
  return 'residential_sale';
}

export function stripInactiveCanonicalUnitFields(
  unit: Record<string, any>,
  transactionType: CanonicalDevelopmentTransactionType,
) {
  const canonical = { ...unit };

  if (transactionType !== 'for_sale') {
    delete canonical.priceFrom;
    delete canonical.priceTo;
    delete canonical.basePriceFrom;
    delete canonical.basePriceTo;
  }

  if (transactionType !== 'for_rent') {
    delete canonical.monthlyRentFrom;
    delete canonical.monthlyRentTo;
    delete canonical.leaseTerm;
    delete canonical.isFurnished;
    delete canonical.depositRequired;
  }

  if (transactionType !== 'auction') {
    delete canonical.startingBid;
    delete canonical.reservePrice;
    delete canonical.auctionStartDate;
    delete canonical.auctionEndDate;
    delete canonical.auctionStatus;
  }

  return canonical;
}

function buildCanonicalEditWorkflowState(args: {
  dev: Record<string, any>;
  developmentData: Record<string, any>;
  unitTypes: Array<Record<string, any>>;
}) {
  const { dev, developmentData, unitTypes } = args;
  const hasPersistedWorkflowState =
    (dev.workflowId !== null && dev.workflowId !== undefined) ||
    (dev.currentStepId !== null && dev.currentStepId !== undefined) ||
    (dev.completedSteps !== null && dev.completedSteps !== undefined);

  if (hasPersistedWorkflowState) {
    return normalizeDevelopmentWorkflowState({
      workflowId: dev.workflowId,
      currentStepId: dev.currentStepId,
      completedSteps: parsePersistedCompletedSteps(dev.completedSteps),
    });
  }

  const completedSteps: string[] = [];

  if (developmentData.developmentType && developmentData.transactionType) {
    completedSteps.push('configuration');
  }
  if (developmentData.name && developmentData.status && developmentData.transactionType) {
    completedSteps.push('identity_market');
  }
  if (developmentData.location?.city && developmentData.location?.province) {
    completedSteps.push('location');
  }
  if (
    developmentData.monthlyLevyFrom ||
    developmentData.ratesFrom ||
    developmentData.transferCostsIncluded
  ) {
    completedSteps.push('governance_finances');
  }
  if ((developmentData.amenities ?? []).length > 0 || (developmentData.features ?? []).length > 0) {
    completedSteps.push('amenities_features');
  }
  if (developmentData.description || (developmentData.highlights ?? []).length > 0) {
    completedSteps.push('marketing_summary');
  }
  if (
    developmentData.media?.heroImage ||
    (developmentData.media?.photos ?? []).length > 0 ||
    (developmentData.media?.videos ?? []).length > 0 ||
    (developmentData.media?.floorPlans ?? []).length > 0 ||
    (developmentData.media?.documents ?? []).length > 0
  ) {
    completedSteps.push('development_media');
  }
  if (unitTypes.length > 0) {
    completedSteps.push('unit_types');
  }

  const firstIncompleteStep =
    EDIT_WORKFLOW_STEPS.find(step => !completedSteps.includes(step)) ?? 'review_publish';

  return {
    workflowId: deriveDevelopmentWorkflowId(dev),
    currentStepId: dev?.isPublished ? 'review_publish' : firstIncompleteStep,
    completedSteps,
  };
}

export function buildDevelopmentCanonicalEditSnapshot(input: CanonicalDevelopmentSnapshotInput) {
  const { dev, media, amenities, highlights, features, unitTypes, parseJson } = input;
  const transactionType = normalizeCanonicalDevelopmentTransactionType(dev.transactionType);
  const canonicalUnitTypes = unitTypes.map(unit =>
    stripInactiveCanonicalUnitFields(unit, transactionType),
  );
  const developmentData = {
    id: dev.id,
    name: dev.name,
    description: dev.description ?? '',
    tagline: dev.tagline ?? dev.subtitle ?? '',
    subtitle: dev.subtitle ?? dev.tagline ?? '',
    status: dev.status,
    nature: dev.nature,
    developmentType: dev.developmentType,
    transactionType,
    ownershipType: dev.ownershipType ?? undefined,
    ownershipTypes: dev.ownershipType ? [dev.ownershipType] : [],
    marketingRole: dev.marketingRole ?? undefined,
    propertyTypes: parseJson(dev.propertyTypes, []),
    launchDate: dev.launchDate ?? undefined,
    completionDate: dev.completionDate ?? undefined,
    monthlyLevyFrom: dev.monthlyLevyFrom ?? undefined,
    monthlyLevyTo: dev.monthlyLevyTo ?? undefined,
    ratesFrom: dev.ratesFrom ?? undefined,
    ratesTo: dev.ratesTo ?? undefined,
    transferCostsIncluded: dev.transferCostsIncluded ?? undefined,
    priceFrom: dev.priceFrom ?? undefined,
    priceTo: dev.priceTo ?? undefined,
    monthlyRentFrom: dev.monthlyRentFrom ?? undefined,
    monthlyRentTo: dev.monthlyRentTo ?? undefined,
    auctionStartDate: dev.auctionStartDate ?? undefined,
    auctionEndDate: dev.auctionEndDate ?? undefined,
    startingBidFrom: dev.startingBidFrom ?? undefined,
    reservePriceFrom: dev.reservePriceFrom ?? undefined,
    location: {
      address: dev.address ?? '',
      suburb: dev.suburb ?? '',
      city: dev.city ?? '',
      province: dev.province ?? '',
      postalCode: dev.postalCode ?? '',
      latitude: dev.latitude ?? '',
      longitude: dev.longitude ?? '',
    },
    media,
    amenities,
    highlights,
    features,
  };
  const workflowState = buildCanonicalEditWorkflowState({
    dev,
    developmentData,
    unitTypes: canonicalUnitTypes,
  });
  const stepData = buildCanonicalStepDataFromDevelopmentSnapshot(
    developmentData,
    canonicalUnitTypes,
  );

  return {
    ...workflowState,
    developmentData,
    stepData,
    unitTypes: canonicalUnitTypes,
  };
}
