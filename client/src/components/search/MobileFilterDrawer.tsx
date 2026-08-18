import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarFilters } from '@/components/SidebarFilters';
import { SearchFilters } from '@/lib/urlUtils';

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: SearchFilters;
  onFilterChange: (filters: SearchFilters) => void;
  onSaveSearch?: () => void;
  allowedPropertyTypes?: readonly string[];
  listingType?: 'sale' | 'rent';
  showAmenities?: boolean;
  showLocationRefinement?: boolean;
}

export function MobileFilterDrawer({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onSaveSearch,
  allowedPropertyTypes,
  listingType,
  showAmenities = true,
  showLocationRefinement = true,
}: MobileFilterDrawerProps) {
  const [localFilters, setLocalFilters] = useState(filters);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Sync local filters when prop changes
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Treat the filter sheet as a modal interaction: keep focus inside it,
  // support Escape, restore focus, and prevent background scrolling.
  useEffect(() => {
    if (!isOpen) return undefined;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter(element => element.getAttribute('aria-hidden') !== 'true');
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  const handleApply = () => {
    onFilterChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters({});
  };

  const handleSaveSearch = () => {
    onClose();
    onSaveSearch?.();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-50 bg-black/50 transition-opacity lg:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-property-filter-title"
        className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300 lg:hidden"
      >
        <div className="flex max-h-[90dvh] flex-col rounded-t-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h2 id="mobile-property-filter-title" className="text-lg font-semibold text-slate-800">
              Filter property results
            </h2>
            <div className="flex items-center gap-1">
              {onSaveSearch && (
                <Button type="button" variant="ghost" size="sm" onClick={handleSaveSearch}>
                  Save search
                </Button>
              )}
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close filters"
                onClick={onClose}
                className="rounded-full p-2 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Filter Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <SidebarFilters
              filters={localFilters as any}
              onFilterChange={f => setLocalFilters(f as SearchFilters)}
              onSaveSearch={onSaveSearch}
              allowedPropertyTypes={allowedPropertyTypes}
              listingType={listingType}
              showAmenities={showAmenities}
              showLocationRefinement={showLocationRefinement}
              showHeader={false}
            />
          </div>

          {/* Footer Actions */}
          <div
            className="flex items-center gap-3 border-t border-gray-200 bg-white px-4 pt-4"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
          >
            <Button variant="outline" className="flex-1" onClick={handleReset}>
              Reset
            </Button>
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleApply}>
              Apply Filters
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
