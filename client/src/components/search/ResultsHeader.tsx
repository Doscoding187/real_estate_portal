import {
  ArrowRight,
  Building2,
  Home,
  LayoutGrid,
  List,
  Map as MapIcon,
  SlidersHorizontal,
} from 'lucide-react';
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
  manualTotalCount?: number;
  developmentTotalCount?: number;
  resultsSummaryText?: string;
  pageSummaryText?: string;
  blendPolicyCopy?: string;
  isLoading?: boolean;
  viewMode: ViewMode;
  sortBy: SortOption;
  onViewModeChange: (mode: ViewMode) => void;
  onSortChange: (sort: SortOption) => void;
  onListingSourceChange?: (source?: SearchFilters['listingSource']) => void;
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
  manualTotalCount = 0,
  developmentTotalCount = 0,
  resultsSummaryText,
  pageSummaryText,
  blendPolicyCopy,
  isLoading,
  viewMode,
  sortBy,
  onViewModeChange,
  onSortChange,
  onListingSourceChange,
  onOpenFilters,
  showMobileFilterButton = true,
  locationContext,
}: ResultsHeaderProps) {
  const locationHierarchy = locationContext?.hierarchy
    ? [
        locationContext.hierarchy.suburb,
        locationContext.hierarchy.city,
        locationContext.hierarchy.province,
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  const showSourceMerchandising = manualTotalCount > 0 || developmentTotalCount > 0;
  const isManualActive = filters.listingSource === 'manual';
  const isDevelopmentActive = filters.listingSource === 'development';
  const isAllActive = !filters.listingSource;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <div className="text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
              </span>
              <span>Live Market Updates</span>
            </div>
            <div className="mt-1">
              {!isLoading ? (
                <span>
                  {resultsSummaryText ??
                    `Showing ${displayedPropertyCount.toLocaleString()} of ${resultCount.toLocaleString()} results${
                      developmentCount > 0
                        ? `, including ${developmentCount.toLocaleString()} development listings`
                        : ''
                    }`}
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
          {blendPolicyCopy && <div className="mt-1 text-xs text-slate-500">{blendPolicyCopy}</div>}
          {!isLoading && pageSummaryText && (
            <div className="mt-1 text-xs text-slate-500">{pageSummaryText}</div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {showMobileFilterButton && onOpenFilters && (
            <Button
              variant="outline"
              size="sm"
              className="hidden border-gray-200 sm:flex lg:hidden"
              onClick={onOpenFilters}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
            </Button>
          )}

          <div className="hidden items-center rounded-lg border border-slate-200 bg-slate-100 p-1 sm:flex">
            <button
              onClick={() => onViewModeChange('list')}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
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
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
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
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                viewMode === 'map'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <MapIcon className="h-4 w-4" />
              <span className="hidden md:inline">Map</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-sm font-medium text-slate-500 sm:inline">Sort by:</span>
            <Select value={sortBy} onValueChange={val => onSortChange(val as SortOption)}>
              <SelectTrigger className="h-10 w-[140px] border-gray-200 bg-white font-medium text-slate-700 sm:w-[180px]">
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

      {showSourceMerchandising && onListingSourceChange && (
        <div className="grid gap-3 md:grid-cols-2">
          <div
            className={`rounded-2xl border p-4 transition-colors ${
              isManualActive
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Home className="h-4 w-4" />
                  <span>Property Listings</span>
                </div>
                <div className={`mt-2 text-2xl font-bold ${isManualActive ? 'text-white' : 'text-slate-900'}`}>
                  {manualTotalCount.toLocaleString()}
                </div>
                <p className={`mt-1 text-sm ${isManualActive ? 'text-slate-200' : 'text-slate-600'}`}>
                  Agent and private listings for specific homes currently on the market.
                </p>
              </div>
              {isManualActive && (
                <span className="rounded-full bg-white/15 px-2 py-1 text-xs font-semibold text-white">
                  Active
                </span>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={isManualActive ? 'secondary' : 'default'}
                className={isManualActive ? 'bg-white text-slate-900 hover:bg-slate-100' : ''}
                onClick={() => onListingSourceChange(isManualActive ? undefined : 'manual')}
              >
                {isManualActive ? 'Show All Results' : 'View Property Listings'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              {!isAllActive && !isManualActive && (
                <Button size="sm" variant="outline" onClick={() => onListingSourceChange(undefined)}>
                  Clear Source Filter
                </Button>
              )}
            </div>
          </div>

          <div
            className={`rounded-2xl border p-4 transition-colors ${
              isDevelopmentActive
                ? 'border-blue-700 bg-blue-700 text-white'
                : 'border-blue-200 bg-blue-50'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Building2 className="h-4 w-4" />
                  <span>New Developments</span>
                </div>
                <div
                  className={`mt-2 text-2xl font-bold ${
                    isDevelopmentActive ? 'text-white' : 'text-blue-950'
                  }`}
                >
                  {developmentTotalCount.toLocaleString()}
                </div>
                <p className={`mt-1 text-sm ${isDevelopmentActive ? 'text-blue-100' : 'text-blue-900/80'}`}>
                  Unit-type inventory from active developments, including off-plan and under-construction stock.
                </p>
              </div>
              {isDevelopmentActive && (
                <span className="rounded-full bg-white/15 px-2 py-1 text-xs font-semibold text-white">
                  Active
                </span>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={isDevelopmentActive ? 'secondary' : 'default'}
                className={isDevelopmentActive ? 'bg-white text-blue-900 hover:bg-blue-100' : 'bg-blue-700 hover:bg-blue-800'}
                onClick={() => onListingSourceChange(isDevelopmentActive ? undefined : 'development')}
              >
                {isDevelopmentActive ? 'Show All Results' : 'View New Developments'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              {!isAllActive && !isDevelopmentActive && (
                <Button size="sm" variant="outline" onClick={() => onListingSourceChange(undefined)}>
                  Clear Source Filter
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
