import { stripUnitPricingForTransaction } from '@/lib/developmentTransactionPayload';
import {
  buildCanonicalDevelopmentDataSnapshot,
  firstDefined,
  getCanonicalDevelopmentEditTargetId,
  getCanonicalDevelopmentMedia,
  getCanonicalStepSlice,
  isPlainObject,
} from '../../../shared/developmentCanonicalSelectors';

type TransactionTypeNormalizer = (type: any) => any;

export const CANONICAL_DRAFT_SNAPSHOT_FIELD_OWNERSHIP = {
  workflowState: ['workflowId', 'currentStepId', 'completedSteps'],
  editIdentity: ['editingId', 'developmentId'],
  canonicalMirrors: ['developmentData', 'stepData', 'unitTypes', 'transactionType'],
  stepSlices: [
    'configuration',
    'identity_market',
    'location',
    'governance_finances',
    'amenities_features',
    'marketing_summary',
    'development_media',
    'unit_types',
    'review_publish',
  ],
  compatibilityOutsideSnapshot: [
    'currentPhase',
    'currentStep',
    'unitTypeDraft',
    'overview',
    'finalisation',
    '_version',
    '_savedAt',
  ],
} as const;

export type DevelopmentDraftSnapshotState = {
  workflowId?: any;
  currentStepId?: any;
  completedSteps?: any[];
  editingId?: any;
  developmentId?: any;
  existingDevelopmentId?: any;
  id?: any;
  stepData?: Record<string, any>;
  unitTypes?: any[];
  developmentData?: Record<string, any>;
  developmentType?: any;
  transactionType?: any;
};

export function getCanonicalUnitTypesFromState(
  state: Pick<DevelopmentDraftSnapshotState, 'stepData' | 'unitTypes'>,
) {
  return Array.isArray(state.stepData?.unit_types?.unitTypes)
    ? state.stepData.unit_types.unitTypes
    : (state.unitTypes ?? []);
}

export function resolveDraftTransactionType(
  state: Pick<DevelopmentDraftSnapshotState, 'stepData' | 'developmentData'>,
  normalizeTransactionType: TransactionTypeNormalizer,
) {
  return normalizeTransactionType(
    state.stepData?.identity_market?.transactionType ??
      state.stepData?.configuration?.transactionType ??
      state.developmentData?.transactionType,
  );
}

export function normalizeUnitTypesForState(
  state: Pick<DevelopmentDraftSnapshotState, 'transactionType' | 'developmentData'>,
  units: any[],
  normalizeTransactionType: TransactionTypeNormalizer,
) {
  const transactionType = normalizeTransactionType(
    state.transactionType ?? state.developmentData?.transactionType,
  );
  return units.map(unit =>
    stripUnitPricingForTransaction(unit, transactionType, { normalizeRanges: false }),
  );
}

export function buildUnitTypesStepData(
  state: Pick<DevelopmentDraftSnapshotState, 'stepData'>,
  units: any[],
) {
  return {
    ...state.stepData,
    unit_types: { ...state.stepData?.unit_types, unitTypes: units },
  };
}

export function buildCanonicalDraftSnapshotParts({
  state,
  transactionType,
  canonicalUnitTypes,
  fallbackDevelopmentData,
}: {
  state: DevelopmentDraftSnapshotState;
  transactionType: any;
  canonicalUnitTypes: any[];
  fallbackDevelopmentData: Record<string, any>;
}) {
  const stepData = state.stepData ?? {};
  const developmentData = (state.developmentData ?? fallbackDevelopmentData) as Record<string, any>;
  const selectorPayload = {
    developmentData,
    developmentType: state.developmentType,
    transactionType: state.transactionType,
    stepData,
  };
  const configuration = getCanonicalStepSlice(selectorPayload, 'configuration');
  const identityMarket = getCanonicalStepSlice(selectorPayload, 'identity_market');
  const governanceFinances = getCanonicalStepSlice(selectorPayload, 'governance_finances');
  const levyRange = isPlainObject(governanceFinances.levyRange) ? governanceFinances.levyRange : {};
  const rightsAndTaxes = isPlainObject(governanceFinances.rightsAndTaxes)
    ? governanceFinances.rightsAndTaxes
    : {};
  const amenitiesFeatures = getCanonicalStepSlice(selectorPayload, 'amenities_features');
  const marketingSummary = getCanonicalStepSlice(selectorPayload, 'marketing_summary');
  const canonicalSnapshot = buildCanonicalDevelopmentDataSnapshot(selectorPayload);
  const canonicalMediaSource = getCanonicalDevelopmentMedia({ developmentData, stepData });
  const media = developmentData.media ?? fallbackDevelopmentData.media;
  const canonicalMedia = {
    heroImage: firstDefined(canonicalMediaSource.heroImage, media.heroImage),
    photos: firstDefined(canonicalMediaSource.photos, media.photos ?? []),
    videos: firstDefined(canonicalMediaSource.videos, media.videos ?? []),
    floorPlans: firstDefined(canonicalMediaSource.floorPlans, media.floorPlans ?? []),
    documents: firstDefined(
      canonicalMediaSource.documents,
      canonicalMediaSource.brochures,
      media.documents ?? media.brochures ?? [],
    ),
  };
  const canonicalDevelopmentData: Record<string, any> = {
    ...canonicalSnapshot,
    transactionType: firstDefined(transactionType, canonicalSnapshot.transactionType),
    media: canonicalMedia,
  };

  return {
    developmentData: canonicalDevelopmentData,
    stepData: {
      ...stepData,
      configuration: {
        ...configuration,
        developmentType: canonicalDevelopmentData.developmentType,
        transactionType: canonicalDevelopmentData.transactionType,
      },
      identity_market: {
        ...identityMarket,
        name: canonicalDevelopmentData.name,
        subtitle: canonicalDevelopmentData.subtitle,
        status: canonicalDevelopmentData.status,
        nature: canonicalDevelopmentData.nature,
        transactionType: canonicalDevelopmentData.transactionType,
        ownershipTypes: canonicalDevelopmentData.ownershipTypes,
        marketingRole: canonicalDevelopmentData.marketingRole,
        launchDate: canonicalDevelopmentData.launchDate,
        completionDate: canonicalDevelopmentData.completionDate,
        expectedFirstHandoverDate: canonicalDevelopmentData.expectedFirstHandoverDate,
        handoverDuringConstruction: canonicalDevelopmentData.handoverDuringConstruction,
      },
      location: canonicalDevelopmentData.location,
      governance_finances: {
        ...governanceFinances,
        levyRange: {
          ...levyRange,
          min: canonicalDevelopmentData.monthlyLevyFrom,
          max: canonicalDevelopmentData.monthlyLevyTo,
        },
        rightsAndTaxes: {
          ...rightsAndTaxes,
          min: canonicalDevelopmentData.ratesFrom,
          max: canonicalDevelopmentData.ratesTo,
        },
        transferCostsIncluded: canonicalDevelopmentData.transferCostsIncluded,
      },
      amenities_features: {
        ...amenitiesFeatures,
        amenities: canonicalDevelopmentData.amenities,
        features: canonicalDevelopmentData.features,
      },
      marketing_summary: {
        ...marketingSummary,
        description: canonicalDevelopmentData.description,
        tagline: canonicalDevelopmentData.tagline,
        keySellingPoints: canonicalDevelopmentData.highlights,
      },
      development_media: {
        ...canonicalMediaSource,
        heroImage: canonicalMedia.heroImage,
        photos: canonicalMedia.photos,
        videos: canonicalMedia.videos,
        floorPlans: canonicalMedia.floorPlans,
        documents: canonicalMedia.documents,
      },
      unit_types: {
        ...(stepData.unit_types ?? {}),
        unitTypes: canonicalUnitTypes,
      },
      review_publish: {
        ...(stepData.review_publish ?? {}),
      },
    },
  };
}

export function buildCanonicalDraftSnapshot({
  state,
  normalizeTransactionType,
  fallbackDevelopmentData,
}: {
  state: DevelopmentDraftSnapshotState;
  normalizeTransactionType: TransactionTypeNormalizer;
  fallbackDevelopmentData: Record<string, any>;
}) {
  const transactionType = resolveDraftTransactionType(state, normalizeTransactionType);
  const editTargetId = getCanonicalDevelopmentEditTargetId(state);
  const unitTypes = getCanonicalUnitTypesFromState(state).map(unit =>
    stripUnitPricingForTransaction(unit, transactionType),
  );
  const snapshotParts = buildCanonicalDraftSnapshotParts({
    state,
    transactionType,
    canonicalUnitTypes: unitTypes,
    fallbackDevelopmentData,
  });

  return {
    workflowId: state.workflowId,
    currentStepId: state.currentStepId,
    completedSteps: state.completedSteps ?? [],
    ...(editTargetId ? { editingId: editTargetId, developmentId: editTargetId } : {}),
    ...snapshotParts,
    transactionType,
    unitTypes,
  };
}
