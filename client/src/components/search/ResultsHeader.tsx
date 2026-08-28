import { Bell, List, Map as MapIcon, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type ViewMode = 'list' | 'map';
export type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'date_desc' | 'date_asc';

interface ResultsHeaderProps {
  title?: string;
  scopeLabels?: string[];
  resultCount?: number;
  isLoading?: boolean;
  hasError?: boolean;
  viewMode: ViewMode;
  sortBy: SortOption;
  onViewModeChange: (mode: ViewMode) => void;
  onSortChange: (sort: SortOption) => void;
  onOpenFilters?: () => void;
  onSaveSearch?: () => void;
  showMobileFilterButton?: boolean;
}
export function ResultsHeader({
  title = 'Properties',
  scopeLabels = [],
  resultCount,
  isLoading,
  hasError,
  viewMode,
  sortBy,
  onViewModeChange,
  onSortChange,
  onOpenFilters,
  onSaveSearch,
  showMobileFilterButton = true,
}: ResultsHeaderProps) {
  const hasSettledCount = !isLoading && !hasError && typeof resultCount === 'number';
  const countLabel = isLoading
    ? 'Finding properties that match your search'
    : hasError
      ? 'Property results are temporarily unavailable'
      : hasSettledCount
        ? `${resultCount.toLocaleString()} verified ${resultCount === 1 ? 'listing' : 'listings'}`
        : 'Preparing property results';

  return (
    <header className="border-b border-slate-200 pb-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
          <p role="status" className="mt-1.5 text-sm text-slate-500">
            {countLabel}
          </p>
          {scopeLabels.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2" aria-label="Search scope">
              {scopeLabels.map(label => (
                <span
                  key={label}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {!isLoading && !hasError ? (
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
            {showMobileFilterButton && onOpenFilters ? (
              <Button
                variant="outline"
                className="h-10 rounded-lg border-slate-200 bg-white text-slate-700 lg:hidden"
                onClick={onOpenFilters}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filters
              </Button>
            ) : null}

            {onSaveSearch ? (
              <Button
                type="button"
                variant="outline"
                className="hidden h-10 rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-50 lg:inline-flex"
                onClick={onSaveSearch}
              >
                <Bell className="mr-2 h-4 w-4" aria-hidden="true" />
                Save search
              </Button>
            ) : null}

            <div className="hidden items-center rounded-lg border border-slate-200 bg-white p-1 sm:flex">
              <ViewButton
                label="List"
                icon={List}
                selected={viewMode === 'list'}
                onClick={() => onViewModeChange('list')}
              />
              <ViewButton
                label="Map"
                icon={MapIcon}
                selected={viewMode === 'map'}
                onClick={() => onViewModeChange('map')}
              />
            </div>

            <Select value={sortBy} onValueChange={value => onSortChange(value as SortOption)}>
              <SelectTrigger
                aria-label="Sort properties"
                className="h-10 min-w-[170px] flex-1 rounded-lg border-slate-200 bg-white font-semibold text-slate-700 shadow-none sm:flex-none"
              >
                <SelectValue placeholder="Recommended" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Recommended</SelectItem>
                <SelectItem value="price_asc">Lowest price</SelectItem>
                <SelectItem value="price_desc">Highest price</SelectItem>
                <SelectItem value="date_desc">Newest listed</SelectItem>
                <SelectItem value="date_asc">Oldest listed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
    </header>
  );
}

function ViewButton({
  label,
  icon: Icon,
  selected,
  onClick,
}: {
  label: 'List' | 'Map';
  icon: typeof List;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Show ${label.toLowerCase()} view`}
      aria-pressed={selected}
      onClick={onClick}
      className={`flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors ${
        selected ? 'bg-slate-100 text-slate-950' : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}
