/**
 * Responsive Filter Panel Component
 *
 * Automatically switches between desktop sidebar and mobile bottom sheet
 * based on screen size. Provides a unified API for filter management.
 *
 * Requirements: 2.1, 8.1, 16.5
 */

import { useState, useEffect, useCallback } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EnhancedSidebarFilters } from './EnhancedSidebarFilters';
import { MobileFilterBottomSheet } from './MobileFilterBottomSheet';
import type { PropertyFilters } from '../../../../shared/types';

export interface ResponsiveFilterPanelProps {
  filters: PropertyFilters;
  onFilterChange: (newFilters: PropertyFilters) => void;
  onSaveSearch?: () => void;
  resultCount?: number;
  className?: string;
}

// Breakpoint for mobile/desktop switch (matches Tailwind's lg breakpoint)
const MOBILE_BREAKPOINT = 1024;

/**
 * Custom hook to detect mobile viewport
 */
function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Initial check
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
}

/**
 * ResponsiveFilterPanel Component
 *
 * Renders either a desktop sidebar or mobile bottom sheet based on viewport.
 * On mobile, shows a floating filter button that opens the bottom sheet.
 */
export function ResponsiveFilterPanel({
  filters,
  onFilterChange,
  onSaveSearch,
  resultCount,
  className,
}: ResponsiveFilterPanelProps) {
  const isMobile = useIsMobile();
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  // Count active filters for badge
  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    if (filters.propertyType?.length) count++;
    if (filters.titleType?.length) count++;
    if (filters.minPrice || filters.maxPrice) count++;
    if (filters.maxLevy) count++;
    if (filters.minBedrooms) count++;
    if (filters.minErfSize || filters.maxErfSize) count++;
    if (filters.minFloorSize || filters.maxFloorSize) count++;
    if (filters.securityEstate) count++;
    if (filters.petFriendly) count++;
    if (filters.fibreReady) count++;
    if (filters.loadSheddingSolutions?.length) count++;
    return count;
  }, [filters]);

  const activeFilterCount = getActiveFilterCount();

  // Close bottom sheet when switching to desktop
  useEffect(() => {
    if (!isMobile && isBottomSheetOpen) {
      setIsBottomSheetOpen(false);
    }
  }, [isMobile, isBottomSheetOpen]);

  // Mobile view: Floating button + Bottom sheet
  if (isMobile) {
    return (
      <>
        {/* Floating Filter Button */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
          <Button
            onClick={() => setIsBottomSheetOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-full px-6 py-3 flex items-center gap-2"
            size="lg"
          >
            <SlidersHorizontal className="h-5 w-5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="bg-white text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Mobile Bottom Sheet */}
        <MobileFilterBottomSheet
          isOpen={isBottomSheetOpen}
          onClose={() => setIsBottomSheetOpen(false)}
          filters={filters}
          onFilterChange={onFilterChange}
          onApply={() => setIsBottomSheetOpen(false)}
          resultCount={resultCount}
        />
      </>
    );
  }

  // Desktop view: Sidebar
  return (
    <EnhancedSidebarFilters
      filters={filters}
      onFilterChange={onFilterChange}
      onSaveSearch={onSaveSearch}
      resultCount={resultCount}
      className={className}
    />
  );
}
