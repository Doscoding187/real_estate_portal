/**
 * ExploreMap Page
 *
 * Map-centric view for exploring properties with synchronized feed.
 * Features modern design with clean map pins, glass overlays, and smooth interactions.
 *
 * Requirements: 3.1, 3.2, 3.3
 *
 * Features:
 * - Map/feed synchronization with throttling and debouncing
 * - Modern category filter bar with pill design
 * - Clean map pins with subtle shadows
 * - Glass overlay controls
 * - Integrated with useExploreCommonState for consistency
 */

import { motion } from 'framer-motion';
import { SlidersHorizontal, MapPin } from 'lucide-react';
import { MapHybridView } from '@/components/explore-discovery/MapHybridView';
import { LifestyleCategorySelector } from '@/components/explore-discovery/LifestyleCategorySelector';
import { FilterPanel } from '@/components/explore-discovery/FilterPanel';
import { ResponsiveFilterPanel } from '@/components/explore-discovery/ResponsiveFilterPanel';
import { useExploreCommonState } from '@/hooks/useExploreCommonState';
import { IconButton } from '@/components/ui/soft/IconButton';

export default function ExploreMap() {
  const {
    selectedCategoryId,
    setSelectedCategoryId,
    showFilters,
    setShowFilters,
    toggleFilters,
    filters,
    filterActions,
  } = useExploreCommonState({
    initialViewMode: 'map',
  });

  const handlePropertyClick = (propertyId: number) => {
    console.log('Navigate to property:', propertyId);
    // TODO: Navigate to property detail page
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Modern category filter bar with glass effect */}
      <motion.div
        className="bg-white/95 backdrop-blur-md border-b border-gray-200/50 px-4 py-3 z-20 shadow-sm"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <div className="flex items-center gap-3">
          {/* Map icon indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-full">
            <MapPin className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-900">Map View</span>
          </div>

          {/* Category selector with modern styling */}
          <div className="flex-1 overflow-hidden">
            <LifestyleCategorySelector
              selectedCategoryId={selectedCategoryId}
              onCategoryChange={setSelectedCategoryId}
              variant="light"
            />
          </div>

          {/* Modern filter button with accent gradient */}
          <motion.button
            onClick={toggleFilters}
            className="relative flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            aria-label="Open filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {filterActions.getFilterCount() > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1.5 -right-1.5 min-w-[1.25rem] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md"
              >
                {filterActions.getFilterCount()}
              </motion.span>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Map hybrid view with modern design */}
      <motion.div
        className="flex-1 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <MapHybridView
          categoryId={selectedCategoryId}
          filters={filters}
          onPropertyClick={handlePropertyClick}
        />
      </motion.div>

      {/* Responsive Filter Panel with modern design */}
      <ResponsiveFilterPanel
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
