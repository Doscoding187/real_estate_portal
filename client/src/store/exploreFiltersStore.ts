import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Filter state interface for Explore feature
 * Manages all filter options across Explore pages
 */
interface FilterState {
  // Filter values
  propertyType: string | null;
  priceMin: number | null;
  priceMax: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  categoryId: number | null;
  location: string | null;
  
  // Actions
  setPropertyType: (type: string | null) => void;
  setPriceRange: (min: number | null, max: number | null) => void;
  setBedrooms: (count: number | null) => void;
  setBathrooms: (count: number | null) => void;
  setCategoryId: (id: number | null) => void;
  setLocation: (location: string | null) => void;
  clearFilters: () => void;
  getFilterCount: () => number;
}

/**
 * Zustand store for Explore filters
 * 
 * Features:
 * - Persists filter state to localStorage
 * - Provides actions for updating individual filters
 * - Calculates active filter count
 * - Shared across all Explore pages (Home, Feed, Shorts, Map)
 * 
 * Requirements: 4.1, 4.3
 */
export const useExploreFiltersStore = create<FilterState>()(
  persist(
    (set, get) => ({
      // Initial state
      propertyType: null,
      priceMin: null,
      priceMax: null,
      bedrooms: null,
      bathrooms: null,
      categoryId: null,
      location: null,

      // Actions
      setPropertyType: (type) => set({ propertyType: type }),
      
      setPriceRange: (min, max) => set({ priceMin: min, priceMax: max }),
      
      setBedrooms: (count) => set({ bedrooms: count }),
      
      setBathrooms: (count) => set({ bathrooms: count }),
      
      setCategoryId: (id) => set({ categoryId: id }),
      
      setLocation: (location) => set({ location }),
      
      clearFilters: () =>
        set({
          propertyType: null,
          priceMin: null,
          priceMax: null,
          bedrooms: null,
          bathrooms: null,
          categoryId: null,
          location: null,
        }),
      
      getFilterCount: () => {
        const state = get();
        return [
          state.propertyType,
          state.priceMin,
          state.priceMax,
          state.bedrooms,
          state.bathrooms,
          state.categoryId,
          state.location,
        ].filter(Boolean).length;
      },
    }),
    {
      name: 'explore-filters', // localStorage key
    }
  )
);
