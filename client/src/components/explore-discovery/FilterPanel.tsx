/**
 * Filter Panel Component
 * Modern filter panel with Zustand integration and chip-style filters
 * Requirements: 4.3, 4.4
 */

import { X, SlidersHorizontal, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExploreFiltersStore } from '@/store/exploreFiltersStore';
import { MicroPill } from '@/components/ui/soft/MicroPill';
import { IconButton } from '@/components/ui/soft/IconButton';
import { AgencySelector } from '@/components/explore-discovery/AgencySelector';
import { designTokens } from '@/lib/design-tokens';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: () => void;
}

export function FilterPanel({
  isOpen,
  onClose,
  onApply,
}: FilterPanelProps) {
  // Get filter state from Zustand store
  const {
    propertyType,
    priceMin,
    priceMax,
    bedrooms,
    bathrooms,
    categoryId,
    location,
    agencyId,
    setPropertyType,
    setPriceRange,
    setBedrooms,
    setBathrooms,
    setCategoryId,
    setLocation,
    setAgencyId,
    clearFilters,
    getFilterCount,
  } = useExploreFiltersStore();

  const filterCount = getFilterCount();

  const handleApply = () => {
    onApply?.();
    onClose();
  };

  const handleReset = () => {
    clearFilters();
  };

  const propertyTypes = [
    { value: 'residential', label: 'Residential' },
    { value: 'development', label: 'Developments' },
    { value: 'land', label: 'Land' },
  ];

  const bedroomOptions = [1, 2, 3, 4, 5];
  const bathroomOptions = [1, 2, 3, 4];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white z-50 overflow-y-auto"
            style={{ boxShadow: designTokens.shadows['2xl'] }}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <SlidersHorizontal className="w-5 h-5 text-gray-700" />
                  <h2 className="text-xl font-bold text-gray-900">Filters</h2>
                </div>
                <IconButton
                  icon={X}
                  onClick={onClose}
                  label="Close filters"
                  size="md"
                  variant="default"
                />
              </div>
              
              {filterCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {filterCount} filter{filterCount !== 1 ? 's' : ''} active
                  </span>
                  <button
                    onClick={handleReset}
                    className="text-sm font-medium transition-colors"
                    style={{ color: designTokens.colors.accent.primary }}
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="px-6 py-6 space-y-8">
              {/* Property Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Property Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {propertyTypes.map((type) => (
                    <MicroPill
                      key={type.value}
                      label={type.label}
                      selected={propertyType === type.value}
                      onClick={() => setPropertyType(propertyType === type.value ? null : type.value)}
                      size="md"
                      variant="default"
                    />
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Price Range
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1.5">Min Price</label>
                    <input
                      type="number"
                      value={priceMin || ''}
                      onChange={(e) => setPriceRange(e.target.value ? Number(e.target.value) : null, priceMax)}
                      placeholder="No min"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      style={{ boxShadow: designTokens.shadows.sm }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1.5">Max Price</label>
                    <input
                      type="number"
                      value={priceMax || ''}
                      onChange={(e) => setPriceRange(priceMin, e.target.value ? Number(e.target.value) : null)}
                      placeholder="No max"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      style={{ boxShadow: designTokens.shadows.sm }}
                    />
                  </div>
                </div>
              </div>

              {/* Bedrooms */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Bedrooms
                </label>
                <div className="flex flex-wrap gap-2">
                  {bedroomOptions.map((num) => (
                    <MicroPill
                      key={num}
                      label={`${num}+`}
                      selected={bedrooms === num}
                      onClick={() => setBedrooms(bedrooms === num ? null : num)}
                      size="md"
                      variant="default"
                    />
                  ))}
                </div>
              </div>

              {/* Bathrooms */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Bathrooms
                </label>
                <div className="flex flex-wrap gap-2">
                  {bathroomOptions.map((num) => (
                    <MicroPill
                      key={num}
                      label={`${num}+`}
                      selected={bathrooms === num}
                      onClick={() => setBathrooms(bathrooms === num ? null : num)}
                      size="md"
                      variant="default"
                    />
                  ))}
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Location
                </label>
                <input
                  type="text"
                  value={location || ''}
                  onChange={(e) => setLocation(e.target.value || null)}
                  placeholder="Enter location..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  style={{ boxShadow: designTokens.shadows.sm }}
                />
              </div>

              {/* Agency Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Agency
                </label>
                <AgencySelector
                  selectedAgencyId={agencyId}
                  onAgencyChange={setAgencyId}
                />
              </div>
            </div>

            {/* Footer with Apply and Reset buttons */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 space-y-3">
              <motion.button
                onClick={handleApply}
                className="w-full px-6 py-3 text-white rounded-xl font-medium transition-all"
                style={{
                  background: designTokens.colors.accent.gradient,
                  boxShadow: designTokens.shadows.accent,
                }}
                whileHover={{ 
                  scale: 1.02,
                  boxShadow: designTokens.shadows.accentHover,
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15 }}
              >
                <div className="flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" />
                  <span>Apply Filters</span>
                </div>
              </motion.button>
              
              {filterCount > 0 && (
                <motion.button
                  onClick={handleReset}
                  className="w-full px-6 py-3 bg-white text-gray-700 rounded-xl font-medium border border-gray-300 hover:bg-gray-50 transition-all"
                  style={{ boxShadow: designTokens.shadows.sm }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                >
                  Reset All Filters
                </motion.button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

