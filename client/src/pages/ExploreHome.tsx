import { useState } from 'react';
import { Play, Grid3x3, SlidersHorizontal } from 'lucide-react';
import { DiscoveryCardFeed } from '@/components/explore-discovery/DiscoveryCardFeed';
import { ExploreVideoFeed } from '@/components/explore-discovery/ExploreVideoFeed';
import { LifestyleCategorySelector } from '@/components/explore-discovery/LifestyleCategorySelector';
import { FilterPanel } from '@/components/explore-discovery/FilterPanel';
import { useCategoryFilter } from '@/hooks/useCategoryFilter';
import { usePropertyFilters } from '@/hooks/usePropertyFilters';
import { DiscoveryItem } from '@/hooks/useDiscoveryFeed';

type ViewMode = 'cards' | 'videos';

export default function ExploreHome() {
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const { selectedCategoryId, setSelectedCategoryId } = useCategoryFilter();
  const [showFilters, setShowFilters] = useState(false);
  
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

  const handleItemClick = (item: DiscoveryItem) => {
    console.log('Item clicked:', item);
    // TODO: Navigate to detail page based on item type
    if (item.type === 'property') {
      // Navigate to property detail
    } else if (item.type === 'video') {
      // Open video feed at this video
      setViewMode('videos');
    } else if (item.type === 'neighbourhood') {
      // Navigate to neighbourhood detail
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Explore</h1>
            
            {/* View mode toggle */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid3x3 className="w-4 h-4" />
                <span>Cards</span>
              </button>
              <button
                onClick={() => setViewMode('videos')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  viewMode === 'videos'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Play className="w-4 h-4" />
                <span>Videos</span>
              </button>
            </div>
          </div>

          {/* Category filter */}
          <LifestyleCategorySelector
            selectedCategoryId={selectedCategoryId}
            onCategoryChange={setSelectedCategoryId}
            variant="light"
            className="pb-2"
          />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto">
        {viewMode === 'cards' ? (
          <div className="py-6">
            <DiscoveryCardFeed
              categoryId={selectedCategoryId}
              filters={filters}
              onItemClick={handleItemClick}
            />
          </div>
        ) : (
          <ExploreVideoFeed categoryId={selectedCategoryId} />
        )}
      </main>

      {/* Filter button (floating) */}
      <button
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center z-30"
        onClick={() => setShowFilters(true)}
        aria-label="Open filters"
      >
        <SlidersHorizontal className="w-6 h-6" />
        {getFilterCount() > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {getFilterCount()}
          </span>
        )}
      </button>

      {/* Filter Panel */}
      <FilterPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
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
