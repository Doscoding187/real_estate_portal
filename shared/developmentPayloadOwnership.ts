export const DEVELOPMENT_INVENTORY_OWNING_STEPS = ['unit_types', 'review_publish'] as const;

export const CANONICAL_UPDATE_MODE_FIELD = 'canonicalUpdateMode' as const;
export const CANONICAL_PARTIAL_UPDATE_MODE = 'partial_step' as const;

export const DEVELOPMENT_INVENTORY_OWNED_PAYLOAD_FIELDS = [
  'unitTypes',
  'totalUnits',
  'availableUnits',
  'priceFrom',
  'priceTo',
  'monthlyRentFrom',
  'monthlyRentTo',
  'auctionStartDate',
  'auctionEndDate',
  'startingBidFrom',
  'reservePriceFrom',
] as const;

export const CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP = {
  workflowState: ['workflowId', 'currentStepId', 'completedSteps'],
  canonicalMirrors: ['developmentData', 'stepData'],
  configuration: ['developmentType', 'transactionType'],
  identityMarket: [
    'name',
    'subtitle',
    'status',
    'nature',
    'ownershipTypes',
    'ownershipType',
    'marketingRole',
    'launchDate',
    'completionDate',
  ],
  classification: ['propertyTypes'],
  location: ['address', 'city', 'province', 'suburb', 'postalCode', 'latitude', 'longitude'],
  amenitiesFeatures: ['amenities', 'features'],
  marketingSummary: ['description', 'tagline', 'highlights'],
  developmentMedia: ['images', 'videos', 'floorPlans', 'brochures'],
  governanceFinances: [
    'monthlyLevyFrom',
    'monthlyLevyTo',
    'ratesFrom',
    'ratesTo',
    'transferCostsIncluded',
  ],
  unitTypes: ['unitTypes'],
  sourceStepSlices: [
    'configuration',
    'identity_market',
    'location',
    'amenities_features',
    'marketing_summary',
    'development_media',
    'governance_finances',
    'unit_types',
  ],
  legacyCompatibilityOutsideCanonicalOwnership: [
    'editingId',
    'developmentId',
    'currentPhase',
    'currentStep',
    'overview',
    'finalisation',
    '_version',
    '_savedAt',
  ],
} as const;

export const PARTIAL_UPDATE_ALWAYS_ALLOWED_PAYLOAD_FIELDS = [
  ...CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.workflowState,
  ...CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.canonicalMirrors,
] as const;

export const PARTIAL_UPDATE_STEP_OWNED_PAYLOAD_FIELDS = {
  configuration: CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.configuration,
  identity_market: CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.identityMarket,
  location: CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.location,
  amenities_features: CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.amenitiesFeatures,
  marketing_summary: CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.marketingSummary,
  development_media: CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.developmentMedia,
  governance_finances: [
    ...CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.governanceFinances,
    'estateSpecs',
  ],
  unit_types: [
    ...CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.configuration,
    ...DEVELOPMENT_INVENTORY_OWNED_PAYLOAD_FIELDS,
  ],
} as const;

export function isDevelopmentInventoryOwningStepId(stepId: unknown): boolean {
  return (
    typeof stepId === 'string' &&
    (DEVELOPMENT_INVENTORY_OWNING_STEPS as readonly string[]).includes(stepId)
  );
}
