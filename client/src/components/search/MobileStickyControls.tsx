import { SlidersHorizontal, Map as MapIcon, List, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SortOption } from "@/lib/urlUtils";

interface MobileStickyControlsProps {
  onOpenFilters: () => void;
  currentView: 'list' | 'map' | 'grid';
  onViewChange: (view: 'list' | 'map' | 'grid') => void;
  onSortChange?: (sort: SortOption) => void;
  currentSort?: SortOption;
  resultCount?: number;
}

export function MobileStickyControls({
  onOpenFilters,
  currentView,
  onViewChange,
  onSortChange,
  currentSort,
  resultCount
}: MobileStickyControlsProps) {
  // Logic to toggle between map and list
  const toggleView = () => {
    const nextView = currentView === 'map' ? 'list' : 'map';
    onViewChange(nextView);
  };

  return (
    <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 bg-slate-900/90 backdrop-blur-md rounded-full shadow-xl border border-slate-700/50 text-white transition-all animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Filter Button */}
      <Button
        variant="ghost"
        size="sm"
        className="text-white hover:text-blue-200 hover:bg-white/10 h-8 px-3 rounded-full flex items-center gap-2"
        onClick={onOpenFilters}
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span className="font-medium text-sm">Filters</span>
      </Button>

      <div className="h-4 w-px bg-slate-600/50" />

      {/* Map/List Toggle */}
      <Button
        variant="ghost"
        size="sm"
        className="text-white hover:text-blue-200 hover:bg-white/10 h-8 px-3 rounded-full flex items-center gap-2"
        onClick={toggleView}
      >
        {currentView === 'map' ? (
          <>
            <List className="h-4 w-4" />
            <span className="font-medium text-sm">List</span>
          </>
        ) : (
          <>
            <MapIcon className="h-4 w-4" />
            <span className="font-medium text-sm">Map</span>
          </>
        )}
      </Button>

      {/* Sort Option (Optional) */}
      {onSortChange && (
        <>
          <div className="h-4 w-px bg-slate-600/50" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:text-blue-200 hover:bg-white/10 h-8 w-8 rounded-full"
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white/95 backdrop-blur-sm">
                <DropdownMenuItem onClick={() => onSortChange('relevance')}>Relevance</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSortChange('price_asc')}>Price: Low to High</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSortChange('price_desc')}>Price: High to Low</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSortChange('date_desc')}>Newest First</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}

    </div>
  );
}
