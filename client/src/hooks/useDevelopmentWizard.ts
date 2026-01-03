import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DevelopmentType,
  ResidentialType,
  CommunityType,
  SecurityFeature,
} from '@/types/wizardTypes';

// Media Item Interface
// Media Item Interface
export interface MediaItem {
  id: string;
  file?: File;
  url: string;
  type: 'image' | 'pdf' | 'video' | 'floorplan';
  category: 'featured' | 'general' | 'amenities' | 'outdoors' | 'videos' | 'photo' | 'floorplan' | 'render' | 'document';
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
  developmentId?: number;
  
  // Base Configuration
  name: string; // "2 Bedroom Apartment", "60m² Simplex"
  description?: string; // Marketing description for this unit type
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
  
  // Price Range
  priceFrom: number;
  priceTo: number; // Can equal priceFrom if fixed price
  
  // Availability Tracking
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
    additional: string[]; // Unit type-specific
  };
  
  // Specifications & Finishes (Unit Type Level)
  specifications: {
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
  baseMedia: {
    gallery: MediaItem[];
    floorPlans: MediaItem[];
    renders: MediaItem[];
  };
  
  // Spec Variations
  specs: SpecVariation[];
  
  // Metadata
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Development Wizard State Interface
export interface DevelopmentWizardState {
  // Wizard Flow
  currentPhase: number; // Legacy numeric (to be migrated to keyed)
  currentStep: number; // Internal step within a phase
  
  // NEW: Listing Identity (Step 0)
  listingIdentity: {
    identityType: 'developer' | 'marketing_agency';
    developerBrandProfileId?: number; // The Developer (Builder/Brand)
    marketingRole?: 'exclusive' | 'joint' | 'open';
  };
  
  // NEW: Development Type (Step 0)
  developmentType: DevelopmentType;
  
  // NEW: Residential Configuration (Step 1)
  residentialConfig: {
    residentialType: ResidentialType | null;
    communityTypes: CommunityType[];
    securityFeatures: SecurityFeature[];
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
    name: string;
    description: string;
    
    // Project Overview (from research: SquareYards, Property24)
    projectStatus: 'pre_launch' | 'under_construction' | 'ready_to_move' | 'nearing_completion' | 'completed';
    possessionDate?: string; // Expected or actual possession date (ISO string)
    totalUnits?: number; // Total units across all types
    totalDevelopmentArea?: number; // Total area in m²
    
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
    };
    
    // Legacy props to prevent breaks
    status?: string; 
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
    securityFeatures: [],
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
  
  // NEW: Selected Amenities
  selectedAmenities: [],
  
  developmentData: {
    nature: 'new',
    name: '',
    description: '',
    projectStatus: 'pre_launch',
    possessionDate: undefined,
    totalUnits: undefined,
    totalDevelopmentArea: undefined,
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

  setIdentity: (data: Partial<DevelopmentWizardState['developmentData']>) => set((state) => ({
    developmentData: {
      ...state.developmentData,
      ...data,
      location: { ...(state.developmentData?.location || {}), ...(data.location || {}) },
      media: { ...(state.developmentData?.media || { photos: [], videos: [] }), ...(data.media || {}) },
    }
  })),

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
        if (!state.developmentData?.location?.address) errors.push('Location is required');
        break;
      case 8: // Media (was 6?) - Wait, Media is now 8
        // Media Phase 
        const hasMedia = state.developmentData?.media?.heroImage || (state.developmentData?.media?.photos?.length || 0) > 0;
        if (!hasMedia) errors.push('Upload at least one image');
        break;
      case 6: // Amenities
         // optional
        break;
      case 7: // Overview
        if ((state.overview?.highlights?.length || 0) < 3) errors.push('Add at least 3 highlights');
        if ((state.overview?.description?.length || 0) < 50) errors.push('Description must be at least 50 characters');
        break;
      case 9: // Unit Types
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
      // 1. Handle Draft Data (matches store structure)
      // We check for key properties that distinguish a draft from a DB entity
      if (data.developmentData || data.classification) {
        return {
          ...state,
          currentPhase: data.currentPhase ?? state.currentPhase,
          currentStep: data.currentStep ?? state.currentStep,
          developmentData: { ...state.developmentData, ...data.developmentData },
          classification: { ...state.classification, ...data.classification },
          overview: { ...state.overview, ...data.overview },
          unitTypes: data.unitTypes || state.unitTypes,
          finalisation: { ...state.finalisation, ...data.finalisation },
          // Hydrate configs if present
          listingIdentity: data.listingIdentity || state.listingIdentity,
          residentialConfig: data.residentialConfig || state.residentialConfig,
          landConfig: data.landConfig || state.landConfig,
          commercialConfig: data.commercialConfig || state.commercialConfig,
          estateProfile: data.estateProfile || state.estateProfile,
          developmentType: data.developmentType || state.developmentType,
        };
      }

      // 2. Handle DB Entity (Edit Mode)
      // Helper to parse JSON fields safely
      const parse = (val: any, def: any) => {
        if (typeof val === 'string') {
          try { return JSON.parse(val); } catch { return def; }
        }
        return val || def;
      };

      const amenities = parse(data.amenities, []);
      const highlights = parse(data.highlights, []);
      const rawFeatures = parse(data.features, []);
      
      console.log('[hydrateDevelopment] Hydrating...', { 
        id: data.id, 
        features_raw: data.features, 
        features_parsed: rawFeatures,
        type_raw: data.features ? typeof data.features : 'undefined'
      });
      
      // Separate config features from display features
      const configFeatures: string[] = [];
      const displayFeatures: string[] = [];
      
      if (Array.isArray(rawFeatures)) {
        rawFeatures.forEach((f: string) => {
          if (f.startsWith('cfg:')) configFeatures.push(f);
          else displayFeatures.push(f);
        });
      }

      // Parse Configuration
      const resConfig: any = { residentialType: null, communityTypes: [], securityFeatures: [] };
      const lndConfig: any = { landType: null, infrastructure: [] };
      const comConfig: any = { commercialType: null, features: [] };
      const estProfile: any = { classification: '', hasHOA: false, levyRange: {min:0,max:0}, architecturalGuidelines: false, estateAmenities: [] };

      configFeatures.forEach(f => {
         const parts = f.split(':');
         if (parts.length < 3) return;
         const key = parts[1];
         const val = parts.slice(2).join(':'); // handle values with colons if any

         switch(key) {
             case 'res_type': resConfig.residentialType = val; break;
             case 'comm_type': resConfig.communityTypes.push(val); break;
             case 'sec_feat': resConfig.securityFeatures.push(val); break;
             case 'land_type': lndConfig.landType = val; break;
             case 'infra': lndConfig.infrastructure.push(val); break;
             case 'comm_use': comConfig.commercialType = val; break;
             case 'comm_feat': comConfig.features.push(val); break;
             case 'est_class': estProfile.classification = val; break;
             case 'hoa': estProfile.hasHOA = val === 'true'; break;
             case 'arch_guide': estProfile.architecturalGuidelines = val === 'true'; break;
             case 'est_levy_min': estProfile.levyRange.min = Number(val); break;
             case 'est_levy_max': estProfile.levyRange.max = Number(val); break;
             case 'est_amenity': estProfile.estateAmenities.push(val); break;
         }
      });
      
      // Map Media
      const dbImages = parse(data.images, []); 
      const dbVideos = parse(data.videos, []);
      
      const photos: MediaItem[] = Array.isArray(dbImages) ? dbImages.map((url: string, i: number) => ({
        id: `img-${i}-${Date.now()}`,
        url,
        type: 'image',
        category: i === 0 ? 'featured' : 'general',
        isPrimary: i === 0,
        displayOrder: i
      })) : [];

      const videos: MediaItem[] = Array.isArray(dbVideos) ? dbVideos.map((url: string, i: number) => ({
        id: `vid-${i}-${Date.now()}`,
        url,
        type: 'video',
        category: 'videos',
        isPrimary: false,
        displayOrder: i
      })) : [];

      return {
          ...state,
          currentPhase: 9, // Start at Finalisation (Step 9) for review/edit navigation
          developmentData: {
              nature: 'new',
              name: data.name || '',
              description: data.description || '',
              projectStatus: data.projectStatus || 'pre_launch',
              possessionDate: data.possessionDate,
              totalUnits: data.totalUnits,
              totalDevelopmentArea: data.totalDevelopmentArea,
              location: {
                  address: data.address || '',
                  city: data.city || '',
                  province: data.province || '',
                  latitude: data.latitude || '',
                  longitude: data.longitude || '',
                  postalCode: data.postalCode || '',
              },
              media: {
                  heroImage: photos.find(p => p.isPrimary),
                  photos: photos.filter(p => !p.isPrimary),
                  videos: videos
              },
              amenities,
              highlights,
              approvalStatus: data.approvalStatus,
              isPublished: !!data.isPublished
          },
          classification: {
              type: data.developmentType || 'residential',
              subType: '',
              ownership: ''
          },
          overview: {
              status: data.status || 'planning',
              highlights,
              description: data.description || '',
              amenities,
              features: displayFeatures
          },
          // Hydrate Configs
          listingIdentity: {
            identityType: data.marketingBrandProfileId ? 'marketing_agency' : 'developer',
            developerBrandProfileId: data.developerBrandProfileId,
            marketingRole: data.marketingRole || 'exclusive'
          },
          residentialConfig: resConfig,
          landConfig: lndConfig,
          commercialConfig: comConfig,
          estateProfile: estProfile, // Partial hydration (levy range omitted for now as not in payload)
          // Hydrate unit types if present in the payload
          unitTypes: Array.isArray(data.unitTypes) ? data.unitTypes.map((u: any) => ({
            ...u,
            amenities: u.amenities || { standard: [], additional: [] },
            specifications: u.specifications || {
              builtInFeatures: { builtInWardrobes: false, tiledFlooring: false, graniteCounters: false },
              finishes: {},
              electrical: { prepaidElectricity: false }
            },
            baseMedia: u.baseMedia || { gallery: [], floorPlans: [], renders: [] },
            specs: Array.isArray(u.specs) ? u.specs : []
          })) : [],
          finalisation: {
              salesTeamIds: [],
              isPublished: !!data.isPublished
          },
          editingId: data.id,
          developerId: data.developerId,
          selectedAmenities: amenities, // Hydrate selected amenities from DB data
      };
  
  // LEGACY ACTIONS (Compatibility Layer)
  
  setDevelopmentData: (data: any) => set((state) => ({
    developmentData: { ...state.developmentData, ...data }
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
  
  addHighlight: (h: string) => set((state) => ({
    developmentData: { ...state.developmentData, highlights: [...state.developmentData.highlights, h] }
  })),
  
  removeHighlight: (i: number) => set((state) => ({
    developmentData: { ...state.developmentData, highlights: state.developmentData.highlights.filter((_, idx) => idx !== i) }
  })),
  
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
    } else {
       // It's a photo/image
       // Only add to photos if it's NOT the hero image (or if we want duplicates? usually not)
       // But legacy 'media' getter aggregates them.
       // Let's store in photos array regardless for safety, but typically Hero is separate.
       // Actually, let's keep Hero separate.
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
           videos: media.videos?.filter(v => v.id !== id) || []
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
