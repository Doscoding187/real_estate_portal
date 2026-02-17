import { LayoutGrid, List, Map as MapIcon, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchFilters } from '@/lib/urlUtils';

export type ViewMode = 'grid' | 'list' | 'map';
export type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'date_desc' | 'date_asc';

interface ResultsHeaderProps {
  filters: SearchFilters;
  resultCount: number;
  displayedPropertyCount?: number;
  developmentCount?: number;
  isLoading?: boolean;
  viewMode: ViewMode;
  sortBy: SortOption;
  onViewModeChange: (mode: ViewMode) => void;
  onSortChange: (sort: SortOption) => void;
  onOpenFilters?: () => void;
  showMobileFilterButton?: boolean;
  locationContext?: {
    name: string;
    type: 'province' | 'city' | 'suburb';
    hierarchy?: {
      province: string;
      city?: string;
      suburb?: string;
    };
  };
}

export function ResultsHeader({
  filters,
  resultCount,
  displayedPropertyCount = resultCount,
  developmentCount = 0,
  isLoading,
  viewMode,
  sortBy,
  onViewModeChange,
  onSortChange,
  onOpenFilters,
  showMobileFilterButton = true,
  locationContext,
}: ResultsHeaderProps) {
  // Generate hierarchy breadcrumbs if context exists
  const locationHierarchy = locationContext?.hierarchy
    ? [
        locationContext.hierarchy.suburb,
        locationContext.hierarchy.city,
        locationContext.hierarchy.province,
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      {/* Left Column: Market + Count */}
      <div className="min-w-0">
        <div className="text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span>Live Market Updates</span>
          </div>
          <div className="mt-1">
            {!isLoading ? (
              <span>
                Showing {displayedPropertyCount.toLocaleString()} of {resultCount.toLocaleString()}{' '}
                properties
                {developmentCount > 0 ? ` and ${developmentCount.toLocaleString()} developments` : ''}
              </span>
            ) : (
              <span>Loading results...</span>
            )}
          </div>
        </div>
        {locationHierarchy && (
          <div className="mt-1 text-xs text-slate-500">
            Searching in: <span className="text-slate-700">{locationHierarchy}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Filter Button - Kept for legacy/tablet, but hidden if Sticky Controls are used on mobile */}
        {showMobileFilterButton && onOpenFilters && (
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden border-gray-200 hidden sm:flex" // Hide on tiny screens where sticky bar takes over
            onClick={onOpenFilters}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
          </Button>
        )}

        {/* View Mode Toggle - Segmented Control Style */}
        <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => onViewModeChange('list')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === 'list'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <List className="h-4 w-4" />
            <span className="hidden md:inline">List</span>
          </button>
          <button
            onClick={() => onViewModeChange('grid')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === 'grid'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden md:inline">Grid</span>
          </button>
          <button
            onClick={() => onViewModeChange('map')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === 'map'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <MapIcon className="h-4 w-4" />
            <span className="hidden md:inline">Map</span>
          </button>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 font-medium hidden sm:inline">Sort by:</span>
          <Select value={sortBy} onValueChange={val => onSortChange(val as SortOption)}>
            <SelectTrigger className="w-[140px] sm:w-[180px] h-10 bg-white border-gray-200 font-medium text-slate-700">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="price_asc">Lowest Price</SelectItem>
              <SelectItem value="price_desc">Highest Price</SelectItem>
              <SelectItem value="date_desc">Newest Listed</SelectItem>
              <SelectItem value="date_asc">Oldest Listed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
