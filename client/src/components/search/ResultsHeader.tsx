import { LayoutGrid, List, Map as MapIcon, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchFilters, propertyTypeToSlug, unslugify } from '@/lib/urlUtils';

export type ViewMode = 'grid' | 'list' | 'map';
export type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'date_desc' | 'date_asc';

interface ResultsHeaderProps {
  filters: SearchFilters;
  resultCount: number;
  isLoading?: boolean;
  viewMode: ViewMode;
  sortBy: SortOption;
  onViewModeChange: (mode: ViewMode) => void;
  onSortChange: (sort: SortOption) => void;
  onOpenFilters?: () => void;
  showMobileFilterButton?: boolean;
}

// Generate human-readable results title
function generateResultsTitle(filters: SearchFilters, count: number, isLoading?: boolean): string {
  const parts: string[] = [];

  // Count
  if (isLoading) {
    parts.push('Loading');
  } else {
    parts.push(count.toLocaleString());
  }

  // Property type
  if (filters.propertyType) {
    const slug = propertyTypeToSlug[filters.propertyType];
    parts.push(unslugify(slug || filters.propertyType));
  } else {
    parts.push('Properties');
  }

  // Listing type
  if (filters.listingType === 'sale') {
    parts.push('for Sale');
  } else if (filters.listingType === 'rent') {
    parts.push('to Rent');
  }

  // Location
  if (filters.suburb && filters.city) {
    parts.push(`in ${filters.suburb}, ${filters.city}`);
  } else if (filters.city) {
    parts.push(`in ${filters.city}`);
  }

  return parts.join(' ');
}

export function ResultsHeader({
  filters,
  resultCount,
  isLoading,
  viewMode,
  sortBy,
  onViewModeChange,
  onSortChange,
  onOpenFilters,
  showMobileFilterButton = true,
}: ResultsHeaderProps) {
  const title = generateResultsTitle(filters, resultCount, isLoading);

  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-gray-100">
      {/* Title & Market Pulse */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          {title}
        </h1>
        {resultCount > 0 && (
            <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Live Market Updates
            </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
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
            <Select value={sortBy} onValueChange={(val) => onSortChange(val as SortOption)}>
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
