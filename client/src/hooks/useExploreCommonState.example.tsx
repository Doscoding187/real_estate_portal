/**
 * Example implementations showing how to use useExploreCommonState
 * across different Explore pages
 */

import { useExploreCommonState } from './useExploreCommonState';
import { LifestyleCategorySelector } from '@/components/explore-discovery/LifestyleCategorySelector';
import { FilterPanel } from '@/components/explore-discovery/FilterPanel';
import { DiscoveryCardFeed } from '@/components/explore-discovery/DiscoveryCardFeed';
import { ExploreVideoFeed } from '@/components/explore-discovery/ExploreVideoFeed';
import { MapHybridView } from '@/components/explore-discovery/MapHybridView';
import { Play, Grid3x3, MapPin, SlidersHorizontal } from 'lucide-react';

/**
 * Example 1: ExploreHome with view mode switching
 */
export function ExploreHomeExample() {
  const {
    viewMode,
    setViewMode,
    selectedCategoryId,
    setSelectedCategoryId,
    showFilters,
    setShowFilters,
    filters,
    filterActions,
  } = useExploreCommonState({
    initialViewMode: 'home',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with view mode toggle */}
      <header className="sticky top-0 z-40 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Explore</h1>
            
            {/* View mode toggle */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setViewMode('home')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                  viewMode === 'home' ? 'bg-white shadow-sm' : ''
                }`}
              >
                <MapPin className="w-4 h-4" />
                Home
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                  viewMode === 'cards' ? 'bg-white shadow-sm' : ''
                }`}
              >
                <Grid3x3 className="w-4 h-4" />
                Cards
              </button>
              <button
                onClick={() => setViewMode('videos')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                  viewMode === 'videos' ? 'bg-white shadow-sm' : ''
                }`}
              >
                <Play className="w-4 h-4" />
                Videos
              </button>
            </div>
          </div>

          {/* Category selector */}
          <LifestyleCategorySelector
            selectedCategoryId={selectedCategoryId}
            onCategoryChange={setSelectedCategoryId}
            variant="light"
          />
        </div>
      </header>

      {/* Content based on view mode */}
      <main className="max-w-7xl mx-auto py-6">
        {viewMode === 'cards' && (
          <DiscoveryCardFeed
            categoryId={selectedCategoryId}
            filters={filters}
            onItemClick={(item) => console.log('Item clicked:', item)}
          />
        )}
        
        {viewMode === 'videos' && (
          <ExploreVideoFeed categoryId={selectedCategoryId} />
        )}
      </main>

      {/* Filter button */}
      <button
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg"
        onClick={() => setShowFilters(true)}
      >
        <SlidersHorizontal className="w-6 h-6" />
        {filterActions.getFilterCount() > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full">
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
        onClearAll={filterActions.clearFilters}
      />
    </div>
  );
}

/**
 * Example 2: ExploreFeed with feed type management
 */
export function ExploreFeedExample() {
  const {
    feedType,
    setFeedType,
    selectedCategoryId,
    setSelectedCategoryId,
    filters,
  } = useExploreCommonState({
    initialViewMode: 'videos',
    initialFeedType: 'recommended',
  });

  return (
    <div className="h-screen bg-black">
      {/* Feed type tabs */}
      <div className="absolute top-4 left-4 right-4 z-50">
        <div className="flex gap-2 bg-white/10 backdrop-blur-xl rounded-full p-1">
          <button
            onClick={() => setFeedType('recommended')}
            className={`px-4 py-2 rounded-full ${
              feedType === 'recommended' ? 'bg-blue-500 text-white' : 'text-white'
            }`}
          >
            For You
          </button>
          <button
            onClick={() => setFeedType('area')}
            className={`px-4 py-2 rounded-full ${
              feedType === 'area' ? 'bg-blue-500 text-white' : 'text-white'
            }`}
          >
            By Area
          </button>
          <button
            onClick={() => setFeedType('category')}
            className={`px-4 py-2 rounded-full ${
              feedType === 'category' ? 'bg-blue-500 text-white' : 'text-white'
            }`}
          >
            By Type
          </button>
        </div>
      </div>

      {/* Video feed */}
      <ExploreVideoFeed
        categoryId={selectedCategoryId}
        filters={filters}
      />
    </div>
  );
}

/**
 * Example 3: ExploreMap with filter integration
 */
export function ExploreMapExample() {
  const {
    selectedCategoryId,
    setSelectedCategoryId,
    showFilters,
    toggleFilters,
    filters,
    filterActions,
  } = useExploreCommonState({
    initialViewMode: 'map',
  });

  return (
    <div className="h-screen flex flex-col">
      {/* Category filter bar */}
      <div className="bg-white border-b px-4 py-3 z-20">
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
            onClick={toggleFilters}
            className="relative flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {filterActions.getFilterCount() > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full">
                {filterActions.getFilterCount()}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Map view */}
      <div className="flex-1 overflow-hidden">
        <MapHybridView
          categoryId={selectedCategoryId}
          filters={filters}
          onPropertyClick={(id) => console.log('Property clicked:', id)}
        />
      </div>

      {/* Filter panel */}
      <FilterPanel
        isOpen={showFilters}
        onClose={() => toggleFilters()}
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
        onClearAll={filterActions.clearFilters}
      />
    </div>
  );
}

/**
 * Example 4: Minimal usage for ExploreShorts
 */
export function ExploreShortsExample() {
  const {
    feedType,
    selectedCategoryId,
  } = useExploreCommonState({
    initialViewMode: 'shorts',
    initialFeedType: 'recommended',
  });

  return (
    <div className="h-screen">
      {/* Shorts container with minimal state */}
      <div className="w-full h-full">
        {/* Video shorts feed */}
        <p>Feed Type: {feedType}</p>
        <p>Category: {selectedCategoryId || 'All'}</p>
      </div>
    </div>
  );
}

/**
 * Example 5: Custom filter management
 */
export function CustomFilterExample() {
  const {
    showFilters,
    setShowFilters,
    filters,
    filterActions,
  } = useExploreCommonState();

  const handleApplyPriceFilter = () => {
    filterActions.updateCommonFilters({
      priceMin: 1000000,
      priceMax: 5000000,
    });
  };

  const handleApplyBedroomFilter = () => {
    filterActions.updateResidentialFilters({
      bedrooms: 3,
    });
  };

  const handleResetFilters = () => {
    filterActions.clearFilters();
    setShowFilters(false);
  };

  return (
    <div>
      {/* Quick filter buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleApplyPriceFilter}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          R1M - R5M
        </button>
        <button
          onClick={handleApplyBedroomFilter}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          3 Bedrooms
        </button>
        <button
          onClick={handleResetFilters}
          className="px-4 py-2 bg-gray-500 text-white rounded"
        >
          Reset
        </button>
      </div>

      {/* Filter count display */}
      <div className="mb-4">
        <p>Active Filters: {filterActions.getFilterCount()}</p>
        <p>Property Type: {filters.propertyType || 'All'}</p>
        <p>Price Range: R{filters.priceMin?.toLocaleString()} - R{filters.priceMax?.toLocaleString()}</p>
      </div>

      {/* Full filter panel */}
      <button
        onClick={() => setShowFilters(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Open Full Filters
      </button>
    </div>
  );
}
