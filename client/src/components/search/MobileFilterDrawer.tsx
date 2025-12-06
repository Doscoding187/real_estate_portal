import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarFilters } from '@/components/SidebarFilters';
import { SearchFilters } from '@/lib/urlUtils';

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: SearchFilters;
  onFilterChange: (filters: SearchFilters) => void;
}

export function MobileFilterDrawer({
  isOpen,
  onClose,
  filters,
  onFilterChange,
}: MobileFilterDrawerProps) {
  const [localFilters, setLocalFilters] = useState(filters);

  // Sync local filters when prop changes
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Prevent body scroll when drawer is open
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
    onFilterChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters({});
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity lg:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-x-0 bottom-0 z-50 lg:hidden animate-in slide-in-from-bottom duration-300">
        <div className="bg-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-slate-800">Filters</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Filter Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <SidebarFilters
              filters={localFilters as any}
              onFilterChange={(f) => setLocalFilters(f as SearchFilters)}
              onSaveSearch={() => {}}
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center gap-3 px-4 py-4 border-t border-gray-200 bg-white">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleReset}
            >
              Reset
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={handleApply}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
