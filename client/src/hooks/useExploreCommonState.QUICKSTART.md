# useExploreCommonState - Quick Start Guide

## TL;DR

Replace this pattern:
```tsx
// OLD - Duplicated across 4 pages
const [viewMode, setViewMode] = useState('home');
const { selectedCategoryId, setSelectedCategoryId } = useCategoryFilter();
const [showFilters, setShowFilters] = useState(false);
const { filters, setPropertyType, updateCommonFilters, ... } = usePropertyFilters();
```

With this:
```tsx
// NEW - Single hook
const {
  viewMode, setViewMode,
  selectedCategoryId, setSelectedCategoryId,
  showFilters, setShowFilters,
  filters, filterActions
} = useExploreCommonState({ initialViewMode: 'home' });
```

## 30-Second Integration

### 1. Import the hook
```tsx
import { useExploreCommonState } from '@/hooks/useExploreCommonState';
```

### 2. Replace existing state
```tsx
function ExploreHome() {
  // Replace all this:
  // const [viewMode, setViewMode] = useState('home');
  // const { selectedCategoryId, setSelectedCategoryId } = useCategoryFilter();
  // const [showFilters, setShowFilters] = useState(false);
  // const { filters, ... } = usePropertyFilters();
  
  // With this:
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
  
  // Rest of your component stays the same!
}
```

### 3. Update filter actions
```tsx
// OLD
<FilterPanel
  onPropertyTypeChange={setPropertyType}
  onPriceChange={(min, max) => updateCommonFilters({ priceMin: min, priceMax: max })}
  onResidentialFiltersChange={updateResidentialFilters}
  onClearAll={clearFilters}
/>

// NEW
<FilterPanel
  onPropertyTypeChange={filterActions.setPropertyType}
  onPriceChange={(min, max) => 
    filterActions.updateCommonFilters({ priceMin: min, priceMax: max })
  }
  onResidentialFiltersChange={filterActions.updateResidentialFilters}
  onClearAll={filterActions.clearFilters}
/>
```

## What You Get

### State
- `viewMode`: 'home' | 'cards' | 'videos' | 'map' | 'shorts'
- `feedType`: 'recommended' | 'area' | 'category'
- `selectedCategoryId`: number | null
- `showFilters`: boolean
- `filters`: Complete filter state object

### Actions
- `setViewMode(mode)`: Change view
- `setFeedType(type)`: Change feed type
- `setSelectedCategoryId(id)`: Change category
- `setShowFilters(show)`: Show/hide filters
- `toggleFilters()`: Toggle filter visibility
- `filterActions.*`: All 7 filter actions

## Common Patterns

### View Mode Toggle
```tsx
<button onClick={() => setViewMode('cards')}>
  Cards View
</button>
```

### Filter Button with Badge
```tsx
<button onClick={() => setShowFilters(true)}>
  Filters
  {filterActions.getFilterCount() > 0 && (
    <span>{filterActions.getFilterCount()}</span>
  )}
</button>
```

### Category Selector
```tsx
<LifestyleCategorySelector
  selectedCategoryId={selectedCategoryId}
  onCategoryChange={setSelectedCategoryId}
/>
```

### Feed Type Tabs
```tsx
<Tabs value={feedType} onValueChange={setFeedType}>
  <TabsTrigger value="recommended">For You</TabsTrigger>
  <TabsTrigger value="area">By Area</TabsTrigger>
  <TabsTrigger value="category">By Type</TabsTrigger>
</Tabs>
```

## Page-Specific Examples

### ExploreHome
```tsx
const state = useExploreCommonState({ initialViewMode: 'home' });
```

### ExploreFeed
```tsx
const state = useExploreCommonState({
  initialViewMode: 'videos',
  initialFeedType: 'recommended',
});
```

### ExploreMap
```tsx
const state = useExploreCommonState({ initialViewMode: 'map' });
```

### ExploreShorts
```tsx
const state = useExploreCommonState({ initialViewMode: 'shorts' });
```

## Need More?

- Full API docs: `useExploreCommonState.README.md`
- Complete examples: `useExploreCommonState.example.tsx`
- Tests: `__tests__/useExploreCommonState.test.ts`
