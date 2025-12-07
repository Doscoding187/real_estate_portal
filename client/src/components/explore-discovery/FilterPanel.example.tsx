/**
 * FilterPanel Usage Example
 * 
 * This example demonstrates how to use the refactored FilterPanel component
 * with Zustand integration and modern chip-style filters.
 */

import { useState } from 'react';
import { FilterPanel } from './FilterPanel';
import { useExploreFiltersStore } from '@/store/exploreFiltersStore';
import { SlidersHorizontal } from 'lucide-react';

export function FilterPanelExample() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { getFilterCount } = useExploreFiltersStore();
  const filterCount = getFilterCount();

  const handleApplyFilters = () => {
    console.log('Filters applied! Fetch data with current filter state.');
    // In a real implementation, you would trigger a data fetch here
    // The filter state is automatically managed by Zustand
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">FilterPanel Example</h1>
      
      {/* Filter Button */}
      <button
        onClick={() => setIsFilterOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        <SlidersHorizontal className="w-5 h-5" />
        <span>Filters</span>
        {filterCount > 0 && (
          <span className="ml-1 px-2 py-0.5 bg-white text-indigo-600 rounded-full text-xs font-semibold">
            {filterCount}
          </span>
        )}
      </button>

      {/* Filter Panel */}
      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={handleApplyFilters}
      />

      {/* Display Current Filters */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Current Filter State</h2>
        <FilterStateDisplay />
      </div>
    </div>
  );
}

function FilterStateDisplay() {
  const filters = useExploreFiltersStore();

  return (
    <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
      <div><strong>Property Type:</strong> {filters.propertyType || 'All'}</div>
      <div><strong>Price Range:</strong> {filters.priceMin || 'No min'} - {filters.priceMax || 'No max'}</div>
      <div><strong>Bedrooms:</strong> {filters.bedrooms ? `${filters.bedrooms}+` : 'Any'}</div>
      <div><strong>Bathrooms:</strong> {filters.bathrooms ? `${filters.bathrooms}+` : 'Any'}</div>
      <div><strong>Location:</strong> {filters.location || 'Any'}</div>
      <div><strong>Category ID:</strong> {filters.categoryId || 'None'}</div>
      <div className="pt-2 border-t border-gray-200">
        <strong>Active Filters:</strong> {filters.getFilterCount()}
      </div>
    </div>
  );
}
