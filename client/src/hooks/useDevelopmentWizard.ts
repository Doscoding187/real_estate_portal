import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DevelopmentType,
  ResidentialType,
  CommunityType,
  DevelopmentNature,
  MarketingRole,
} from '@/types/wizardTypes';
import { AMENITY_REGISTRY } from '@/config/amenityRegistry';
import { WorkflowId, WizardStepId, WizardData } from '@/lib/types/wizard-workflows';
import { WORKFLOWS, getWorkflow, getVisibleSteps } from '@/lib/workflows';

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
const initialResidentialConfig = { residentialType: null, communityTypes: [] };
const initialLandConfig = { landType: null, infrastructure: [] };
const initialCommercialConfig = { commercialType: null, features: [] };

const normalizeTransactionType = (
  type: any,
): import('@/types/wizardTypes').TransactionType | undefined => {
  if (!type) return undefined;
  if (type === 'sale') return 'for_sale';
  if (type === 'rent') return 'for_rent';
  return type as import('@/types/wizardTypes').TransactionType;
};

const getCompatibleTransactionTypes = (devType: string) => {
  if (devType === 'commercial') return ['for_sale', 'for_rent', 'auction'];
  if (devType === 'residential') return ['for_sale', 'for_rent', 'auction'];
  return ['for_sale', 'for_rent'];
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
  auctionStatus?: 'scheduled' | 'active' | 'sold' | 'passed_in' | 'withdrawn';
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
  unitSize?: number;

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

  // Persistence
  saveDraft: (saveCallback?: (data: any) => Promise<void>) => Promise<void>;
  publish: () => Promise<void>;
  reset: () => void;

  // Hydration (For Edit Mode)
  hydrateDevelopment: (data: any) => void;

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
        (mediaData.photos?.find(
          (p: MediaItem) => p.category === 'hero' || p.category === 'featured' || p.isPrimary,
        ) ||
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
      set(state => ({ residentialConfig: { ...state.residentialConfig, ...data } })),

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
        const newUnit = {
          ...unitType,
          id: `unit-${Date.now()}`,
          specs: [],
          displayOrder: state.unitTypes.length,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as UnitType;

        const nextUnits = [...state.unitTypes, newUnit];
        return {
          unitTypes: nextUnits,
          stepData: {
            ...state.stepData,
            unit_types: { ...state.stepData?.unit_types, unitTypes: nextUnits },
          },
        };
      }),

    updateUnitType: (id: string, updates: Partial<UnitType>) =>
      set(state => {
        const nextUnits = state.unitTypes.map(u => (u.id === id ? { ...u, ...updates } : u));
        return {
          unitTypes: nextUnits,
          stepData: {
            ...state.stepData,
            unit_types: { ...state.stepData?.unit_types, unitTypes: nextUnits },
          },
        };
      }),

    removeUnitType: (id: string) =>
      set(state => {
        const nextUnits = state.unitTypes.filter(u => u.id !== id);
        return {
          unitTypes: nextUnits,
          stepData: {
            ...state.stepData,
            unit_types: { ...state.stepData?.unit_types, unitTypes: nextUnits },
          },
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
          if (!state.developmentData?.ownershipType) errors.push('Please select an ownership type');
          if (
            state.developmentData?.status === 'launching-soon' &&
            !state.developmentData?.launchDate
          )
            errors.push('Launch date is required for "Launching Soon" status');
          break;
        case 5:
          if (!state.developmentData?.location?.address) errors.push('Location is required');
          if (!state.developmentData?.location?.city) errors.push('City is required');
          break;
        case 8:
          if ((state.developmentData?.highlights?.length || 0) < 3)
            errors.push('Add at least 3 key selling points');
          if ((state.developmentData?.description?.length || 0) < 50)
            errors.push('Description must be at least 50 characters');
          const status = state.developmentData?.status;
          if (status === 'launching-soon' || status === 'selling') {
            if (!state.developmentData?.completionDate)
              errors.push('Expected completion date is required for this status');
          }
          break;
        case 9:
          const media = state.developmentData?.media;
          if (!media?.heroImage) errors.push('Hero image is required');
          if ((media?.documents || []).length < 1)
            errors.push('Add at least 1 brochure or document');
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
      const errors: string[] = [];

      // Identity (canonical)
      if (!wizardData.name) errors.push('Development Name is required');

      // Location (canonical)
      if (!wizardData.location?.address) errors.push('Location Address is required');

      // Media (canonical) - at least 1 image total
      const photosCount = wizardData.media?.photos?.length ?? 0;
      const heroImage =
        (wizardData as any).heroImage ||
        wizardData.media?.heroImage?.url ||
        (typeof wizardData.media?.heroImage === 'string' ? wizardData.media?.heroImage : undefined);
      if ((heroImage ? 1 : 0) + photosCount === 0) {
        errors.push('At least 1 image is required');
      }

      // Classification (selector state - not in wizardData by design)
      if (!state.classification?.type) errors.push('Classification Type is required');

      // Marketing Summary (canonical)
      const highlightsLen = wizardData.highlights?.length ?? 0;
      if (highlightsLen < 3) errors.push('Add at least 3 highlights');

      const descLen = wizardData.description?.length ?? 0;
      if (descLen < 50) errors.push('Description must be at least 50 characters');

      // Unit Types (canonical)
      if (state.classification?.type !== 'land') {
        const units = wizardData.unitTypes ?? [];
        if (units.length === 0) {
          errors.push('Add at least one unit type');
        } else {
          const transactionType =
            wizardData.transactionType ??
            state.transactionType ??
            state.developmentData.transactionType;
          const isRent = transactionType === 'for_rent';
          const isAuction = transactionType === 'auction';

          if (isRent) {
            const validRents = units.every((u: any) => {
              const from = Number(u?.monthlyRentFrom ?? u?.monthlyRent ?? 0);
              const to = Number(u?.monthlyRentTo ?? 0);
              return from > 0 || to > 0;
            });
            if (!validRents) errors.push('All unit types must have a monthly rent');
          } else if (isAuction) {
            const now = Date.now();
            const validAuctionUnits = units.every((u: any) => {
              const startingBid = Number(u?.startingBid ?? 0);
              const reservePrice = u?.reservePrice != null ? Number(u.reservePrice) : undefined;
              const startDate = u?.auctionStartDate ? new Date(u.auctionStartDate) : null;
              const endDate = u?.auctionEndDate ? new Date(u.auctionEndDate) : null;

              if (!startingBid || startingBid <= 0) return false;
              if (
                reservePrice != null &&
                Number.isFinite(reservePrice) &&
                reservePrice > 0 &&
                reservePrice < startingBid
              )
                return false;
              if (!startDate || Number.isNaN(startDate.getTime())) return false;
              if (!endDate || Number.isNaN(endDate.getTime())) return false;
              if (endDate.getTime() <= startDate.getTime()) return false;
              if (startDate.getTime() < now) return false;
              return true;
            });
            if (!validAuctionUnits) errors.push('All unit types must have valid auction terms');
          } else {
            const validPrices = units.every((u: any) => (u.priceFrom || 0) > 0);
            if (!validPrices) errors.push('All unit types must have a base price');
          }
        }
      }

      return { isValid: errors.length === 0, errors };
    },

    // WORKFLOW ACTIONS (Consolidated)
    initializeWorkflow: (
      type: DevelopmentType,
      transactionType: import('@/types/wizardTypes').TransactionType,
    ) =>
      set(state => {
        const newState: Partial<DevelopmentWizardState> = {
          developmentType: type,
          transactionType: normalizeTransactionType(transactionType), // Store at root level (canonical)
          developmentData: {
            ...state.developmentData,
            transactionType: normalizeTransactionType(transactionType), // Keep legacy synced for safely
          },
          currentPhase: 1,
          currentStep: 1,
          completedSteps: [],
          stepErrors: {},
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
            ? (data as any).unitTypes
            : state.unitTypes;

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
        const isDraft = data.draftData !== undefined;
        const source = isDraft ? (data as any).draftData : data;

        if (!source) {
          console.error('[hydrateDevelopment] No data provided');
          return state;
        }

        const parse = (val: any, def: any) => {
          if (val === null || val === undefined || val === '') return def;
          if (typeof val === 'string') {
            try {
              const parsed = JSON.parse(val);
              if (typeof parsed === 'string') {
                const trimmed = parsed.trim();
                if (
                  (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
                  (trimmed.startsWith('{') && trimmed.endsWith('}'))
                ) {
                  try {
                    return JSON.parse(trimmed);
                  } catch {
                    return def;
                  }
                }
              }
              return parsed;
            } catch {
              return def;
            }
          }
          return val;
        };

        const toNumber = (value: any, fallback: number) => {
          const num = Number(value);
          return Number.isFinite(num) ? num : fallback;
        };

        const normalizeAmenityKeys = (value: unknown): string[] => {
          const list = (() => {
            if (Array.isArray(value)) return value;
            if (value && typeof value === 'object') {
              const standard = Array.isArray((value as any).standard)
                ? (value as any).standard
                : [];
              const additional = Array.isArray((value as any).additional)
                ? (value as any).additional
                : [];
              return [...standard, ...additional];
            }
            return [];
          })();

          if (list.length === 0) return [];

          const byKey = new Set(AMENITY_REGISTRY.map(item => item.key));
          const byLabel = new Map(
            AMENITY_REGISTRY.map(item => [item.label.toLowerCase(), item.key]),
          );

          return list
            .map(item => String(item ?? '').trim())
            .filter(Boolean)
            .map(item => {
              if (byKey.has(item)) return item;
              const mapped = byLabel.get(item.toLowerCase());
              return mapped ?? item;
            });
        };

        // ============================================================================
        // Helper: Map incoming media to canonical shape
        // ============================================================================
        const mapIncomingMediaToCanonical = (src: any) => {
          const parsedMedia = parse(src.media, { photos: [], videos: [], documents: [] });

          // Fallback to legacy 'images' column if 'media' column is empty
          if ((!parsedMedia.photos || parsedMedia.photos.length === 0) && src.images) {
            const legacyImages = parse(src.images, []);
            if (Array.isArray(legacyImages) && legacyImages.length > 0) {
              parsedMedia.photos = legacyImages.map((url: string | any) => {
                if (typeof url === 'string')
                  return { id: `img-${Math.random()}`, url, category: 'general', type: 'image' };
                return url;
              });
            }
          }

          // Restore heroImage if missing but present in photos
          if (!parsedMedia.heroImage && parsedMedia.photos?.length > 0) {
            const manualHero =
              parsedMedia.photos.find((p: any) => p.category === 'featured' || p.isPrimary) ||
              parsedMedia.photos[0];

            if (manualHero) {
              parsedMedia.heroImage = { ...manualHero, category: 'featured', isPrimary: true };
            }
          }

          return {
            heroImage: parsedMedia.heroImage,
            photos: parsedMedia.photos || [],
            videos: parsedMedia.videos || [],
            documents: parsedMedia.documents || parsedMedia.brochures || [],
          };
        };

        // ============================================================================
        // Build Canonical Updates (Dual Support: source.developmentData OR flat DB)
        // ============================================================================
        const rawAmenities = source.amenities
          ? parse(source.amenities, [])
          : (source.developmentData?.amenities ?? state.developmentData.amenities ?? []);
        const normalizedAmenities = normalizeAmenityKeys(rawAmenities);

        const updates: Partial<typeof state.developmentData> = {
          // Identity
          name: source.name ?? source.developmentData?.name ?? '',
          subtitle: source.subtitle ?? source.tagline ?? source.developmentData?.subtitle ?? '',
          description: source.description ?? source.developmentData?.description ?? '',

          // Status & Dates
          status: source.status ?? source.developmentData?.status ?? state.developmentData.status,
          nature: source.nature ?? source.developmentData?.nature ?? state.developmentData.nature,
          launchDate: source.launchDate
            ? new Date(source.launchDate)
            : source.developmentData?.launchDate
              ? new Date(source.developmentData.launchDate)
              : state.developmentData.launchDate,
          completionDate: source.completionDate
            ? new Date(source.completionDate)
            : source.developmentData?.completionDate
              ? new Date(source.developmentData.completionDate)
              : state.developmentData.completionDate,

          // Transaction & Ownership
          transactionType:
            normalizeTransactionType(
              source.transactionType ?? source.developmentData?.transactionType,
            ) ?? state.developmentData.transactionType,
          ownershipType:
            source.ownershipType ??
            source.developmentData?.ownershipType ??
            state.developmentData.ownershipType,
          ownershipTypes:
            source.ownershipTypes ??
            source.developmentData?.ownershipTypes ??
            state.developmentData.ownershipTypes ??
            [],
          structuralType:
            source.structuralType ??
            source.developmentData?.structuralType ??
            state.developmentData.structuralType,
          floors: source.floors ?? source.developmentData?.floors ?? state.developmentData.floors,

          // Property Types
          propertyTypes:
            typeof source.propertyTypes === 'string'
              ? parse(source.propertyTypes, [])
              : (source.propertyTypes ??
                source.developmentData?.propertyTypes ??
                state.developmentData.propertyTypes),

          // Location (Always strings, never null)
          location: {
            address:
              source.address ??
              source.location?.address ??
              source.developmentData?.location?.address ??
              '',
            suburb:
              source.suburb ??
              source.location?.suburb ??
              source.developmentData?.location?.suburb ??
              '',
            city:
              source.city ?? source.location?.city ?? source.developmentData?.location?.city ?? '',
            province:
              source.province ??
              source.location?.province ??
              source.developmentData?.location?.province ??
              '',
            postalCode:
              source.postalCode ??
              source.location?.postalCode ??
              source.developmentData?.location?.postalCode ??
              '',
            latitude: String(
              source.latitude ??
                source.location?.latitude ??
                source.developmentData?.location?.latitude ??
                '',
            ),
            longitude: String(
              source.longitude ??
                source.location?.longitude ??
                source.developmentData?.location?.longitude ??
                '',
            ),
          },

          // Media (Canonical shape)
          media: source.developmentData?.media
            ? source.developmentData.media
            : mapIncomingMediaToCanonical(source),

          // Marketing fields (CRITICAL: must never be undefined)
          highlights: source.highlights
            ? parse(source.highlights, [])
            : (source.developmentData?.highlights ?? state.developmentData.highlights ?? []),
          amenities: normalizedAmenities,
        };

        // Use normalizer to guarantee field preservation
        const canonicalDevelopmentData = normalizeDevelopmentData(state.developmentData, updates);

        // ============================================================================
        // Hydrate Configuration Objects
        // ============================================================================
        const hydratedResidentialConfig = parse(source.residentialConfig, {
          unitMix: { studios: 0, oneBed: 0, twoBed: 0, threeBed: 0, fourPlusBed: 0 },
          priceRange: { min: null, max: null },
          sizeRange: { min: null, max: null },
          parkingOptions: [],
          levy: { from: null, to: null },
          rates: { from: null, to: null },
          residentialType: null,
          communityTypes: [],
        });

        const hydratedLandConfig = parse(source.landConfig, {
          totalStands: null,
          availableStands: null,
          erfSizeFrom: null,
          erfSizeTo: null,
          priceFrom: null,
          priceTo: null,
          serviced: null,
          zoningType: null,
          buildingRestrictions: null,
          landType: null,
          infrastructure: [],
        });

        const hydratedCommercialConfig = parse(source.commercialConfig, {
          totalSpace: null,
          availableSpace: null,
          spaceUnits: 'sqm',
          rentalRate: null,
          tenantType: [],
          parkingRatio: null,
          commercialType: null,
          features: [],
        });

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

        if (Array.isArray(source.unitTypes)) {
          hydratedUnitTypes = source.unitTypes.map((u: any, idx: number) => {
            if (!u.id) {
              console.warn(`[hydrateDevelopment] Unit ${idx} missing ID, generating...`);
              u.id = `unit-${Date.now()}-${idx}`;
            }

            return {
              id: u.id,
              label: u.label || u.name || 'Unnamed Unit',
              name: u.name || u.label || 'Unnamed Unit',
              configDescription: u.configDescription || u.description || '',

              // Layout - Numbers, not null
              floors: u.floors || undefined,
              bedrooms: Number(u.bedrooms ?? 0),
              bathrooms: Number(u.bathrooms ?? 0),
              unitSize: Number(u.unitSize ?? u.floorSize ?? 0),
              yardSize: u.yardSize ? Number(u.yardSize) : undefined,

              // Type - Enums, undefined when unknown
              ownershipType: u.ownershipType || undefined,
              structuralType: u.structuralType || undefined,

              // Parking - Required fields with safe defaults
              parkingType: u.parkingType ?? 'none',
              parkingBays: Number(u.parkingBays ?? u.parkingSpaces ?? 0),

              // Pricing - Numbers, not null
              priceFrom: Number(u.priceFrom ?? u.basePriceFrom ?? 0),
              priceTo: Number(u.priceTo ?? u.basePriceTo ?? u.priceFrom ?? u.basePriceFrom ?? 0),
              basePriceFrom: u.basePriceFrom ? Number(u.basePriceFrom) : undefined,
              basePriceTo: u.basePriceTo ? Number(u.basePriceTo) : undefined,
              monthlyRentFrom: u.monthlyRentFrom ? Number(u.monthlyRentFrom) : undefined,
              monthlyRentTo: u.monthlyRentTo ? Number(u.monthlyRentTo) : undefined,
              leaseTerm: u.leaseTerm || undefined,
              isFurnished: u.isFurnished ?? undefined,
              depositRequired: u.depositRequired ? Number(u.depositRequired) : undefined,
              startingBid: u.startingBid != null ? Number(u.startingBid) : undefined,
              reservePrice: u.reservePrice != null ? Number(u.reservePrice) : undefined,
              auctionStartDate: u.auctionStartDate || undefined,
              auctionEndDate: u.auctionEndDate || undefined,
              auctionStatus: u.auctionStatus || undefined,

              // Availability - Numbers, not null
              availableUnits: Number(u.availableUnits ?? 0),
              totalUnits: Number(u.totalUnits ?? 0),
              completionDate: u.completionDate || undefined,

              // Complex fields
              amenities: parse(u.amenities, { standard: [], additional: [] }),
              specifications: parse(u.specifications, {
                builtInFeatures: {},
                finishes: {},
                electrical: {},
              }),
              baseMedia: parse(u.baseMedia, { gallery: [], floorPlans: [], renders: [] }),
              features: parse(u.features, {
                kitchen: [],
                bathroom: [],
                flooring: [],
                storage: [],
                climate: [],
                security: [],
                outdoor: [],
                other: [],
              }),
              extras: parse(u.extras, []),
              specs: parse(u.specs, []),

              // New JSON Fields
              baseFeatures: parse(u.baseFeatures, {}),
              baseFinishes: parse(u.baseFinishes, {}),
              specOverrides: parse(u.specOverrides, {}),

              // Notes
              virtualTourLink: u.virtualTourLink || '',
              transferCostsIncluded: !!u.transferCostsIncluded,
              internalNotes: u.internalNotes || '',
              isActive: u.isActive !== false,
              displayOrder: u.displayOrder ?? idx,
            };
          });
        } else {
          console.warn('[hydrateDevelopment] No unitTypes array found');
        }

        // ============================================================================
        // Hydrate Marketing/Overview
        // ============================================================================
        const hydratedOverview = {
          status: source.status || 'planning',
          description: source.description || '',
          highlights: source.highlights ? parse(source.highlights, []) : [],
          amenities: source.amenities ? parse(source.amenities, []) : [],
          features: parse(source.features || source.keyFeatures, []),
        };

        // ============================================================================
        // Hydrate Classification
        // ============================================================================
        const hydratedClassification = {
          type:
            source.developmentType === 'mixed_use'
              ? 'mixed'
              : source.developmentType || 'residential',
          subType: source.customClassification || '',
          ownership: source.ownershipType || '',
        };

        const ownershipTypesFromSource = (() => {
          const raw =
            source.ownershipTypes ??
            source.developmentData?.ownershipTypes ??
            source.ownershipType ??
            source.developmentData?.ownershipType;
          if (typeof raw === 'string') {
            const trimmed = raw.trim();
            if (trimmed.startsWith('[')) {
              const parsed = parse(trimmed, []);
              if (Array.isArray(parsed)) return parsed;
            }
            return trimmed ? [trimmed] : [];
          }
          if (Array.isArray(raw)) return raw;
          if (raw) return [raw];
          return [];
        })();

        const estateSpecs = parse(source.estateSpecs, {});
        const resolvedLevyRange = {
          min: toNumber(estateSpecs?.levyRange?.min ?? source.monthlyLevyFrom ?? 0, 0),
          max: toNumber(estateSpecs?.levyRange?.max ?? source.monthlyLevyTo ?? 0, 0),
        };
        const resolvedRightsAndTaxes = {
          min: toNumber(estateSpecs?.rightsAndTaxes?.min ?? source.ratesFrom ?? 0, 0),
          max: toNumber(estateSpecs?.rightsAndTaxes?.max ?? source.ratesTo ?? 0, 0),
        };

        const hydratedStepData = isDraft
          ? (source.stepData ?? state.stepData)
          : {
              identity_market: {
                name: canonicalDevelopmentData.name,
                subtitle: canonicalDevelopmentData.subtitle,
                status: canonicalDevelopmentData.status,
                nature: canonicalDevelopmentData.nature,
                transactionType: canonicalDevelopmentData.transactionType,
                ownershipTypes: ownershipTypesFromSource,
                marketingRole: canonicalDevelopmentData.marketingRole,
                completionDate: canonicalDevelopmentData.completionDate,
                launchDate: canonicalDevelopmentData.launchDate,
              },
              location: { ...canonicalDevelopmentData.location },
              governance_finances: {
                hasGoverningBody: estateSpecs?.hasHOA ?? false,
                governanceType: estateSpecs?.governanceType ?? '',
                levyRange: resolvedLevyRange,
                architecturalGuidelines: estateSpecs?.architecturalGuidelines ?? false,
                guidelinesSummary: estateSpecs?.guidelinesSummary ?? '',
                rightsAndTaxes: resolvedRightsAndTaxes,
              },
              amenities_features: {
                amenities: normalizedAmenities,
              },
              marketing_summary: {
                description: canonicalDevelopmentData.description,
                tagline: canonicalDevelopmentData.subtitle ?? '',
                keySellingPoints: canonicalDevelopmentData.highlights ?? [],
              },
              development_media: {
                heroImage: canonicalDevelopmentData.media?.heroImage,
                photos: canonicalDevelopmentData.media?.photos ?? [],
                videos: canonicalDevelopmentData.media?.videos ?? [],
                documents: canonicalDevelopmentData.media?.documents ?? [],
              },
              unit_types: { unitTypes: hydratedUnitTypes },
            };

        // ============================================================================
        // Return Complete Hydrated State
        // ============================================================================
        return {
          ...state,
          // CRITICAL: Don't force currentPhase - let Wizard orchestrator decide
          // Only set phase for draft resume (not edit mode)
          currentPhase: isDraft
            ? source.currentPhase || state.currentPhase || 1
            : state.currentPhase,

          developmentData: canonicalDevelopmentData,
          residentialConfig: hydratedResidentialConfig,
          landConfig: hydratedLandConfig,
          commercialConfig: hydratedCommercialConfig,

          selectedAmenities: standardAmenities,

          unitTypes: hydratedUnitTypes,
          overview: hydratedOverview,
          classification: hydratedClassification,
          stepData: hydratedStepData,

          developmentType:
            source.developmentType === 'mixed_use'
              ? 'mixed'
              : source.developmentType || 'residential',

          // Legacy compatibility
          editingId: isDraft ? undefined : source.id,
          developerId: source.developerId,
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
      set(state => ({
        unitTypes: state.unitTypes.filter(u => u.id !== id),
      })),

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
      return {
        // Core data (persisted)
        developmentData: {
          ...state.developmentData,
          transactionType: normalizeTransactionType(state.developmentData.transactionType),
        },
        classification: state.classification,
        // Workflow-Specific Fields (Phase 2B)
        name: state.developmentData.name,
        status: state.developmentData.status,
        marketingRole: state.developmentData.marketingRole,
        ownershipTypes: state.developmentData.ownershipTypes,

        // Spec Variation drafts
        unitTypeDraft: state.unitTypeDraft,
        overview: state.overview,
        unitTypes: state.unitTypes,
        finalisation: state.finalisation,

        // Configuration slices
        listingIdentity: state.listingIdentity,
        developmentType: state.developmentType,
        residentialConfig: state.residentialConfig,
        landConfig: state.landConfig,
        commercialConfig: state.commercialConfig,

        selectedAmenities: state.selectedAmenities,
        unitGroups: state.unitGroups,

        // Metadata (NOT UI state like currentPhase)
        _version: '3.0', // Schema version for migrations
        _savedAt: Date.now(),
      };
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
      name: 'development-wizard-storage-v2', // v2: Clean slate - no legacy state
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
