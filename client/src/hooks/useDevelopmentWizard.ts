import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UnitType {
  id: string;
  // Ownership & Structure
  ownershipType: 'full-title' | 'sectional-title' | 'leasehold' | 'life-rights';
  structuralType: 'apartment' | 'freestanding-house' | 'simplex' | 'duplex' | 'penthouse' | 'plot-and-plan' | 'townhouse' | 'studio';
  
  // Configuration
  bedrooms: number;
  bathrooms: number;
  floors?: 'single-storey' | 'double-storey' | 'triplex';
  label: string; // e.g., "Type 2A", "The Ebony"
  
  // Pricing
  priceFrom: number;
  priceTo?: number; // Auto-calculated for price range
  
  // Sizes
  unitSize?: number; // in sqm
  yardSize?: number; // in sqm (for freestanding properties)
  
  // Availability
  availableUnits: number;
  
  // Media & Description
  floorPlanImages?: string[]; // URLs to floor plan images
  configDescription?: string; // Optional description of this config
  virtualTourLink?: string; // Matterport, YouTube, etc.
  galleryImages?: string[]; // Unit-specific images
}

export interface MediaItem {
  id: string;
  file?: File;
  url: string;
  type: 'image' | 'video' | 'floorplan';
  category?: 'featured' | 'general' | 'floorplans' | 'amenities' | 'outdoors' | 'videos';
  isPrimary: boolean;
  displayOrder: number;
}

export interface ContactDetails {
  name: string;
  email: string;
  phone: string;
  preferredContact?: 'email' | 'phone';
}

export interface DevelopmentWizardState {
  // Basic Details - Step 1
  developmentName: string;
  address: string;
  city: string;
  province: string;
  suburb?: string;
  postalCode?: string;
  latitude?: string;
  longitude?: string;
  gpsAccuracy?: 'accurate' | 'approximate'; // GPS accuracy indicator
  
  developerId?: number;
  status: 'now-selling' | 'launching-soon' | 'under-construction' | 'ready-to-move' | 'sold-out' | 'phase-1-complete';
  rating?: number; // Auto-calculated, read-only
  
  // Project Overview - Step 1 additions
  totalUnits: number; // Total units in development
  projectSize?: number; // in acres
  projectHighlights: string[]; // Up to 5 key selling points
  
  // Unit Configurations - Step 2
  unitTypes: UnitType[];
  
  // Features & Amenities - Step 3
  description: string;
  amenities: string[]; // Selected from master list
  highlights: string[];
  completionDate?: string;
  
  // Specifications - Step 3 additions
  specifications: {
    walls?: string[]; // e.g., ['Painted', 'Plastered', 'Feature walls']
    flooring?: string[]; // e.g., ['Tiled', 'Vinyl', 'Laminate']
    kitchen?: string[]; // e.g., ['Gas/Electric', 'Built-in cupboards']
    bathrooms?: string[]; // e.g., ['Shower', 'Bath', 'Premium fittings']
    structure?: string[]; // e.g., ['Concrete frame', 'Brick']
  };
  
  // Media - Step 4
  media: MediaItem[];
  primaryImageIndex: number;
  
  // Developer Info - Step 5
  developerName: string;
  contactDetails: ContactDetails;
  isFeaturedDealer: boolean;
  companyLogo?: string;
  developerWebsite?: string;
  aboutDeveloper?: string; // Company description
  trackRecord?: string; // Past achievements
  pastProjects: Array<{ name: string; year: string; location: string }>;
  
  // Wizard State
  currentStep: number;
  isComplete: boolean;
  draftId?: number;
  
  // Actions
  setDevelopmentName: (name: string) => void;
  setAddress: (address: string) => void;
  setCity: (city: string) => void;
  setProvince: (province: string) => void;
  setSuburb: (suburb: string) => void;
  setPostalCode: (code: string) => void;
  setLatLng: (lat: string, lng: string) => void;
  setLatitude: (lat: string) => void;
  setLongitude: (lng: string) => void;
  setGpsAccuracy: (accuracy: 'accurate' | 'approximate') => void;
  setDeveloperId: (id: number) => void;
  setStatus: (status: DevelopmentWizardState['status']) => void;
  setRating: (rating: number) => void;
  setTotalUnits: (total: number) => void;
  setProjectSize: (size: number) => void;
  setProjectHighlights: (highlights: string[]) => void;
  addProjectHighlight: (highlight: string) => void;
  removeProjectHighlight: (index: number) => void;
  
  // Unit Types Actions
  addUnitType: (unitType: Omit<UnitType, 'id'>) => void;
  updateUnitType: (id: string, updates: Partial<UnitType>) => void;
  removeUnitType: (id: string) => void;
  reorderUnitTypes: (unitTypes: UnitType[]) => void;
  
  // Highlights Actions
  setDescription: (description: string) => void;
  setAmenities: (amenities: string[]) => void;
  setHighlights: (highlights: string[]) => void;
  setCompletionDate: (date: string) => void;
  setSpecifications: (specs: DevelopmentWizardState['specifications']) => void;
  
  // Media Actions
  addMedia: (media: Omit<MediaItem, 'id' | 'displayOrder'>) => void;
  removeMedia: (id: string) => void;
  setPrimaryImage: (id: string) => void;
  reorderMedia: (media: MediaItem[]) => void;
  
  // Developer Actions
  setDeveloperName: (name: string) => void;
  setContactDetails: (details: ContactDetails) => void;
  setIsFeaturedDealer: (isFeatured: boolean) => void;
  setCompanyLogo: (logo: string) => void;
  setDeveloperWebsite: (website: string) => void;
  setAboutDeveloper: (about: string) => void;
  setTrackRecord: (record: string) => void;
  setPastProjects: (projects: Array<{ name: string; year: string; location: string }>) => void;
  
  // Wizard Actions
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  setIsComplete: (isComplete: boolean) => void;
  setDraftId: (id: number) => void;
  reset: () => void;
}

const initialState = {
  developmentName: '',
  address: '',
  city: '',
  province: '',
  suburb: '',
  postalCode: '',
  latitude: '',
  longitude: '',
  gpsAccuracy: undefined,
  developerId: undefined,
  status: 'now-selling' as const,
  rating: undefined,
  totalUnits: 0,
  projectSize: undefined,
  projectHighlights: [],
  
  unitTypes: [],
  
  description: '',
  amenities: [],
  highlights: [],
  completionDate: undefined,
  specifications: {
    walls: [],
    flooring: [],
    kitchen: [],
    bathrooms: [],
    structure: [],
  },
  
  media: [],
  primaryImageIndex: 0,
  
  developerName: '',
  contactDetails: {
    name: '',
    email: '',
    phone: '',
    preferredContact: 'email' as const,
  },
  isFeaturedDealer: false,
  companyLogo: undefined,
  developerWebsite: undefined,
  aboutDeveloper: undefined,
  trackRecord: undefined,
  pastProjects: [],
  
  currentStep: 0,
  isComplete: false,
  draftId: undefined,
};

export const useDevelopmentWizard = create<DevelopmentWizardState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Basic Details Actions
      setDevelopmentName: (name) => set({ developmentName: name }),
      setAddress: (address) => set({ address }),
      setCity: (city) => set({ city }),
      setProvince: (province) => set({ province }),
      setSuburb: (suburb) => set({ suburb }),
      setPostalCode: (code) => set({ postalCode: code }),
      setLatLng: (lat, lng) => set({ latitude: lat, longitude: lng }),
      setLatitude: (lat) => set({ latitude: lat }),
      setLongitude: (lng) => set({ longitude: lng }),
      setGpsAccuracy: (accuracy) => set({ gpsAccuracy: accuracy }),
      setDeveloperId: (id) => set({ developerId: id }),
      setStatus: (status) => set({ status }),
      setRating: (rating) => set({ rating }),
      setTotalUnits: (total) => set({ totalUnits: total }),
      setProjectSize: (size) => set({ projectSize: size }),
      setProjectHighlights: (highlights) => set({ projectHighlights: highlights }),
      addProjectHighlight: (highlight) => set((state) => ({ 
        projectHighlights: [...state.projectHighlights, highlight]
      })),
      removeProjectHighlight: (index) => set((state) => ({
        projectHighlights: state.projectHighlights.filter((_, i) => i !== index)
      })),
      
      // Unit Types Actions
      addUnitType: (unitType) => {
        const newUnit: UnitType = {
          ...unitType,
          id: `unit-${Date.now()}-${Math.random()}`,
        };
        set((state) => ({
          unitTypes: [...state.unitTypes, newUnit],
        }));
      },
      
      updateUnitType: (id, updates) => {
        set((state) => ({
          unitTypes: state.unitTypes.map((unit) =>
            unit.id === id ? { ...unit, ...updates } : unit
          ),
        }));
      },
      
      removeUnitType: (id) => {
        set((state) => ({
          unitTypes: state.unitTypes.filter((unit) => unit.id !== id),
        }));
      },
      
      reorderUnitTypes: (unitTypes) => set({ unitTypes }),
      
      // Highlights Actions
      setDescription: (description) => set({ description }),
      setAmenities: (amenities) => set({ amenities }),
      setHighlights: (highlights) => set({ highlights }),
      setCompletionDate: (date) => set({ completionDate: date }),
      setSpecifications: (specs) => set({ specifications: specs }),
      
      // Media Actions
      addMedia: (media) => {
        const state = get();
        const newMedia: MediaItem = {
          ...media,
          id: `media-${Date.now()}-${Math.random()}`,
          displayOrder: state.media.length,
        };
        set({
          media: [...state.media, newMedia],
        });
      },
      
      removeMedia: (id) => {
        set((state) => {
          const filtered = state.media.filter((m) => m.id !== id);
          // Reorder after removal
          return {
            media: filtered.map((m, i) => ({ ...m, displayOrder: i })),
          };
        });
      },
      
      setPrimaryImage: (id) => {
        set((state) => {
          const index = state.media.findIndex((m) => m.id === id);
          return {
            media: state.media.map((m) => ({
              ...m,
              isPrimary: m.id === id,
            })),
            primaryImageIndex: index >= 0 ? index : 0,
          };
        });
      },
      
      reorderMedia: (media) => {
        set({
          media: media.map((m, i) => ({ ...m, displayOrder: i })),
        });
      },
      
      // Developer Actions
      setDeveloperName: (name) => set({ developerName: name }),
      setContactDetails: (details) => set({ contactDetails: details }),
      setIsFeaturedDealer: (isFeatured) => set({ isFeaturedDealer: isFeatured }),
      setCompanyLogo: (logo) => set({ companyLogo: logo }),
      setDeveloperWebsite: (website) => set({ developerWebsite: website }),
      setAboutDeveloper: (about) => set({ aboutDeveloper: about }),
      setTrackRecord: (record) => set({ trackRecord: record }),
      setPastProjects: (projects) => set({ pastProjects: projects }),
      
      // Wizard Actions
      nextStep: () => {
        const state = get();
        if (state.currentStep < 5) {
          set({ currentStep: state.currentStep + 1 });
        }
      },
      
      previousStep: () => {
        const state = get();
        if (state.currentStep > 0) {
          set({ currentStep: state.currentStep - 1 });
        }
      },
      
      goToStep: (step) => {
        if (step >= 0 && step <= 5) {
          set({ currentStep: step });
        }
      },
      
      setIsComplete: (isComplete) => set({ isComplete }),
      setDraftId: (id) => set({ draftId: id }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'development-wizard-storage',
      partialize: (state) => ({
        developmentName: state.developmentName,
        address: state.address,
        city: state.city,
        province: state.province,
        suburb: state.suburb,
        postalCode: state.postalCode,
        status: state.status,
        rating: state.rating,
        unitTypes: state.unitTypes,
        description: state.description,
        amenities: state.amenities,
        highlights: state.highlights,
        completionDate: state.completionDate,
        totalUnits: state.totalUnits,
        developerName: state.developerName,
        contactDetails: state.contactDetails,
        isFeaturedDealer: state.isFeaturedDealer,
        currentStep: state.currentStep,
        draftId: state.draftId,
        // Don't persist media files
      }),
    }
  )
);
