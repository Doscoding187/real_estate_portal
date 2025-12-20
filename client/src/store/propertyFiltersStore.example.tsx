/**
 * Example usage of propertyFiltersStore
 * 
 * This file demonstrates how to use the Property filters store
 * in various scenarios for the property results page.
 */

import { usePropertyFiltersStore } from './propertyFiltersStore';
import { useEffect } from 'react';

// Example 1: Complete Filter Panel
export function PropertyFilterPanel() {
  const {
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    getActiveFilterCount,
  } = usePropertyFiltersStore();

  const filterCount = getActiveFilterCount();

  return (
    <div className="p-4 space-y-4 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filters</h3>
        {filterCount > 0 && (
          <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded-full">
            {filterCount}
          </span>
        )}
      </div>

      {/* Location Filters */}
      <div>
        <label className="block text-sm font-medium mb-1">Province</label>
        <select
          value={filters.province || ''}
          onChange={(e) => updateFilter('province', e.target.value || undefined)}
          className="w-full p-2 border rounded"
        >
          <option value="">All Provinces</option>
          <option value="Gauteng">Gauteng</option>
          <option value="Western Cape">Western Cape</option>
          <option value="KwaZulu-Natal">KwaZulu-Natal</option>
        </select>
      </div>

      {/* Price Range */}
      <div>
        <label className="block text-sm font-medium mb-1">Price Range</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={filters.minPrice || ''}
            onChange={(e) =>
              updateFilter('minPrice', e.target.value ? Number(e.target.value) : undefined)
            }
            placeholder="Min (R)"
            className="w-1/2 p-2 border rounded"
          />
          <input
            type="number"
            value={filters.maxPrice || ''}
            onChange={(e) =>
              updateFilter('maxPrice', e.target.value ? Number(e.target.value) : undefined)
            }
            placeholder="Max (R)"
            className="w-1/2 p-2 border rounded"
          />
        </div>
      </div>

      {/* Bedrooms */}
      <div>
        <label className="block text-sm font-medium mb-1">Bedrooms</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((count) => (
            <button
              key={count}
              onClick={() =>
                updateFilter(
                  'minBedrooms',
                  filters.minBedrooms === count ? undefined : count
                )
              }
              className={`px-3 py-1 rounded ${
                filters.minBedrooms === count
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {count}+
            </button>
          ))}
        </div>
      </div>

      {/* SA-Specific Filters */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">SA Features</label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.securityEstate || false}
            onChange={(e) => updateFilter('securityEstate', e.target.checked)}
          />
          Security Estate
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.petFriendly || false}
            onChange={(e) => updateFilter('petFriendly', e.target.checked)}
          />
          Pet Friendly
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.fibreReady || false}
            onChange={(e) => updateFilter('fibreReady', e.target.checked)}
          />
          Fibre Ready
        </label>
      </div>

      {/* Actions */}
      <button
        onClick={resetFilters}
        className="w-full px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
      >
        Clear All Filters
      </button>
    </div>
  );
}

// Example 2: Quick Filter Chips
export function QuickFilters() {
  const { setFilters, filters } = usePropertyFiltersStore();

  const quickFilters = [
    {
      label: 'Pet-Friendly',
      filters: { petFriendly: true },
      active: filters.petFriendly === true,
    },
    {
      label: 'Fibre Ready',
      filters: { fibreReady: true },
      active: filters.fibreReady === true,
    },
    {
      label: 'Sectional Title',
      filters: { titleType: ['sectional'] },
      active: filters.titleType?.includes('sectional'),
    },
    {
      label: 'Under R2M',
      filters: { maxPrice: 2000000 },
      active: filters.maxPrice === 2000000,
    },
    {
      label: 'Security Estate',
      filters: { securityEstate: true },
      active: filters.securityEstate === true,
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {quickFilters.map((qf) => (
        <button
          key={qf.label}
          onClick={() => setFilters(qf.active ? {} : qf.filters)}
          className={`px-4 py-2 rounded-full text-sm transition-colors ${
            qf.active
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {qf.label}
        </button>
      ))}
    </div>
  );
}

// Example 3: Sort and View Controls
export function ResultsControls() {
  const { sortOption, viewMode, setSortOption, setViewMode } =
    usePropertyFiltersStore();

  return (
    <div className="flex items-center justify-between">
      {/* Sort Dropdown */}
      <select
        value={sortOption}
        onChange={(e) => setSortOption(e.target.value as any)}
        className="px-4 py-2 border rounded"
      >
        <option value="date_desc">Newest Listed</option>
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
        <option value="suburb_asc">Suburb A-Z</option>
      </select>

      {/* View Mode Toggle */}
      <div className="flex gap-1 bg-gray-200 rounded p-1">
        <button
          onClick={() => setViewMode('list')}
          className={`px-3 py-1 rounded ${
            viewMode === 'list' ? 'bg-white shadow' : ''
          }`}
        >
          List
        </button>
        <button
          onClick={() => setViewMode('grid')}
          className={`px-3 py-1 rounded ${
            viewMode === 'grid' ? 'bg-white shadow' : ''
          }`}
        >
          Grid
        </button>
        <button
          onClick={() => setViewMode('map')}
          className={`px-3 py-1 rounded ${
            viewMode === 'map' ? 'bg-white shadow' : ''
          }`}
        >
          Map
        </button>
      </div>
    </div>
  );
}

// Example 4: Active Filters Display
export function ActiveFilters() {
  const { filters, updateFilter, resetFilters } = usePropertyFiltersStore();

  const activeFilters: Array<{ label: string; onRemove: () => void }> = [];

  if (filters.province) {
    activeFilters.push({
      label: filters.province,
      onRemove: () => updateFilter('province', undefined),
    });
  }

  if (filters.city) {
    activeFilters.push({
      label: filters.city,
      onRemove: () => updateFilter('city', undefined),
    });
  }

  if (filters.minPrice) {
    activeFilters.push({
      label: `Min: R${filters.minPrice.toLocaleString()}`,
      onRemove: () => updateFilter('minPrice', undefined),
    });
  }

  if (filters.maxPrice) {
    activeFilters.push({
      label: `Max: R${filters.maxPrice.toLocaleString()}`,
      onRemove: () => updateFilter('maxPrice', undefined),
    });
  }

  if (filters.minBedrooms) {
    activeFilters.push({
      label: `${filters.minBedrooms}+ beds`,
      onRemove: () => updateFilter('minBedrooms', undefined),
    });
  }

  if (filters.securityEstate) {
    activeFilters.push({
      label: 'Security Estate',
      onRemove: () => updateFilter('securityEstate', undefined),
    });
  }

  if (filters.petFriendly) {
    activeFilters.push({
      label: 'Pet Friendly',
      onRemove: () => updateFilter('petFriendly', undefined),
    });
  }

  if (filters.fibreReady) {
    activeFilters.push({
      label: 'Fibre Ready',
      onRemove: () => updateFilter('fibreReady', undefined),
    });
  }

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm text-gray-600">Active filters:</span>
      {activeFilters.map((filter, index) => (
        <div
          key={index}
          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
        >
          <span>{filter.label}</span>
          <button
            onClick={filter.onRemove}
            className="hover:bg-blue-200 rounded-full p-0.5"
            aria-label={`Remove ${filter.label} filter`}
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
      ))}
      <button
        onClick={resetFilters}
        className="text-sm text-blue-600 hover:text-blue-800"
      >
        Clear all
      </button>
    </div>
  );
}

// Example 5: URL Synchronization Hook
export function useFilterUrlSync() {
  const { syncFromUrl, syncToUrl } = usePropertyFiltersStore();

  // Load filters from URL on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    syncFromUrl(searchParams);
  }, []);

  // Function to update URL with current filters
  const updateUrl = () => {
    const params = syncToUrl();
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  };

  return { updateUrl };
}

// Example 6: Property Results Page Integration
export function PropertyResultsPage() {
  const { filters, sortOption, viewMode, page } = usePropertyFiltersStore();
  const { updateUrl } = useFilterUrlSync();

  // Update URL whenever filters change
  useEffect(() => {
    updateUrl();
  }, [filters, sortOption, viewMode, page]);

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar Filters */}
        <aside className="lg:col-span-1">
          <PropertyFilterPanel />
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-3 space-y-4">
          {/* Quick Filters */}
          <QuickFilters />

          {/* Active Filters */}
          <ActiveFilters />

          {/* Sort and View Controls */}
          <ResultsControls />

          {/* Results would go here */}
          <div className="text-gray-500">
            Property results for: {JSON.stringify(filters, null, 2)}
          </div>
        </main>
      </div>
    </div>
  );
}

// Example 7: Selective Subscription (Performance Optimization)
export function PriceRangeFilter() {
  // Only re-renders when price filters change
  const minPrice = usePropertyFiltersStore((state) => state.filters.minPrice);
  const maxPrice = usePropertyFiltersStore((state) => state.filters.maxPrice);
  const updateFilter = usePropertyFiltersStore((state) => state.updateFilter);

  return (
    <div className="flex gap-2">
      <input
        type="number"
        value={minPrice || ''}
        onChange={(e) =>
          updateFilter('minPrice', e.target.value ? Number(e.target.value) : undefined)
        }
        placeholder="Min Price"
        className="w-1/2 p-2 border rounded"
      />
      <input
        type="number"
        value={maxPrice || ''}
        onChange={(e) =>
          updateFilter('maxPrice', e.target.value ? Number(e.target.value) : undefined)
        }
        placeholder="Max Price"
        className="w-1/2 p-2 border rounded"
      />
    </div>
  );
}
