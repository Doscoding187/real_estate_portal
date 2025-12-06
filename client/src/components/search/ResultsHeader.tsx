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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
          {title}
        </h1>
        {filters.city && !filters.suburb && (
          <p className="text-sm text-muted-foreground mt-0.5">
            Browse available properties in {filters.city}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Mobile Filter Button */}
        {showMobileFilterButton && onOpenFilters && (
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden border-gray-200"
            onClick={onOpenFilters}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
          </Button>
        )}

        {/* View Mode Toggle */}
        <div className="hidden sm:flex items-center bg-gray-100 rounded-lg p-1">
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2.5 ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
            onClick={() => onViewModeChange('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2.5 ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
            onClick={() => onViewModeChange('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2.5 ${viewMode === 'map' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
            onClick={() => onViewModeChange('map')}
          >
            <MapIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Sort Dropdown */}
        <Select value={sortBy} onValueChange={(val) => onSortChange(val as SortOption)}>
          <SelectTrigger className="w-[160px] h-9 bg-white border-gray-200">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">Relevance</SelectItem>
            <SelectItem value="price_asc">Price: Low to High</SelectItem>
            <SelectItem value="price_desc">Price: High to Low</SelectItem>
            <SelectItem value="date_desc">Newest First</SelectItem>
            <SelectItem value="date_asc">Oldest First</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
