import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DevelopmentType,
  ResidentialType,
  CommunityType,
  DevelopmentNature,
  MarketingRole,
} from '@/types/wizardTypes';
import { WorkflowId, WizardStepId, WizardData } from '@/lib/types/wizard-workflows';
import { WORKFLOWS, getWorkflow, getVisibleSteps } from '@/lib/workflows';
import { normalizeDevelopmentTransactionType } from '@/lib/developmentTransactionPayload';
import {
  buildCanonicalDraftSnapshot,
  buildUnitTypesStepData,
  getCanonicalUnitTypesFromState,
  normalizeUnitTypesForState,
} from '@/lib/developmentDraftSnapshot';
import {
  buildHydratedDevelopmentDataUpdates,
  buildHydratedStepData,
  hydrateDevelopmentConfigs,
  normalizeHydratedUnitTypeForState,
} from '@/lib/developmentHydrationAdapter';
import {
  firstDefined,
  getCanonicalDevelopmentEditTargetId,
  getCanonicalDevelopmentConfiguration,
  getCanonicalDevelopmentUnitTypes,
  isPlainObject,
  parseCanonicalJsonValue,
} from '../../../shared/developmentCanonicalSelectors';
import { normalizeDevelopmentWorkflowState } from '../../../shared/developmentWorkflow';
import { getDevelopmentPublishReadinessSummary } from '../../../shared/developmentReadiness';

export const DEVELOPMENT_WIZARD_STORAGE_KEY = 'development-wizard-storage-v2';
export const PUBLISHER_DEVELOPMENT_WIZARD_STORAGE_KEY = 'publisher-development-wizard-storage-v1';

// Media Item Interface
// Media Item Interface
export interface MediaItem {
  id: string;
  file?: File;
  url: string;
  type: 'image' | 'pdf' | 'video' | 'floorplan' | 'document';
  category:
    | 'featured'
    | 'general'
    | 'amenities'
    | 'outdoors'
    | 'videos'
    | 'photo'
    | 'floorplan'
    | 'render'
    | 'document'
    | 'brochures';
  isPrimary: boolean;
  displayOrder: number;
  uploadedAt?: Date;
  fileName?: string;
}

// Document Interface
export interface Document {
  id: string;
  name: string;
  type: 'brochure' | 'site-plan' | 'pricing-sheet' | 'estate-rules' | 'engineering-pack' | 'other';
  url: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt: Date;
}

// Spec Variation Interface
export interface SpecVariation {
  id: string;
  unitTypeId: string;

  // Basic Info
  name: string; // "Standard Spec", "GAP Spec", "Premium Spec"
  price: number;
  description: string;

  // Overrides (optional - only store if different from base)
  bedroomsOverride?: number;
  bathroomsOverride?: number;
  sizeOverride?: number;

  // Amenity & Specification Overrides
  overrides?: {
    amenities?: {
      add?: string[]; // Additional amenities beyond unit type
      remove?: string[]; // Unit type amenities to exclude
    };
    specifications?: {
      builtInFeatures?: {
        builtInWardrobes?: boolean;
        tiledFlooring?: boolean;
        graniteCounters?: boolean;
      };
      finishes?: {
        paintAndWalls?: string;
        flooringTypes?: string;
        kitchenFeatures?: string;
        bathroomFeatures?: string;
      };
      electrical?: {
        prepaidElectricity?: boolean;
      };
    };
  };

  // Spec-Specific Media (overrides base media)
  media?: {
    photos: MediaItem[];
    floorPlans: MediaItem[];
    videos: MediaItem[];
    pdfs: MediaItem[];
  };

  // Spec-Specific Documents
  documents?: Document[];

  // Metadata
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Unit Type Interface (with Inheritance)

// CONSTANTS & HELPERS
const initialResidentialConfig = {
  residentialType: null,
  freeholdCategory: null as FreeholdCategory | null,
  communityTypes: [],
};
const initialLandConfig = { landType: null, infrastructure: [] };
const initialCommercialConfig = { commercialType: null, features: [] };

export type FreeholdCategory = 'freestanding' | 'security_estate';

const derivePropertyTypesFromResidentialConfig = (config: {
  residentialType: ResidentialType | null;
}): string[] | null => {
  if (config.residentialType === 'apartment') return ['apartment'];
  if (config.residentialType === 'townhouse') return ['cluster_house'];
  if (config.residentialType === 'freehold') return ['house'];
  return null;
};

const normalizeTransactionType = (
  type: any,
): import('@/types/wizardTypes').TransactionType | undefined => {
  if (!type) return undefined;
  return normalizeDevelopmentTransactionType(type) as import('@/types/wizardTypes').TransactionType;
};

const getCompatibleTransactionTypes = (devType: string) => {
  if (devType === 'commercial') return ['for_sale', 'for_rent', 'auction'];
  if (devType === 'residential') return ['for_sale', 'for_rent', 'auction'];
  return ['for_sale', 'for_rent'];
};

const resolveHydrationUnitTypes = (snapshotSource: any, source: any) => {
  return getCanonicalDevelopmentUnitTypes({
    ...source,
    stepData: snapshotSource?.stepData,
    unitTypes: source?.unitTypes,
  });
};

// UNIT TYPE DEFINITION
export interface UnitType {
  id: string;
  developmentId?: number; // Optional on frontend (required on DB)

  // Base Configuration
  label?: string; // Optional display label (e.g., "Type A", "The Ebony")
  name: string; // "2 Bedroom Apartment", "60m² Simplex"
  description?: string; // Marketing description for this unit type
  configDescription?: string; // Additional configuration notes

  // Ownership & Structure (from backend schema)
  ownershipType?: 'full-title' | 'sectional-title' | 'leasehold' | 'life-rights';
  structuralType?:
    | 'apartment'
    | 'freestanding-house'
    | 'simplex'
    | 'duplex'
    | 'penthouse'
    | 'plot-and-plan'
    | 'townhouse'
    | 'studio';
  unitCategory?: 'house' | 'apartment';
  unitSubType?: string;
  floors?: 'single-storey' | 'double-storey' | 'triplex';

  usageType?: 'residential' | 'commercial'; // For Mixed-Use
  bedrooms: number;
  bathrooms: number;

  // Enhanced Parking
  parkingType:
    | 'none'
    // New Model Types (structure/layout)
    | 'open'
    | 'covered'
    | 'tandem'
    | 'side-by-side'
    // Legacy / Migrated logic types
    | 'open_bay'
    | 'covered_bay'
    | 'carport'
    | 'single_garage'
    | 'double_garage'
    | 'tandem_garage'
    | string; // looser string to accommodate DB varchar variability
  parkingBays: number; // 0-4

  // Size (single source of truth)
  unitSize?: number; // m² (floor/indoor size)
  yardSize?: number; // m² (for townhouses/freeholds)

  // Price Range & Costs
  priceFrom: number;
  priceTo: number; // Can equal priceFrom if fixed price
  monthlyRentFrom?: number;
  monthlyRentTo?: number;
  leaseTerm?: string;
  isFurnished?: boolean;
  depositRequired?: number; // Deposit amount required
  startingBid?: number;
  reservePrice?: number;
  auctionStartDate?: string;
  auctionEndDate?: string;
  auctionStatus?:
    | 'scheduled'
    | 'registration_open'
    | 'active'
    | 'sold'
    | 'passed_in'
    | 'withdrawn';
  transferCostsIncluded?: boolean; // Boolean flag
  // Extended Costs (Ranges for variable unit sizes)
  monthlyLevyFrom?: number;
  monthlyLevyTo?: number;
  ratesAndTaxesFrom?: number;
  ratesAndTaxesTo?: number;

  // Legacy (Keep for migration safety if needed, or remove if confident)
  monthlyLevy?: number; // Deprecated -> use From/To
  totalUnits: number; // Total units of this type
  availableUnits: number; // Currently available
  reservedUnits: number; // Under offer / held
  // soldUnits = totalUnits - availableUnits - reservedUnits (calculated)

  // Legacy compatibility (deprecated, use priceFrom/priceTo)
  basePriceFrom?: number;
  basePriceTo?: number;

  // Amenities (Two-Level System)
  amenities: {
    standard: string[]; // Inherited from development (read-only)
    additional: string[]; // Legacy flat list
  };

  // Structured Unit Features (Mental Model: "What's inside?")
  features?: {
    kitchen: string[];
    bathroom: string[];
    flooring: string[];
    storage: string[];
    climate: string[];
    security: string[];
    outdoor: string[];
    other: string[];
  };

  // NEW: Pricing Extras (Base Price + Extras Model)
  extras?: { label: string; price: number }[];

  // Base Features (from backend schema)
  baseFeatures?: {
    builtInWardrobes: boolean;
    tiledFlooring: boolean;
    graniteCounters: boolean;
    prepaidElectricity: boolean;
    balcony: boolean;
    petFriendly: boolean;
  };

  // Base Finishes (from backend schema)
  baseFinishes?: {
    paintAndWalls?: string;
    flooringTypes?: string;
    kitchenFeatures?: string;
    bathroomFeatures?: string;
  };

  // Legacy specifications structure (deprecated, use baseFeatures/baseFinishes)
  specifications?: {
    builtInFeatures: {
      builtInWardrobes: boolean;
      tiledFlooring: boolean;
      graniteCounters: boolean;
    };
    finishes: {
      paintAndWalls?: string;
      flooringTypes?: string;
      kitchenFeatures?: string;
      bathroomFeatures?: string;
    };
    electrical: {
      prepaidElectricity: boolean;
      // generatorReady: boolean;
      // inverterReady: boolean;
    };
  };

  // Base Media (inherited by all specs)
  baseMedia?: {
    gallery: Array<{ id: string; url: string; isPrimary: boolean }>;
    floorPlans: Array<{ id: string; url: string; type: 'image' | 'pdf' }>;
    renders: Array<{ id: string; url: string; type: 'image' | 'video' }>;
  };

  // Virtual Tour & Notes
  virtualTourLink?: string; // URL to virtual tour
  internalNotes?: string; // Internal notes (not shown to public)

  // Spec Variations & Overrides
  specs?: SpecVariation[];
  specOverrides?: any; // JSON field for spec-specific overrides

  // Metadata
  displayOrder?: number;
  isActive?: boolean;
  completionDate?: string; // ISO date string

  // DB-managed timestamps (optional - not part of input DTO)
  createdAt?: string; // ISO timestamp string (DB-managed)
  updatedAt?: string; // ISO timestamp string (DB-managed)
}

// Development Wizard State Interface
export interface DevelopmentWizardState {
  // Wizard Flow
  currentPhase: number; // Legacy numeric (to be migrated to keyed)
  currentStep: number; // Internal step within a phase

  // NEW: Listing Identity (Step 0)
  listingIdentity: {
    identityType: 'developer' | 'marketing_agency' | 'private_owner' | 'brand';
    developerBrandProfileId?: number; // The Developer (Builder/Brand)
    marketingBrandProfileId?: number; // Marketing agency's own brand (if applicable)
    marketingRole?: MarketingRole;
  };

  // NEW: Development Type (Step 0)
  developmentType: DevelopmentType;

  // NEW: Residential Configuration (Step 1)
  residentialConfig: {
    residentialType: ResidentialType | null;
    freeholdCategory?: FreeholdCategory | null;
    communityTypes: CommunityType[];
  };

  // NEW: Land Configuration (Step 1 for Land)
  landConfig: {
    landType: string | null;
    infrastructure: string[];
  };

  // NEW: Commercial Configuration (Step 1 for Commercial)
  commercialConfig: {
    commercialType: string | null;
    features: string[];
  };

  // NEW: Selected Amenities (keys from registry)
  selectedAmenities: string[];

  // Phase 1: Identity
  developmentData: {
    nature: DevelopmentNature;
    parentDevelopmentId?: string; // For phases/extensions
    // Identity & Classification
    name: string;
    subtitle?: string; // Marketing tagline
    description: string;

    // Market Configuration (New Schema)
    transactionType: import('@/types/wizardTypes').TransactionType;
    ownershipType: import('@/types/wizardTypes').OwnershipType; // Legacy Singular
    ownershipTypes?: import('@/types/wizardTypes').OwnershipType[]; // New Plural
    marketingRole?: MarketingRole; // Phase 2B
    auctionType?: import('@/types/wizardTypes').AuctionType;
    // nature removed here - handled above
    structuralType: import('@/types/wizardTypes').StructuralType;
    floors: import('@/types/wizardTypes').FloorType;
    propertyTypes: string[]; // Multi-select: ['apartments', 'houses', 'townhouses']
    customClassification?: string; // Optional user input: "Loft, Duplex"

    // Project Overview
    status: import('@/types/wizardTypes').DevelopmentStatus;
    completionDate?: Date | null; // Expected or actual possession date
    launchDate?: Date | null; // When sales officially launch
    expectedFirstHandoverDate?: Date | null;
    handoverDuringConstruction?: boolean;

    // Legacy / Calculated (kept for compatibility)
    totalUnits?: number; // Total units across all types
    totalDevelopmentArea?: number; // Total area in m²

    // Global Financials (NEW)
    monthlyLevyFrom?: number;
    monthlyLevyTo?: number;
    ratesFrom?: number;
    ratesTo?: number;
    transferCostsIncluded?: boolean;
    reservePriceIncluded?: boolean;
    reservePriceAmount?: number;

    // Location
    location: {
      latitude: string;
      longitude: string;
      address: string;
      city: string;
      province: string;
      suburb?: string;
      postalCode?: string;
      // Legacy props to prevent breaks
      gpsAccuracy?: 'accurate' | 'approximate';
      noOfficialStreet?: boolean;
    };

    // Media
    media: {
      heroImage?: MediaItem;
      photos: MediaItem[];
      videos: MediaItem[];
      documents: MediaItem[]; // New: Brochures, Site Plans
    };

    // Legacy props to prevent breaks
    amenities: string[];
    highlights: string[];
    approvalStatus?: 'draft' | 'pending' | 'approved' | 'rejected';
    isPublished?: boolean;
  };

  // Phase 2: Classification (The "Brain")
  classification: {
    type: 'residential' | 'commercial' | 'mixed' | 'land';
    subType: string;
    ownership: 'full-title' | 'sectional-title' | 'leasehold' | '';
  };

  // Phase 3: Overview
  overview: {
    status: 'planning' | 'construction' | 'near-completion' | 'completed';
    highlights: string[];
    description: string;
    amenities: string[]; // Shared amenities (or Services for Land)
    features: string[]; // Additional features
  };

  // Phase 4: Unit Types (Skipped for Land)
  unitTypes: UnitType[];
  unitGroups: { id: string; name: string; type: 'residential' | 'commercial' }[]; // Multi-use grouping

  // Phase 5: Finalisation
  finalisation: {
    salesTeamIds: string[];
    marketingCompany?: string;
    isPublished: boolean;
  };

  // Legacy / Compatibility Fields
  phaseDetails?: any;
  infrastructure?: any[];
  documents?: any[];
  developerId?: number;
  draftId?: number;
  editingId?: number; // ID of development being edited
  persistedEditSnapshot?: Record<string, any> | null;

  // NEW: Unit Type Draft (Persistence against accidental closing)
  unitTypeDraft?: Partial<UnitType> | null;

  // WORKFLOW  // Workflow State
  workflowId: WorkflowId | null;
  currentStepId: WizardStepId | null;
  completedSteps: WizardStepId[];
  stepErrors: Record<string, import('@/lib/types/wizard-workflows').FieldError[]>; // Archival of step submissions
  stepData: Record<string, any>; // Archival of raw step data

  // ACTIONS ==================================================================

  // Navigation
  setPhase: (phase: number) => void;
  setCurrentStep: (step: number) => void;

  // Data Setters
  setListingIdentity: (data: Partial<DevelopmentWizardState['listingIdentity']>) => void;
  setIdentity: (data: Partial<DevelopmentWizardState['developmentData']>) => void;
  setClassification: (data: Partial<DevelopmentWizardState['classification']>) => void;
  setOverview: (data: Partial<DevelopmentWizardState['overview']>) => void;
  setFinalisation: (data: Partial<DevelopmentWizardState['finalisation']>) => void;

  // NEW: Configuration Actions
  setDevelopmentType: (type: DevelopmentType) => void;
  transactionType: import('@/types/wizardTypes').TransactionType | null;
  setResidentialConfig: (data: Partial<DevelopmentWizardState['residentialConfig']>) => void;
  setLandConfig: (data: Partial<DevelopmentWizardState['landConfig']>) => void;
  setCommercialConfig: (data: Partial<DevelopmentWizardState['commercialConfig']>) => void;
  // setEstateProfile removed (Phase 2D cleanup)
  setSelectedAmenities: (amenities: string[]) => void;
  toggleAmenity: (key: string) => void;

  // Unit Actions
  addUnitType: (unitType: Omit<UnitType, 'id'>) => void;
  updateUnitType: (id: string, updates: Partial<UnitType>) => void;
  removeUnitType: (id: string) => void;
  setUnitTypeDraft: (draft: Partial<UnitType> | null) => void;
  addGroup: (group: { name: string; type: 'residential' | 'commercial' }) => void;

  // Validation
  validatePhase: (phase: number) => { isValid: boolean; errors: string[] };
  validateForPublish: () => { isValid: boolean; errors: string[] };
  getCardFieldRecommendations: () => string[];

  // Persistence
  saveDraft: (saveCallback?: (data: any) => Promise<void>) => Promise<void>;
  publish: () => Promise<void>;
  reset: () => void;

  // Hydration (For Edit Mode)
  hydrateDevelopment: (data: any) => void;
  markEditSnapshotPersisted: () => void;

  // Legacy Actions (Stubs/Aliases)
  setDevelopmentData: (data: any) => void;
  setLocation: (data: any) => void;
  addAmenity: (amenity: string) => void;
  removeAmenity: (amenity: string) => void;
  addHighlight: (hl: string) => void;
  removeHighlight: (idx: number) => void;
  addMedia: (item: any) => void;
  removeMedia: (id: string) => void;
  setPrimaryImage: (id: string) => void;
  reorderMedia: (items: MediaItem[]) => void;

  // Legacy Unit Actions
  deleteUnitType: (id: string) => void;
  duplicateUnitType: (id: string) => void;
  updateMedia: (id: string, updates: Partial<MediaItem>) => void;

  // WORKFLOW ACTIONS
  setWorkflow: (id: WorkflowId | null) => void;
  setWorkflowStep: (stepId: WizardStepId) => void;
  goWorkflowNext: () => void;
  goWorkflowBack: () => void;
  saveWorkflowStepData: (stepId: WizardStepId, data: Record<string, any>) => void;

  // Phase 2A Actions
  initializeWorkflow: (
    type: import('@/types/wizardTypes').DevelopmentType,
    transactionType: import('@/types/wizardTypes').TransactionType,
  ) => void;
  setWorkflowSelector: (
    devType: import('@/types/wizardTypes').DevelopmentType,
    txType: 'for_sale' | 'for_rent' | 'auction',
  ) => void;
  getDraftData: () => any; // Returns the consolidated draft data
  getPersistedEditSnapshot: () => Record<string, any> | null;

  // Canonical-first getter for unitTypes (prevents stale UI reads)
  getUnitTypes: () => UnitType[];

  // Canonical WizardData getter (for publish payload and workflow evaluation)
  getWizardData: () => WizardData;

  // Legacy Misc (removed legacy developmentType - now uses DevelopmentType enum)
  media: MediaItem[];

  // Validation Stubs
  validateStep: (step: number) => { isValid: boolean; errors: string[] };
  canProceed: () => boolean;
  nextStep: () => void;
  previousStep: () => void;
}

const initialState: Omit<DevelopmentWizardState, keyof ReturnType<typeof createActions>> = {
  currentPhase: 1,
  currentStep: 1,

  // NEW: Listing Identity
  listingIdentity: {
    identityType: 'developer',
    marketingRole: 'exclusive',
  },

  // NEW: Development Type
  developmentType: 'residential',
  transactionType: null,

  // NEW: Residential Configuration
  residentialConfig: {
    residentialType: null,
    freeholdCategory: null,
    communityTypes: [],
  },

  // NEW: Land Configuration
  landConfig: {
    landType: null,
    infrastructure: [],
  },

  // NEW: Commercial Configuration
  commercialConfig: {
    commercialType: null,
    features: [],
  },

  // estateProfile removed (Phase 2D)

  unitTypeDraft: null,

  // NEW: Selected Amenities
  selectedAmenities: [],

  developmentData: {
    nature: undefined as any, // User must explicitly select
    name: '',
    description: '',
    subtitle: '',
    status: undefined as any, // User must explicitly select
    completionDate: null,
    launchDate: null, // NEW: Launch Date field
    expectedFirstHandoverDate: null,
    handoverDuringConstruction: false,
    transactionType: undefined as any, // User must explicitly select
    ownershipType: undefined as any, // Legacy (Single)
    ownershipTypes: [], // New (Multiple) - Phase 2B
    structuralType: undefined as any, // Optional - can remain undefined
    floors: undefined as any, // Optional - can remain undefined
    auctionType: undefined,
    propertyTypes: [],
    customClassification: '',

    // Legacy / Calculated
    totalUnits: undefined,
    totalDevelopmentArea: undefined,

    // Global Financials
    monthlyLevyFrom: undefined,
    monthlyLevyTo: undefined,
    ratesFrom: undefined,
    ratesTo: undefined,
    transferCostsIncluded: false,
    reservePriceIncluded: false,
    reservePriceAmount: undefined,

    location: {
      latitude: '',
      longitude: '',
      address: '',
      city: '',
      province: '',
    },
    media: {
      photos: [],
      videos: [],
      documents: [],
    },
    // Legacy inits
    amenities: [],
    highlights: [],
  },

  classification: {
    type: 'residential',
    subType: '',
    ownership: '',
  },

  overview: {
    status: 'planning',
    highlights: [],
    description: '',
    amenities: [],
    features: [],
  },

  unitTypes: [],
  unitGroups: [],

  finalisation: {
    salesTeamIds: [],
    isPublished: false,
  },

  // Legacy
  documents: [],
  infrastructure: [],
  phaseDetails: {},
  persistedEditSnapshot: null,

  // Workflow Defaults
  workflowId: null,
  currentStepId: null,
  completedSteps: [],
  stepData: {},
  stepErrors: {},

  // Legacy
  media: [],
};

// =============================================================================
// STATE NORMALIZER (Prevents partial updates from erasing required fields)
// =============================================================================
const _DEFAULT_DEVELOPMENT_DATA = initialState.developmentData;

/**
 * Normalizes developmentData to ensure critical fields are never undefined.
 * This prevents "Cannot read properties of undefined" errors in wizard phases.
 */
function normalizeDevelopmentData(
  current: typeof _DEFAULT_DEVELOPMENT_DATA,
  updates: Partial<typeof _DEFAULT_DEVELOPMENT_DATA>,
): typeof _DEFAULT_DEVELOPMENT_DATA {
  return {
    ...current,
    ...updates,
    // CRITICAL: These fields must NEVER be undefined
    name: updates.name ?? current.name ?? '',
    description: updates.description ?? current.description ?? '',
    highlights: updates.highlights ?? current.highlights ?? [],
    amenities: updates.amenities ?? current.amenities ?? [],
    propertyTypes: updates.propertyTypes ?? current.propertyTypes ?? [],
    // Nested objects need deep merge
    location: {
      ...(current.location || initialState.developmentData.location),
      ...(updates.location || {}),
    } as typeof current.location,
    media: {
      photos: updates.media?.photos ?? current.media?.photos ?? [],
      videos: updates.media?.videos ?? current.media?.videos ?? [],
      documents: updates.media?.documents ?? current.media?.documents ?? [],
      heroImage: updates.media?.heroImage ?? current.media?.heroImage,
    },
  };
}

// Helper function to create actions
const createActions = (
  set: (
    partial:
      | Partial<DevelopmentWizardState>
      | ((state: DevelopmentWizardState) => Partial<DevelopmentWizardState>),
  ) => void,
  get: () => DevelopmentWizardState,
) => {
  // HELPER: Centralized data builder for consistent workflow evaluation
  const buildWizardData = (state: DevelopmentWizardState): WizardData => {
    // 1. Extract Step Data Slices (Canonical Source)
    const identity = state.stepData?.identity_market || {};
    const config = state.stepData?.configuration || {};
    const location = state.stepData?.location || {};
    const governance = state.stepData?.governance_finances || {};
    const amenities = state.stepData?.amenities_features || {};
    const marketing = state.stepData?.marketing_summary || {};
    const mediaData = state.stepData?.development_media || {};

    // 2. Resolve Transaction Type (Selector > Step Data > Legacy)
    // Selector is primary for fundamental workflow type, identity.transactionType is secondary
    const rawTransactionType =
      state.transactionType ?? // The actual top-level selector
      identity.transactionType ??
      state.developmentData.transactionType;

    const transactionType = normalizeTransactionType(rawTransactionType);

    // Helper to derive hero image from photos if not explicitly set
    const derivedMedia = {
      ...state.developmentData.media,
      ...mediaData,
      heroImage:
        mediaData.heroImage ??
        state.developmentData.media?.heroImage ??
        (mediaData.photos?.find((p: MediaItem) => p.category === 'featured' || p.isPrimary) ||
          mediaData.photos?.[0]),
    };

    // 3. Construct Wizard Data with Strict Precedence
    return {
      // Base: Legacy data (last resort fallback)
      ...state.developmentData,

      // Overrides: Workflow State
      developmentType: state.developmentType, // Explicitly ensure this is carried over
      listingIdentity: state.listingIdentity, // Merge local identity state

      // Canonical Identity Fields (Step Data > Legacy)
      name: identity.name ?? state.developmentData.name,
      status: identity.status ?? state.developmentData.status,
      marketingRole: identity.marketingRole ?? state.developmentData.marketingRole,
      ownershipTypes: identity.ownershipTypes ?? state.developmentData.ownershipTypes,
      nature: identity.nature ?? state.developmentData.nature,
      auctionType: identity.auctionType ?? state.developmentData.auctionType,
      launchDate: identity.launchDate ?? state.developmentData.launchDate,
      completionDate: identity.completionDate ?? state.developmentData.completionDate,
      expectedFirstHandoverDate:
        identity.expectedFirstHandoverDate ?? state.developmentData.expectedFirstHandoverDate,
      handoverDuringConstruction:
        identity.handoverDuringConstruction ?? state.developmentData.handoverDuringConstruction,

      // Canonical Location Fields
      location: {
        ...state.developmentData.location,
        ...location,
      },

      // Merge other step data
      ...config,
      ...governance,
      ...amenities,

      // Marketing Summary (Map keySellingPoints -> highlights, tagline -> subtitle)
      ...marketing,
      description: marketing.description ?? state.developmentData.description, // Explicit mapping
      highlights:
        marketing.highlights ??
        marketing.keySellingPoints ??
        marketing.sellingPoints ??
        state.developmentData.highlights,
      subtitle: marketing.tagline ?? state.developmentData.subtitle,

      // Media (Canonical Merger)
      media: derivedMedia,
      // Root-level heroImage for validation (Phase 2I.1)
      heroImage:
        derivedMedia.heroImage?.url ??
        (typeof derivedMedia.heroImage === 'string' ? derivedMedia.heroImage : undefined) ??
        derivedMedia.photos?.[0]?.url,

      // Unit Types (Canonical Persistence)
      unitTypes: state.stepData?.unit_types?.unitTypes ?? state.unitTypes ?? [],

      transactionType,
    } as WizardData;
  };

  const buildCanonicalDraftDataFromState = (
    state: DevelopmentWizardState,
    options: { savedAt?: number } = {},
  ) => {
    const canonicalSnapshot = buildCanonicalDraftSnapshot({
      state,
      normalizeTransactionType,
      fallbackDevelopmentData: initialState.developmentData,
    });

    return {
      // Canonical workflow snapshot for server drafts.
      workflowId: canonicalSnapshot.workflowId,
      currentStepId: canonicalSnapshot.currentStepId,
      completedSteps: canonicalSnapshot.completedSteps,
      stepData: canonicalSnapshot.stepData,
      currentPhase: state.currentPhase,
      currentStep: state.currentStep,
      ...(canonicalSnapshot.editingId
        ? {
            editingId: canonicalSnapshot.editingId,
            developmentId: canonicalSnapshot.developmentId,
          }
        : {}),

      // Core data (persisted)
      developmentData: canonicalSnapshot.developmentData,
      classification: state.classification,
      // Workflow-Specific Fields (Phase 2B)
      name: canonicalSnapshot.developmentData.name,
      status: canonicalSnapshot.developmentData.status,
      marketingRole: canonicalSnapshot.developmentData.marketingRole,
      ownershipTypes: canonicalSnapshot.developmentData.ownershipTypes,

      // Spec Variation drafts
      unitTypeDraft: state.unitTypeDraft,
      overview: state.overview,
      unitTypes: canonicalSnapshot.unitTypes,
      finalisation: state.finalisation,

      // Configuration slices
      listingIdentity: state.listingIdentity,
      developmentType: state.developmentType,
      residentialConfig: state.residentialConfig,
      landConfig: state.landConfig,
      commercialConfig: state.commercialConfig,

      selectedAmenities: state.selectedAmenities,
      unitGroups: state.unitGroups,

      // Metadata
      _version: '3.0',
      ...(options.savedAt !== undefined ? { _savedAt: options.savedAt } : {}),
    };
  };

  return {
    // CANONICAL GETTERS

    /**
     * Returns the canonical WizardData object for workflow evaluation and publish payload.
     * Uses strict precedence: stepData > selector state > legacy developmentData
     */
    getWizardData: (): WizardData => {
      const state = get();
      return buildWizardData(state);
    },

    /**
     * Non-blocking recommendations focused on keeping result cards visually uniform.
     * These are stricter than publish minimums and are shown as guidance.
     */
    getCardFieldRecommendations: (): string[] => {
      const state = get();
      const wizardData = buildWizardData(state);
      const recommendations: string[] = [];

      const suburb = String(wizardData.location?.suburb || '').trim();
      if (!suburb) {
        recommendations.push(
          'Add a suburb so the result card location is complete (suburb, city, province).',
        );
      }

      const linkedBrandProfileId =
        state.listingIdentity?.developerBrandProfileId ??
        (state.developmentData as any)?.developerBrandProfileId ??
        null;
      if (!linkedBrandProfileId) {
        recommendations.push(
          'Link a developer brand profile (with logo) to keep builder name/avatar consistent on cards.',
        );
      }

      const photosCount = wizardData.media?.photos?.length ?? 0;
      const heroImage =
        (wizardData as any).heroImage ||
        wizardData.media?.heroImage?.url ||
        (typeof wizardData.media?.heroImage === 'string' ? wizardData.media?.heroImage : undefined);
      const totalImageCount = (heroImage ? 1 : 0) + photosCount;
      if (totalImageCount < 3) {
        recommendations.push(
          'Upload at least 3 images so cards have consistent visual coverage and gallery indicators.',
        );
      }

      const descriptionLength = String(wizardData.description || '').trim().length;
      if (descriptionLength < 120) {
        recommendations.push(
          'Use a richer description (120+ characters) so card previews remain informative.',
        );
      }

      const highlightCount = Array.isArray(wizardData.highlights)
        ? wizardData.highlights.length
        : 0;
      if (highlightCount < 4) {
        recommendations.push(
          'Add at least 4 highlights to keep chips consistent across cards (only the first few are shown).',
        );
      }

      if (state.classification?.type !== 'land') {
        const units = Array.isArray(wizardData.unitTypes) ? wizardData.unitTypes : [];
        if (units.length < 2) {
          recommendations.push(
            'Add at least 2 unit types to improve carousel consistency on result cards.',
          );
        }

        const hasIncompleteUnit = units.some((u: any) => {
          const unitName = String(u?.name || '').trim();
          const priceValue = Number(
            u?.priceFrom ?? u?.basePriceFrom ?? u?.monthlyRentFrom ?? u?.startingBid ?? 0,
          );
          return !unitName || !Number.isFinite(priceValue) || priceValue <= 0;
        });

        if (hasIncompleteUnit) {
          recommendations.push(
            'Ensure every unit type has a clear name and valid price so carousel items render uniformly.',
          );
        }
      }

      return recommendations;
    },

    // NEW ACTIONS

    setListingIdentity: (data: Partial<DevelopmentWizardState['listingIdentity']>) =>
      set(state => ({
        listingIdentity: { ...state.listingIdentity, ...data },
      })),

    setPhase: (phase: number) => {
      set({ currentPhase: phase });

      // Workflow Engine Compatibility Layer
      const { workflowId } = get();
      if (
        workflowId === 'residential_sale' ||
        workflowId === 'residential_rent' ||
        workflowId === 'residential_auction'
      ) {
        const PHASE_MAPPING: Record<number, import('@/lib/types/wizard-workflows').WizardStepId> = {
          3: 'configuration',
          4: 'identity_market',
          5: 'location',
          6: 'governance_finances',
          7: 'amenities_features',
          8: 'marketing_summary',
          9: 'development_media',
          10: 'unit_types',
          11: 'review_publish',
        };
        const stepId = PHASE_MAPPING[phase];
        if (stepId) set({ currentStepId: stepId });
      }
    },

    setCurrentStep: (step: number) => set({ currentStep: step }),

    setIdentity: (data: Partial<DevelopmentWizardState['developmentData']>) =>
      set(state => {
        const mergedData = normalizeDevelopmentData(state.developmentData, data);
        return {
          developmentData: mergedData,
          overview: {
            ...state.overview,
            description: mergedData.description || state.overview.description || '',
            highlights: mergedData.highlights || state.overview.highlights || [],
          },
        };
      }),

    // THE BRAIN: Logic Engine
    setClassification: (data: Partial<DevelopmentWizardState['classification']>) =>
      set(state => {
        const currentClass = state.classification || initialState.classification;
        const newClassification = { ...currentClass, ...data };
        if (data.type && data.type !== currentClass.type) {
          newClassification.subType = '';
          if (data.type === 'land') {
            return { classification: newClassification, unitTypes: [] };
          }
        }
        return { classification: newClassification };
      }),

    setOverview: (data: Partial<DevelopmentWizardState['overview']>) =>
      set(state => ({
        overview: { ...(state.overview || initialState.overview), ...data },
      })),

    setFinalisation: (data: Partial<DevelopmentWizardState['finalisation']>) =>
      set(state => ({
        finalisation: { ...(state.finalisation || initialState.finalisation), ...data },
      })),

    // Configuration Actions
    setDevelopmentType: (type: import('@/types/wizardTypes').DevelopmentType) =>
      set(state => {
        const newState: Partial<DevelopmentWizardState> = { developmentType: type };
        if (type === 'residential') {
          newState.landConfig = initialLandConfig;
          newState.commercialConfig = initialCommercialConfig;
        } else if (type === 'land') {
          newState.residentialConfig = initialResidentialConfig;
          newState.commercialConfig = initialCommercialConfig;
        } else if (type === 'commercial') {
          newState.residentialConfig = initialResidentialConfig;
          newState.landConfig = initialLandConfig;
        }
        const currentTransactionType = state.developmentData.transactionType;
        if (currentTransactionType && type) {
          const compatibleTypes = getCompatibleTransactionTypes(type);
          if (!compatibleTypes.includes(currentTransactionType)) {
            newState.developmentData = { ...state.developmentData, transactionType: 'for_sale' }; // Default to sale or handle safely
          }
        }
        return newState;
      }),

    setResidentialConfig: (data: Partial<DevelopmentWizardState['residentialConfig']>) =>
      set(state => {
        const nextResidentialConfig = { ...state.residentialConfig, ...data };
        const derivedPropertyTypes =
          derivePropertyTypesFromResidentialConfig(nextResidentialConfig);

        if (!derivedPropertyTypes) {
          return { residentialConfig: nextResidentialConfig };
        }

        return {
          residentialConfig: nextResidentialConfig,
          developmentData: normalizeDevelopmentData(state.developmentData, {
            propertyTypes: derivedPropertyTypes,
          }),
        };
      }),

    setLandConfig: (data: Partial<DevelopmentWizardState['landConfig']>) =>
      set(state => ({ landConfig: { ...state.landConfig, ...data } })),

    setCommercialConfig: (data: Partial<DevelopmentWizardState['commercialConfig']>) =>
      set(state => ({ commercialConfig: { ...state.commercialConfig, ...data } })),

    setSelectedAmenities: (amenities: string[]) => set({ selectedAmenities: amenities }),

    toggleAmenity: (key: string) =>
      set(state => ({
        selectedAmenities: state.selectedAmenities.includes(key)
          ? state.selectedAmenities.filter(a => a !== key)
          : [...state.selectedAmenities, key],
      })),

    // Unit Actions
    addUnitType: (unitType: Omit<UnitType, 'id'>) =>
      set(state => {
        const currentUnits = getCanonicalUnitTypesFromState(state);
        const newUnit = {
          ...unitType,
          id: `unit-${Date.now()}`,
          specs: [],
          displayOrder: currentUnits.length,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as UnitType;

        const nextUnits = normalizeUnitTypesForState(
          state,
          [...currentUnits, newUnit],
          normalizeTransactionType,
        );
        return {
          unitTypes: nextUnits,
          stepData: buildUnitTypesStepData(state, nextUnits),
        };
      }),

    updateUnitType: (id: string, updates: Partial<UnitType>) =>
      set(state => {
        const currentUnits = getCanonicalUnitTypesFromState(state);
        const nextUnits = normalizeUnitTypesForState(
          state,
          currentUnits.map(u => (u.id === id ? { ...u, ...updates } : u)),
          normalizeTransactionType,
        );
        return {
          unitTypes: nextUnits,
          stepData: buildUnitTypesStepData(state, nextUnits),
        };
      }),

    removeUnitType: (id: string) =>
      set(state => {
        const currentUnits = getCanonicalUnitTypesFromState(state);
        const nextUnits = normalizeUnitTypesForState(
          state,
          currentUnits.filter(u => u.id !== id),
          normalizeTransactionType,
        );
        return {
          unitTypes: nextUnits,
          stepData: buildUnitTypesStepData(state, nextUnits),
        };
      }),

    setUnitTypeDraft: (draft: Partial<UnitType> | null) => set({ unitTypeDraft: draft }),

    addGroup: (group: { name: string; type: 'residential' | 'commercial' }) =>
      set(state => ({
        unitGroups: [...state.unitGroups, { ...group, id: `group-${Date.now()}` }],
      })),

    // VALIDATION
    validatePhase: (phase: number) => {
      const state = get();
      const errors: string[] = [];
      switch (phase) {
        case 1:
          if (
            state.listingIdentity.identityType === 'marketing_agency' &&
            !state.listingIdentity.developerBrandProfileId
          )
            errors.push('Select the Developer Brand you are representing');
          break;
        case 4:
          if (!state.developmentData?.name) errors.push('Development name is required');
          if (!state.developmentData?.status) errors.push('Please select a development status');
          if (!state.developmentData?.transactionType)
            errors.push('Please select a transaction type');
          if ((state.developmentData?.ownershipTypes || []).length === 0) {
            errors.push('Please select at least one ownership type');
          }
          if (
            (state.developmentData?.status === 'launching-soon' ||
              state.developmentData?.status === 'selling') &&
            !state.developmentData?.launchDate
          ) {
            errors.push('Launch date is required for this status');
          }
          if (
            (state.developmentData?.status === 'launching-soon' ||
              state.developmentData?.status === 'selling') &&
            !state.developmentData?.completionDate
          ) {
            errors.push('Expected completion date is required for this status');
          }
          if (
            state.developmentData?.handoverDuringConstruction &&
            !state.developmentData?.expectedFirstHandoverDate
          ) {
            errors.push(
              'Expected first handover date is required when handovers occur during construction',
            );
          }
          break;
        case 5:
          if (!state.developmentData?.location?.address) errors.push('Location is required');
          if (!state.developmentData?.location?.city) errors.push('City is required');
          break;
        case 8: {
          if ((state.developmentData?.highlights?.length || 0) < 3)
            errors.push('Add at least 3 key selling points');
          const overviewDescLen = String(state.developmentData?.description ?? '').trim().length;
          if (overviewDescLen === 0) {
            errors.push('Description is required');
          } else if (overviewDescLen < 50) {
            errors.push('Description must be at least 50 characters');
          }
          break;
        }
        case 9:
          {
            const media = state.developmentData?.media;
            if (!media?.heroImage) errors.push('Hero image is required');
            if ((media?.documents || []).length < 1)
              errors.push('Add at least 1 brochure or document');
          }
          break;
        case 10:
          if (state.classification?.type !== 'land' && (state.unitTypes?.length || 0) === 0)
            errors.push('Add at least one unit type');
          break;
      }
      return { isValid: errors.length === 0, errors };
    },

    validateForPublish: () => {
      const state = get();
      const wizardData = buildWizardData(state); // Use canonical source
      const readiness = getDevelopmentPublishReadinessSummary(wizardData, {
        classification: state.classification,
        transactionType:
          wizardData.transactionType ??
          state.transactionType ??
          state.developmentData.transactionType,
        nowMs: Date.now(),
      });
      const errors = readiness.messages;

      return { isValid: errors.length === 0, errors };
    },

    // WORKFLOW ACTIONS (Consolidated)
    initializeWorkflow: (
      type: DevelopmentType,
      transactionType: import('@/types/wizardTypes').TransactionType,
    ) =>
      set(state => {
        const normalizedTransactionType = normalizeTransactionType(transactionType) ?? 'for_sale';
        const newState: Partial<DevelopmentWizardState> = {
          developmentType: type,
          transactionType: normalizedTransactionType, // Store at root level (canonical)
          developmentData: {
            ...state.developmentData,
            transactionType: normalizedTransactionType, // Keep legacy synced for safely
          },
          currentPhase: 1,
          currentStep: 1,
          completedSteps: [],
          stepErrors: {},
          persistedEditSnapshot: null,
        };
        const wizardData = buildWizardData({ ...state, ...newState });
        const workflow = getWorkflow(wizardData);
        if (workflow) {
          const visibleSteps = getVisibleSteps(workflow, wizardData);
          return {
            ...newState,
            workflowId: workflow.id,
            currentStepId: visibleSteps[0]?.id || null,
            stepErrors: {},
          };
        }
        return newState;
      }),

    reset: () =>
      set(() => ({
        ...initialState,
        editingId: undefined,
        draftId: undefined,
        developerId: undefined,
        persistedEditSnapshot: null,
        currentStepId: null,
        workflowId: null,
        completedSteps: [],
        stepErrors: {},
      })),

    setWorkflow: (id: WorkflowId | null) =>
      set(state => {
        if (!id) return { workflowId: null, currentStepId: null };
        const workflow = WORKFLOWS[id];
        if (!workflow) return { workflowId: null, currentStepId: null };
        const wizardData = buildWizardData(state);
        const visibleSteps = getVisibleSteps(workflow, wizardData);
        return { workflowId: id, currentStepId: visibleSteps[0]?.id || null, stepErrors: {} };
      }),

    setWorkflowStep: (stepId: WizardStepId) => set({ currentStepId: stepId }),

    goWorkflowNext: () =>
      set(state => {
        if (!state.workflowId || !state.currentStepId) return {};
        const workflow = WORKFLOWS[state.workflowId];
        if (!workflow) return {};

        const wizardData = buildWizardData(state);
        const visibleSteps = getVisibleSteps(workflow, wizardData);
        const currentIndex = visibleSteps.findIndex(s => s.id === state.currentStepId);

        // If step id is invalid, snap to the first visible step
        if (currentIndex === -1) {
          return { currentStepId: visibleSteps[0]?.id || null };
        }

        const currentStepDef = visibleSteps[currentIndex];
        let newErrors = { ...state.stepErrors };

        // Validate current step (non-blocking, but tracked)
        if (currentStepDef?.validate) {
          const result = currentStepDef.validate(wizardData);
          if (!result.valid && result.errors) {
            newErrors[state.currentStepId!] = result.errors;
          } else {
            delete newErrors[state.currentStepId!];
          }
        }

        // Terminal guard: last step => do not advance
        if (currentIndex >= visibleSteps.length - 1) {
          return { stepErrors: newErrors };
        }

        const nextStepId = visibleSteps[currentIndex + 1].id;
        return {
          currentStepId: nextStepId,
          stepErrors: newErrors,
          completedSteps: Array.from(new Set([...state.completedSteps, state.currentStepId!])),
        };
      }),

    goWorkflowBack: () =>
      set(state => {
        if (!state.workflowId || !state.currentStepId) return {};
        const workflow = WORKFLOWS[state.workflowId];
        if (!workflow) return {};
        const wizardData = buildWizardData(state);
        const visibleSteps = getVisibleSteps(workflow, wizardData);
        const currentIndex = visibleSteps.findIndex(s => s.id === state.currentStepId);
        if (currentIndex === -1) return { currentStepId: visibleSteps[0]?.id || null };
        if (currentIndex > 0) return { currentStepId: visibleSteps[currentIndex - 1].id };
        return {};
      }),

    saveWorkflowStepData: (stepId: WizardStepId, data: Record<string, any>) =>
      set(state => {
        // 1) Update canonical step slice
        const nextStepData = {
          ...state.stepData,
          [stepId]: {
            ...(state.stepData?.[stepId] ?? {}),
            ...data,
          },
        };

        // 2) Update legacy developmentData (best-effort mirror during migration)
        const mergedDevData = normalizeDevelopmentData(state.developmentData, data as any);

        // 3) CRITICAL: unitTypes mirror sync for immediate UI reactivity
        //    Only when saving the unit_types step and the payload includes unitTypes
        const nextUnitTypes =
          stepId === 'unit_types' && Array.isArray((data as any).unitTypes)
            ? normalizeUnitTypesForState(state, (data as any).unitTypes, normalizeTransactionType)
            : getCanonicalUnitTypesFromState(state);
        if (stepId === 'unit_types' && Array.isArray((data as any).unitTypes)) {
          nextStepData.unit_types = {
            ...(nextStepData.unit_types ?? {}),
            unitTypes: nextUnitTypes,
          };
        }

        // 4) Keep developmentType in its proper authoritative place
        const nextDevelopmentType =
          typeof (data as any).developmentType === 'string'
            ? (data as any).developmentType
            : state.developmentType;

        return {
          stepData: nextStepData,
          developmentData: mergedDevData,
          developmentType: nextDevelopmentType,
          unitTypes: nextUnitTypes,
        };
      }),

    // NEW ALIASES
    setWorkflowSelector: (
      dt: import('@/types/wizardTypes').DevelopmentType,
      tx: import('@/types/wizardTypes').TransactionType,
    ) => get().initializeWorkflow(dt, tx),
    saveDraft: async (saveCallback?: (data: any) => Promise<void>) => {
      // Use centralized getDraftData for stable payload
      const draftData = get().getDraftData();
      if (saveCallback) {
        await saveCallback(draftData);
      }
    },
    publish: async () => {
      // Simulate API call latency
      await new Promise(resolve => setTimeout(resolve, 1000));
      set(state => ({
        finalisation: { ...state.finalisation, isPublished: true },
      }));
    },

    hydrateDevelopment: (data: any) =>
      set(state => {
        const hasCanonicalSnapshot = Boolean(
          data?.workflowId || data?.currentStepId || data?.stepData || data?._version,
        );
        const isDraft = data.draftData !== undefined || (!data?.id && hasCanonicalSnapshot);
        const source = data.draftData !== undefined ? (data as any).draftData : data;
        const snapshotSource = source;
        const workflowState = normalizeDevelopmentWorkflowState(snapshotSource ?? {});

        if (!source) {
          console.error('[hydrateDevelopment] No data provided');
          return state;
        }

        const parse = parseCanonicalJsonValue as (val: any, def: any) => any;

        const hasSnapshotStepData = isPlainObject(snapshotSource?.stepData);
        const snapshotStepData = hasSnapshotStepData ? snapshotSource.stepData : {};
        const draftEditTargetId = getCanonicalDevelopmentEditTargetId(source);
        const { sourceSelectorPayload, updates, normalizedAmenities } =
          buildHydratedDevelopmentDataUpdates({
            source,
            snapshotStepData,
            currentDevelopmentData: state.developmentData,
            normalizeTransactionType,
          });
        const canonicalSourceConfiguration =
          getCanonicalDevelopmentConfiguration(sourceSelectorPayload);
        const sourceDevelopmentType = firstDefined(
          canonicalSourceConfiguration.developmentType,
          source.developmentType,
          source.developmentData?.developmentType,
        );
        const hydratedDevelopmentType =
          sourceDevelopmentType === 'mixed_use'
            ? 'mixed'
            : sourceDevelopmentType || state.developmentType || 'residential';
        // ============================================================================
        // Build Canonical Updates (Dual Support: source.developmentData OR flat DB)
        // ============================================================================
        // Use normalizer to guarantee field preservation
        const canonicalDevelopmentData = normalizeDevelopmentData(state.developmentData, updates);

        // ============================================================================
        // Hydrate Configuration Objects
        // ============================================================================
        const {
          residentialConfig: hydratedResidentialConfig,
          landConfig: hydratedLandConfig,
          commercialConfig: hydratedCommercialConfig,
        } = hydrateDevelopmentConfigs(source, parse);

        // mixedUseConfig not used - removed to prevent phantom state

        // ============================================================================
        // Hydrate Amenities
        // ============================================================================
        const standardAmenities = normalizedAmenities;
        // additionalAmenities not used - removed to prevent phantom state

        // ============================================================================
        // Hydrate Unit Types (CRITICAL)
        // ============================================================================
        let hydratedUnitTypes: any[] = [];

        const sourceUnitTypes = resolveHydrationUnitTypes(snapshotSource, source);

        if (Array.isArray(sourceUnitTypes)) {
          hydratedUnitTypes = sourceUnitTypes.map((u: any, idx: number) => {
            if (!u.id) {
              console.warn(`[hydrateDevelopment] Unit ${idx} missing ID, generating...`);
            }

            return normalizeHydratedUnitTypeForState(
              u,
              idx,
              canonicalDevelopmentData.transactionType,
              parse,
            );
          });
        } else {
          hydratedUnitTypes = getCanonicalUnitTypesFromState(state);
        }

        // ============================================================================
        // Hydrate Marketing/Overview
        // ============================================================================
        const hydratedOverview = {
          status: (canonicalDevelopmentData.status || 'planning') as any,
          description: canonicalDevelopmentData.description || '',
          highlights: canonicalDevelopmentData.highlights ?? [],
          amenities: canonicalDevelopmentData.amenities ?? [],
          features: (canonicalDevelopmentData as any).features ?? [],
        };

        // ============================================================================
        // Hydrate Classification
        // ============================================================================
        const hydratedClassification = {
          type: hydratedDevelopmentType,
          subType: source.customClassification || '',
          ownership: (canonicalDevelopmentData.ownershipType || '') as any,
        };

        const hydratedStepData = buildHydratedStepData({
          source,
          snapshotStepData,
          hasSnapshotStepData,
          canonicalDevelopmentData,
          hydratedDevelopmentType,
          hydratedUnitTypes,
          parse,
        });

        // ============================================================================
        // Return Complete Hydrated State
        // ============================================================================
        const nextHydratedState: DevelopmentWizardState = {
          ...state,
          // CRITICAL: Don't force currentPhase - let Wizard orchestrator decide
          // Only set phase for draft resume (not edit mode)
          currentPhase: isDraft ? source.currentPhase || state.currentPhase || 1 : 1,

          developmentData: canonicalDevelopmentData,
          residentialConfig: hydratedResidentialConfig,
          landConfig: hydratedLandConfig,
          commercialConfig: hydratedCommercialConfig,

          selectedAmenities: standardAmenities,

          unitTypes: hydratedUnitTypes,
          overview: hydratedOverview,
          classification: hydratedClassification,
          stepData: hydratedStepData,
          workflowId: workflowState.workflowId as WorkflowId | null,
          currentStepId: workflowState.currentStepId as WizardStepId | null,
          completedSteps: workflowState.completedSteps as WizardStepId[],

          developmentType: hydratedDevelopmentType,

          // Legacy compatibility
          editingId: isDraft ? draftEditTargetId : source.id,
          developerId: source.developerId,
        };

        const shouldCapturePersistedEditSnapshot = Boolean(
          nextHydratedState.editingId || source.id,
        );

        return {
          ...nextHydratedState,
          persistedEditSnapshot: shouldCapturePersistedEditSnapshot
            ? buildCanonicalDraftDataFromState(nextHydratedState)
            : null,
        };
      }),

    markEditSnapshotPersisted: () =>
      set(state => {
        if (!state.editingId) return {};
        return {
          persistedEditSnapshot: buildCanonicalDraftDataFromState(state),
        };
      }),

    // LEGACY ACTIONS (Compatibility Layer)

    setDevelopmentData: (data: any) =>
      set(state => ({
        // Use the normalizer to guarantee field preservation
        developmentData: normalizeDevelopmentData(state.developmentData, data),
      })),

    setLocation: (loc: any) =>
      set(state => ({
        developmentData: {
          ...state.developmentData,
          location: { ...(state.developmentData?.location || {}), ...loc },
        },
      })),

    addAmenity: (a: string) =>
      set(state => ({
        developmentData: {
          ...state.developmentData,
          amenities: [...state.developmentData.amenities, a],
        },
      })),

    removeAmenity: (a: string) =>
      set(state => ({
        developmentData: {
          ...state.developmentData,
          amenities: state.developmentData.amenities.filter(x => x !== a),
        },
      })),

    addHighlight: (h: string) =>
      set(state => {
        const newHighlights = [...(state.developmentData.highlights || []), h];
        return {
          developmentData: { ...state.developmentData, highlights: newHighlights },
          overview: {
            ...state.overview,
            highlights: newHighlights,
            description: state.developmentData.description,
          }, // Sync overview
        };
      }),

    removeHighlight: (index: number) =>
      set(state => {
        const newHighlights = state.developmentData.highlights.filter((_, i) => i !== index);
        return {
          developmentData: { ...state.developmentData, highlights: newHighlights },
          overview: { ...state.overview, highlights: newHighlights },
        };
      }),

    // Robust Media Implementation
    addMedia: (item: any) =>
      set(state => {
        if (!state.developmentData?.media) return state;

        const newItem: MediaItem = {
          ...item,
          id: `media-${Date.now()}-${Math.random()}`,
          displayOrder: 0,
          isPrimary: item.category === 'featured' || item.isPrimary,
        };

        const mediaState = { ...state.developmentData.media };

        // If it's the first image or marked as featured/primary, set as hero
        if (
          newItem.isPrimary ||
          (!mediaState.heroImage && (newItem.type === 'image' || newItem.category === 'featured'))
        ) {
          mediaState.heroImage = { ...newItem, isPrimary: true, category: 'featured' };
          // Ensure no duplicates if it was added to photos too
        }

        if (newItem.type === 'video' || newItem.category === 'videos') {
          mediaState.videos = [...(mediaState.videos || []), newItem];
        } else if (newItem.type === 'pdf' || newItem.category === 'document') {
          mediaState.documents = [...(mediaState.documents || []), newItem];
        } else {
          // It's a photo/image
          if (mediaState.heroImage?.id !== newItem.id) {
            mediaState.photos = [...(mediaState.photos || []), newItem];
          }
        }

        return { developmentData: { ...state.developmentData, media: mediaState } };
      }),

    removeMedia: (id: string) =>
      set(state => {
        const media = state.developmentData?.media;
        if (!media) return state;

        const isHero = media.heroImage?.id === id;

        return {
          developmentData: {
            ...state.developmentData,
            media: {
              heroImage: isHero ? undefined : media.heroImage,
              photos: media.photos?.filter(p => p.id !== id) || [],
              videos: media.videos?.filter(v => v.id !== id) || [],
              documents: media.documents?.filter(d => d.id !== id) || [],
            },
          },
        };
      }),

    setPrimaryImage: (id: string) =>
      set(state => {
        const media = state.developmentData?.media;
        if (!media) return state;

        // 1. Check if already hero
        if (media.heroImage?.id === id) return state;

        // 2. Find in photos
        const photoIndex = media.photos?.findIndex(p => p.id === id);
        if (photoIndex === undefined || photoIndex === -1) return state;

        const newHero = {
          ...media.photos![photoIndex],
          isPrimary: true,
          category: 'featured' as const,
        };
        const oldHero = media.heroImage;

        // 3. Swap: Remove new hero from photos, add old hero to photos
        const newPhotos = [...(media.photos || [])];
        newPhotos.splice(photoIndex, 1);

        if (oldHero) {
          newPhotos.unshift({ ...oldHero, isPrimary: false, category: 'general' });
        }

        return {
          developmentData: {
            ...state.developmentData,
            media: {
              ...media,
              heroImage: newHero,
              photos: newPhotos,
            },
          },
        };
      }),

    reorderMedia: (items: MediaItem[]) =>
      set(state => {
        // Split items back into photos/videos/hero based on their types or existing state
        // This is complex because 'items' is a flat list.
        // We'll update the displayOrders.

        const media = state.developmentData?.media;
        if (!media) return state;

        const newPhotos = (media.photos || []).map(p => {
          const match = items.find(i => i.id === p.id);
          return match ? { ...p, displayOrder: match.displayOrder } : p;
        });

        const newVideos = (media.videos || []).map(v => {
          const match = items.find(i => i.id === v.id);
          return match ? { ...v, displayOrder: match.displayOrder } : v;
        });

        return {
          developmentData: {
            ...state.developmentData,
            media: {
              ...media,
              photos: newPhotos.sort((a, b) => a.displayOrder - b.displayOrder),
              videos: newVideos.sort((a, b) => a.displayOrder - b.displayOrder),
            },
          },
        };
      }),

    deleteUnitType: (id: string) =>
      set(state => {
        const currentUnits = getCanonicalUnitTypesFromState(state);
        const nextUnits = normalizeUnitTypesForState(
          state,
          currentUnits.filter(u => u.id !== id),
          normalizeTransactionType,
        );
        return {
          unitTypes: nextUnits,
          stepData: buildUnitTypesStepData(state, nextUnits),
        };
      }),

    duplicateUnitType: (_id: string) => {
      /* No-op for now */
    },

    updateMedia: (id: string, updates: Partial<MediaItem>) =>
      set(state => {
        const media = state.developmentData?.media;
        if (!media) return state;

        const updateItem = (item: MediaItem) => (item.id === id ? { ...item, ...updates } : item);

        // Check if hero image matches
        let heroImage = media.heroImage;
        if (heroImage && heroImage.id === id) {
          heroImage = { ...heroImage, ...updates };
        }

        return {
          developmentData: {
            ...state.developmentData,
            media: {
              heroImage,
              photos: (media.photos || []).map(updateItem),
              videos: (media.videos || []).map(updateItem),
              documents: (media.documents || []).map(updateItem),
            },
          },
        };
      }),

    // IMPORTANT: Media List Aggregator (Action, not getter)
    getMediaList: () => {
      const state = get();
      if (!state?.developmentData?.media) return [];

      const s = state.developmentData.media;
      const list: MediaItem[] = [];
      if (s.heroImage) list.push({ ...s.heroImage, category: 'featured' });

      // Map photos to 'general' category unless specified
      s.photos?.forEach(p => list.push({ ...p, category: (p.category as any) || 'general' }));
      s.videos?.forEach(v => list.push({ ...v, category: (v.category as any) || 'videos' }));
      s.documents?.forEach(d => list.push({ ...d, category: (d.category as any) || 'document' }));

      return list;
    },

    // IMPORTANT: Canonical Draft Data Getter (Centralized Payload)
    getDraftData: () => {
      const state = get();
      return buildCanonicalDraftDataFromState(state, { savedAt: Date.now() });
    },

    getPersistedEditSnapshot: () => {
      return get().persistedEditSnapshot ?? null;
    },

    // Canonical-first getter for unitTypes (prevents stale UI reads)
    getUnitTypes: () => {
      const state = get();
      return state.stepData?.unit_types?.unitTypes ?? state.unitTypes ?? [];
    },

    validateStep: (_s: number) => ({ isValid: true, errors: [] }),
    canProceed: () => true,
    nextStep: () => {},
    previousStep: () => {},

    // Workflow Actions stubs removed (duplicates)
  };
};

export const useDevelopmentWizard = create<DevelopmentWizardState>()(
  persist(
    (set, get) => ({
      ...initialState,
      ...createActions(set, get),
    }),
    {
      name: DEVELOPMENT_WIZARD_STORAGE_KEY,
      partialize: state => ({
        // Always persist core state (never return empty object)
        currentPhase: state.currentPhase,
        currentStep: state.currentStep,

        listingIdentity: state.listingIdentity,
        developmentType: state.developmentType,

        residentialConfig: state.residentialConfig,
        landConfig: state.landConfig,
        commercialConfig: state.commercialConfig,

        developmentData: {
          ...state.developmentData,
          media: {
            // Strip File objects but always persist structure
            heroImage: state.developmentData.media?.heroImage
              ? { ...state.developmentData.media.heroImage, file: undefined }
              : undefined,
            photos: (state.developmentData.media?.photos || []).map(p => ({
              ...p,
              file: undefined,
            })),
            videos: (state.developmentData.media?.videos || []).map(v => ({
              ...v,
              file: undefined,
            })),
            documents: (state.developmentData.media?.documents || []).map(d => ({
              ...d,
              file: undefined,
            })),
          },
        },

        classification: state.classification,
        overview: state.overview,
        // Canonical-first: persist from stepData, fallback to legacy mirror
        unitTypes: state.stepData?.unit_types?.unitTypes ?? state.unitTypes ?? [],
        unitGroups: state.unitGroups,
        finalisation: state.finalisation,
        selectedAmenities: state.selectedAmenities,

        // Legacy (only if truly needed)
        documents: state.documents,

        // Workflow Persistence
        workflowId: state.workflowId,
        currentStepId: state.currentStepId,
        completedSteps: state.completedSteps,
        stepData: state.stepData,
      }),
    },
  ),
);
