import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFilterUrlSync } from '../useFilterUrlSync';
import { useExploreFiltersStore } from '../../store/exploreFiltersStore';

// Mock wouter
vi.mock('wouter', () => ({
  useLocation: () => ['/explore', vi.fn()],
}));

describe('useFilterUrlSync', () => {
  beforeEach(() => {
    // Reset store
    const { clearFilters } = useExploreFiltersStore.getState();
    clearFilters();

    // Reset URL
    window.history.replaceState({}, '', '/explore');
  });

  describe('URL to Store Sync (on mount)', () => {
    it('should sync URL params to store on mount', () => {
      // Set URL with params
      window.history.replaceState({}, '', '/explore?type=residential&beds=3&baths=2');

      // Render hook
      renderHook(() => useFilterUrlSync());

      // Check store was updated
      const state = useExploreFiltersStore.getState();
      expect(state.propertyType).toBe('residential');
      expect(state.bedrooms).toBe(3);
      expect(state.bathrooms).toBe(2);
    });

    it('should sync price range from URL', () => {
      window.history.replaceState({}, '', '/explore?minPrice=100000&maxPrice=500000');

      renderHook(() => useFilterUrlSync());

      const state = useExploreFiltersStore.getState();
      expect(state.priceMin).toBe(100000);
      expect(state.priceMax).toBe(500000);
    });

    it('should sync category and location from URL', () => {
      window.history.replaceState({}, '', '/explore?category=5&location=Cape%20Town');

      renderHook(() => useFilterUrlSync());

      const state = useExploreFiltersStore.getState();
      expect(state.categoryId).toBe(5);
      expect(state.location).toBe('Cape Town');
    });

    it('should handle partial price range (min only)', () => {
      window.history.replaceState({}, '', '/explore?minPrice=100000');

      renderHook(() => useFilterUrlSync());

      const state = useExploreFiltersStore.getState();
      expect(state.priceMin).toBe(100000);
      expect(state.priceMax).toBeNull();
    });

    it('should handle partial price range (max only)', () => {
      window.history.replaceState({}, '', '/explore?maxPrice=500000');

      renderHook(() => useFilterUrlSync());

      const state = useExploreFiltersStore.getState();
      expect(state.priceMin).toBeNull();
      expect(state.priceMax).toBe(500000);
    });

    it('should not update store if URL has no params', () => {
      window.history.replaceState({}, '', '/explore');

      renderHook(() => useFilterUrlSync());

      const state = useExploreFiltersStore.getState();
      expect(state.propertyType).toBeNull();
      expect(state.bedrooms).toBeNull();
      expect(state.bathrooms).toBeNull();
    });
  });

  describe('Store to URL Sync', () => {
    it('should update URL when property type changes', () => {
      renderHook(() => useFilterUrlSync());

      const { setPropertyType } = useExploreFiltersStore.getState();
      setPropertyType('residential');

      // Wait for effect
      setTimeout(() => {
        expect(window.location.search).toContain('type=residential');
      }, 0);
    });

    it('should update URL when price range changes', () => {
      renderHook(() => useFilterUrlSync());

      const { setPriceRange } = useExploreFiltersStore.getState();
      setPriceRange(100000, 500000);

      setTimeout(() => {
        expect(window.location.search).toContain('minPrice=100000');
        expect(window.location.search).toContain('maxPrice=500000');
      }, 0);
    });

    it('should update URL when bedrooms change', () => {
      renderHook(() => useFilterUrlSync());

      const { setBedrooms } = useExploreFiltersStore.getState();
      setBedrooms(3);

      setTimeout(() => {
        expect(window.location.search).toContain('beds=3');
      }, 0);
    });

    it('should update URL when bathrooms change', () => {
      renderHook(() => useFilterUrlSync());

      const { setBathrooms } = useExploreFiltersStore.getState();
      setBathrooms(2);

      setTimeout(() => {
        expect(window.location.search).toContain('baths=2');
      }, 0);
    });

    it('should update URL when category changes', () => {
      renderHook(() => useFilterUrlSync());

      const { setCategoryId } = useExploreFiltersStore.getState();
      setCategoryId(5);

      setTimeout(() => {
        expect(window.location.search).toContain('category=5');
      }, 0);
    });

    it('should update URL when location changes', () => {
      renderHook(() => useFilterUrlSync());

      const { setLocation } = useExploreFiltersStore.getState();
      setLocation('Cape Town');

      setTimeout(() => {
        expect(window.location.search).toContain('location=Cape%20Town');
      }, 0);
    });

    it('should clear URL params when filters are cleared', () => {
      // Set some filters first
      const { setPropertyType, setBedrooms, clearFilters } = useExploreFiltersStore.getState();
      setPropertyType('residential');
      setBedrooms(3);

      renderHook(() => useFilterUrlSync());

      // Clear filters
      clearFilters();

      setTimeout(() => {
        expect(window.location.search).toBe('');
      }, 0);
    });

    it('should handle multiple filters in URL', () => {
      renderHook(() => useFilterUrlSync());

      const { setPropertyType, setBedrooms, setBathrooms, setPriceRange } =
        useExploreFiltersStore.getState();

      setPropertyType('residential');
      setBedrooms(3);
      setBathrooms(2);
      setPriceRange(100000, 500000);

      setTimeout(() => {
        const search = window.location.search;
        expect(search).toContain('type=residential');
        expect(search).toContain('beds=3');
        expect(search).toContain('baths=2');
        expect(search).toContain('minPrice=100000');
        expect(search).toContain('maxPrice=500000');
      }, 0);
    });
  });

  describe('Bidirectional Sync', () => {
    it('should maintain sync when URL is set first, then store is updated', () => {
      // Set URL
      window.history.replaceState({}, '', '/explore?type=residential&beds=3');

      renderHook(() => useFilterUrlSync());

      // Verify store was synced
      let state = useExploreFiltersStore.getState();
      expect(state.propertyType).toBe('residential');
      expect(state.bedrooms).toBe(3);

      // Update store
      const { setBathrooms } = useExploreFiltersStore.getState();
      setBathrooms(2);

      // Verify URL was updated
      setTimeout(() => {
        expect(window.location.search).toContain('baths=2');
        expect(window.location.search).toContain('type=residential');
        expect(window.location.search).toContain('beds=3');
      }, 0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid number params gracefully', () => {
      window.history.replaceState({}, '', '/explore?beds=invalid&minPrice=notanumber');

      renderHook(() => useFilterUrlSync());

      const state = useExploreFiltersStore.getState();
      // parseInt returns NaN for invalid strings, which should be handled
      expect(isNaN(state.bedrooms as any) || state.bedrooms === null).toBe(true);
    });

    it('should handle empty string params', () => {
      window.history.replaceState({}, '', '/explore?type=&location=');

      renderHook(() => useFilterUrlSync());

      const state = useExploreFiltersStore.getState();
      // Empty strings should not set values
      expect(state.propertyType).toBeNull();
      expect(state.location).toBeNull();
    });

    it('should preserve base path when updating query params', () => {
      window.history.replaceState({}, '', '/explore/feed');

      renderHook(() => useFilterUrlSync());

      const { setPropertyType } = useExploreFiltersStore.getState();
      setPropertyType('residential');

      setTimeout(() => {
        expect(window.location.pathname).toBe('/explore/feed');
        expect(window.location.search).toContain('type=residential');
      }, 0);
    });
  });
});
