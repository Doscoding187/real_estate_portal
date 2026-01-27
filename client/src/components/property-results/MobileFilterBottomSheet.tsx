/**
 * Mobile Filter Bottom Sheet Component
 *
 * Slide-up bottom sheet for mobile filter experience with:
 * - Smooth animation
 * - Drag-to-close functionality
 * - Focus trap for accessibility
 * - All SA-specific filters
 *
 * Requirements: 2.1, 8.1, 16.5
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, SlidersHorizontal, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import type { PropertyFilters } from '../../../../shared/types';
import {
  Home,
  Building2,
  Shield,
  Heart,
  Wifi,
  Sun,
  Zap,
  Battery,
  Ruler,
  DollarSign,
} from 'lucide-react';

export interface MobileFilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: PropertyFilters;
  onFilterChange: (newFilters: PropertyFilters) => void;
  onApply?: () => void;
  resultCount?: number;
}

// Property types for SA market
const PROPERTY_TYPES = [
  { value: 'house', label: 'House' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'plot', label: 'Plot/Land' },
  { value: 'commercial', label: 'Commercial' },
];

// Title types for SA market
const TITLE_TYPES = [
  { value: 'freehold', label: 'Freehold', icon: Home },
  { value: 'sectional', label: 'Sectional Title', icon: Building2 },
];

// Load-shedding solutions
const LOAD_SHEDDING_SOLUTIONS = [
  { value: 'solar', label: 'Solar', icon: Sun },
  { value: 'generator', label: 'Generator', icon: Zap },
  { value: 'inverter', label: 'Inverter', icon: Battery },
];

// Default ranges
const DEFAULT_PRICE_RANGE: [number, number] = [0, 50000000];
const DEFAULT_LEVY_RANGE: [number, number] = [0, 10000];
const DEFAULT_ERF_SIZE_RANGE: [number, number] = [0, 5000];

type SnapPoint = 'half' | 'full' | 'closed';

const SNAP_POINTS = {
  closed: 0,
  half: 60,
  full: 92,
};

/**
 * MobileFilterBottomSheet Component
 *
 * Mobile-optimized filter panel with slide-up animation and drag-to-close.
 * Includes all SA-specific filters in a scrollable bottom sheet.
 */
export function MobileFilterBottomSheet({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onApply,
  resultCount,
}: MobileFilterBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [snapPoint, setSnapPoint] = useState<SnapPoint>('half');
  const [isDragging, setIsDragging] = useState(false);

  // Local state for sliders
  const [priceRange, setPriceRange] = useState<[number, number]>([
    filters.minPrice ?? DEFAULT_PRICE_RANGE[0],
    filters.maxPrice ?? DEFAULT_PRICE_RANGE[1],
  ]);

  const [levyRange, setLevyRange] = useState<[number, number]>([
    0,
    filters.maxLevy ?? DEFAULT_LEVY_RANGE[1],
  ]);

  const [erfSizeRange, setErfSizeRange] = useState<[number, number]>([
    filters.minErfSize ?? DEFAULT_ERF_SIZE_RANGE[0],
    filters.maxErfSize ?? DEFAULT_ERF_SIZE_RANGE[1],
  ]);

  // Sync local state with props
  useEffect(() => {
    setPriceRange([
      filters.minPrice ?? DEFAULT_PRICE_RANGE[0],
      filters.maxPrice ?? DEFAULT_PRICE_RANGE[1],
    ]);
    setLevyRange([0, filters.maxLevy ?? DEFAULT_LEVY_RANGE[1]]);
    setErfSizeRange([
      filters.minErfSize ?? DEFAULT_ERF_SIZE_RANGE[0],
      filters.maxErfSize ?? DEFAULT_ERF_SIZE_RANGE[1],
    ]);
  }, [filters]);

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

      if (velocity > 500 || offset > vh * 0.2) {
        if (snapPoint === 'full') {
          setSnapPoint('half');
        } else {
          onClose();
        }
      } else if (velocity < -500 || offset < -vh * 0.1) {
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

    firstElement?.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    sheet.addEventListener('keydown', handleTabKey);
    return () => sheet.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  // Escape key to close
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

  // Filter handlers
  const handlePropertyTypeChange = useCallback(
    (type: string, checked: boolean) => {
      const currentTypes = filters.propertyType || [];
      let newTypes: string[];

      if (checked) {
        newTypes = [...currentTypes, type];
      } else {
        newTypes = currentTypes.filter((t: string) => t !== type);
      }

      onFilterChange({
        ...filters,
        propertyType: newTypes.length > 0 ? (newTypes as any) : undefined,
      });
    },
    [filters, onFilterChange],
  );

  const handleTitleTypeChange = useCallback(
    (type: 'freehold' | 'sectional', checked: boolean) => {
      const currentTypes = filters.titleType || [];
      let newTypes: ('freehold' | 'sectional')[];

      if (checked) {
        newTypes = [...currentTypes, type];
      } else {
        newTypes = currentTypes.filter((t: 'freehold' | 'sectional') => t !== type);
      }

      onFilterChange({
        ...filters,
        titleType: newTypes.length > 0 ? newTypes : undefined,
      });
    },
    [filters, onFilterChange],
  );

  const handleBedroomChange = useCallback(
    (beds: number) => {
      if (filters.minBedrooms === beds) {
        const { minBedrooms, ...rest } = filters;
        onFilterChange(rest);
      } else {
        onFilterChange({ ...filters, minBedrooms: beds });
      }
    },
    [filters, onFilterChange],
  );

  const handleBooleanFilterChange = useCallback(
    (key: 'securityEstate' | 'petFriendly' | 'fibreReady', checked: boolean) => {
      if (checked) {
        onFilterChange({ ...filters, [key]: true });
      } else {
        const newFilters = { ...filters };
        delete newFilters[key];
        onFilterChange(newFilters);
      }
    },
    [filters, onFilterChange],
  );

  const handleLoadSheddingChange = useCallback(
    (solution: 'solar' | 'generator' | 'inverter', checked: boolean) => {
      const currentSolutions = filters.loadSheddingSolutions || [];
      let newSolutions: ('solar' | 'generator' | 'inverter' | 'none')[];

      if (checked) {
        newSolutions = [
          ...currentSolutions.filter(
            (s: 'solar' | 'generator' | 'inverter' | 'none') => s !== 'none',
          ),
          solution,
        ];
      } else {
        newSolutions = currentSolutions.filter(
          (s: 'solar' | 'generator' | 'inverter' | 'none') => s !== solution,
        );
      }

      onFilterChange({
        ...filters,
        loadSheddingSolutions: newSolutions.length > 0 ? newSolutions : undefined,
      });
    },
    [filters, onFilterChange],
  );

  const handlePriceCommit = useCallback(
    (value: number[]) => {
      onFilterChange({
        ...filters,
        minPrice: value[0] > 0 ? value[0] : undefined,
        maxPrice: value[1] < DEFAULT_PRICE_RANGE[1] ? value[1] : undefined,
      });
    },
    [filters, onFilterChange],
  );

  const handleLevyCommit = useCallback(
    (value: number[]) => {
      onFilterChange({
        ...filters,
        maxLevy: value[1] < DEFAULT_LEVY_RANGE[1] ? value[1] : undefined,
      });
    },
    [filters, onFilterChange],
  );

  const handleErfSizeCommit = useCallback(
    (value: number[]) => {
      onFilterChange({
        ...filters,
        minErfSize: value[0] > 0 ? value[0] : undefined,
        maxErfSize: value[1] < DEFAULT_ERF_SIZE_RANGE[1] ? value[1] : undefined,
      });
    },
    [filters, onFilterChange],
  );

  const handleResetFilters = useCallback(() => {
    onFilterChange({});
    setPriceRange(DEFAULT_PRICE_RANGE);
    setLevyRange(DEFAULT_LEVY_RANGE);
    setErfSizeRange(DEFAULT_ERF_SIZE_RANGE);
  }, [onFilterChange]);

  const handleApply = useCallback(() => {
    onApply?.();
    onClose();
  }, [onApply, onClose]);

  // Count active filters
  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    if (filters.propertyType?.length) count++;
    if (filters.titleType?.length) count++;
    if (filters.minPrice || filters.maxPrice) count++;
    if (filters.maxLevy) count++;
    if (filters.minBedrooms) count++;
    if (filters.minErfSize || filters.maxErfSize) count++;
    if (filters.securityEstate) count++;
    if (filters.petFriendly) count++;
    if (filters.fibreReady) count++;
    if (filters.loadSheddingSolutions?.length) count++;
    return count;
  }, [filters]);

  const activeFilterCount = getActiveFilterCount();

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
            className="fixed bottom-0 left-0 right-0 bg-white z-50 rounded-t-3xl overflow-hidden flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filter-title"
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" aria-hidden="true" />
            </div>

            {/* Header */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-gray-700" />
                  <h2 id="mobile-filter-title" className="text-lg font-bold text-gray-900">
                    Filters
                  </h2>
                  {activeFilterCount > 0 && (
                    <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close filters"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {resultCount !== undefined && (
                <p className="text-sm text-gray-600 mt-1">
                  {resultCount.toLocaleString()} properties found
                </p>
              )}

              {/* Snap point indicator */}
              <div className="flex justify-center gap-2 mt-2">
                <button
                  onClick={() => setSnapPoint('half')}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    snapPoint === 'half' ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                  aria-label="Snap to half height"
                />
                <button
                  onClick={() => setSnapPoint('full')}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    snapPoint === 'full' ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                  aria-label="Snap to full height"
                />
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
              {/* Budget */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="h-4 w-4 text-gray-600" />
                  <label className="text-sm font-semibold text-gray-900">Budget</label>
                </div>
                <Slider
                  value={[priceRange[0], priceRange[1]]}
                  max={DEFAULT_PRICE_RANGE[1]}
                  step={100000}
                  min={0}
                  onValueChange={value => setPriceRange([value[0], value[1]])}
                  onValueCommit={handlePriceCommit}
                  className="mb-2"
                />
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{formatCurrency(priceRange[0])}</span>
                  <span>{formatCurrency(priceRange[1])}</span>
                </div>
              </div>

              {/* Property Type */}
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-3 block">
                  Property Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {PROPERTY_TYPES.map(type => (
                    <button
                      key={type.value}
                      onClick={() =>
                        handlePropertyTypeChange(
                          type.value,
                          !filters.propertyType?.includes(type.value as any),
                        )
                      }
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        filters.propertyType?.includes(type.value as any)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Type */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Home className="h-4 w-4 text-gray-600" />
                  <label className="text-sm font-semibold text-gray-900">Title Type</label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {TITLE_TYPES.map(type => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        onClick={() =>
                          handleTitleTypeChange(
                            type.value as 'freehold' | 'sectional',
                            !filters.titleType?.includes(type.value as any),
                          )
                        }
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          filters.titleType?.includes(type.value as any)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {type.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Max Levy */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="h-4 w-4 text-gray-600" />
                  <label className="text-sm font-semibold text-gray-900">Max Monthly Levy</label>
                </div>
                <Slider
                  value={[levyRange[1]]}
                  max={DEFAULT_LEVY_RANGE[1]}
                  step={500}
                  min={0}
                  onValueChange={value => setLevyRange([0, value[0]])}
                  onValueCommit={value => handleLevyCommit([0, value[0]])}
                  className="mb-2"
                />
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>R0</span>
                  <span className="font-medium">
                    {levyRange[1] >= DEFAULT_LEVY_RANGE[1]
                      ? 'No limit'
                      : `R${levyRange[1].toLocaleString()}/month`}
                  </span>
                </div>
              </div>

              {/* Bedrooms */}
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-3 block">Bedrooms</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(num => (
                    <button
                      key={num}
                      onClick={() => handleBedroomChange(num)}
                      className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                        filters.minBedrooms === num
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {num}
                      {num === 5 ? '+' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* SA Features */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-gray-600" />
                  <label className="text-sm font-semibold text-gray-900">SA Features</label>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="mobile-security-estate"
                      checked={filters.securityEstate || false}
                      onCheckedChange={checked =>
                        handleBooleanFilterChange('securityEstate', checked as boolean)
                      }
                      className="h-5 w-5"
                    />
                    <Label
                      htmlFor="mobile-security-estate"
                      className="text-sm font-medium text-gray-700 flex items-center gap-2"
                    >
                      <Shield className="h-4 w-4 text-green-600" />
                      Security Estate
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="mobile-pet-friendly"
                      checked={filters.petFriendly || false}
                      onCheckedChange={checked =>
                        handleBooleanFilterChange('petFriendly', checked as boolean)
                      }
                      className="h-5 w-5"
                    />
                    <Label
                      htmlFor="mobile-pet-friendly"
                      className="text-sm font-medium text-gray-700 flex items-center gap-2"
                    >
                      <Heart className="h-4 w-4 text-red-500" />
                      Pet-Friendly
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="mobile-fibre-ready"
                      checked={filters.fibreReady || false}
                      onCheckedChange={checked =>
                        handleBooleanFilterChange('fibreReady', checked as boolean)
                      }
                      className="h-5 w-5"
                    />
                    <Label
                      htmlFor="mobile-fibre-ready"
                      className="text-sm font-medium text-gray-700 flex items-center gap-2"
                    >
                      <Wifi className="h-4 w-4 text-blue-500" />
                      Fibre-Ready
                    </Label>
                  </div>
                </div>
              </div>

              {/* Load-Shedding Solutions */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-gray-600" />
                  <label className="text-sm font-semibold text-gray-900">
                    Load-Shedding Solutions
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {LOAD_SHEDDING_SOLUTIONS.map(solution => {
                    const Icon = solution.icon;
                    return (
                      <button
                        key={solution.value}
                        onClick={() =>
                          handleLoadSheddingChange(
                            solution.value as 'solar' | 'generator' | 'inverter',
                            !filters.loadSheddingSolutions?.includes(solution.value as any),
                          )
                        }
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          filters.loadSheddingSolutions?.includes(solution.value as any)
                            ? 'bg-amber-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {solution.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Erf Size */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Ruler className="h-4 w-4 text-gray-600" />
                  <label className="text-sm font-semibold text-gray-900">Erf Size (m²)</label>
                </div>
                <Slider
                  value={[erfSizeRange[0], erfSizeRange[1]]}
                  max={DEFAULT_ERF_SIZE_RANGE[1]}
                  step={100}
                  min={0}
                  onValueChange={value => setErfSizeRange([value[0], value[1]])}
                  onValueCommit={handleErfSizeCommit}
                  className="mb-2"
                />
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{erfSizeRange[0].toLocaleString()} m²</span>
                  <span>
                    {erfSizeRange[1] >= DEFAULT_ERF_SIZE_RANGE[1]
                      ? '5,000+ m²'
                      : `${erfSizeRange[1].toLocaleString()} m²`}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3 space-y-2">
              <Button
                onClick={handleApply}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                <Check className="w-4 h-4 mr-2" />
                Apply Filters
                {resultCount !== undefined && (
                  <span className="ml-2 text-blue-200">({resultCount.toLocaleString()})</span>
                )}
              </Button>

              {activeFilterCount > 0 && (
                <Button onClick={handleResetFilters} variant="outline" className="w-full" size="lg">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset All Filters
                </Button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
