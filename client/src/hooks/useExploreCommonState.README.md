# useExploreCommonState Hook

## Overview

The `useExploreCommonState` hook provides centralized state management for all Explore pages. It consolidates common logic that was previously duplicated across `ExploreHome`, `ExploreFeed`, `ExploreShorts`, and `ExploreMap` pages.

## Purpose

This hook extracts and manages:
- **View mode state**: Switching between home, cards, videos, map, and shorts views
- **Feed type state**: Filtering by recommended, area, or category
- **Category selection**: Managing lifestyle category filters
- **Filter visibility**: Showing/hiding the filter panel
- **Property filters**: Integration with the property filter system

## API Reference

### Parameters

```typescript
interface UseExploreCommonStateOptions {
  initialViewMode?: ExploreViewMode;      // Default: 'home'
  initialFeedType?: ExploreFeedType;      // Default: 'recommended'
  initialShowFilters?: boolean;           // Default: false
}
```

### Return Value

```typescript
interface UseExploreCommonStateReturn {
  // View mode state
  viewMode: ExploreViewMode;
  setViewMode: (mode: ExploreViewMode) => void;
  
  // Feed type state
  feedType: ExploreFeedType;
  setFeedType: (type: ExploreFeedType) => void;
  
  // Category selection
  selectedCategoryId: number | null;
  setSelectedCategoryId: (id: number | null) => void;
  
  // Filter visibility
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  toggleFilters: () => void;
  
  // Property filters
  filters: PropertyFilters;
  filterActions: {
    setPropertyType: (type: string | null) => void;
    updateCommonFilters: (updates: Partial<CommonFilters>) => void;
    updateResidentialFilters: (updates: Partial<ResidentialFilters>) => void;
    updateDevelopmentFilters: (updates: Partial<DevelopmentFilters>) => void;
    updateLandFilters: (updates: Partial<LandFilters>) => void;
    clearFilters: () => void;
    getFilterCount: () => number;
  };
}
```

## Usage Examples

### Basic Usage

```tsx
import { useExploreCommonState } from '@/hooks/useExploreCommonState';

function ExploreHome() {
  const {
    viewMode,
    setViewMode,
    selectedCategoryId,
    setSelectedCategoryId,
    showFilters,
    setShowFilters,
    filters,
    filterActions,
  } = useExploreCommonState();

  return (
    <div>
      {/* View mode toggle */}
      <button onClick={() => setViewMode('cards')}>
        Cards View
      </button>
      
      {/* Category selector */}
      <LifestyleCategorySelector
        selectedCategoryId={selectedCategoryId}
        onCategoryChange={setSelectedCategoryId}
      />
      
      {/* Filter panel */}
      <FilterPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        {...filterActions}
      />
    </div>
  );
}
```

### With Custom Initial State

```tsx
function ExploreMap() {
  const {
    selectedCategoryId,
    setSelectedCategoryId,
    showFilters,
    toggleFilters,
    filters,
    filterActions,
  } = useExploreCommonState({
    initialViewMode: 'map',
    initialShowFilters: false,
  });

  return (
    <div>
      <MapHybridView
        categoryId={selectedCategoryId}
        filters={filters}
      />
      
      <button onClick={toggleFilters}>
        Toggle Filters ({filterActions.getFilterCount()})
      </button>
    </div>
  );
}
```

### Feed Type Management

```tsx
function ExploreFeed() {
  const {
    feedType,
    setFeedType,
    selectedCategoryId,
    filters,
  } = useExploreCommonState({
    initialViewMode: 'videos',
    initialFeedType: 'recommended',
  });

  return (
    <div>
      {/* Feed type tabs */}
      <Tabs value={feedType} onValueChange={setFeedType}>
        <TabsTrigger value="recommended">For You</TabsTrigger>
        <TabsTrigger value="area">By Area</TabsTrigger>
        <TabsTrigger value="category">By Type</TabsTrigger>
      </Tabs>
      
      {/* Video feed */}
      <ExploreVideoFeed
        feedType={feedType}
        categoryId={selectedCategoryId}
        filters={filters}
      />
    </div>
  );
}
```

### Filter Management

```tsx
function ExploreWithFilters() {
  const {
    showFilters,
    setShowFilters,
    filters,
    filterActions,
  } = useExploreCommonState();

  const handleApplyFilters = () => {
    // Filters are automatically applied through the hook
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    filterActions.clearFilters();
  };

  return (
    <div>
      {/* Filter button with count badge */}
      <button onClick={() => setShowFilters(true)}>
        Filters
        {filterActions.getFilterCount() > 0 && (
          <span className="badge">
            {filterActions.getFilterCount()}
          </span>
        )}
      </button>
      
      {/* Filter panel */}
      <FilterPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        propertyType={filters.propertyType}
        onPropertyTypeChange={filterActions.setPropertyType}
        priceMin={filters.priceMin}
        priceMax={filters.priceMax}
        onPriceChange={(min, max) => 
          filterActions.updateCommonFilters({ priceMin: min, priceMax: max })
        }
        residentialFilters={filters.residential}
        onResidentialFiltersChange={filterActions.updateResidentialFilters}
        developmentFilters={filters.development}
        onDevelopmentFiltersChange={filterActions.updateDevelopmentFilters}
        landFilters={filters.land}
        onLandFiltersChange={filterActions.updateLandFilters}
        filterCount={filterActions.getFilterCount()}
        onClearAll={handleClearFilters}
      />
    </div>
  );
}
```

## Integration with Existing Hooks

This hook integrates with:

1. **`useCategoryFilter`**: Manages lifestyle category selection
2. **`usePropertyFilters`**: Manages property type and filter state

All state is synchronized and persisted according to the underlying hooks' behavior.

## Benefits

### Code Consolidation
- Reduces duplication across 4 Explore pages
- Centralizes common state management logic
- Makes it easier to add new Explore pages

### Consistency
- Ensures all pages use the same state structure
- Maintains consistent behavior across views
- Simplifies testing and debugging

### Maintainability
- Single source of truth for common state
- Easier to update shared logic
- Better TypeScript type safety

## Migration Guide

### Before (ExploreHome.tsx)

```tsx
function ExploreHome() {
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const { selectedCategoryId, setSelectedCategoryId } = useCategoryFilter();
  const [showFilters, setShowFilters] = useState(false);
  const {
    filters,
    setPropertyType,
    updateCommonFilters,
    // ... more filter actions
  } = usePropertyFilters();
  
  // Component logic...
}
```

### After (ExploreHome.tsx)

```tsx
function ExploreHome() {
  const {
    viewMode,
    setViewMode,
    selectedCategoryId,
    setSelectedCategoryId,
    showFilters,
    setShowFilters,
    filters,
    filterActions,
  } = useExploreCommonState({ initialViewMode: 'home' });
  
  // Component logic...
}
```

## Type Definitions

```typescript
// View modes
type ExploreViewMode = 'home' | 'cards' | 'videos' | 'map' | 'shorts';

// Feed types
type ExploreFeedType = 'recommended' | 'area' | 'category';
```

## Requirements Validation

This hook satisfies:
- **Requirement 8.4**: Extract shared logic into reusable hooks
- **Requirement 8.5**: Use useExploreCommonState hook for shared functionality

## Related Hooks

- `useCategoryFilter`: Category selection state
- `usePropertyFilters`: Property filter state
- `useFilterUrlSync`: URL synchronization for filters
- `useExploreFiltersStore`: Zustand store for filter persistence

## Testing

See `client/src/hooks/__tests__/useExploreCommonState.test.ts` for comprehensive test coverage.

## Performance Considerations

- All state updates are optimized with React's built-in state management
- Filter actions are memoized to prevent unnecessary re-renders
- Category and filter state is persisted across page navigation
