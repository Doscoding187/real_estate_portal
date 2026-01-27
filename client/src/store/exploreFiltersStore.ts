import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OwnershipType, StructuralType, FloorType } from '@/shared/contract';

/**
 * Filter state for Explore feature
 * Simplified to match backend PropertyFilters interface
 */
interface FilterState {
  propertyType: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  minBedrooms: number | null;
  maxBedrooms: number | null;
  minBathrooms: number | null;
  location: string | null;
  agencyId: number | null;
  ownershipType: OwnershipType | null;
  structuralType: StructuralType | null;
  floors: FloorType | null;

  // Actions
  setPropertyType: (type: string | null) => void;
  setMinPrice: (price: number | null) => void;
  setMaxPrice: (price: number | null) => void;
  setMinBedrooms: (count: number | null) => void;
  setMaxBedrooms: (count: number | null) => void;
  setMinBathrooms: (count: number | null) => void;
  setLocation: (location: string | null) => void;
  setAgencyId: (id: number | null) => void;
  setOwnershipType: (type: OwnershipType | null) => void;
  setStructuralType: (type: StructuralType | null) => void;
  setFloors: (floors: FloorType | null) => void;
  clearFilters: () => void;
  getFilterCount: () => number;
}

export const useExploreFiltersStore = create<FilterState>()(
  persist(
    (set, get) => ({
      // Initial state
      propertyType: null,
      minPrice: null,
      maxPrice: null,
      minBedrooms: null,
      maxBedrooms: null,
      minBathrooms: null,
      location: null,
      agencyId: null,
      ownershipType: null,
      structuralType: null,
      floors: null,

      // Actions
      setPropertyType: type => set({ propertyType: type }),
      setMinPrice: price => set({ minPrice: price }),
      setMaxPrice: price => set({ maxPrice: price }),
      setMinBedrooms: count => set({ minBedrooms: count }),
      setMaxBedrooms: count => set({ maxBedrooms: count }),
      setMinBathrooms: count => set({ minBathrooms: count }),
      setLocation: location => set({ location }),
      setAgencyId: id => set({ agencyId: id }),
      setOwnershipType: type => set({ ownershipType: type }),
      setStructuralType: type => set({ structuralType: type }),
      setFloors: floors => set({ floors }),

      clearFilters: () =>
        set({
          propertyType: null,
          minPrice: null,
          maxPrice: null,
          minBedrooms: null,
          maxBedrooms: null,
          minBathrooms: null,
          location: null,
          agencyId: null,
          ownershipType: null,
          structuralType: null,
          floors: null,
        }),

      getFilterCount: () => {
        const state = get();
        let count = 0;
        if (state.propertyType) count++;
        if (state.minPrice !== null || state.maxPrice !== null) count++;
        if (state.minBedrooms !== null || state.maxBedrooms !== null) count++;
        if (state.minBathrooms !== null) count++;
        if (state.location) count++;
        if (state.agencyId) count++;
        if (state.ownershipType) count++;
        if (state.structuralType) count++;
        if (state.floors) count++;
        return count;
      },
    }),
    {
      name: 'explore-filters',
    },
  ),
);
