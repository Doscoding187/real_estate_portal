import { Building2, Home, MapPin, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import type { SearchFilters } from '@/lib/urlUtils';

export interface SearchFilterRecoveryAction {
  key: string;
  label: string;
  keys: readonly string[];
}

function hasActiveFilter(filters: SearchFilters, keys: readonly string[]) {
  return keys.some(key => {
    const value = filters[key];
    if (value === undefined || value === null || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'boolean') return value;
    return true;
  });
}

export function getZeroResultFilterActions(filters: SearchFilters): SearchFilterRecoveryAction[] {
  const groups = [
    { key: 'price', label: 'Clear price range', keys: ['minPrice', 'maxPrice'] },
    { key: 'bedrooms', label: 'Clear bedroom filter', keys: ['minBedrooms', 'maxBedrooms'] },
    { key: 'bathrooms', label: 'Clear bathroom filter', keys: ['minBathrooms', 'maxBathrooms'] },
    { key: 'area', label: 'Clear size filter', keys: ['minArea', 'maxArea'] },
    { key: 'propertyType', label: 'Clear property type', keys: ['propertyType'] },
    { key: 'furnished', label: 'Clear furnished filter', keys: ['furnished'] },
    { key: 'amenities', label: 'Clear amenities', keys: ['amenities'] },
  ] as const;

  return groups.filter(group => hasActiveFilter(filters, group.keys));
}

interface SearchResultsEmptyStateProps {
  filters: SearchFilters;
  transactionType: 'for-sale' | 'to-rent';
  searchDescription: string;
  onClearAllFilters: () => void;
  onClearFilterKeys: (keys: readonly string[]) => void;
  onSwitchToSource: (source?: SearchFilters['listingSource']) => void;
  onChangeLocations?: () => void;
  onBroadenToParent?: () => void;
  parentRecoveryLabel?: string;
  onStartOver?: () => void;
}

function getJourneyLabel(transactionType: SearchResultsEmptyStateProps['transactionType']) {
  return transactionType === 'for-sale' ? 'homes for sale' : 'rentals';
}

export function SearchResultsEmptyState({
  filters,
  transactionType,
  searchDescription,
  onClearAllFilters,
  onClearFilterKeys,
  onSwitchToSource,
  onChangeLocations,
  onBroadenToParent,
  parentRecoveryLabel,
  onStartOver,
}: SearchResultsEmptyStateProps) {
  const filterRecoveryActions = getZeroResultFilterActions(filters);
  const journeyLabel = getJourneyLabel(transactionType);

  return (
    <Empty
      role="status"
      data-testid="search-results-zero-state"
      className="mx-auto max-w-2xl border border-slate-200 bg-white py-14"
    >
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-slate-100 text-slate-500">
          <Search className="h-6 w-6" />
        </EmptyMedia>
        <EmptyTitle className="text-slate-900">No matching {journeyLabel}</EmptyTitle>
        <EmptyDescription className="max-w-lg text-slate-600">{searchDescription}</EmptyDescription>
      </EmptyHeader>

      <EmptyContent className="max-w-xl">
        <p className="text-sm font-medium text-slate-700">Try adjusting your search:</p>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          {filterRecoveryActions.map(action => (
            <Button
              key={action.key}
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => onClearFilterKeys(action.keys)}
            >
              {action.label}
            </Button>
          ))}

          {filters.listingSource && (
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => onSwitchToSource(undefined)}
            >
              Show all sources
            </Button>
          )}

          <Button className="w-full gap-2 sm:w-auto" onClick={onClearAllFilters}>
            <SlidersHorizontal className="h-4 w-4" />
            Clear all filters
          </Button>
        </div>

        <div className="flex w-full flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:flex-wrap sm:justify-center">
          {onChangeLocations && (
            <Button
              variant="secondary"
              className="w-full gap-2 sm:w-auto"
              onClick={onChangeLocations}
            >
              <MapPin className="h-4 w-4" />
              Change locations
            </Button>
          )}

          {onBroadenToParent && parentRecoveryLabel && (
            <Button
              variant="secondary"
              className="w-full gap-2 sm:w-auto"
              onClick={onBroadenToParent}
            >
              <MapPin className="h-4 w-4" />
              Search all {parentRecoveryLabel}
            </Button>
          )}

          {filters.listingSource === 'manual' && (
            <Button
              variant="outline"
              className="w-full gap-2 sm:w-auto"
              onClick={() => onSwitchToSource('development')}
            >
              <Building2 className="h-4 w-4" />
              Show new developments
            </Button>
          )}

          {filters.listingSource === 'development' && (
            <Button
              variant="outline"
              className="w-full gap-2 sm:w-auto"
              onClick={() => onSwitchToSource('manual')}
            >
              <Home className="h-4 w-4" />
              Show property listings
            </Button>
          )}

          {onStartOver && (
            <Button variant="ghost" className="w-full gap-2 sm:w-auto" onClick={onStartOver}>
              <RotateCcw className="h-4 w-4" />
              Start a new search
            </Button>
          )}
        </div>
      </EmptyContent>
    </Empty>
  );
}

interface SearchResultsUnavailableStateProps {
  title: string;
  description: string;
  onStartOver?: () => void;
}

export function SearchResultsUnavailableState({
  title,
  description,
  onStartOver,
}: SearchResultsUnavailableStateProps) {
  return (
    <Empty
      role="alert"
      data-testid="search-results-unavailable-state"
      className="mx-auto max-w-2xl border border-amber-200 bg-amber-50 py-14"
    >
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-amber-100 text-amber-700">
          <Search className="h-6 w-6" />
        </EmptyMedia>
        <EmptyTitle className="text-amber-950">{title}</EmptyTitle>
        <EmptyDescription className="max-w-lg text-amber-900">{description}</EmptyDescription>
      </EmptyHeader>

      {onStartOver && (
        <EmptyContent>
          <Button variant="outline" onClick={onStartOver}>
            Start a new search
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}
