# Property Filters Store

A Zustand store for managing property search filters with URL synchronization and localStorage persistence.

## Features

- **Filter State Management**: Manages all property filter criteria including location, price, bedrooms, and SA-specific filters
- **URL Synchronization**: Automatically syncs filter state with URL parameters for shareable search links
- **localStorage Persistence**: Persists filter preferences across sessions
- **Sort & View Mode**: Manages sort options and view mode (list/grid/map)
- **Pagination**: Tracks current page and resets when filters change

## Usage

### Basic Filter Management

```typescript
import { usePropertyFiltersStore } from '@/store/propertyFiltersStore';

function FilterPanel() {
  const { filters, setFilters, resetFilters } = usePropertyFiltersStore();

  const handlePriceChange = (min: number, max: number) => {
    setFilters({ minPrice: min, maxPrice: max });
  };

  return (
    <div>
      <input
        type="number"
        value={filters.minPrice || ''}
        onChange={(e) => handlePriceChange(Number(e.target.value), filters.maxPrice)}
      />
      <button onClick={resetFilters}>Clear Filters</button>
    </div>
  );
}
```

### URL Synchronization

```typescript
import { usePropertyFiltersStore } from '@/store/propertyFiltersStore';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'wouter';

function PropertyResultsPage() {
  const [location] = useLocation();
  const navigate = useNavigate();
  const { syncFromUrl, syncToUrl } = usePropertyFiltersStore();

  // Load filters from URL on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(location.split('?')[1]);
    syncFromUrl(searchParams);
  }, []);

  // Update URL when filters change
  const updateUrl = () => {
    const params = syncToUrl();
    navigate(`/properties?${params.toString()}`, { replace: true });
  };

  return <div>...</div>;
}
```

### Selective Subscription (Performance)

```typescript
// Only re-render when specific filters change
function PriceFilter() {
  const minPrice = usePropertyFiltersStore((state) => state.filters.minPrice);
  const maxPrice = usePropertyFiltersStore((state) => state.filters.maxPrice);
  const setFilters = usePropertyFiltersStore((state) => state.setFilters);

  return (
    <div>
      <input
        type="number"
        value={minPrice || ''}
        onChange={(e) => setFilters({ minPrice: Number(e.target.value) })}
      />
      <input
        type="number"
        value={maxPrice || ''}
        onChange={(e) => setFilters({ maxPrice: Number(e.target.value) })}
      />
    </div>
  );
}
```

### Active Filter Count

```typescript
function FilterBadge() {
  const getActiveFilterCount = usePropertyFiltersStore(
    (state) => state.getActiveFilterCount
  );
  const count = getActiveFilterCount();

  if (count === 0) return null;

  return (
    <span className="badge">
      {count} {count === 1 ? 'filter' : 'filters'} active
    </span>
  );
}
```

### Sort and View Mode

```typescript
function ResultsControls() {
  const { sortOption, viewMode, setSortOption, setViewMode } =
    usePropertyFiltersStore();

  return (
    <div>
      <select
        value={sortOption}
        onChange={(e) => setSortOption(e.target.value as SortOption)}
      >
        <option value="date_desc">Newest First</option>
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
        <option value="suburb_asc">Suburb A-Z</option>
      </select>

      <div>
        <button
          onClick={() => setViewMode('list')}
          className={viewMode === 'list' ? 'active' : ''}
        >
          List
        </button>
        <button
          onClick={() => setViewMode('grid')}
          className={viewMode === 'grid' ? 'active' : ''}
        >
          Grid
        </button>
        <button
          onClick={() => setViewMode('map')}
          className={viewMode === 'map' ? 'active' : ''}
        >
          Map
        </button>
      </div>
    </div>
  );
}
```

### SA-Specific Filters

```typescript
function SAFilters() {
  const { filters, updateFilter } = usePropertyFiltersStore();

  return (
    <div>
      {/* Title Type */}
      <div>
        <label>
          <input
            type="checkbox"
            checked={filters.titleType?.includes('freehold')}
            onChange={(e) => {
              const current = filters.titleType || [];
              const updated = e.target.checked
                ? [...current, 'freehold']
                : current.filter((t) => t !== 'freehold');
              updateFilter('titleType', updated);
            }}
          />
          Freehold
        </label>
        <label>
          <input
            type="checkbox"
            checked={filters.titleType?.includes('sectional')}
            onChange={(e) => {
              const current = filters.titleType || [];
              const updated = e.target.checked
                ? [...current, 'sectional']
                : current.filter((t) => t !== 'sectional');
              updateFilter('titleType', updated);
            }}
          />
          Sectional Title
        </label>
      </div>

      {/* Boolean Filters */}
      <label>
        <input
          type="checkbox"
          checked={filters.securityEstate || false}
          onChange={(e) => updateFilter('securityEstate', e.target.checked)}
        />
        Security Estate
      </label>

      <label>
        <input
          type="checkbox"
          checked={filters.petFriendly || false}
          onChange={(e) => updateFilter('petFriendly', e.target.checked)}
        />
        Pet Friendly
      </label>

      <label>
        <input
          type="checkbox"
          checked={filters.fibreReady || false}
          onChange={(e) => updateFilter('fibreReady', e.target.checked)}
        />
        Fibre Ready
      </label>

      {/* Load-Shedding Solutions */}
      <div>
        <label>Load-Shedding Solutions:</label>
        {['solar', 'generator', 'inverter'].map((solution) => (
          <label key={solution}>
            <input
              type="checkbox"
              checked={filters.loadSheddingSolutions?.includes(solution as any)}
              onChange={(e) => {
                const current = filters.loadSheddingSolutions || [];
                const updated = e.target.checked
                  ? [...current, solution as any]
                  : current.filter((s) => s !== solution);
                updateFilter('loadSheddingSolutions', updated);
              }}
            />
            {solution.charAt(0).toUpperCase() + solution.slice(1)}
          </label>
        ))}
      </div>
    </div>
  );
}
```

## API Reference

### State

- `filters: PropertyFilters` - Current filter state
- `sortOption: SortOption` - Current sort option
- `viewMode: ViewMode` - Current view mode (list/grid/map)
- `page: number` - Current page number

### Actions

- `setFilters(filters: Partial<PropertyFilters>)` - Set multiple filters at once
- `updateFilter<K>(key: K, value: PropertyFilters[K])` - Update a single filter
- `resetFilters()` - Reset all filters to default
- `setSortOption(sort: SortOption)` - Set sort option
- `setViewMode(mode: ViewMode)` - Set view mode
- `setPage(page: number)` - Set current page
- `syncFromUrl(searchParams: URLSearchParams)` - Load filters from URL
- `syncToUrl()` - Convert filters to URL parameters
- `getActiveFilterCount()` - Get count of active filters

## Filter Types

### PropertyFilters

```typescript
interface PropertyFilters {
  // Location
  province?: string;
  city?: string;
  suburb?: string[];

  // Basic filters
  propertyType?: ('house' | 'apartment' | 'townhouse' | 'plot' | 'commercial')[];
  listingType?: 'sale' | 'rent';
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;

  // Size filters
  minErfSize?: number;
  maxErfSize?: number;
  minFloorSize?: number;
  maxFloorSize?: number;

  // SA-specific filters
  titleType?: ('freehold' | 'sectional')[];
  maxLevy?: number;
  securityEstate?: boolean;
  petFriendly?: boolean;
  fibreReady?: boolean;
  loadSheddingSolutions?: ('solar' | 'generator' | 'inverter' | 'none')[];

  // Status
  status?: ('available' | 'under_offer' | 'sold' | 'let')[];

  // Map bounds
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}
```

### SortOption

```typescript
type SortOption =
  | 'price_asc'
  | 'price_desc'
  | 'date_desc'
  | 'date_asc'
  | 'suburb_asc'
  | 'suburb_desc';
```

### ViewMode

```typescript
type ViewMode = 'list' | 'grid' | 'map';
```

## Persistence

The store automatically persists the following to localStorage:

- `filters` - All filter state
- `sortOption` - Sort preference
- `viewMode` - View mode preference

The `page` number is NOT persisted and always starts at 1.

## URL Format

Filters are serialized to URL parameters for shareable links:

```
/properties?
  province=Gauteng&
  city=Johannesburg&
  suburb=Sandton,Rosebank&
  propertyType=house,apartment&
  listingType=sale&
  minPrice=1000000&
  maxPrice=5000000&
  minBedrooms=3&
  securityEstate=true&
  petFriendly=true&
  fibreReady=true&
  sort=price_asc&
  view=grid&
  page=2
```

## Requirements

Validates the following requirements:

- **2.1**: Filter panel with SA-specific filters
- **2.2**: Quick filter presets
- **2.3**: Sort order support
- **2.4**: URL synchronization for shareable links
- **2.5**: Filter persistence across sessions

## Testing

Property-based tests verify:

- **Property 3**: URL parameters accurately represent filter state
- **Property 4**: Filter state round-trip through URL preserves all values

Run tests:

```bash
npm test -- client/src/store/__tests__/propertyFiltersStore.property.test.ts
```
