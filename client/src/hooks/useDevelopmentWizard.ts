import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UnitType {
  id: string;
  propertyType: 'full-title-house' | 'apartment' | 'leasehold' | 'penthouse' | 'simplex' | 'duplex';
  bedrooms: number;
  label: string;
  priceFrom: number;
  availableUnits: number;
  unitSize?: number; // in sqm
  yardSize?: number; // in sqm (for freestanding properties)
}

export interface MediaItem {
  id: string;
  file?: File;
  url: string;
  type: 'image' | 'video' | 'floorplan';
  category?: 'featured' | 'general' | 'amenities' | 'outdoors' | 'videos';
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
  // Basic Details
  developmentName: string;
  address: string;
  city: string;
  province: string;
  suburb?: string;
  postalCode?: string;
  latitude?: string;
  longitude?: string;
  developerId?: number;
  status: 'pre-launch' | 'launching-soon' | 'now-selling' | 'sold-out';
  rating?: number;
  
  // Unit Types
  unitTypes: UnitType[];
  
  // Highlights
  description: string;
  amenities: string[];
  highlights: string[];
  completionDate?: string;
  totalUnits: number;
  
  // Media
  media: MediaItem[];
  primaryImageIndex: number;
  
  // Developer Info
  developerName: string;
  contactDetails: ContactDetails;
  isFeaturedDealer: boolean;
  companyLogo?: string;
  
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
  setDeveloperId: (id: number) => void;
  setStatus: (status: DevelopmentWizardState['status']) => void;
  setRating: (rating: number) => void;
  
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
  setTotalUnits: (total: number) => void;
  
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
  developerId: undefined,
  status: 'now-selling' as const,
  rating: undefined,
  
  unitTypes: [],
  
  description: '',
  amenities: [],
  highlights: [],
  completionDate: undefined,
  totalUnits: 0,
  
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
      setDeveloperId: (id) => set({ developerId: id }),
      setStatus: (status) => set({ status }),
      setRating: (rating) => set({ rating }),
      
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
      setTotalUnits: (total) => set({ totalUnits: total }),
      
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
