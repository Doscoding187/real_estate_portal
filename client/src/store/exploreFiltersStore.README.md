# Explore Filters Store

A Zustand store for managing filter state across all Explore pages with localStorage persistence.

## Overview

The `exploreFiltersStore` provides centralized state management for property filters used throughout the Explore feature. It persists filter selections to localStorage, ensuring filters remain active across page navigation and browser sessions.

## Features

- ✅ Centralized filter state management
- ✅ localStorage persistence (survives page refreshes)
- ✅ Type-safe with TypeScript
- ✅ Shared across all Explore pages (Home, Feed, Shorts, Map)
- ✅ Filter count calculation for UI badges
- ✅ Clear all filters functionality

## Installation

The store is already set up. Just import and use:

```typescript
import { useExploreFiltersStore } from '@/store/exploreFiltersStore';
```

## Filter State

The store manages the following filter properties:

| Property | Type | Description |
|----------|------|-------------|
| `propertyType` | `string \| null` | Property type (e.g., 'residential', 'development', 'land') |
| `priceMin` | `number \| null` | Minimum price filter |
| `priceMax` | `number \| null` | Maximum price filter |
| `bedrooms` | `number \| null` | Number of bedrooms |
| `bathrooms` | `number \| null` | Number of bathrooms |
| `categoryId` | `number \| null` | Lifestyle category ID |
| `location` | `string \| null` | Location filter |

## Actions

### setPropertyType(type)
Set the property type filter.

```typescript
const { setPropertyType } = useExploreFiltersStore();
setPropertyType('residential');
setPropertyType(null); // Clear filter
```

### setPriceRange(min, max)
Set the price range filter.

```typescript
const { setPriceRange } = useExploreFiltersStore();
setPriceRange(100000, 500000);
setPriceRange(100000, null); // Min only
setPriceRange(null, 500000); // Max only
setPriceRange(null, null); // Clear both
```

### setBedrooms(count)
Set the bedroom count filter.

```typescript
const { setBedrooms } = useExploreFiltersStore();
setBedrooms(3);
setBedrooms(null); // Clear filter
```

### setBathrooms(count)
Set the bathroom count filter.

```typescript
const { setBathrooms } = useExploreFiltersStore();
setBathrooms(2);
setBathrooms(null); // Clear filter
```

### setCategoryId(id)
Set the lifestyle category filter.

```typescript
const { setCategoryId } = useExploreFiltersStore();
setCategoryId(5);
setCategoryId(null); // Clear filter
```

### setLocation(location)
Set the location filter.

```typescript
const { setLocation } = useExploreFiltersStore();
setLocation('Cape Town');
setLocation(null); // Clear filter
```

### clearFilters()
Reset all filters to null.

```typescript
const { clearFilters } = useExploreFiltersStore();
clearFilters();
```

### getFilterCount()
Calculate the number of active filters.

```typescript
const { getFilterCount } = useExploreFiltersStore();
const count = getFilterCount(); // Returns number of non-null filters
```

## Usage Examples

### Basic Filter Panel

```typescript
import { useExploreFiltersStore } from '@/store/exploreFiltersStore';

function FilterPanel() {
  const {
    propertyType,
    priceMin,
    priceMax,
    bedrooms,
    bathrooms,
    setPropertyType,
    setPriceRange,
    setBedrooms,
    setBathrooms,
    clearFilters,
    getFilterCount,
  } = useExploreFiltersStore();

  const filterCount = getFilterCount();

  return (
    <div className="filter-panel">
      <div className="filter-header">
        <h3>Filters</h3>
        {filterCount > 0 && (
          <span className="badge">{filterCount}</span>
        )}
      </div>

      <div className="filter-group">
        <label>Property Type</label>
        <select 
          value={propertyType || ''} 
          onChange={(e) => setPropertyType(e.target.value || null)}
        >
          <option value="">All Types</option>
          <option value="residential">Residential</option>
          <option value="development">Development</option>
          <option value="land">Land</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Price Range</label>
        <input
          type="number"
          value={priceMin || ''}
          onChange={(e) => setPriceRange(
            e.target.value ? parseInt(e.target.value) : null,
            priceMax
          )}
          placeholder="Min Price"
        />
        <input
          type="number"
          value={priceMax || ''}
          onChange={(e) => setPriceRange(
            priceMin,
            e.target.value ? parseInt(e.target.value) : null
          )}
          placeholder="Max Price"
        />
      </div>

      <div className="filter-group">
        <label>Bedrooms</label>
        <input
          type="number"
          value={bedrooms || ''}
          onChange={(e) => setBedrooms(
            e.target.value ? parseInt(e.target.value) : null
          )}
          placeholder="Any"
        />
      </div>

      <div className="filter-actions">
        <button onClick={clearFilters}>Clear All</button>
      </div>
    </div>
  );
}
```

### Reading Filters for API Calls

```typescript
import { useExploreFiltersStore } from '@/store/exploreFiltersStore';
import { useQuery } from '@tanstack/react-query';

function PropertyFeed() {
  const filters = useExploreFiltersStore();

  const { data: properties } = useQuery({
    queryKey: ['properties', filters],
    queryFn: () => fetchProperties({
      propertyType: filters.propertyType,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      bedrooms: filters.bedrooms,
      bathrooms: filters.bathrooms,
      categoryId: filters.categoryId,
      location: filters.location,
    }),
  });

  return (
    <div>
      {properties?.map(property => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}
```

### Filter Badge Component

```typescript
import { useExploreFiltersStore } from '@/store/exploreFiltersStore';

function FilterBadge() {
  const getFilterCount = useExploreFiltersStore(state => state.getFilterCount);
  const count = getFilterCount();

  if (count === 0) return null;

  return (
    <span className="filter-badge">
      {count} {count === 1 ? 'filter' : 'filters'} active
    </span>
  );
}
```

### Selective Subscription (Performance Optimization)

Only subscribe to specific state slices to minimize re-renders:

```typescript
// Only re-render when propertyType changes
const propertyType = useExploreFiltersStore(state => state.propertyType);

// Only re-render when price range changes
const { priceMin, priceMax } = useExploreFiltersStore(
  state => ({ priceMin: state.priceMin, priceMax: state.priceMax })
);

// Only re-render when filter count changes
const filterCount = useExploreFiltersStore(state => state.getFilterCount());
```

## Persistence

The store automatically persists to localStorage with the key `'explore-filters'`. This means:

- Filters survive page refreshes
- Filters survive browser restarts
- Filters are shared across all Explore pages
- No manual save/load required

To clear persisted data:

```typescript
localStorage.removeItem('explore-filters');
// Or use the clearFilters action
```

## Integration with URL Sync

The store is designed to work with the URL sync hook (Task 12):

```typescript
// URL sync hook will read from store and update URL
import { useFilterUrlSync } from '@/hooks/useFilterUrlSync';

function ExplorePage() {
  useFilterUrlSync(); // Syncs store <-> URL
  
  // Rest of component...
}
```

## Best Practices

1. **Use selective subscriptions** for better performance
2. **Clear filters** when navigating away from Explore
3. **Validate filter values** before setting them
4. **Use getFilterCount()** for UI badges and indicators
5. **Combine with React Query** for efficient data fetching

## Requirements

- **Requirement 4.1:** Filter state persists across all Explore pages ✅
- **Requirement 4.3:** Clear and apply filter actions ✅

## Related Files

- `client/src/hooks/useFilterUrlSync.ts` (Task 12) - URL synchronization
- `client/src/components/explore-discovery/FilterPanel.tsx` (Task 13) - Filter UI
- All Explore pages (Tasks 24-27) - Filter consumers

</content>
