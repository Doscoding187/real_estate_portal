import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { MapHybridView } from '@/components/explore-discovery/MapHybridView';
import { LifestyleCategorySelector } from '@/components/explore-discovery/LifestyleCategorySelector';
import { FilterPanel } from '@/components/explore-discovery/FilterPanel';
import { useCategoryFilter } from '@/hooks/useCategoryFilter';
import { usePropertyFilters } from '@/hooks/usePropertyFilters';

export default function ExploreMap() {
  const { selectedCategoryId, setSelectedCategoryId } = useCategoryFilter();
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  
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

  const handlePropertyClick = (propertyId: number) => {
    console.log('Navigate to property:', propertyId);
    // TODO: Navigate to property detail page
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Category filter bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 z-20">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <LifestyleCategorySelector
              selectedCategoryId={selectedCategoryId}
              onCategoryChange={setSelectedCategoryId}
              variant="light"
            />
          </div>
          
          {/* Filter button */}
          <button
            onClick={() => setShowFilterPanel(true)}
            className="relative flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="font-medium">Filters</span>
            {getFilterCount() > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {getFilterCount()}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Map hybrid view */}
      <div className="flex-1 overflow-hidden">
        <MapHybridView
          categoryId={selectedCategoryId}
          filters={filters}
          onPropertyClick={handlePropertyClick}
        />
      </div>

      {/* Filter Panel */}
      <FilterPanel
        isOpen={showFilterPanel}
        onClose={() => setShowFilterPanel(false)}
        propertyType={filters.propertyType}
        onPropertyTypeChange={setPropertyType}
        priceMin={filters.priceMin}
        priceMax={filters.priceMax}
        onPriceChange={(min, max) => updateCommonFilters({ priceMin: min, priceMax: max })}
        residentialFilters={filters.residential}
        onResidentialFiltersChange={updateResidentialFilters}
        developmentFilters={filters.development}
        onDevelopmentFiltersChange={updateDevelopmentFilters}
        landFilters={filters.land}
        onLandFiltersChange={updateLandFilters}
        filterCount={getFilterCount()}
        onClearAll={clearFilters}
      />
    </div>
  );
}
