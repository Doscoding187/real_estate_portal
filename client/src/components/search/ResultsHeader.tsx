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
  resultCount: number;
  isLoading?: boolean;
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
  viewMode,
  sortBy,
  onViewModeChange,
  onSortChange,
  onOpenFilters,
  showMobileFilterButton = true,
}: ResultsHeaderProps) {
  const countLabel = isLoading
    ? 'Loading properties...'
    : `Showing ${resultCount.toLocaleString()} ${resultCount === 1 ? 'property' : 'properties'}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-600">{countLabel}</p>
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
    </div>
  );
}
