/**
 * Example usage of exploreFiltersStore
 * 
 * This file demonstrates how to use the Explore filters store
 * in various scenarios.
 */

import { useExploreFiltersStore } from './exploreFiltersStore';

// Example 1: Basic Filter Panel Component
export function BasicFilterPanel() {
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
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filters</h3>
        {filterCount > 0 && (
          <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded-full">
            {filterCount}
          </span>
        )}
      </div>

      {/* Property Type */}
      <div>
        <label className="block text-sm font-medium mb-1">Property Type</label>
        <select
          value={propertyType || ''}
          onChange={(e) => setPropertyType(e.target.value || null)}
          className="w-full p-2 border rounded"
        >
          <option value="">All Types</option>
          <option value="residential">Residential</option>
          <option value="development">Development</option>
          <option value="land">Land</option>
        </select>
      </div>

      {/* Price Range */}
      <div>
        <label className="block text-sm font-medium mb-1">Price Range</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={priceMin || ''}
            onChange={(e) =>
              setPriceRange(
                e.target.value ? parseInt(e.target.value) : null,
                priceMax
              )
            }
            placeholder="Min"
            className="w-1/2 p-2 border rounded"
          />
          <input
            type="number"
            value={priceMax || ''}
            onChange={(e) =>
              setPriceRange(
                priceMin,
                e.target.value ? parseInt(e.target.value) : null
              )
            }
            placeholder="Max"
            className="w-1/2 p-2 border rounded"
          />
        </div>
      </div>

      {/* Bedrooms */}
      <div>
        <label className="block text-sm font-medium mb-1">Bedrooms</label>
        <input
          type="number"
          value={bedrooms || ''}
          onChange={(e) =>
            setBedrooms(e.target.value ? parseInt(e.target.value) : null)
          }
          placeholder="Any"
          className="w-full p-2 border rounded"
        />
      </div>

      {/* Bathrooms */}
      <div>
        <label className="block text-sm font-medium mb-1">Bathrooms</label>
        <input
          type="number"
          value={bathrooms || ''}
          onChange={(e) =>
            setBathrooms(e.target.value ? parseInt(e.target.value) : null)
          }
          placeholder="Any"
          className="w-full p-2 border rounded"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={clearFilters}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Clear All
        </button>
      </div>
    </div>
  );
}

// Example 2: Filter Badge (shows active filter count)
export function FilterBadge() {
  const getFilterCount = useExploreFiltersStore((state) => state.getFilterCount);
  const count = getFilterCount();

  if (count === 0) return null;

  return (
    <div className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
      {count} {count === 1 ? 'filter' : 'filters'} active
    </div>
  );
}

// Example 3: Quick Filter Chips
export function QuickFilterChips() {
  const { propertyType, bedrooms, setPropertyType, setBedrooms } =
    useExploreFiltersStore();

  const propertyTypes = [
    { value: 'residential', label: 'Residential' },
    { value: 'development', label: 'Development' },
    { value: 'land', label: 'Land' },
  ];

  const bedroomOptions = [1, 2, 3, 4, 5];

  return (
    <div className="space-y-3">
      {/* Property Type Chips */}
      <div>
        <p className="text-sm font-medium mb-2">Property Type</p>
        <div className="flex flex-wrap gap-2">
          {propertyTypes.map((type) => (
            <button
              key={type.value}
              onClick={() =>
                setPropertyType(
                  propertyType === type.value ? null : type.value
                )
              }
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                propertyType === type.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bedroom Chips */}
      <div>
        <p className="text-sm font-medium mb-2">Bedrooms</p>
        <div className="flex flex-wrap gap-2">
          {bedroomOptions.map((count) => (
            <button
              key={count}
              onClick={() => setBedrooms(bedrooms === count ? null : count)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                bedrooms === count
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {count}+
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Example 4: Active Filters Display
export function ActiveFiltersDisplay() {
  const {
    propertyType,
    priceMin,
    priceMax,
    bedrooms,
    bathrooms,
    location,
    setPropertyType,
    setPriceRange,
    setBedrooms,
    setBathrooms,
    setLocation,
    getFilterCount,
  } = useExploreFiltersStore();

  const filterCount = getFilterCount();

  if (filterCount === 0) {
    return (
      <div className="text-sm text-gray-500">No active filters</div>
    );
  }

  const removeFilter = (filterName: string) => {
    switch (filterName) {
      case 'propertyType':
        setPropertyType(null);
        break;
      case 'priceMin':
        setPriceRange(null, priceMax);
        break;
      case 'priceMax':
        setPriceRange(priceMin, null);
        break;
      case 'bedrooms':
        setBedrooms(null);
        break;
      case 'bathrooms':
        setBathrooms(null);
        break;
      case 'location':
        setLocation(null);
        break;
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {propertyType && (
        <FilterChip
          label={`Type: ${propertyType}`}
          onRemove={() => removeFilter('propertyType')}
        />
      )}
      {priceMin && (
        <FilterChip
          label={`Min: R${priceMin.toLocaleString()}`}
          onRemove={() => removeFilter('priceMin')}
        />
      )}
      {priceMax && (
        <FilterChip
          label={`Max: R${priceMax.toLocaleString()}`}
          onRemove={() => removeFilter('priceMax')}
        />
      )}
      {bedrooms && (
        <FilterChip
          label={`${bedrooms} beds`}
          onRemove={() => removeFilter('bedrooms')}
        />
      )}
      {bathrooms && (
        <FilterChip
          label={`${bathrooms} baths`}
          onRemove={() => removeFilter('bathrooms')}
        />
      )}
      {location && (
        <FilterChip
          label={location}
          onRemove={() => removeFilter('location')}
        />
      )}
    </div>
  );
}

// Helper component for filter chips
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
      <span>{label}</span>
      <button
        onClick={onRemove}
        className="hover:bg-blue-200 rounded-full p-0.5"
        aria-label={`Remove ${label} filter`}
      >
        <svg
          className="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

// Example 5: Selective Subscription (Performance Optimization)
export function PropertyTypeFilter() {
  // Only re-renders when propertyType changes
  const propertyType = useExploreFiltersStore((state) => state.propertyType);
  const setPropertyType = useExploreFiltersStore((state) => state.setPropertyType);

  return (
    <select
      value={propertyType || ''}
      onChange={(e) => setPropertyType(e.target.value || null)}
    >
      <option value="">All Types</option>
      <option value="residential">Residential</option>
      <option value="development">Development</option>
    </select>
  );
}

// Example 6: Using filters with API calls
export function useFilteredProperties() {
  const filters = useExploreFiltersStore();

  // This would integrate with React Query
  const queryParams = {
    propertyType: filters.propertyType,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
    bedrooms: filters.bedrooms,
    bathrooms: filters.bathrooms,
    categoryId: filters.categoryId,
    location: filters.location,
  };

  // Remove null values for cleaner API calls
  const cleanParams = Object.fromEntries(
    Object.entries(queryParams).filter(([_, value]) => value !== null)
  );

  return cleanParams;
}
