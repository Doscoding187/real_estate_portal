/**
 * Property Filters Hook
 * Manages filter state for Explore views with property type detection
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { useState, useEffect, useCallback } from 'react';

export type PropertyType = 'residential' | 'development' | 'land' | 'all';

export interface ResidentialFilters {
  beds?: number[];
  baths?: number[];
  parking?: number[];
  securityLevel?: string[];
  petFriendly?: boolean;
  furnished?: boolean;
}

export interface DevelopmentFilters {
  launchStatus?: string[];
  phase?: string[];
  unitConfigurations?: string[];
  developerOffers?: boolean;
}

export interface LandFilters {
  zoning?: string[];
  utilities?: string[];
  sizeMin?: number;
  sizeMax?: number;
  surveyStatus?: string[];
}

export interface CommonFilters {
  priceMin?: number;
  priceMax?: number;
  location?: string;
}

export interface PropertyFilters extends CommonFilters {
  propertyType: PropertyType;
  residential?: ResidentialFilters;
  development?: DevelopmentFilters;
  land?: LandFilters;
}

const STORAGE_KEY = 'explore_property_filters';

const defaultFilters: PropertyFilters = {
  propertyType: 'all',
};

export function usePropertyFilters() {
  const [filters, setFilters] = useState<PropertyFilters>(() => {
    // Load from sessionStorage
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load filters from storage:', error);
    }
    return defaultFilters;
  });

  // Save to sessionStorage whenever filters change
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
      console.error('Failed to save filters to storage:', error);
    }
  }, [filters]);

  // Update property type
  const setPropertyType = useCallback((type: PropertyType) => {
    setFilters(prev => ({
      ...prev,
      propertyType: type,
      // Clear type-specific filters when changing type
      residential: type === 'residential' ? prev.residential : undefined,
      development: type === 'development' ? prev.development : undefined,
      land: type === 'land' ? prev.land : undefined,
    }));
  }, []);

  // Update common filters
  const updateCommonFilters = useCallback((updates: Partial<CommonFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);

  // Update residential filters
  const updateResidentialFilters = useCallback((updates: Partial<ResidentialFilters>) => {
    setFilters(prev => ({
      ...prev,
      residential: {
        ...prev.residential,
        ...updates,
      },
    }));
  }, []);

  // Update development filters
  const updateDevelopmentFilters = useCallback((updates: Partial<DevelopmentFilters>) => {
    setFilters(prev => ({
      ...prev,
      development: {
        ...prev.development,
        ...updates,
      },
    }));
  }, []);

  // Update land filters
  const updateLandFilters = useCallback((updates: Partial<LandFilters>) => {
    setFilters(prev => ({
      ...prev,
      land: {
        ...prev.land,
        ...updates,
      },
    }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  // Clear type-specific filters only
  const clearTypeFilters = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      residential: undefined,
      development: undefined,
      land: undefined,
    }));
  }, []);

  // Get active filter count
  const getFilterCount = useCallback(() => {
    let count = 0;

    // Count common filters
    if (filters.priceMin !== undefined) count++;
    if (filters.priceMax !== undefined) count++;
    if (filters.location) count++;
    if (filters.propertyType !== 'all') count++;

    // Count residential filters
    if (filters.residential) {
      if (filters.residential.beds?.length) count++;
      if (filters.residential.baths?.length) count++;
      if (filters.residential.parking?.length) count++;
      if (filters.residential.securityLevel?.length) count++;
      if (filters.residential.petFriendly !== undefined) count++;
      if (filters.residential.furnished !== undefined) count++;
    }

    // Count development filters
    if (filters.development) {
      if (filters.development.launchStatus?.length) count++;
      if (filters.development.phase?.length) count++;
      if (filters.development.unitConfigurations?.length) count++;
      if (filters.development.developerOffers !== undefined) count++;
    }

    // Count land filters
    if (filters.land) {
      if (filters.land.zoning?.length) count++;
      if (filters.land.utilities?.length) count++;
      if (filters.land.sizeMin !== undefined) count++;
      if (filters.land.sizeMax !== undefined) count++;
      if (filters.land.surveyStatus?.length) count++;
    }

    return count;
  }, [filters]);

  // Check if any filters are active
  const hasActiveFilters = useCallback(() => {
    return getFilterCount() > 0;
  }, [getFilterCount]);

  return {
    filters,
    setPropertyType,
    updateCommonFilters,
    updateResidentialFilters,
    updateDevelopmentFilters,
    updateLandFilters,
    clearFilters,
    clearTypeFilters,
    getFilterCount,
    hasActiveFilters,
  };
}
