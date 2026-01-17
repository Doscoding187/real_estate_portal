import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DevelopmentType,
  ResidentialType,
  CommunityType,
} from '@/types/wizardTypes';

// Media Item Interface
// Media Item Interface
export interface MediaItem {
  id: string;
  file?: File;
  url: string;
  type: 'image' | 'pdf' | 'video' | 'floorplan' | 'document';
  category: 'featured' | 'general' | 'amenities' | 'outdoors' | 'videos' | 'photo' | 'floorplan' | 'render' | 'document' | 'brochures';
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
export interface UnitType {
  id: string;
  developmentId: number; // Required - FK to developments
  
  // Base Configuration
  label?: string; // Optional display label (e.g., "Type A", "The Ebony")
  name: string; // "2 Bedroom Apartment", "60m² Simplex"
  description?: string; // Marketing description for this unit type
  configDescription?: string; // Additional configuration notes
  
  // Ownership & Structure (from backend schema)
  ownershipType?: 'full-title' | 'sectional-title' | 'leasehold' | 'life-rights';
  structuralType?: 'apartment' | 'freestanding-house' | 'simplex' | 'duplex' | 'penthouse' | 'plot-and-plan' | 'townhouse' | 'studio';
  floors?: 'single-storey' | 'double-storey' | 'triplex';
  
  usageType?: 'residential' | 'commercial'; // For Mixed-Use
  bedrooms: number;
  bathrooms: number;
  
  // Enhanced Parking
  parkingType: 'none' | 'open_bay' | 'covered_bay' | 'carport' | 'single_garage' | 'double_garage' | 'tandem_garage';
  parkingBays: number; // 0-4
  
  // Size Range (for variations within unit type)
  sizeFrom: number; // Min m²
  sizeTo: number; // Max m² (can equal sizeFrom if fixed size)
  yardSize?: number; // m² (for townhouses/freeholds)
  
  // Price Range & Costs
  priceFrom: number;
  priceTo: number; // Can equal priceFrom if fixed price
  depositRequired?: number; // Deposit amount required
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
  parking?: 'none' | '1' | '2' | 'carport' | 'garage';
  
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
    marketingRole?: 'exclusive' | 'joint' | 'open';
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
  
  // NEW: Estate Profile (Conditional, Step 4)
  estateProfile: {
    classification: string;
    hasHOA: boolean;
    levyRange: { min: number; max: number };
    architecturalGuidelines: boolean;
    estateAmenities: string[];
  };
  
  // NEW: Selected Amenities (keys from registry)
  selectedAmenities: string[];
  
    // Phase 1: Identity
  developmentData: {
    nature: 'new' | 'phase' | 'extension';
    parentDevelopmentId?: string; // For phases/extensions
    // Identity & Classification
    name: string;
    subtitle?: string; // Marketing tagline
    description: string;
    
    // Market Configuration (New Schema)
    transactionType: import('@/types/wizardTypes').TransactionType;
    ownershipType: import('@/types/wizardTypes').OwnershipType;
    propertyTypes: string[]; // Multi-select: ['apartments', 'houses', 'townhouses']
    customClassification?: string; // Optional user input: "Loft, Duplex"
    
    // Project Overview
    status: import('@/types/wizardTypes').DevelopmentStatus;
    completionDate?: Date | null; // Expected or actual possession date

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
  setResidentialConfig: (data: Partial<DevelopmentWizardState['residentialConfig']>) => void;
  setLandConfig: (data: Partial<DevelopmentWizardState['landConfig']>) => void;
  setCommercialConfig: (data: Partial<DevelopmentWizardState['commercialConfig']>) => void;
  setEstateProfile: (data: Partial<DevelopmentWizardState['estateProfile']>) => void;
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
  
  // NEW: Estate Profile
  estateProfile: {
    classification: '',
    hasHOA: false,
    levyRange: { min: 0, max: 0 },
    architecturalGuidelines: false,
    estateAmenities: [],
  },
  
  unitTypeDraft: null,
  
  // NEW: Selected Amenities
  selectedAmenities: [],
  
  developmentData: {
    nature: 'new',
    name: '',
    description: '',
    subtitle: '',
    status: 'launching-soon',
    completionDate: null,
    transactionType: 'sale',
    ownershipType: 'sectional_title',
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
};

// =============================================================================
// STATE NORMALIZER (Prevents partial updates from erasing required fields)
// =============================================================================
const DEFAULT_DEVELOPMENT_DATA = initialState.developmentData;

/**
 * Normalizes developmentData to ensure critical fields are never undefined.
 * This prevents "Cannot read properties of undefined" errors in wizard phases.
 */
function normalizeDevelopmentData(
  current: typeof DEFAULT_DEVELOPMENT_DATA,
  updates: Partial<typeof DEFAULT_DEVELOPMENT_DATA>
): typeof DEFAULT_DEVELOPMENT_DATA {
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
      ...(current.location || {}),
      ...(updates.location || {}),
    },
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
  set: (partial: Partial<DevelopmentWizardState> | ((state: DevelopmentWizardState) => Partial<DevelopmentWizardState>)) => void,
  get: () => DevelopmentWizardState
) => ({

  // NEW ACTIONS
  
  setListingIdentity: (data: Partial<DevelopmentWizardState['listingIdentity']>) => set((state) => ({
    listingIdentity: { ...state.listingIdentity, ...data }
  })),

  setPhase: (phase: number) => set({ currentPhase: phase }),
  
  setCurrentStep: (step: number) => set({ currentStep: step }),

  setIdentity: (data: Partial<DevelopmentWizardState['developmentData']>) => set((state) => {
      // Use the normalizer to guarantee field preservation
      const mergedData = normalizeDevelopmentData(state.developmentData, data);
      
      return {
        developmentData: mergedData,
        // Sync Overview Description if it changed
        overview: { 
            ...state.overview, 
            description: mergedData.description || state.overview.description || '',
            highlights: mergedData.highlights || state.overview.highlights || []
        } 
      };
  }),

  // THE BRAIN: Logic Engine
  setClassification: (data: Partial<DevelopmentWizardState['classification']>) => set((state) => {
    const currentClass = state.classification || {};
    const newClassification = { ...currentClass, ...data };
    
    // Logic Rule: Reset sub-type if type changes
    if (data.type && data.type !== currentClass.type) {
      newClassification.subType = ''; 
      
      // Logic Rule: If switching to Land, clear unit types strictly
      if (data.type === 'land') {
         // modifying state via the return object
         return { classification: newClassification, unitTypes: [] };
      }
    }
    
    return { classification: newClassification };
  }),
  
  setOverview: (data: Partial<DevelopmentWizardState['overview']>) => set((state) => ({
    overview: { ...(state.overview || {}), ...data }
  })),

  setFinalisation: (data: Partial<DevelopmentWizardState['finalisation']>) => set((state) => ({
    finalisation: { ...(state.finalisation || {}), ...data }
  })),

  // Configuration Actions
  setDevelopmentType: (type: DevelopmentType) => set({ developmentType: type }),
  
  setResidentialConfig: (data: Partial<DevelopmentWizardState['residentialConfig']>) => set((state) => ({
    residentialConfig: { ...state.residentialConfig, ...data }
  })),
  
  setLandConfig: (data: Partial<DevelopmentWizardState['landConfig']>) => set((state) => ({
    landConfig: { ...state.landConfig, ...data }
  })),
  
  setCommercialConfig: (data: Partial<DevelopmentWizardState['commercialConfig']>) => set((state) => ({
    commercialConfig: { ...state.commercialConfig, ...data }
  })),
  
  setEstateProfile: (data: Partial<DevelopmentWizardState['estateProfile']>) => set((state) => ({
    estateProfile: { ...state.estateProfile, ...data }
  })),
  
  setSelectedAmenities: (amenities: string[]) => set({ selectedAmenities: amenities }),
  
  toggleAmenity: (key: string) => set((state) => ({
    selectedAmenities: state.selectedAmenities.includes(key)
      ? state.selectedAmenities.filter(a => a !== key)
      : [...state.selectedAmenities, key]
  })),

  // Unit Actions
  addUnitType: (unitType: Omit<UnitType, 'id'>) => set((state) => ({
    unitTypes: [...state.unitTypes, { 
      ...unitType, 
      id: `unit-${Date.now()}`,
      specs: [],
      displayOrder: state.unitTypes.length,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as UnitType]
  })),
  
  updateUnitType: (id: string, updates: Partial<UnitType>) => set((state) => ({
    unitTypes: state.unitTypes.map(u => u.id === id ? { ...u, ...updates } : u)
  })),
  
  removeUnitType: (id: string) => set((state) => ({
    unitTypes: state.unitTypes.filter(u => u.id !== id)
  })),

  setUnitTypeDraft: (draft) => set({ unitTypeDraft: draft }),
  
  addGroup: (group: { name: string; type: 'residential' | 'commercial' }) => set((state) => ({
    unitGroups: [...state.unitGroups, { ...group, id: `group-${Date.now()}` }]
  })),

  validatePhase: (phase: number) => {
    const state = get();
    const errors: string[] = [];
    
    switch (phase) {
      case 1: // Representation
        if (state.listingIdentity.identityType === 'marketing_agency' && !state.listingIdentity.developerBrandProfileId) {
          errors.push('Select the Developer Brand you are representing');
        }
        break;
      case 2: // Development Type
         // No validation needed usually, defaults to Residential
        break;
      case 3: // Configuration
         // No specific validation? maybe
        break;
      case 4: // Identity / Basic Details
        if (!state.developmentData?.name) errors.push('Name is required');
        if (!state.developmentData?.status) errors.push('Status is required');
        break;
      
      case 5: // Location (NEW)
        if (!state.developmentData?.location?.address) errors.push('Location is required');
        if (!state.developmentData?.location?.city) errors.push('City is required');
        break;

      case 6: // Estate Profile (Conditional) OR Amenities if skipped
        // Logic handled in component navigation largely, but good to check if we are on Estate Profile step
        if (state.developmentData.nature === 'phase' && !state.estateProfile.classification) {
           // weak check for now
        }
        break;

      case 7: // Amenities (was 6)
        break;

      case 8: // Overview / Marketing Summary (was 7)
        if ((state.developmentData?.highlights?.length || 0) < 3) errors.push('Add at least 3 key selling points');
        if ((state.developmentData?.description?.length || 0) < 50) errors.push('Description must be at least 50 characters');
        
        // Conditional Validation for Completion Date
        const status = state.developmentData?.status;
        if (status === 'launching-soon' || status === 'selling') {
           if (!state.developmentData?.completionDate) {
              errors.push('Expected completion date is required for this status');
           }
        }
        break;

      case 9: // Media (was 8)
        const media = state.developmentData?.media;
        if (!media?.heroImage) errors.push('Hero image is required');
        
        // At least 1 document/brochure required for developments
        const docCount = (media?.documents || []).length;
        if (docCount < 1) errors.push('Add at least 1 brochure or document');
        break;

      case 10: // Unit Types (was 9)
        if (state.classification?.type !== 'land' && (state.unitTypes?.length || 0) === 0) {
          errors.push('Add at least one unit type');
        }
        break;
    }
    return { isValid: errors.length === 0, errors };
  },

  validateForPublish: () => {
    const state = get();
    const errors: string[] = [];

    // Phase 1: Identity
    if (!state.developmentData?.name) errors.push('Development Name is required');
    if (!state.developmentData?.location?.address) errors.push('Location Address is required');
    
    // Media Check (Hero + Photos)
    const media = state.developmentData?.media;
    const mediaCount = (media?.heroImage ? 1 : 0) + (media?.photos?.length || 0);
    if (mediaCount === 0) errors.push('At least 1 image is required');

    // Phase 2: Classification
    if (!state.classification?.type) errors.push('Classification Type is required');

    // Phase 3: Overview
    if ((state.overview?.highlights?.length || 0) < 3) errors.push('Add at least 3 highlights');
    if ((state.overview?.description?.length || 0) < 50) errors.push('Description must be at least 50 characters');

    // Phase 4: Unit Types (Skip for Land)
    if (state.classification?.type !== 'land') {
       if ((state.unitTypes?.length || 0) === 0) {
         errors.push('Add at least one unit type');
       } else if (state.unitTypes) {
         // Check if any unit has 0 price (support both new and legacy fields)
         const validPrices = state.unitTypes.every(u => (u.priceFrom || u.basePriceFrom || 0) > 0);
         if (!validPrices) errors.push('All unit types must have a base price');
       }
    }

    return { isValid: errors.length === 0, errors };
  },

  saveDraft: async (saveCallback?: (data: any) => Promise<void>) => { 
    const state = get();
    const draftData = {
      developmentData: state.developmentData,
      classification: state.classification,
      overview: state.overview,
      unitTypes: state.unitTypes,
      finalisation: state.finalisation,
      currentPhase: state.currentPhase,
      // Include configs
      listingIdentity: state.listingIdentity, // NEW
      residentialConfig: state.residentialConfig,
      landConfig: state.landConfig,
      commercialConfig: state.commercialConfig,
      estateProfile: state.estateProfile,
      developmentType: state.developmentType, // Include basic type too
    };
    if (saveCallback) {
      await saveCallback(draftData);
    }
  },
  publish: async () => { 
    // Simulate API call latency
    await new Promise(resolve => setTimeout(resolve, 1000));
    set((state) => ({
      finalisation: { ...state.finalisation, isPublished: true }
    }));
  },
  
  reset: () => set(initialState),
  
  hydrateDevelopment: (data: any) => set((state) => {
    console.log('[hydrateDevelopment] Starting hydration with data:', data);

    const isDraft = data.draftData !== undefined;
    const source = isDraft ? data.draftData : data;

    if (!source) {
      console.error('[hydrateDevelopment] No data provided');
      return state;
    }

    const parse = (val: any, def: any) => {
      if (!val) return def;
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          return def;
        }
      }
      return val;
    };

    // ============================================================================
    // Hydrate Development Data
    // ============================================================================
    const hydratedDevelopmentData = {
      // Identity
      name: source.name || '',
      description: source.description || '',
      tagline: source.tagline || source.subtitle || '',
      subtitle: source.subtitle || source.tagline || '',

      // Type & Classification
      developmentType: source.developmentType || 'residential',
      propertyCategory: source.propertyCategory || null,
      subCategory: source.subCategory || null,

      // Location (COMPLETE)
      location: {
        address: source.address || '',
        suburb: source.suburb || '',
        city: source.city || '',
        province: source.province || '',
        postalCode: source.postalCode || '',
        latitude: source.latitude || null,
        longitude: source.longitude || null,
      },

      // Pricing
      priceFrom: source.priceFrom || null,
      priceTo: source.priceTo || null,
      monthlyLevyFrom: source.monthlyLevyFrom || null,
      monthlyLevyTo: source.monthlyLevyTo || null,
      ratesFrom: source.ratesFrom || null,
      ratesTo: source.ratesTo || null,

      // Units
      totalUnits: source.totalUnits || null,
      availableUnits: source.availableUnits || null,
      totalDevelopmentArea: source.totalDevelopmentArea || null,
      
      // Stand/Floor Sizes
      erfSizeFrom: source.erfSizeFrom || null,
      erfSizeTo: source.erfSizeTo || null,
      floorSizeFrom: source.floorSizeFrom || null,
      floorSizeTo: source.floorSizeTo || null,
      bedroomsFrom: source.bedroomsFrom || null,
      bedroomsTo: source.bedroomsTo || null,
      bathroomsFrom: source.bathroomsFrom || null,
      bathroomsTo: source.bathroomsTo || null,

      // Dates
      completionDate: source.completionDate ? new Date(source.completionDate) : null,
      launchDate: source.launchDate ? new Date(source.launchDate) : null,

      // Status
      status: source.status || 'draft',

      // Features (Booleans)
      petsAllowed: source.petsAllowed !== undefined && source.petsAllowed !== null ? Boolean(source.petsAllowed) : null,
      fibreReady: source.fibreReady !== undefined && source.fibreReady !== null ? Boolean(source.fibreReady) : null,
      solarReady: source.solarReady !== undefined && source.solarReady !== null ? Boolean(source.solarReady) : null,
      waterBackup: source.waterBackup !== undefined && source.waterBackup !== null ? Boolean(source.waterBackup) : null,
      backupPower: source.backupPower !== undefined && source.backupPower !== null ? Boolean(source.backupPower) : null,
      gatedCommunity: source.gatedCommunity !== undefined && source.gatedCommunity !== null ? Boolean(source.gatedCommunity) : null,
      featured: source.featured !== undefined ? source.featured : false,
      isPhasedDevelopment: source.isPhasedDevelopment !== undefined ? Boolean(source.isPhasedDevelopment) : false,

      // Media
      media: (() => {
        const parsedMedia = parse(source.media, { photos: [], videos: [], brochures: [] });
        
        // Fix: Fallback to legacy 'images' column if 'media' column is empty
        if ((!parsedMedia.photos || parsedMedia.photos.length === 0) && source.images) {
           const legacyImages = parse(source.images, []);
           if (Array.isArray(legacyImages) && legacyImages.length > 0) {
             console.log('[hydrateDevelopment] Hydrating photos from legacy images source');
             parsedMedia.photos = legacyImages.map((url: string | any) => {
                if (typeof url === 'string') return { id: `img-${Math.random()}`, url, category: 'general', type: 'image' };
                return url;
             });
           }
        }
        
        // Fix: Restore heroImage if missing but present in photos (Legacy/Structure Mismatch handling)
        if (!parsedMedia.heroImage && parsedMedia.photos?.length > 0) {
           // Look for featured/primary photo first
           const manualHero = parsedMedia.photos.find((p: any) => p.category === 'featured' || p.isPrimary) 
                           || parsedMedia.photos[0];
           
           if (manualHero) {
             console.log('[hydrateDevelopment] Restored missing heroImage from photos:', manualHero.id);
             parsedMedia.heroImage = { ...manualHero, category: 'featured', isPrimary: true };
           }
        }
        return parsedMedia;
      })(),
      
      // Legacy image handling for wizard
      images: source.images ? parse(source.images, []) : parse(source.media, {})?.photos || [],

      // References
      brandProfileId: source.brandProfileId || source.developerBrandProfileId || null,
      agentId: source.agentId || null,
      
      // Technical
      nature: source.nature || 'new',
      customClassification: source.customClassification || '',
      transactionType: source.transactionType || 'sale',
      ownershipType: source.ownershipType || 'sectional_title',
      propertyTypes: typeof source.propertyTypes === 'string' ? parse(source.propertyTypes, []) : (source.propertyTypes || []),
      
      // CRITICAL: Marketing fields used by OverviewPhase - must NEVER be undefined
      highlights: source.highlights ? parse(source.highlights, []) : [],
      amenities: source.amenities ? parse(source.amenities, []) : [],
    };

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
      communityTypes: []
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
      infrastructure: []
    });

    const hydratedCommercialConfig = parse(source.commercialConfig, {
      totalSpace: null,
      availableSpace: null,
      spaceUnits: 'sqm',
      rentalRate: null,
      tenantType: [],
      parkingRatio: null,
      commercialType: null,
      features: []
    });

    const hydratedMixedUseConfig = parse(source.mixedUseConfig, {
      residentialUnits: null,
      commercialSpace: null,
      retailSpace: null,
      officeSpace: null,
    });

    // ============================================================================
    // Hydrate Estate Profile (for estates/complexes)
    // ============================================================================
    const hydratedEstateProfile = parse(source.estateSpecs, {
      security: {
        type: null,
        features: [],
      },
      lifestyle: {
        amenities: [],
        clubhouse: null,
        communityFacilities: [],
      },
      infrastructure: {
        roadTypes: [],
        utilities: [],
        maintenance: null,
      },
      classification: '', 
      hasHOA: false, 
      levyRange: {min:0,max:0}, 
      architecturalGuidelines: false, 
      estateAmenities: []
    });

    // ============================================================================
    // Hydrate Amenities
    // ============================================================================
    const hydratedAmenities = parse(source.amenities, { 
      standard: [], 
      additional: [] 
    });
    
    // Normalize if it came back as array (legacy or strict DB)
    let standardAmenities = Array.isArray(hydratedAmenities) ? hydratedAmenities : (hydratedAmenities.standard || []);
    let additionalAmenities = hydratedAmenities.additional || [];

    // ============================================================================
    // Hydrate Unit Types (CRITICAL)
    // ============================================================================
    let hydratedUnitTypes: any[] = [];
    
    if (Array.isArray(source.unitTypes)) {
      console.log(`[hydrateDevelopment] Hydrating ${source.unitTypes.length} unit types`);
      
      hydratedUnitTypes = source.unitTypes.map((u: any, idx: number) => {
        if (!u.id) {
          console.warn(`[hydrateDevelopment] Unit ${idx} missing ID, generating...`);
          u.id = `unit-${Date.now()}-${idx}`;
        }

        return {
          id: u.id,
          label: u.label || u.name || 'Unnamed Unit',
          name: u.name || u.label || 'Unnamed Unit',
          
          // Layout
          bedrooms: u.bedrooms !== undefined ? u.bedrooms : null,
          bathrooms: u.bathrooms !== undefined ? u.bathrooms : null,
          floorSizeFrom: u.floorSizeFrom || null,
          floorSizeTo: u.floorSizeTo || null,
          yardSize: u.yardSize || null,
          
          // Type
          ownershipType: u.ownershipType || null,
          structuralType: u.structuralType || null,
          
          // Parking
          parkingType: u.parkingType || null,
          parkingSpaces: u.parkingSpaces !== undefined ? u.parkingSpaces : null,
          parkingBays: u.parkingBays !== undefined ? u.parkingBays : null,
          
          // Pricing
          priceFrom: u.priceFrom || null,
          priceTo: u.priceTo || null,
          depositRequired: u.depositRequired !== undefined ? u.depositRequired : null,
          
          // Availability
          availableUnits: u.availableUnits !== undefined ? u.availableUnits : null,
          totalUnits: u.totalUnits !== undefined ? u.totalUnits : null,
          completionDate: u.completionDate || null,
          
          // Complex fields
          amenities: parse(u.amenities, { standard: [], additional: [] }),
          specifications: parse(u.specifications, { builtInFeatures: {}, finishes: {}, electrical: {} }),
          baseMedia: parse(u.baseMedia, { gallery: [], floorPlans: [], renders: [] }),
          extras: parse(u.extras, []),
          specs: parse(u.specs, []),
          
          // Notes
          internalNotes: u.internalNotes || null,
          isActive: u.isActive !== false,
          displayOrder: u.displayOrder || idx
        };
      });
    } else {
      console.warn('[hydrateDevelopment] No unitTypes array found');
    }

    // ============================================================================
    // Hydrate Marketing/Overview
    // ============================================================================
    const hydratedOverview = {
      description: source.description || '',
      keyFeatures: parse(source.keyFeatures || source.features, []), // Try both keys
      highlights: source.highlights ? parse(source.highlights, []) : [],
      metaTitle: source.metaTitle || '',
      metaDescription: source.metaDescription || '',
      keywords: parse(source.keywords, []),
    };

    // ============================================================================
    // Hydrate Classification
    // ============================================================================
    const hydratedClassification = {
      propertyCategory: source.propertyCategory || null,
      subCategory: source.subCategory || null,
      tags: source.tags || [],
    };

    // ============================================================================
    // Return Complete Hydrated State
    // ============================================================================
    console.log('[hydrateDevelopment] Hydration Complete. State updated.');
    
    return {
      ...state,
      currentPhase: isDraft ? (source.currentPhase || 1) : 9,
      
      developmentData: hydratedDevelopmentData,
      residentialConfig: hydratedResidentialConfig,
      landConfig: hydratedLandConfig,
      commercialConfig: hydratedCommercialConfig,
      mixedUseConfig: hydratedMixedUseConfig,
      estateProfile: hydratedEstateProfile,
      
      selectedAmenities: standardAmenities,
      additionalAmenities: additionalAmenities,
      
      unitTypes: hydratedUnitTypes,
      overview: hydratedOverview,
      classification: hydratedClassification,
      
      developmentType: source.developmentType || 'residential',
      
      // Ensure specific fields are synced back to store root if needed by components
      specifications: parse(source.specifications, {}),
      
      // Legacy compatibility
      editingId: isDraft ? undefined : source.id,
      developerId: source.developerId,
    };
  }),
  
  // LEGACY ACTIONS (Compatibility Layer)
  
  setDevelopmentData: (data: any) => set((state) => ({
    // Use the normalizer to guarantee field preservation
    developmentData: normalizeDevelopmentData(state.developmentData, data)
  })),
  
  setLocation: (loc: any) => set((state) => ({
    developmentData: { 
        ...state.developmentData, 
        location: { ...(state.developmentData?.location || {}), ...loc } 
    }
  })),
  
  addAmenity: (a: string) => set((state) => ({
    developmentData: { ...state.developmentData, amenities: [...state.developmentData.amenities, a] }
  })),
  
  removeAmenity: (a: string) => set((state) => ({
    developmentData: { ...state.developmentData, amenities: state.developmentData.amenities.filter(x => x !== a) }
  })),
  
  addHighlight: (h: string) => set((state) => {
    const newHighlights = [...(state.developmentData.highlights || []), h];
    return {
      developmentData: { ...state.developmentData, highlights: newHighlights },
      overview: { ...state.overview, highlights: newHighlights, description: state.developmentData.description } // Sync overview
    };
  }),

  removeHighlight: (index: number) => set((state) => {
    const newHighlights = state.developmentData.highlights.filter((_, i) => i !== index);
    return {
      developmentData: { ...state.developmentData, highlights: newHighlights },
      overview: { ...state.overview, highlights: newHighlights }
    };
  }),
  
  // Robust Media Implementation
  addMedia: (item: any) => set((state) => {
    if (!state.developmentData?.media) return state;

    const newItem: MediaItem = { 
       ...item, 
       id: `media-${Date.now()}-${Math.random()}`, 
       displayOrder: 0, 
       isPrimary: item.category === 'featured' || item.isPrimary
    };
    
    const mediaState = { ...state.developmentData.media };
    
    // If it's the first image or marked as featured/primary, set as hero
    if (newItem.isPrimary || (!mediaState.heroImage && (newItem.type === 'image' || newItem.category === 'featured'))) {
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
  
  removeMedia: (id: string) => set((state) => {
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
           documents: media.documents?.filter(d => d.id !== id) || []
        }
      }
    };
  }),
  
  setPrimaryImage: (id: string) => set((state) => {
    const media = state.developmentData?.media;
    if (!media) return state;

    // 1. Check if already hero
    if (media.heroImage?.id === id) return state;

    // 2. Find in photos
    const photoIndex = media.photos?.findIndex(p => p.id === id);
    if (photoIndex === undefined || photoIndex === -1) return state;

    const newHero = { ...media.photos![photoIndex], isPrimary: true, category: 'featured' as const };
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
             photos: newPhotos
          }
       }
    };
  }),
  
  reorderMedia: (items: MediaItem[]) => set((state) => {
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
               photos: newPhotos.sort((a,b) => a.displayOrder - b.displayOrder),
               videos: newVideos.sort((a,b) => a.displayOrder - b.displayOrder)
            }
         }
      };
  }),
  
  deleteUnitType: (id: string) => set((state) => ({
     unitTypes: state.unitTypes.filter(u => u.id !== id)
  })),
  
  duplicateUnitType: (id: string) => { /* No-op for now */ },
  
  updateMedia: (id: string, updates: Partial<MediaItem>) => set((state) => {
    const media = state.developmentData?.media;
    if (!media) return state;

    const updateItem = (item: MediaItem) => item.id === id ? { ...item, ...updates } : item;

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
        }
      }
    };
  }),
  

  
  // IMPORTANT: Media Getter that aggregates everything for the UI
  get media() { 
      const state = get();
      if (!state?.developmentData?.media) return [];
      
      const s = state.developmentData.media;
      const list: MediaItem[] = [];
      if (s.heroImage) list.push({ ...s.heroImage, category: 'featured' });
      
      // Map photos to 'general' category unless specified
      s.photos?.forEach(p => list.push({ ...p, category: (p.category as any) || 'general' }));
      s.videos?.forEach(v => list.push({ ...v, category: (v.category as any) || 'videos' }));
      
      return list;
  },
  
  validateStep: (s: number) => ({ isValid: true, errors: [] }),
  canProceed: () => true,
  nextStep: () => {},
  previousStep: () => {},
});

export const useDevelopmentWizard = create<DevelopmentWizardState>()(
  persist(
    (set, get) => ({
      ...initialState,
      ...createActions(set, get),
    }),
    {
      name: 'development-wizard-storage',
      partialize: (state) => {
        if (!state?.developmentData?.media) return {};
        
        return {
          currentPhase: state.currentPhase,
          developmentData: {
            ...state.developmentData,
            media: {
               // Don't persist Files
               heroImage: state.developmentData.media.heroImage ? { ...state.developmentData.media.heroImage, file: undefined } : undefined,
               photos: (state.developmentData.media.photos || []).map(p => ({ ...p, file: undefined })),
               videos: (state.developmentData.media.videos || []).map(v => ({ ...v, file: undefined })),
            }
          },
          listingIdentity: state.listingIdentity,
          developmentType: state.developmentType,
          residentialConfig: state.residentialConfig,
          landConfig: state.landConfig,
          commercialConfig: state.commercialConfig,
          estateProfile: state.estateProfile,
          classification: state.classification,
          overview: state.overview,
          unitTypes: state.unitTypes,
          finalisation: state.finalisation,
          // Persist legacy fields if needed, or drop them
          documents: state.documents,
        };
      },
    }
  )
);
