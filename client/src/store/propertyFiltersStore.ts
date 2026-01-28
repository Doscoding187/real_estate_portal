import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PropertyFilters, SortOption, ViewMode } from '../../../shared/types';

/**
 * Property filters store state interface
 * Manages filter state, URL synchronization, and localStorage persistence
 */
interface PropertyFiltersState {
  // Filter state
  filters: PropertyFilters;
  sortOption: SortOption;
  viewMode: ViewMode;
  page: number;

  // Actions
  setFilters: (filters: Partial<PropertyFilters>) => void;
  updateFilter: <K extends keyof PropertyFilters>(key: K, value: PropertyFilters[K]) => void;
  resetFilters: () => void;
  setSortOption: (sort: SortOption) => void;
  setViewMode: (mode: ViewMode) => void;
  setPage: (page: number) => void;

  // URL synchronization
  syncFromUrl: (searchParams: URLSearchParams) => void;
  syncToUrl: () => URLSearchParams;

  // Utility
  getActiveFilterCount: () => number;
}

/**
 * Default filter state
 */
const defaultFilters: PropertyFilters = {};

/**
 * Default sort option
 */
const defaultSortOption: SortOption = 'date_desc';

/**
 * Default view mode
 */
const defaultViewMode: ViewMode = 'list';

/**
 * Parse URL search params into PropertyFilters
 */
const parseFiltersFromUrl = (searchParams: URLSearchParams): PropertyFilters => {
  const filters: PropertyFilters = {};

  // Location filters
  if (searchParams.has('province')) filters.province = searchParams.get('province')!;
  if (searchParams.has('city')) filters.city = searchParams.get('city')!;
  if (searchParams.has('suburb')) {
    const suburbs = searchParams.get('suburb')!;
    filters.suburb = suburbs.split(',').filter(Boolean);
  }

  // Basic filters
  if (searchParams.has('propertyType')) {
    const types = searchParams.get('propertyType')!;
    filters.propertyType = types.split(',') as any[];
  }
  if (searchParams.has('listingType')) {
    filters.listingType = searchParams.get('listingType') as any;
  }
  if (searchParams.has('minPrice')) {
    filters.minPrice = Number(searchParams.get('minPrice'));
  }
  if (searchParams.has('maxPrice')) {
    filters.maxPrice = Number(searchParams.get('maxPrice'));
  }
  if (searchParams.has('minBedrooms')) {
    filters.minBedrooms = Number(searchParams.get('minBedrooms'));
  }
  if (searchParams.has('maxBedrooms')) {
    filters.maxBedrooms = Number(searchParams.get('maxBedrooms'));
  }
  if (searchParams.has('minBathrooms')) {
    filters.minBathrooms = Number(searchParams.get('minBathrooms'));
  }

  // Size filters
  if (searchParams.has('minErfSize')) {
    filters.minErfSize = Number(searchParams.get('minErfSize'));
  }
  if (searchParams.has('maxErfSize')) {
    filters.maxErfSize = Number(searchParams.get('maxErfSize'));
  }
  if (searchParams.has('minFloorSize')) {
    filters.minFloorSize = Number(searchParams.get('minFloorSize'));
  }
  if (searchParams.has('maxFloorSize')) {
    filters.maxFloorSize = Number(searchParams.get('maxFloorSize'));
  }

  // SA-specific filters
  if (searchParams.has('titleType')) {
    const types = searchParams.get('titleType')!;
    filters.titleType = types.split(',') as any[];
  }
  if (searchParams.has('maxLevy')) {
    filters.maxLevy = Number(searchParams.get('maxLevy'));
  }
  if (searchParams.has('securityEstate')) {
    filters.securityEstate = searchParams.get('securityEstate') === 'true';
  }
  if (searchParams.has('petFriendly')) {
    filters.petFriendly = searchParams.get('petFriendly') === 'true';
  }
  if (searchParams.has('fibreReady')) {
    filters.fibreReady = searchParams.get('fibreReady') === 'true';
  }
  if (searchParams.has('loadSheddingSolutions')) {
    const solutions = searchParams.get('loadSheddingSolutions')!;
    filters.loadSheddingSolutions = solutions.split(',') as any[];
  }

  // Status filters
  if (searchParams.has('status')) {
    const statuses = searchParams.get('status')!;
    filters.status = statuses.split(',') as any[];
  }

  // Map bounds
  if (searchParams.has('bounds')) {
    const boundsStr = searchParams.get('bounds')!;
    const [north, south, east, west] = boundsStr.split(',').map(Number);
    filters.bounds = { north, south, east, west };
  }

  return filters;
};

/**
 * Convert PropertyFilters to URL search params
 */
const serializeFiltersToUrl = (filters: PropertyFilters): URLSearchParams => {
  const params = new URLSearchParams();

  // Location filters
  if (filters.province) params.set('province', filters.province);
  if (filters.city) params.set('city', filters.city);
  if (filters.suburb && filters.suburb.length > 0) {
    params.set('suburb', filters.suburb.join(','));
  }

  // Basic filters
  if (filters.propertyType && filters.propertyType.length > 0) {
    params.set('propertyType', filters.propertyType.join(','));
  }
  if (filters.listingType) params.set('listingType', filters.listingType);
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  if (filters.minBedrooms !== undefined) params.set('minBedrooms', String(filters.minBedrooms));
  if (filters.maxBedrooms !== undefined) params.set('maxBedrooms', String(filters.maxBedrooms));
  if (filters.minBathrooms !== undefined) params.set('minBathrooms', String(filters.minBathrooms));

  // Size filters
  if (filters.minErfSize !== undefined) params.set('minErfSize', String(filters.minErfSize));
  if (filters.maxErfSize !== undefined) params.set('maxErfSize', String(filters.maxErfSize));
  if (filters.minFloorSize !== undefined) params.set('minFloorSize', String(filters.minFloorSize));
  if (filters.maxFloorSize !== undefined) params.set('maxFloorSize', String(filters.maxFloorSize));

  // SA-specific filters
  if (filters.titleType && filters.titleType.length > 0) {
    params.set('titleType', filters.titleType.join(','));
  }
  if (filters.maxLevy !== undefined) params.set('maxLevy', String(filters.maxLevy));
  if (filters.securityEstate !== undefined) {
    params.set('securityEstate', String(filters.securityEstate));
  }
  if (filters.petFriendly !== undefined) {
    params.set('petFriendly', String(filters.petFriendly));
  }
  if (filters.fibreReady !== undefined) {
    params.set('fibreReady', String(filters.fibreReady));
  }
  if (filters.loadSheddingSolutions && filters.loadSheddingSolutions.length > 0) {
    params.set('loadSheddingSolutions', filters.loadSheddingSolutions.join(','));
  }

  // Status filters
  if (filters.status && filters.status.length > 0) {
    params.set('status', filters.status.join(','));
  }

  // Map bounds
  if (filters.bounds) {
    const { north, south, east, west } = filters.bounds;
    params.set('bounds', `${north},${south},${east},${west}`);
  }

  return params;
};

/**
 * Zustand store for property search filters
 *
 * Features:
 * - Manages all property filter state
 * - Persists to localStorage
 * - Synchronizes with URL parameters
 * - Supports sort options and view modes
 * - Provides utility functions for filter management
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
export const usePropertyFiltersStore = create<PropertyFiltersState>()(
  persist(
    (set, get) => ({
      // Initial state
      filters: defaultFilters,
      sortOption: defaultSortOption,
      viewMode: defaultViewMode,
      page: 1,

      // Set multiple filters at once
      setFilters: newFilters =>
        set(state => ({
          filters: { ...state.filters, ...newFilters },
          page: 1, // Reset to first page when filters change
        })),

      // Update a single filter
      updateFilter: (key, value) =>
        set(state => ({
          filters: { ...state.filters, [key]: value },
          page: 1, // Reset to first page when filters change
        })),

      // Reset all filters to default
      resetFilters: () =>
        set({
          filters: defaultFilters,
          page: 1,
        }),

      // Set sort option
      setSortOption: sort =>
        set({
          sortOption: sort,
          page: 1, // Reset to first page when sort changes
        }),

      // Set view mode
      setViewMode: mode => set({ viewMode: mode }),

      // Set current page
      setPage: page => set({ page }),

      // Sync filters from URL parameters
      syncFromUrl: searchParams => {
        const filters = parseFiltersFromUrl(searchParams);
        const sort = searchParams.get('sort') as SortOption | null;
        const view = searchParams.get('view') as ViewMode | null;
        const page = searchParams.get('page');

        set({
          filters,
          sortOption: sort || defaultSortOption,
          viewMode: view || defaultViewMode,
          page: page ? Number(page) : 1,
        });
      },

      // Sync filters to URL parameters
      syncToUrl: () => {
        const state = get();
        const params = serializeFiltersToUrl(state.filters);

        // Add sort, view, and page to URL
        if (state.sortOption !== defaultSortOption) {
          params.set('sort', state.sortOption);
        }
        if (state.viewMode !== defaultViewMode) {
          params.set('view', state.viewMode);
        }
        if (state.page > 1) {
          params.set('page', String(state.page));
        }

        return params;
      },

      // Get count of active filters
      getActiveFilterCount: () => {
        const { filters } = get();
        let count = 0;

        // Count location filters
        if (filters.province) count++;
        if (filters.city) count++;
        if (filters.suburb && filters.suburb.length > 0) count++;

        // Count basic filters
        if (filters.propertyType && filters.propertyType.length > 0) count++;
        if (filters.listingType) count++;
        if (filters.minPrice !== undefined) count++;
        if (filters.maxPrice !== undefined) count++;
        if (filters.minBedrooms !== undefined) count++;
        if (filters.maxBedrooms !== undefined) count++;
        if (filters.minBathrooms !== undefined) count++;

        // Count size filters
        if (filters.minErfSize !== undefined) count++;
        if (filters.maxErfSize !== undefined) count++;
        if (filters.minFloorSize !== undefined) count++;
        if (filters.maxFloorSize !== undefined) count++;

        // Count SA-specific filters
        if (filters.titleType && filters.titleType.length > 0) count++;
        if (filters.maxLevy !== undefined) count++;
        if (filters.securityEstate) count++;
        if (filters.petFriendly) count++;
        if (filters.fibreReady) count++;
        if (filters.loadSheddingSolutions && filters.loadSheddingSolutions.length > 0) count++;

        // Count status filters
        if (filters.status && filters.status.length > 0) count++;

        // Count map bounds
        if (filters.bounds) count++;

        return count;
      },
    }),
    {
      name: 'property-filters', // localStorage key
      partialize: state => ({
        // Only persist filters, sortOption, and viewMode
        // Don't persist page number
        filters: state.filters,
        sortOption: state.sortOption,
        viewMode: state.viewMode,
      }),
    },
  ),
);
