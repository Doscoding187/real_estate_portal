/**
 * Explore Discovery Page
 * Main page for the Explore Discovery Engine video feed
 * Requirements: 1.1, 1.2, 4.1, 4.2, 4.3
 */

import { ExploreVideoFeed } from '@/components/explore-discovery/ExploreVideoFeed';
import { LifestyleCategorySelector } from '@/components/explore-discovery/LifestyleCategorySelector';
import { FilterPanel } from '@/components/explore-discovery/FilterPanel';
import { useCategoryFilter } from '@/hooks/useCategoryFilter';
import { usePropertyFilters } from '@/hooks/usePropertyFilters';
import { useState } from 'react';
import { X, Filter } from 'lucide-react';

export default function ExploreDiscovery() {
  const { selectedCategoryId, setSelectedCategoryId } = useCategoryFilter();
  const [showFilters, setShowFilters] = useState(false);
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

  return (
    <div className="relative w-full h-screen bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-white text-2xl font-bold">Explore</h1>
          
          <div className="flex items-center gap-2">
            {/* Category filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
              aria-label="Category filters"
            >
              <Filter className="w-5 h-5 text-white" />
            </button>

            {/* Advanced filter button */}
            <button
              onClick={() => setShowFilterPanel(true)}
              className="relative p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
              aria-label="Advanced filters"
            >
              <Filter className="w-5 h-5 text-white" />
              {getFilterCount() > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {getFilterCount()}
                </span>
              )}
            </button>

            {/* Close button */}
            <button
              onClick={() => window.history.back()}
              className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Category filter (if filters shown) */}
        {showFilters && (
          <div className="px-4 pb-4">
            <LifestyleCategorySelector
              selectedCategoryId={selectedCategoryId}
              onCategoryChange={setSelectedCategoryId}
              variant="dark"
            />
          </div>
        )}
      </div>

      {/* Video Feed */}
      <ExploreVideoFeed categoryId={selectedCategoryId} />

      {/* Instructions overlay (shown briefly on first visit) */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
        <div className="px-6 py-3 bg-black/70 backdrop-blur-sm rounded-full text-white text-sm text-center">
          <p>Swipe up for next • Double tap to save</p>
        </div>
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
