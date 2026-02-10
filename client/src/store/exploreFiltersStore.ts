// client/src/store/exploreFiltersStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OwnershipType, StructuralType, FloorType } from '@/shared/contract';

/**
 * Explore Filters Store
 *
 * Goal:
 * - Keep the "legacy" fields your UI may already use (minPrice/maxPrice, minBedrooms/maxBedrooms, etc.)
 * - ALSO expose the newer API that your tests/components expect:
 *   setPriceRange, setBedrooms, setBathrooms, setCategoryId + priceMin/priceMax/bedrooms/bathrooms/categoryId
 *
 * This prevents "setPriceRange is not a function" and the null-vs-undefined test failures.
 */

interface FilterState {
  // --- Legacy fields (already used in parts of the app) ---
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

  // --- Newer fields (tests/components expect these) ---
  priceMin: number | null;
  priceMax: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  categoryId: number | null;

  // --- Legacy actions ---
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

  // --- Newer actions ---
  setPriceRange: (min: number | null, max: number | null) => void;
  setBedrooms: (value: number | null) => void;
  setBathrooms: (value: number | null) => void;
  setCategoryId: (value: number | null) => void;

  // --- Shared ---
  clearFilters: () => void;
  getFilterCount: () => number;
}

const INITIAL_STATE = {
  // Legacy
  propertyType: null as string | null,

  minPrice: null as number | null,
  maxPrice: null as number | null,

  minBedrooms: null as number | null,
  maxBedrooms: null as number | null,

  minBathrooms: null as number | null,

  location: null as string | null,
  agencyId: null as number | null,

  ownershipType: null as OwnershipType | null,
  structuralType: null as StructuralType | null,
  floors: null as FloorType | null,

  // Newer
  priceMin: null as number | null,
  priceMax: null as number | null,
  bedrooms: null as number | null,
  bathrooms: null as number | null,
  categoryId: null as number | null,
};

export const useExploreFiltersStore = create<FilterState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      // --- Legacy actions ---
      setPropertyType: type => set({ propertyType: type }),

      setMinPrice: price =>
        set({
          minPrice: price,
          // keep newer fields in sync
          priceMin: price,
        }),

      setMaxPrice: price =>
        set({
          maxPrice: price,
          // keep newer fields in sync
          priceMax: price,
        }),

      setMinBedrooms: count =>
        set({
          minBedrooms: count,
          // keep newer fields in sync (best-effort)
          bedrooms: count,
        }),

      setMaxBedrooms: count => set({ maxBedrooms: count }),

      setMinBathrooms: count =>
        set({
          minBathrooms: count,
          // keep newer fields in sync (best-effort)
          bathrooms: count,
        }),

      setLocation: location => set({ location }),
      setAgencyId: id => set({ agencyId: id }),

      setOwnershipType: type => set({ ownershipType: type }),
      setStructuralType: type => set({ structuralType: type }),
      setFloors: floors => set({ floors }),

      // --- Newer actions (tests/components expect these) ---
      setPriceRange: (min, max) =>
        set({
          priceMin: min,
          priceMax: max,
          // keep legacy fields in sync
          minPrice: min,
          maxPrice: max,
        }),

      setBedrooms: value =>
        set({
          bedrooms: value,
          // simplest sync with legacy
          minBedrooms: value,
          maxBedrooms: value,
        }),

      setBathrooms: value =>
        set({
          bathrooms: value,
          // legacy only has minBathrooms
          minBathrooms: value,
        }),

      setCategoryId: value => set({ categoryId: value }),

      // --- Shared ---
      clearFilters: () => set({ ...INITIAL_STATE }),

      /**
       * Count active filters.
       * IMPORTANT: Prefer the newer unified fields to avoid double-counting.
       * Fall back to legacy fields if newer fields are still null.
       */
      getFilterCount: () => {
        const s = get();
        let count = 0;

        // Property type
        if (s.propertyType) count++;

        // Price (prefer newer)
        const hasPrice =
          s.priceMin !== null ||
          s.priceMax !== null ||
          (s.priceMin === null && s.priceMax === null && (s.minPrice !== null || s.maxPrice !== null));
        if (hasPrice) count++;

        // Bedrooms (prefer newer)
        const hasBedrooms =
          s.bedrooms !== null ||
          (s.bedrooms === null && (s.minBedrooms !== null || s.maxBedrooms !== null));
        if (hasBedrooms) count++;

        // Bathrooms (prefer newer)
        const hasBathrooms =
          s.bathrooms !== null ||
          (s.bathrooms === null && s.minBathrooms !== null);
        if (hasBathrooms) count++;

        // Location
        if (s.location) count++;

        // Agency
        if (s.agencyId !== null) count++;

        // Category
        if (s.categoryId !== null) count++;

        // Extra legacy filters
        if (s.ownershipType) count++;
        if (s.structuralType) count++;
        if (s.floors) count++;

        return count;
      },
    }),
    {
      name: 'explore-filters',
      // Keep persisted state stable across code changes
      version: 1,
      // Only persist the data fields (not actions)
      partialize: state => ({
        propertyType: state.propertyType,

        minPrice: state.minPrice,
        maxPrice: state.maxPrice,

        minBedrooms: state.minBedrooms,
        maxBedrooms: state.maxBedrooms,

        minBathrooms: state.minBathrooms,

        location: state.location,
        agencyId: state.agencyId,

        ownershipType: state.ownershipType,
        structuralType: state.structuralType,
        floors: state.floors,

        priceMin: state.priceMin,
        priceMax: state.priceMax,
        bedrooms: state.bedrooms,
        bathrooms: state.bathrooms,
        categoryId: state.categoryId,
      }),
    },
  ),
);
