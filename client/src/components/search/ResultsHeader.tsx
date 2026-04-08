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
  const journeySummary = [filters.listingType, filters.propertyType].filter(Boolean).join(' / ');
  const locationHierarchy = locationContext?.hierarchy
    ? [
        locationContext.hierarchy.suburb,
        locationContext.hierarchy.city,
        locationContext.hierarchy.province,
      ]
        .filter(Boolean)
        .join(' / ')
    : null;

  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white px-4 py-4 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.35)] sm:px-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {journeySummary && (
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                {journeySummary}
              </div>
            )}
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 sm:hidden">
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              Live
            </div>
            <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 sm:inline-flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              Live Market Updates
            </div>
          </div>

          <div className="mt-3">
            {!isLoading ? (
              <>
                <h1 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-2xl lg:text-[1.65rem]">
                  {displayedPropertyCount.toLocaleString()} listings ready to review
                </h1>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Showing {displayedPropertyCount.toLocaleString()} of{' '}
                  {resultCount.toLocaleString()} properties
                  {developmentCount > 0
                    ? ` and ${developmentCount.toLocaleString()} developments`
                    : ''}
                  .
                </p>
              </>
            ) : (
              <>
                <h1 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-2xl lg:text-[1.65rem]">
                  Loading current market matches
                </h1>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  We are preparing the latest listings for this search.
                </p>
              </>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2 sm:hidden">
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {displayedPropertyCount.toLocaleString()} visible
            </div>
            {developmentCount > 0 && (
              <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                {developmentCount.toLocaleString()} developments
              </div>
            )}
          </div>

          <div className="mt-3 hidden flex-wrap gap-2 sm:flex">
            {locationHierarchy && (
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                Searching in {locationHierarchy}
              </div>
            )}
            {developmentCount > 0 && (
              <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                {developmentCount.toLocaleString()} developments in this mix
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:min-w-[340px]">
          {showMobileFilterButton && onOpenFilters && (
            <Button
              variant="outline"
              size="sm"
              className="hidden border-slate-200 bg-white text-slate-700 shadow-sm sm:flex lg:hidden"
              onClick={onOpenFilters}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
            </Button>
          )}

          <div className="hidden items-center rounded-xl border border-slate-200 bg-slate-100/90 p-1 shadow-inner sm:flex">
            <button
              onClick={() => onViewModeChange('list')}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
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
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
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
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                viewMode === 'map'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <MapIcon className="h-4 w-4" />
              <span className="hidden md:inline">Map</span>
            </button>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <span className="hidden text-sm font-medium text-slate-500 sm:inline">Sort by:</span>
            <Select value={sortBy} onValueChange={val => onSortChange(val as SortOption)}>
              <SelectTrigger className="h-11 w-full min-w-[160px] border-slate-200 bg-white font-medium text-slate-700 shadow-sm sm:w-[190px]">
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
    </div>
  );
}
