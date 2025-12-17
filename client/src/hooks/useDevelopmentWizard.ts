import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  usageType?: 'residential' | 'commercial'; // For Mixed-Use
  bedrooms: number;
  bathrooms: number;
  parking: 'none' | '1' | '2' | 'carport' | 'garage';
  unitSize?: number; // m²
  yardSize?: number; // m²
  basePriceFrom: number;
  basePriceTo?: number;
  
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
  currentPhase: number; // 1-5
  currentStep: number; // Internal step within a phase
  
  // Phase 1: Identity
  developmentData: {
    nature: 'new' | 'phase' | 'extension';
    parentDevelopmentId?: string; // For phases/extensions
    name: string;
    description: string;
    
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
  setIdentity: (data: Partial<DevelopmentWizardState['developmentData']>) => void;
  setClassification: (data: Partial<DevelopmentWizardState['classification']>) => void;
  setOverview: (data: Partial<DevelopmentWizardState['overview']>) => void;
  setFinalisation: (data: Partial<DevelopmentWizardState['finalisation']>) => void;
  
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
  
  // Legacy Misc
  setDevelopmentType: (type: 'master' | 'phase') => void;
  developmentType: 'master' | 'phase';
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
  
  developmentData: {
    nature: 'new',
    name: '',
    description: '',
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
      case 1:
        if (!state.developmentData?.name) errors.push('Name is required');
        if (!state.developmentData?.location?.address) errors.push('Location is required');
        break;
      case 2:
        if (!state.classification?.type) errors.push('Type is required');
        break;
      case 3:
        if ((state.overview?.highlights?.length || 0) < 3) errors.push('Add at least 3 highlights');
        if ((state.overview?.description?.length || 0) < 50) errors.push('Description must be at least 50 characters');
        break;
      case 4:
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
         // Check if any unit has 0 price
         const validPrices = state.unitTypes.every(u => u.basePriceFrom > 0);
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
      const features = parse(data.features, []);
      
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
          currentPhase: 1, // Reset to start for editing
          developmentData: {
              nature: 'new',
              name: data.name || '',
              description: data.description || '',
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
              highlights
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
              features
          },
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
          developerId: data.developerId
      };
  }),
  
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
  
  setDevelopmentType: (t: 'master' | 'phase') => {}, // No-op
  get developmentType() { return 'master' as const; },
  
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
