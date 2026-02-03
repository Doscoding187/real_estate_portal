/**
 * Explore Discovery Page (Aligned with simplified FilterPanel API)
 *
 * - Keeps the same UI intent: video feed + optional category chips + filter panel
 * - Removes the legacy prop-heavy FilterPanel usage
 * - Uses ResponsiveFilterPanel (Zustand-backed) with the simplified API: isOpen/onClose/onApply
 */

import { useState } from 'react';
import { X, Filter, SlidersHorizontal } from 'lucide-react';

import { ExploreVideoFeed } from '@/components/explore-discovery/ExploreVideoFeed';
import { LifestyleCategorySelector } from '@/components/explore-discovery/LifestyleCategorySelector';
import { ResponsiveFilterPanel } from '@/components/explore-discovery/ResponsiveFilterPanel';
import { useCategoryFilter } from '@/hooks/useCategoryFilter';
import { useExploreFiltersStore } from '@/store/exploreFiltersStore';

export default function ExploreDiscovery() {
  const { selectedCategoryId, setSelectedCategoryId } = useCategoryFilter();

  const [showCategoryChips, setShowCategoryChips] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const getFilterCount = useExploreFiltersStore(s => s.getFilterCount);

  return (
    <div className="relative w-full h-screen bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-white text-2xl font-bold">Explore</h1>

          <div className="flex items-center gap-2">
            {/* Category chips toggle */}
            <button
              onClick={() => setShowCategoryChips(v => !v)}
              className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
              aria-label="Toggle category filters"
            >
              <Filter className="w-5 h-5 text-white" />
            </button>

            {/* Advanced filters */}
            <button
              onClick={() => setShowFilters(true)}
              className="relative p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
              aria-label="Open advanced filters"
            >
              <SlidersHorizontal className="w-5 h-5 text-white" />
              {getFilterCount() > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {getFilterCount()}
                </span>
              )}
            </button>

            {/* Close */}
            <button
              onClick={() => window.history.back()}
              className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Category selector */}
        {showCategoryChips && (
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

      {/* Hint overlay (optional) */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
        <div className="px-6 py-3 bg-black/70 backdrop-blur-sm rounded-full text-white text-sm text-center">
          <p>Swipe up for next • Double tap to save</p>
        </div>
      </div>

      {/* Filters (Zustand-backed, simplified API) */}
      <ResponsiveFilterPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={() => setShowFilters(false)}
      />
    </div>
  );
}
