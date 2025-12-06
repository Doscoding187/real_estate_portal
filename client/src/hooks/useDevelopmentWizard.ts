import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Media Item Interface
export interface MediaItem {
  id: string;
  file?: File;
  url: string;
  type: 'image' | 'pdf' | 'video';
  category: 'photo' | 'floorplan' | 'render' | 'document';
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

export interface ContactDetails {
  name: string;
  email: string;
  phone: string;
  preferredContact?: 'email' | 'phone';
}

// Development Wizard State Interface
export interface DevelopmentWizardState {
  // Wizard Flow
  currentStep: number; // 1-4
  
  // Step 1: Development Details
  developmentData: {
    // Basic Information
    name: string;
    status: 'now-selling' | 'launching-soon' | 'under-construction' | 'ready-to-move' | 'sold-out' | 'phase-completed' | 'new-phase-launching';
    completionDate?: string;
    description: string;
    developerName: string; // read-only
    rating?: number; // read-only
    
    // Location
    location: {
      latitude: string;
      longitude: string;
      address: string;
      city: string;
      province: string;
      suburb?: string;
      postalCode?: string;
      gpsAccuracy?: 'accurate' | 'approximate';
      noOfficialStreet: boolean;
    };
    
    // Development Amenities (inherited by all unit types as "standard amenities")
    amenities: string[];
    
    // Development Highlights (max 5)
    highlights: string[];
    
    // Development Media
    media: {
      heroImage?: MediaItem;
      photos: MediaItem[];
      videos: MediaItem[];
    };
  };
  
  // Step 2: Unit Types
  unitTypes: UnitType[];
  
  // Step 3: Phase Details & Infrastructure
  phaseDetails: {
    phaseName?: string;
    phaseNumber?: number;
    expectedCompletion?: Date;
    phaseStatus?: string;
  };
  infrastructure: string[]; // Estate-level only
  
  // Step 4: Documents
  documents: Document[];
  
  // Metadata
  developerId?: number;
  isComplete: boolean;
  draftId?: number;
  
  // Actions
  
  // Task 2.2: Development data actions
  setDevelopmentData: (data: Partial<DevelopmentWizardState['developmentData']>) => void;
  setLocation: (location: Partial<DevelopmentWizardState['developmentData']['location']>) => void;
  addAmenity: (amenity: string) => void;
  removeAmenity: (amenity: string) => void;
  addHighlight: (highlight: string) => void;
  removeHighlight: (index: number) => void;
  
  // Task 2.3: Unit type actions
  addUnitType: (unitType: Omit<UnitType, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateUnitType: (id: string, updates: Partial<UnitType>) => void;
  deleteUnitType: (id: string) => void;
  duplicateUnitType: (id: string) => void;
  setBaseFeatures: (unitTypeId: string, features: UnitType['specifications']['builtInFeatures']) => void;
  setBaseFinishes: (unitTypeId: string, finishes: UnitType['specifications']['finishes']) => void;
  
  // Task 2.4: Spec variation actions
  addSpec: (unitTypeId: string, spec: Omit<SpecVariation, 'id' | 'unitTypeId' | 'createdAt' | 'updatedAt'>) => void;
  updateSpec: (unitTypeId: string, specId: string, updates: Partial<SpecVariation>) => void;
  deleteSpec: (unitTypeId: string, specId: string) => void;
  setSpecOverrides: (unitTypeId: string, specId: string, overrides: SpecVariation['overrides']) => void;
  computeFinalFeatures: (unitTypeId: string, specId: string) => {
    amenities: string[];
    specifications: UnitType['specifications'];
  };
  
  // Task 2.5: Document and feature actions
  setDevelopmentFeatures: (features: string[]) => void;
  addDocument: (document: Omit<Document, 'id' | 'uploadedAt'>) => void;
  removeDocument: (id: string) => void;
  
  // Task 2.6: Wizard navigation actions
  setCurrentStep: (step: number) => void;
  validateStep: (step: number) => { isValid: boolean; errors: string[] };
  canProceed: () => boolean;
  nextStep: () => void;
  previousStep: () => void;
  
  // Task 2.7: Save and publish actions
  saveDraft: () => Promise<void>;
  publish: () => Promise<void>;
  
  // Utility actions
  setDeveloperId: (id: number) => void;
  setIsComplete: (isComplete: boolean) => void;
  setDraftId: (id: number) => void;
  reset: () => void;
}

const initialState: Omit<DevelopmentWizardState, keyof ReturnType<typeof createActions>> = {
  // Wizard Flow
  currentStep: 1, // Start at step 1
  
  // Step 1: Development Details
  developmentData: {
    name: '',
    status: 'now-selling',
    completionDate: undefined,
    description: '',
    developerName: '', // Will be auto-filled from authenticated user
    rating: undefined,
    
    location: {
      latitude: '',
      longitude: '',
      address: '',
      city: '',
      province: '',
      suburb: '',
      postalCode: '',
      gpsAccuracy: undefined,
      noOfficialStreet: false,
    },
    
    amenities: [],
    highlights: [],
    
    media: {
      heroImage: undefined,
      photos: [],
      videos: [],
    },
  },
  
  // Step 2: Unit Types
  unitTypes: [],
  
  // Step 3: Phase Details & Infrastructure
  phaseDetails: {
    phaseName: undefined,
    phaseNumber: undefined,
    expectedCompletion: undefined,
    phaseStatus: undefined,
  },
  infrastructure: [],
  
  // Step 4: Documents
  documents: [],
  
  // Metadata
  developerId: undefined,
  isComplete: false,
  draftId: undefined,
};

// Helper function to create actions
const createActions = (
  set: (partial: Partial<DevelopmentWizardState> | ((state: DevelopmentWizardState) => Partial<DevelopmentWizardState>)) => void,
  get: () => DevelopmentWizardState
) => ({

  // Task 2.2: Development data actions
  setDevelopmentData: (data: Partial<DevelopmentWizardState['developmentData']>) => set((state: DevelopmentWizardState) => ({
    developmentData: { ...state.developmentData, ...data }
  })),
  
  setLocation: (location: Partial<DevelopmentWizardState['developmentData']['location']>) => set((state: DevelopmentWizardState) => ({
    developmentData: {
      ...state.developmentData,
      location: { ...state.developmentData.location, ...location }
    }
  })),
  
  addAmenity: (amenity: string) => set((state: DevelopmentWizardState) => ({
    developmentData: {
      ...state.developmentData,
      amenities: [...state.developmentData.amenities, amenity]
    }
  })),
  
  removeAmenity: (amenity: string) => set((state: DevelopmentWizardState) => ({
    developmentData: {
      ...state.developmentData,
      amenities: state.developmentData.amenities.filter((a: string) => a !== amenity)
    }
  })),
  
  addHighlight: (highlight: string) => set((state: DevelopmentWizardState) => {
    // Enforce max 5 highlights
    if (state.developmentData.highlights.length >= 5) {
      return state;
    }
    return {
      developmentData: {
        ...state.developmentData,
        highlights: [...state.developmentData.highlights, highlight]
      }
    };
  }),
  
  removeHighlight: (index: number) => set((state: DevelopmentWizardState) => ({
    developmentData: {
      ...state.developmentData,
      highlights: state.developmentData.highlights.filter((_: string, i: number) => i !== index)
    }
  })),
  
  // Task 2.3: Unit type actions
  addUnitType: (unitType: Omit<UnitType, 'id' | 'createdAt' | 'updatedAt'>) => {
    const state = get();
    const newUnit: UnitType = {
      ...unitType,
      id: `unit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      amenities: {
        standard: state.developmentData.amenities, // Inherit from development
        additional: unitType.amenities?.additional || []
      },
      displayOrder: state.unitTypes.length,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set((state: DevelopmentWizardState) => ({
      unitTypes: [...state.unitTypes, newUnit]
    }));
  },
  
  updateUnitType: (id: string, updates: Partial<UnitType>) => {
    set((state: DevelopmentWizardState) => ({
      unitTypes: state.unitTypes.map((unit: UnitType) =>
        unit.id === id 
          ? { ...unit, ...updates, updatedAt: new Date() } 
          : unit
      )
    }));
  },
  
  deleteUnitType: (id: string) => {
    set((state: DevelopmentWizardState) => ({
      unitTypes: state.unitTypes.filter((unit: UnitType) => unit.id !== id)
    }));
  },
  
  duplicateUnitType: (id: string) => {
    const state = get();
    const unitToDuplicate = state.unitTypes.find((u: UnitType) => u.id === id);
    if (!unitToDuplicate) return;
    
    const duplicatedUnit: UnitType = {
      ...unitToDuplicate,
      id: `unit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${unitToDuplicate.name} (Copy)`,
      specs: unitToDuplicate.specs.map((spec: SpecVariation) => ({
        ...spec,
        id: `spec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      displayOrder: state.unitTypes.length,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    set((state: DevelopmentWizardState) => ({
      unitTypes: [...state.unitTypes, duplicatedUnit]
    }));
  },
  
  setBaseFeatures: (unitTypeId: string, features: UnitType['specifications']['builtInFeatures']) => {
    set((state: DevelopmentWizardState) => ({
      unitTypes: state.unitTypes.map((unit: UnitType) =>
        unit.id === unitTypeId
          ? {
              ...unit,
              specifications: {
                ...unit.specifications,
                builtInFeatures: features
              },
              updatedAt: new Date()
            }
          : unit
      )
    }));
  },
  
  setBaseFinishes: (unitTypeId: string, finishes: UnitType['specifications']['finishes']) => {
    set((state: DevelopmentWizardState) => ({
      unitTypes: state.unitTypes.map((unit: UnitType) =>
        unit.id === unitTypeId
          ? {
              ...unit,
              specifications: {
                ...unit.specifications,
                finishes: finishes
              },
              updatedAt: new Date()
            }
          : unit
      )
    }));
  },
  
  // Task 2.4: Spec variation actions
  addSpec: (unitTypeId: string, spec: Omit<SpecVariation, 'id' | 'unitTypeId' | 'createdAt' | 'updatedAt'>) => {
    const state = get();
    const unitType = state.unitTypes.find((u: UnitType) => u.id === unitTypeId);
    if (!unitType) return;
    
    const newSpec: SpecVariation = {
      ...spec,
      id: `spec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      unitTypeId,
      displayOrder: unitType.specs.length,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    set((state: DevelopmentWizardState) => ({
      unitTypes: state.unitTypes.map((unit: UnitType) =>
        unit.id === unitTypeId
          ? {
              ...unit,
              specs: [...unit.specs, newSpec],
              updatedAt: new Date()
            }
          : unit
      )
    }));
  },
  
  updateSpec: (unitTypeId: string, specId: string, updates: Partial<SpecVariation>) => {
    set((state: DevelopmentWizardState) => ({
      unitTypes: state.unitTypes.map((unit: UnitType) =>
        unit.id === unitTypeId
          ? {
              ...unit,
              specs: unit.specs.map((spec: SpecVariation) =>
                spec.id === specId
                  ? { ...spec, ...updates, updatedAt: new Date() }
                  : spec
              ),
              updatedAt: new Date()
            }
          : unit
      )
    }));
  },
  
  deleteSpec: (unitTypeId: string, specId: string) => {
    set((state: DevelopmentWizardState) => ({
      unitTypes: state.unitTypes.map((unit: UnitType) =>
        unit.id === unitTypeId
          ? {
              ...unit,
              specs: unit.specs.filter((spec: SpecVariation) => spec.id !== specId),
              updatedAt: new Date()
            }
          : unit
      )
    }));
  },
  
  setSpecOverrides: (unitTypeId: string, specId: string, overrides: SpecVariation['overrides']) => {
    set((state: DevelopmentWizardState) => ({
      unitTypes: state.unitTypes.map((unit: UnitType) =>
        unit.id === unitTypeId
          ? {
              ...unit,
              specs: unit.specs.map((spec: SpecVariation) =>
                spec.id === specId
                  ? { ...spec, overrides, updatedAt: new Date() }
                  : spec
              ),
              updatedAt: new Date()
            }
          : unit
      )
    }));
  },
  
  computeFinalFeatures: (unitTypeId: string, specId: string) => {
    const state = get();
    const unitType = state.unitTypes.find((u: UnitType) => u.id === unitTypeId);
    if (!unitType) {
      return { amenities: [], specifications: {} as UnitType['specifications'] };
    }
    
    const spec = unitType.specs.find((s: SpecVariation) => s.id === specId);
    if (!spec) {
      return {
        amenities: [...unitType.amenities.standard, ...unitType.amenities.additional],
        specifications: unitType.specifications
      };
    }
    
    // Compute final amenities: Development + Unit Type + Spec Overrides
    let finalAmenities: string[] = [
      ...unitType.amenities.standard,
      ...unitType.amenities.additional
    ];
    
    if (spec.overrides?.amenities) {
      // Remove amenities
      if (spec.overrides.amenities.remove) {
        finalAmenities = finalAmenities.filter(
          (a: string) => !spec.overrides!.amenities!.remove!.includes(a)
        );
      }
      // Add amenities
      if (spec.overrides.amenities.add) {
        finalAmenities = [...finalAmenities, ...spec.overrides.amenities.add];
      }
    }
    
    // Compute final specifications: Unit Type + Spec Overrides
    const finalSpecifications: UnitType['specifications'] = {
      builtInFeatures: {
        ...unitType.specifications.builtInFeatures,
        ...spec.overrides?.specifications?.builtInFeatures
      },
      finishes: {
        ...unitType.specifications.finishes,
        ...spec.overrides?.specifications?.finishes
      },
      electrical: {
        ...unitType.specifications.electrical,
        ...spec.overrides?.specifications?.electrical
      }
    };
    
    return {
      amenities: finalAmenities,
      specifications: finalSpecifications
    };
  },
  
  // Task 2.5: Document and feature actions
  setDevelopmentFeatures: (features: string[]) => {
    set({ infrastructure: features });
  },
  
  addDocument: (document: Omit<Document, 'id' | 'uploadedAt'>) => {
    const newDocument: Document = {
      ...document,
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      uploadedAt: new Date(),
    };
    set((state: DevelopmentWizardState) => ({
      documents: [...state.documents, newDocument]
    }));
  },
  
  removeDocument: (id: string) => {
    set((state: DevelopmentWizardState) => ({
      documents: state.documents.filter((doc: Document) => doc.id !== id)
    }));
  },
  
  // Task 2.6: Wizard navigation actions
  setCurrentStep: (step: number) => {
    if (step >= 1 && step <= 4) {
      set({ currentStep: step });
    }
  },
  
  validateStep: (step: number) => {
    const state = get();
    const errors: string[] = [];
    
    switch (step) {
      case 1: // Development Details
        if (!state.developmentData.name || state.developmentData.name.length < 5) {
          errors.push('Development name must be at least 5 characters');
        }
        if (!state.developmentData.location.latitude || !state.developmentData.location.longitude) {
          errors.push('Location is required');
        }
        if (state.developmentData.highlights.length > 5) {
          errors.push('Maximum 5 highlights allowed');
        }
        break;
        
      case 2: // Unit Types
        if (state.unitTypes.length === 0) {
          errors.push('At least one unit type is required');
        }
        state.unitTypes.forEach((unit: UnitType, index: number) => {
          if (!unit.name) {
            errors.push(`Unit type ${index + 1}: Name is required`);
          }
          if (!unit.bedrooms || unit.bedrooms < 0) {
            errors.push(`Unit type ${index + 1}: Valid bedrooms count is required`);
          }
          if (!unit.bathrooms || unit.bathrooms < 0) {
            errors.push(`Unit type ${index + 1}: Valid bathrooms count is required`);
          }
          if (!unit.basePriceFrom || unit.basePriceFrom <= 0) {
            errors.push(`Unit type ${index + 1}: Valid base price is required`);
          }
        });
        break;
        
      case 3: // Phase Details
        // Optional fields, no strict validation
        break;
        
      case 4: // Review & Publish
        // All previous validations must pass
        const step1Validation = get().validateStep(1);
        const step2Validation = get().validateStep(2);
        errors.push(...step1Validation.errors, ...step2Validation.errors);
        break;
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },
  
  canProceed: () => {
    const state = get();
    const validation = state.validateStep(state.currentStep);
    return validation.isValid;
  },
  
  nextStep: () => {
    const state = get();
    if (state.currentStep < 4 && state.canProceed()) {
      set({ currentStep: state.currentStep + 1 });
    }
  },
  
  previousStep: () => {
    const state = get();
    if (state.currentStep > 1) {
      set({ currentStep: state.currentStep - 1 });
    }
  },
  
  // Task 2.7: Save and publish actions
  saveDraft: async () => {
    const state = get();
    // TODO: Implement API call to save draft
    console.log('Saving draft...', state);
    // This will be implemented when backend endpoints are ready
    // For now, the persist middleware handles local storage
  },
  
  publish: async () => {
    const state = get();
    
    // Validate all steps before publishing
    const allStepsValid = [1, 2, 3, 4].every(step => {
      const validation = state.validateStep(step);
      return validation.isValid;
    });
    
    if (!allStepsValid) {
      throw new Error('Please complete all required fields before publishing');
    }
    
    // TODO: Implement API call to publish
    console.log('Publishing development...', state);
    set({ isComplete: true });
    // This will be implemented when backend endpoints are ready
  },
  
  // Utility actions
  setDeveloperId: (id: number) => set({ developerId: id }),
  setIsComplete: (isComplete: boolean) => set({ isComplete }),
  setDraftId: (id: number) => set({ draftId: id }),
  reset: () => set(initialState),
});

export const useDevelopmentWizard = create<DevelopmentWizardState>()(
  persist(
    (set, get) => ({
      ...initialState,
      ...createActions(set, get),
    }),
    {
      name: 'development-wizard-storage',
      partialize: (state) => ({
        currentStep: state.currentStep,
        developmentData: {
          ...state.developmentData,
          // Don't persist File objects in media
          media: {
            heroImage: state.developmentData.media.heroImage ? {
              ...state.developmentData.media.heroImage,
              file: undefined
            } : undefined,
            photos: state.developmentData.media.photos.map(p => ({ ...p, file: undefined })),
            videos: state.developmentData.media.videos.map(v => ({ ...v, file: undefined })),
          }
        },
        unitTypes: state.unitTypes.map(unit => ({
          ...unit,
          baseMedia: {
            gallery: unit.baseMedia.gallery.map(m => ({ ...m, file: undefined })),
            floorPlans: unit.baseMedia.floorPlans.map(m => ({ ...m, file: undefined })),
            renders: unit.baseMedia.renders.map(m => ({ ...m, file: undefined })),
          }
        })),
        phaseDetails: state.phaseDetails,
        infrastructure: state.infrastructure,
        documents: state.documents,
        developerId: state.developerId,
        draftId: state.draftId,
      }),
    }
  )
);
