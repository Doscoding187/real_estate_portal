/**
 * ExploreMap Page (Aligned with simplified filter API)
 *
 * - Keeps: category selector + map hybrid view + filter badge
 * - Uses ResponsiveFilterPanel with simplified API (Zustand-backed)
 * - Removes legacy prop-heavy filter wiring
 */

import { motion } from 'framer-motion';
import { SlidersHorizontal, MapPin } from 'lucide-react';

import { MapHybridView } from '@/components/explore-discovery/MapHybridView';
import { LifestyleCategorySelector } from '@/components/explore-discovery/LifestyleCategorySelector';
import { ResponsiveFilterPanel } from '@/components/explore-discovery/ResponsiveFilterPanel';
import { useExploreCommonState } from '@/hooks/useExploreCommonState';

export default function ExploreMap() {
  const {
    selectedCategoryId,
    setSelectedCategoryId,
    showFilters,
    setShowFilters,
    toggleFilters,
    filters,
    filterActions,
  } = useExploreCommonState({ initialViewMode: 'map' });

  const handlePropertyClick = (propertyId: number) => {
    console.log('Navigate to property:', propertyId);
    // TODO: Navigate to property detail page
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top bar */}
      <motion.div
        className="bg-white/95 backdrop-blur-md border-b border-gray-200/50 px-4 py-3 z-20 shadow-sm"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-full">
            <MapPin className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-900">Map View</span>
          </div>

          <div className="flex-1 overflow-hidden">
            <LifestyleCategorySelector
              selectedCategoryId={selectedCategoryId}
              onCategoryChange={setSelectedCategoryId}
              variant="light"
            />
          </div>

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

      {/* Map view */}
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

      {/* Filters (simplified API) */}
      <ResponsiveFilterPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={() => setShowFilters(false)}
      />
    </div>
  );
}
