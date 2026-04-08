import { ArrowUpDown, List, Map as MapIcon, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SortOption } from '@/components/search/ResultsHeader';

interface MobileStickyControlsProps {
  onOpenFilters: () => void;
  currentView: 'list' | 'map' | 'grid';
  onViewChange: (view: 'list' | 'map' | 'grid') => void;
  onSortChange?: (sort: SortOption) => void;
  currentSort?: SortOption;
  resultCount?: number;
}

const SORT_LABELS: Record<SortOption, string> = {
  relevance: 'Relevance',
  price_asc: 'Lowest Price',
  price_desc: 'Highest Price',
  date_desc: 'Newest',
  date_asc: 'Oldest',
};
const SORT_SHORT_LABELS: Record<SortOption, string> = {
  relevance: 'Sort',
  price_asc: 'Low',
  price_desc: 'High',
  date_desc: 'New',
  date_asc: 'Old',
};

export function MobileStickyControls({
  onOpenFilters,
  currentView,
  onViewChange,
  onSortChange,
  currentSort = 'relevance',
  resultCount,
}: MobileStickyControlsProps) {
  const toggleView = () => {
    onViewChange(currentView === 'map' ? 'list' : 'map');
  };

  return (
    <div
      className="fixed bottom-3 left-1/2 z-50 flex w-[calc(100%-1.25rem)] max-w-md -translate-x-1/2 items-center justify-between rounded-[22px] border border-slate-200/80 bg-white/95 px-2.5 pt-2.5 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.45)] backdrop-blur-md lg:hidden"
      style={{ paddingBottom: 'calc(0.6rem + env(safe-area-inset-bottom))' }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-10 rounded-full border-slate-200 px-3 text-slate-700"
          onClick={onOpenFilters}
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filters
        </Button>

        {typeof resultCount === 'number' && (
          <div className="hidden rounded-full bg-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 min-[390px]:inline-flex">
            {resultCount.toLocaleString()} found
          </div>
        )}
      </div>

      <div className="ml-3 flex shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-10 rounded-full px-2.5 text-slate-700 hover:bg-slate-100"
          onClick={toggleView}
        >
          {currentView === 'map' ? (
            <>
              <List className="h-4 w-4 min-[390px]:mr-1.5" />
              <span className="hidden min-[390px]:inline">List</span>
            </>
          ) : (
            <>
              <MapIcon className="h-4 w-4 min-[390px]:mr-1.5" />
              <span className="hidden min-[390px]:inline">Map</span>
            </>
          )}
        </Button>

        {onSortChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 rounded-full px-2.5 text-slate-700 hover:bg-slate-100"
              >
                <ArrowUpDown className="h-4 w-4 min-[390px]:mr-1.5" />
                <span className="hidden min-[390px]:inline">{SORT_LABELS[currentSort]}</span>
                <span className="min-[390px]:hidden">{SORT_SHORT_LABELS[currentSort]}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 rounded-2xl border-slate-200 bg-white p-1.5"
            >
              <DropdownMenuItem onClick={() => onSortChange('relevance')}>
                Relevance
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSortChange('price_asc')}>
                Lowest Price
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSortChange('price_desc')}>
                Highest Price
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSortChange('date_desc')}>Newest</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSortChange('date_asc')}>Oldest</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
