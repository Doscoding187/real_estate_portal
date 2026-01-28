import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useExploreCommonState } from '../useExploreCommonState';

// Mock the dependent hooks
vi.mock('../useCategoryFilter', () => ({
  useCategoryFilter: () => ({
    selectedCategoryId: null,
    setSelectedCategoryId: vi.fn(),
  }),
}));

vi.mock('../usePropertyFilters', () => ({
  usePropertyFilters: () => ({
    filters: {
      propertyType: null,
      priceMin: null,
      priceMax: null,
      residential: {},
      development: {},
      land: {},
    },
    setPropertyType: vi.fn(),
    updateCommonFilters: vi.fn(),
    updateResidentialFilters: vi.fn(),
    updateDevelopmentFilters: vi.fn(),
    updateLandFilters: vi.fn(),
    clearFilters: vi.fn(),
    getFilterCount: vi.fn(() => 0),
  }),
}));

describe('useExploreCommonState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useExploreCommonState());

      expect(result.current.viewMode).toBe('home');
      expect(result.current.feedType).toBe('recommended');
      expect(result.current.showFilters).toBe(false);
    });

    it('should initialize with custom values', () => {
      const { result } = renderHook(() =>
        useExploreCommonState({
          initialViewMode: 'cards',
          initialFeedType: 'area',
          initialShowFilters: true,
        }),
      );

      expect(result.current.viewMode).toBe('cards');
      expect(result.current.feedType).toBe('area');
      expect(result.current.showFilters).toBe(true);
    });
  });

  describe('view mode management', () => {
    it('should update view mode', () => {
      const { result } = renderHook(() => useExploreCommonState());

      act(() => {
        result.current.setViewMode('videos');
      });

      expect(result.current.viewMode).toBe('videos');
    });

    it('should support all view modes', () => {
      const { result } = renderHook(() => useExploreCommonState());

      const viewModes: Array<'home' | 'cards' | 'videos' | 'map' | 'shorts'> = [
        'home',
        'cards',
        'videos',
        'map',
        'shorts',
      ];

      viewModes.forEach(mode => {
        act(() => {
          result.current.setViewMode(mode);
        });
        expect(result.current.viewMode).toBe(mode);
      });
    });
  });

  describe('feed type management', () => {
    it('should update feed type', () => {
      const { result } = renderHook(() => useExploreCommonState());

      act(() => {
        result.current.setFeedType('category');
      });

      expect(result.current.feedType).toBe('category');
    });

    it('should support all feed types', () => {
      const { result } = renderHook(() => useExploreCommonState());

      const feedTypes: Array<'recommended' | 'area' | 'category'> = [
        'recommended',
        'area',
        'category',
      ];

      feedTypes.forEach(type => {
        act(() => {
          result.current.setFeedType(type);
        });
        expect(result.current.feedType).toBe(type);
      });
    });
  });

  describe('filter visibility management', () => {
    it('should toggle filter visibility', () => {
      const { result } = renderHook(() => useExploreCommonState());

      expect(result.current.showFilters).toBe(false);

      act(() => {
        result.current.setShowFilters(true);
      });

      expect(result.current.showFilters).toBe(true);

      act(() => {
        result.current.setShowFilters(false);
      });

      expect(result.current.showFilters).toBe(false);
    });

    it('should toggle filters with toggleFilters function', () => {
      const { result } = renderHook(() => useExploreCommonState());

      expect(result.current.showFilters).toBe(false);

      act(() => {
        result.current.toggleFilters();
      });

      expect(result.current.showFilters).toBe(true);

      act(() => {
        result.current.toggleFilters();
      });

      expect(result.current.showFilters).toBe(false);
    });
  });

  describe('filter actions', () => {
    it('should expose all filter actions', () => {
      const { result } = renderHook(() => useExploreCommonState());

      expect(result.current.filterActions).toHaveProperty('setPropertyType');
      expect(result.current.filterActions).toHaveProperty('updateCommonFilters');
      expect(result.current.filterActions).toHaveProperty('updateResidentialFilters');
      expect(result.current.filterActions).toHaveProperty('updateDevelopmentFilters');
      expect(result.current.filterActions).toHaveProperty('updateLandFilters');
      expect(result.current.filterActions).toHaveProperty('clearFilters');
      expect(result.current.filterActions).toHaveProperty('getFilterCount');
    });

    it('should expose filter state', () => {
      const { result } = renderHook(() => useExploreCommonState());

      expect(result.current.filters).toBeDefined();
      expect(result.current.filters).toHaveProperty('propertyType');
      expect(result.current.filters).toHaveProperty('priceMin');
      expect(result.current.filters).toHaveProperty('priceMax');
      expect(result.current.filters).toHaveProperty('residential');
      expect(result.current.filters).toHaveProperty('development');
      expect(result.current.filters).toHaveProperty('land');
    });
  });

  describe('category selection', () => {
    it('should expose category selection state', () => {
      const { result } = renderHook(() => useExploreCommonState());

      expect(result.current.selectedCategoryId).toBeDefined();
      expect(result.current.setSelectedCategoryId).toBeDefined();
    });
  });

  describe('state independence', () => {
    it('should maintain independent state across multiple instances', () => {
      const { result: result1 } = renderHook(() => useExploreCommonState());
      const { result: result2 } = renderHook(() => useExploreCommonState());

      act(() => {
        result1.current.setViewMode('cards');
      });

      act(() => {
        result2.current.setViewMode('videos');
      });

      expect(result1.current.viewMode).toBe('cards');
      expect(result2.current.viewMode).toBe('videos');
    });

    it('should maintain independent filter visibility', () => {
      const { result: result1 } = renderHook(() => useExploreCommonState());
      const { result: result2 } = renderHook(() => useExploreCommonState());

      act(() => {
        result1.current.setShowFilters(true);
      });

      expect(result1.current.showFilters).toBe(true);
      expect(result2.current.showFilters).toBe(false);
    });
  });

  describe('return value stability', () => {
    it('should maintain stable references for functions', () => {
      const { result, rerender } = renderHook(() => useExploreCommonState());

      const initialToggleFilters = result.current.toggleFilters;

      rerender();

      expect(result.current.toggleFilters).toBe(initialToggleFilters);
    });
  });

  describe('integration scenarios', () => {
    it('should handle typical ExploreHome workflow', () => {
      const { result } = renderHook(() => useExploreCommonState({ initialViewMode: 'home' }));

      // Start on home view
      expect(result.current.viewMode).toBe('home');
      expect(result.current.showFilters).toBe(false);

      // Switch to cards view
      act(() => {
        result.current.setViewMode('cards');
      });
      expect(result.current.viewMode).toBe('cards');

      // Open filters
      act(() => {
        result.current.setShowFilters(true);
      });
      expect(result.current.showFilters).toBe(true);

      // Close filters
      act(() => {
        result.current.setShowFilters(false);
      });
      expect(result.current.showFilters).toBe(false);
    });

    it('should handle typical ExploreFeed workflow', () => {
      const { result } = renderHook(() =>
        useExploreCommonState({
          initialViewMode: 'videos',
          initialFeedType: 'recommended',
        }),
      );

      // Start with recommended feed
      expect(result.current.feedType).toBe('recommended');

      // Switch to area feed
      act(() => {
        result.current.setFeedType('area');
      });
      expect(result.current.feedType).toBe('area');

      // Switch to category feed
      act(() => {
        result.current.setFeedType('category');
      });
      expect(result.current.feedType).toBe('category');
    });

    it('should handle typical ExploreMap workflow', () => {
      const { result } = renderHook(() => useExploreCommonState({ initialViewMode: 'map' }));

      // Start on map view
      expect(result.current.viewMode).toBe('map');

      // Toggle filters multiple times
      act(() => {
        result.current.toggleFilters();
      });
      expect(result.current.showFilters).toBe(true);

      act(() => {
        result.current.toggleFilters();
      });
      expect(result.current.showFilters).toBe(false);
    });
  });
});
