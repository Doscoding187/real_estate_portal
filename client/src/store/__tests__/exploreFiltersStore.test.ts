import { describe, it, expect, beforeEach } from 'vitest';
import { useExploreFiltersStore } from '../exploreFiltersStore';

describe('exploreFiltersStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const { clearFilters } = useExploreFiltersStore.getState();
    clearFilters();
  });

  it('should initialize with null values', () => {
    const state = useExploreFiltersStore.getState();
    
    expect(state.propertyType).toBeNull();
    expect(state.priceMin).toBeNull();
    expect(state.priceMax).toBeNull();
    expect(state.bedrooms).toBeNull();
    expect(state.bathrooms).toBeNull();
    expect(state.categoryId).toBeNull();
    expect(state.location).toBeNull();
  });

  it('should set property type', () => {
    const { setPropertyType } = useExploreFiltersStore.getState();
    
    setPropertyType('residential');
    
    const state = useExploreFiltersStore.getState();
    expect(state.propertyType).toBe('residential');
  });

  it('should set price range', () => {
    const { setPriceRange } = useExploreFiltersStore.getState();
    
    setPriceRange(100000, 500000);
    
    const state = useExploreFiltersStore.getState();
    expect(state.priceMin).toBe(100000);
    expect(state.priceMax).toBe(500000);
  });

  it('should set bedrooms', () => {
    const { setBedrooms } = useExploreFiltersStore.getState();
    
    setBedrooms(3);
    
    const state = useExploreFiltersStore.getState();
    expect(state.bedrooms).toBe(3);
  });

  it('should set bathrooms', () => {
    const { setBathrooms } = useExploreFiltersStore.getState();
    
    setBathrooms(2);
    
    const state = useExploreFiltersStore.getState();
    expect(state.bathrooms).toBe(2);
  });

  it('should set category ID', () => {
    const { setCategoryId } = useExploreFiltersStore.getState();
    
    setCategoryId(5);
    
    const state = useExploreFiltersStore.getState();
    expect(state.categoryId).toBe(5);
  });

  it('should set location', () => {
    const { setLocation } = useExploreFiltersStore.getState();
    
    setLocation('Cape Town');
    
    const state = useExploreFiltersStore.getState();
    expect(state.location).toBe('Cape Town');
  });

  it('should clear all filters', () => {
    const { 
      setPropertyType, 
      setPriceRange, 
      setBedrooms, 
      setBathrooms, 
      setCategoryId, 
      setLocation,
      clearFilters 
    } = useExploreFiltersStore.getState();
    
    // Set multiple filters
    setPropertyType('residential');
    setPriceRange(100000, 500000);
    setBedrooms(3);
    setBathrooms(2);
    setCategoryId(5);
    setLocation('Cape Town');
    
    // Clear all filters
    clearFilters();
    
    const state = useExploreFiltersStore.getState();
    expect(state.propertyType).toBeNull();
    expect(state.priceMin).toBeNull();
    expect(state.priceMax).toBeNull();
    expect(state.bedrooms).toBeNull();
    expect(state.bathrooms).toBeNull();
    expect(state.categoryId).toBeNull();
    expect(state.location).toBeNull();
  });

  it('should calculate filter count correctly with no filters', () => {
    const { getFilterCount } = useExploreFiltersStore.getState();
    
    expect(getFilterCount()).toBe(0);
  });

  it('should calculate filter count correctly with one filter', () => {
    const { setPropertyType, getFilterCount } = useExploreFiltersStore.getState();
    
    setPropertyType('residential');
    
    expect(getFilterCount()).toBe(1);
  });

  it('should calculate filter count correctly with multiple filters', () => {
    const { 
      setPropertyType, 
      setPriceRange, 
      setBedrooms, 
      setCategoryId,
      getFilterCount 
    } = useExploreFiltersStore.getState();
    
    setPropertyType('residential');
    setPriceRange(100000, 500000);
    setBedrooms(3);
    setCategoryId(5);
    
    // Should count: propertyType, priceMin, priceMax, bedrooms, categoryId = 5
    expect(getFilterCount()).toBe(5);
  });

  it('should calculate filter count correctly after clearing', () => {
    const { 
      setPropertyType, 
      setBedrooms, 
      clearFilters,
      getFilterCount 
    } = useExploreFiltersStore.getState();
    
    setPropertyType('residential');
    setBedrooms(3);
    expect(getFilterCount()).toBe(2);
    
    clearFilters();
    expect(getFilterCount()).toBe(0);
  });

  it('should allow setting filters to null', () => {
    const { setPropertyType, setBedrooms } = useExploreFiltersStore.getState();
    
    setPropertyType('residential');
    setBedrooms(3);
    
    let state = useExploreFiltersStore.getState();
    expect(state.propertyType).toBe('residential');
    expect(state.bedrooms).toBe(3);
    
    // Set back to null
    setPropertyType(null);
    setBedrooms(null);
    
    state = useExploreFiltersStore.getState();
    expect(state.propertyType).toBeNull();
    expect(state.bedrooms).toBeNull();
  });

  it('should handle price range with only min value', () => {
    const { setPriceRange, getFilterCount } = useExploreFiltersStore.getState();
    
    setPriceRange(100000, null);
    
    const state = useExploreFiltersStore.getState();
    expect(state.priceMin).toBe(100000);
    expect(state.priceMax).toBeNull();
    expect(getFilterCount()).toBe(1);
  });

  it('should handle price range with only max value', () => {
    const { setPriceRange, getFilterCount } = useExploreFiltersStore.getState();
    
    setPriceRange(null, 500000);
    
    const state = useExploreFiltersStore.getState();
    expect(state.priceMin).toBeNull();
    expect(state.priceMax).toBe(500000);
    expect(getFilterCount()).toBe(1);
  });
});
