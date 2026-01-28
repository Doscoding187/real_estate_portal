/**
 * Mobile Filter Bottom Sheet Component
 * Drag-to-close bottom sheet with snap points, keyboard navigation, and focus trap
 * Requirements: 4.5, 4.6, 4.7
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, SlidersHorizontal, Check } from 'lucide-react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { useExploreFiltersStore } from '@/store/exploreFiltersStore';
import { MicroPill } from '@/components/ui/soft/MicroPill';
import { IconButton } from '@/components/ui/soft/IconButton';
import { designTokens } from '@/lib/design-tokens';

interface MobileFilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: () => void;
}

type SnapPoint = 'half' | 'full' | 'closed';

const SNAP_POINTS = {
  closed: 0,
  half: 50, // 50% of viewport height
  full: 90, // 90% of viewport height
};

export function MobileFilterBottomSheet({
  isOpen,
  onClose,
  onApply,
}: MobileFilterBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [snapPoint, setSnapPoint] = useState<SnapPoint>('half');
  const [isDragging, setIsDragging] = useState(false);
  const y = useMotionValue(0);

  // Get filter state from Zustand store
  const {
    propertyType,
    priceMin,
    priceMax,
    bedrooms,
    bathrooms,
    categoryId,
    location,
    setPropertyType,
    setPriceRange,
    setBedrooms,
    setBathrooms,
    setCategoryId,
    setLocation,
    clearFilters,
    getFilterCount,
  } = useExploreFiltersStore();

  const filterCount = getFilterCount();

  // Calculate sheet height based on snap point
  const getSheetHeight = useCallback(() => {
    if (typeof window === 'undefined') return 0;
    const vh = window.innerHeight;
    return (vh * SNAP_POINTS[snapPoint]) / 100;
  }, [snapPoint]);

  // Handle drag end and snap to nearest point
  const handleDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      setIsDragging(false);
      const velocity = info.velocity.y;
      const offset = info.offset.y;
      const vh = window.innerHeight;

      // If dragging down with velocity or past threshold, close or snap to half
      if (velocity > 500 || offset > vh * 0.2) {
        if (snapPoint === 'full') {
          setSnapPoint('half');
        } else {
          onClose();
        }
      }
      // If dragging up with velocity or past threshold, snap to full
      else if (velocity < -500 || offset < -vh * 0.1) {
        setSnapPoint('full');
      }
    },
    [snapPoint, onClose],
  );

  // Focus trap implementation
  useEffect(() => {
    if (!isOpen || !sheetRef.current) return;

    const sheet = sheetRef.current;
    const focusableElements = sheet.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element when opened
    firstElement?.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    sheet.addEventListener('keydown', handleTabKey);
    return () => sheet.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  // Keyboard navigation - Escape to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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
            aria-hidden="true"
          />

          {/* Bottom Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{
              y: snapPoint === 'closed' ? '100%' : 0,
              height: getSheetHeight(),
            }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            style={{ y }}
            className="fixed bottom-0 left-0 right-0 bg-white z-50 rounded-t-3xl overflow-hidden flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="filter-sheet-title"
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" aria-hidden="true" />
            </div>

            {/* Header */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <SlidersHorizontal className="w-5 h-5 text-gray-700" />
                  <h2 id="filter-sheet-title" className="text-xl font-bold text-gray-900">
                    Filters
                  </h2>
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
                    aria-label="Reset all filters"
                  >
                    Reset
                  </button>
                </div>
              )}

              {/* Snap point indicator */}
              <div className="flex justify-center gap-2 mt-3">
                <button
                  onClick={() => setSnapPoint('half')}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    snapPoint === 'half' ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                  aria-label="Snap to half height"
                />
                <button
                  onClick={() => setSnapPoint('full')}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    snapPoint === 'full' ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                  aria-label="Snap to full height"
                />
              </div>
            </div>

            {/* Content - Scrollable */}
            <div ref={contentRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
              {/* Property Type */}
              <div>
                <label
                  className="block text-sm font-semibold text-gray-900 mb-3"
                  id="property-type-label"
                >
                  Property Type
                </label>
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-labelledby="property-type-label"
                >
                  {propertyTypes.map(type => (
                    <MicroPill
                      key={type.value}
                      label={type.label}
                      selected={propertyType === type.value}
                      onClick={() =>
                        setPropertyType(propertyType === type.value ? null : type.value)
                      }
                      size="md"
                      variant="default"
                    />
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <label
                  className="block text-sm font-semibold text-gray-900 mb-3"
                  id="price-range-label"
                >
                  Price Range
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="min-price" className="block text-xs text-gray-600 mb-1.5">
                      Min Price
                    </label>
                    <input
                      id="min-price"
                      type="number"
                      value={priceMin || ''}
                      onChange={e =>
                        setPriceRange(e.target.value ? Number(e.target.value) : null, priceMax)
                      }
                      placeholder="No min"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      style={{ boxShadow: designTokens.shadows.sm }}
                      aria-label="Minimum price"
                    />
                  </div>
                  <div>
                    <label htmlFor="max-price" className="block text-xs text-gray-600 mb-1.5">
                      Max Price
                    </label>
                    <input
                      id="max-price"
                      type="number"
                      value={priceMax || ''}
                      onChange={e =>
                        setPriceRange(priceMin, e.target.value ? Number(e.target.value) : null)
                      }
                      placeholder="No max"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      style={{ boxShadow: designTokens.shadows.sm }}
                      aria-label="Maximum price"
                    />
                  </div>
                </div>
              </div>

              {/* Bedrooms */}
              <div>
                <label
                  className="block text-sm font-semibold text-gray-900 mb-3"
                  id="bedrooms-label"
                >
                  Bedrooms
                </label>
                <div className="flex flex-wrap gap-2" role="group" aria-labelledby="bedrooms-label">
                  {bedroomOptions.map(num => (
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
                <label
                  className="block text-sm font-semibold text-gray-900 mb-3"
                  id="bathrooms-label"
                >
                  Bathrooms
                </label>
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-labelledby="bathrooms-label"
                >
                  {bathroomOptions.map(num => (
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
                <label
                  htmlFor="location-input"
                  className="block text-sm font-semibold text-gray-900 mb-3"
                >
                  Location
                </label>
                <input
                  id="location-input"
                  type="text"
                  value={location || ''}
                  onChange={e => setLocation(e.target.value || null)}
                  placeholder="Enter location..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  style={{ boxShadow: designTokens.shadows.sm }}
                  aria-label="Location"
                />
              </div>
            </div>

            {/* Footer with Apply and Reset buttons */}
            <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4 space-y-3">
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
                aria-label="Apply filters"
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
                  aria-label="Reset all filters"
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
