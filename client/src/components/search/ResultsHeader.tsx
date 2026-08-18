import { LayoutGrid, List, Map as MapIcon, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type ViewMode = 'grid' | 'list' | 'map';
export type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'date_desc' | 'date_asc';

interface ResultsHeaderProps {
  resultCount?: number;
  isLoading?: boolean;
  hasError?: boolean;
  viewMode: ViewMode;
  sortBy: SortOption;
  onViewModeChange: (mode: ViewMode) => void;
  onSortChange: (sort: SortOption) => void;
  onOpenFilters?: () => void;
  showMobileFilterButton?: boolean;
}

export function ResultsHeader({
  resultCount,
  isLoading,
  hasError,
  viewMode,
  sortBy,
  onViewModeChange,
  onSortChange,
  onOpenFilters,
  showMobileFilterButton = true,
}: ResultsHeaderProps) {
  const hasSettledCount = !isLoading && !hasError && typeof resultCount === 'number';
  const countLabel = isLoading
    ? 'Finding properties that match your search'
    : hasError
      ? 'Property results are temporarily unavailable'
      : hasSettledCount
        ? `${resultCount.toLocaleString()} ${resultCount === 1 ? 'property' : 'properties'} ready to review`
        : 'Preparing property results';

  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white px-4 py-4 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.35)] sm:px-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p role="status" className="text-xs font-medium leading-5 text-slate-700 sm:text-sm">
            {countLabel}
          </p>

          {hasSettledCount && (
            <div className="mt-3 flex flex-wrap gap-2 sm:hidden">
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {resultCount.toLocaleString()} matches
              </div>
            </div>
          )}
        </div>

        {!isLoading && !hasError && (
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
                type="button"
                aria-label="Show list view"
                aria-pressed={viewMode === 'list'}
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
                type="button"
                aria-label="Show grid view"
                aria-pressed={viewMode === 'grid'}
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
                type="button"
                aria-label="Show map view"
                aria-pressed={viewMode === 'map'}
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
        )}
      </div>
    </div>
  );
}
