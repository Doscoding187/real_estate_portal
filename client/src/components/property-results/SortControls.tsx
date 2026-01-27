/**
 * SortControls Component
 *
 * Provides sort dropdown and view mode toggle for property results page.
 * Integrates with propertyFiltersStore for state management.
 *
 * Features:
 * - Sort dropdown with SA-specific options
 * - View mode toggle (List/Grid/Map)
 * - View mode persisted to localStorage via Zustand store
 * - Responsive design with mobile-friendly touch targets
 *
 * Requirements: 2.3, 3.1, 3.4
 */

import { LayoutGrid, List, Map as MapIcon, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SortOption, ViewMode } from '../../../../shared/types';

/**
 * Sort option configuration with labels
 */
export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'date_desc', label: 'Newest Listed' },
  { value: 'date_asc', label: 'Oldest Listed' },
  { value: 'suburb_asc', label: 'Suburb A-Z' },
  { value: 'suburb_desc', label: 'Suburb Z-A' },
];

/**
 * View mode configuration with icons and labels
 */
export const VIEW_MODES: { value: ViewMode; label: string; icon: typeof List }[] = [
  { value: 'list', label: 'List View', icon: List },
  { value: 'grid', label: 'Grid View', icon: LayoutGrid },
  { value: 'map', label: 'Map View', icon: MapIcon },
];

export interface SortControlsProps {
  /** Current sort option */
  sortOption: SortOption;
  /** Current view mode */
  viewMode: ViewMode;
  /** Callback when sort option changes */
  onSortChange: (sort: SortOption) => void;
  /** Callback when view mode changes */
  onViewModeChange: (mode: ViewMode) => void;
  /** Whether to show view mode toggle (default: true) */
  showViewModeToggle?: boolean;
  /** Whether to show sort dropdown (default: true) */
  showSortDropdown?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * SortControls Component
 *
 * Renders sort dropdown and view mode toggle for property results.
 * View mode preference is persisted to localStorage via the store.
 *
 * @example
 * ```tsx
 * <SortControls
 *   sortOption={sortOption}
 *   viewMode={viewMode}
 *   onSortChange={setSortOption}
 *   onViewModeChange={setViewMode}
 * />
 * ```
 */
export function SortControls({
  sortOption,
  viewMode,
  onSortChange,
  onViewModeChange,
  showViewModeToggle = true,
  showSortDropdown = true,
  className = '',
}: SortControlsProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`} data-testid="sort-controls">
      {/* View Mode Toggle */}
      {showViewModeToggle && (
        <div
          className="hidden sm:flex items-center bg-gray-100 rounded-lg p-1"
          role="group"
          aria-label="View mode selection"
          data-testid="view-mode-toggle"
        >
          {VIEW_MODES.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant="ghost"
              size="sm"
              className={`h-8 px-2.5 min-w-[44px] ${
                viewMode === value
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              onClick={() => onViewModeChange(value)}
              aria-label={label}
              aria-pressed={viewMode === value}
              data-testid={`view-mode-${value}`}
              data-active={viewMode === value}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
      )}

      {/* Sort Dropdown */}
      {showSortDropdown && (
        <Select value={sortOption} onValueChange={val => onSortChange(val as SortOption)}>
          <SelectTrigger
            className="w-[180px] h-9 bg-white border-gray-200"
            data-testid="sort-dropdown"
            aria-label="Sort properties by"
          >
            <ArrowUpDown className="h-4 w-4 mr-2 text-slate-500" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value} data-testid={`sort-option-${value}`}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

/**
 * Mobile View Mode Selector
 *
 * A mobile-friendly version of the view mode toggle that appears
 * as a full-width button group.
 */
export function MobileViewModeSelector({
  viewMode,
  onViewModeChange,
  className = '',
}: Pick<SortControlsProps, 'viewMode' | 'onViewModeChange' | 'className'>) {
  return (
    <div
      className={`flex sm:hidden items-center bg-gray-100 rounded-lg p-1 w-full ${className}`}
      role="group"
      aria-label="View mode selection"
      data-testid="mobile-view-mode-toggle"
    >
      {VIEW_MODES.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          variant="ghost"
          size="sm"
          className={`flex-1 h-10 min-h-[44px] gap-2 ${
            viewMode === value
              ? 'bg-white shadow-sm text-slate-900'
              : 'text-slate-500 hover:text-slate-900'
          }`}
          onClick={() => onViewModeChange(value)}
          aria-label={label}
          aria-pressed={viewMode === value}
          data-testid={`mobile-view-mode-${value}`}
          data-active={viewMode === value}
        >
          <Icon className="h-4 w-4" />
          <span className="text-xs font-medium">
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </span>
        </Button>
      ))}
    </div>
  );
}

export default SortControls;
