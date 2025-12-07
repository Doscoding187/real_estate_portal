import { useState, useCallback } from 'react';
import { useCategoryFilter } from './useCategoryFilter';
import { usePropertyFilters } from './usePropertyFilters';

/**
 * View modes available across Explore pages
 */
export type ExploreViewMode = 'home' | 'cards' | 'videos' | 'map' | 'shorts';

/**
 * Feed types for filtering content
 */
export type ExploreFeedType = 'recommended' | 'area' | 'category';

/**
 * Common state and logic shared across all Explore pages
 * 
 * This hook extracts and centralizes:
 * - View mode state management
 * - Category selection state
 * - Filter visibility state
 * - Property filter integration
 * - Common callbacks and handlers
 * 
 * @example
 * ```tsx
 * function ExploreHome() {
 *   const {
 *     viewMode,
 *     setViewMode,
 *     selectedCategoryId,
 *     setSelectedCategoryId,
 *     showFilters,
 *     setShowFilters,
 *     filters,
 *     filterActions,
 *   } = useExploreCommonState({ initialViewMode: 'home' });
 * 
 *   return (
 *     <div>
 *       <button onClick={() => setViewMode('cards')}>Cards View</button>
 *       <FilterPanel isOpen={showFilters} {...filterActions} />
 *     </div>
 *   );
 * }
 * ```
 */

interface UseExploreCommonStateOptions {
  /**
   * Initial view mode when the component mounts
   * @default 'home'
   */
  initialViewMode?: ExploreViewMode;
  
  /**
   * Initial feed type for filtering
   * @default 'recommended'
   */
  initialFeedType?: ExploreFeedType;
  
  /**
   * Whether to show filters panel initially
   * @default false
   */
  initialShowFilters?: boolean;
}

interface UseExploreCommonStateReturn {
  // View mode state
  viewMode: ExploreViewMode;
  setViewMode: (mode: ExploreViewMode) => void;
  
  // Feed type state
  feedType: ExploreFeedType;
  setFeedType: (type: ExploreFeedType) => void;
  
  // Category selection state
  selectedCategoryId: number | null;
  setSelectedCategoryId: (id: number | null) => void;
  
  // Filter visibility state
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  toggleFilters: () => void;
  
  // Property filters
  filters: ReturnType<typeof usePropertyFilters>['filters'];
  filterActions: {
    setPropertyType: ReturnType<typeof usePropertyFilters>['setPropertyType'];
    updateCommonFilters: ReturnType<typeof usePropertyFilters>['updateCommonFilters'];
    updateResidentialFilters: ReturnType<typeof usePropertyFilters>['updateResidentialFilters'];
    updateDevelopmentFilters: ReturnType<typeof usePropertyFilters>['updateDevelopmentFilters'];
    updateLandFilters: ReturnType<typeof usePropertyFilters>['updateLandFilters'];
    clearFilters: ReturnType<typeof usePropertyFilters>['clearFilters'];
    getFilterCount: ReturnType<typeof usePropertyFilters>['getFilterCount'];
  };
}

/**
 * Hook that provides common state management for all Explore pages
 * 
 * Consolidates:
 * - View mode switching (home, cards, videos, map, shorts)
 * - Feed type filtering (recommended, area, category)
 * - Category selection
 * - Filter panel visibility
 * - Property filter state and actions
 * 
 * This reduces code duplication across ExploreHome, ExploreFeed, 
 * ExploreShorts, and ExploreMap pages.
 */
export function useExploreCommonState(
  options: UseExploreCommonStateOptions = {}
): UseExploreCommonStateReturn {
  const {
    initialViewMode = 'home',
    initialFeedType = 'recommended',
    initialShowFilters = false,
  } = options;

  // View mode state
  const [viewMode, setViewMode] = useState<ExploreViewMode>(initialViewMode);
  
  // Feed type state
  const [feedType, setFeedType] = useState<ExploreFeedType>(initialFeedType);
  
  // Filter visibility state
  const [showFilters, setShowFilters] = useState(initialShowFilters);
  
  // Category selection (from existing hook)
  const { selectedCategoryId, setSelectedCategoryId } = useCategoryFilter();
  
  // Property filters (from existing hook)
  const {
    filters,
    setPropertyType,
    updateCommonFilters,
    updateResidentialFilters,
    updateDevelopmentFilters,
    updateLandFilters,
    clearFilters,
    getFilterCount,
  } = usePropertyFilters();

  // Toggle filter panel visibility
  const toggleFilters = useCallback(() => {
    setShowFilters(prev => !prev);
  }, []);

  return {
    // View mode
    viewMode,
    setViewMode,
    
    // Feed type
    feedType,
    setFeedType,
    
    // Category selection
    selectedCategoryId,
    setSelectedCategoryId,
    
    // Filter visibility
    showFilters,
    setShowFilters,
    toggleFilters,
    
    // Property filters
    filters,
    filterActions: {
      setPropertyType,
      updateCommonFilters,
      updateResidentialFilters,
      updateDevelopmentFilters,
      updateLandFilters,
      clearFilters,
      getFilterCount,
    },
  };
}
