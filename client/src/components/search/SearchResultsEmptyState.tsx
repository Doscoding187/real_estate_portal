import { Building2, Home, MapPin, Search, SlidersHorizontal } from 'lucide-react';
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

interface SearchResultsEmptyStateProps {
  filters: SearchFilters;
  locationContext?: {
    type?: 'province' | 'city' | 'suburb';
    hierarchy?: {
      province?: string;
      city?: string;
      suburb?: string;
    };
    ids?: {
      cityId?: string;
    };
  } | null;
  onClearAllFilters: () => void;
  onSwitchToSource: (source?: SearchFilters['listingSource']) => void;
  onBroadenToCity?: () => void;
  onBroadenToProvince?: () => void;
}

function getEmptyStateCopy(filters: SearchFilters) {
  if (filters.listingSource === 'manual') {
    return {
      icon: Home,
      title: 'No resale properties match this search',
      description:
        'There are no resale properties matching these filters right now. Try broadening the search or switch to new developments in this area.',
      primaryActionLabel: 'Show New Developments',
      primaryActionSource: 'development' as const,
    };
  }

  if (filters.listingSource === 'development') {
    return {
      icon: Building2,
      title: 'No new developments match this search',
      description:
        'There are no new development homes matching these filters right now. Try broadening the search or switch back to resale properties.',
      primaryActionLabel: 'Show Resale',
      primaryActionSource: 'manual' as const,
    };
  }

  return {
    icon: Search,
    title: 'No matching properties found',
      description:
      'We could not find any properties matching this exact search. Try clearing some filters or broadening the area.',
    primaryActionLabel: 'Clear Filters & Broaden Search',
    primaryActionSource: undefined,
  };
}

export function SearchResultsEmptyState({
  filters,
  locationContext,
  onClearAllFilters,
  onSwitchToSource,
  onBroadenToCity,
  onBroadenToProvince,
}: SearchResultsEmptyStateProps) {
  const copy = getEmptyStateCopy(filters);
  const Icon = copy.icon;

  return (
    <Empty className="mx-auto max-w-2xl border border-slate-200 bg-white py-14">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-slate-100 text-slate-500">
          <Icon className="h-6 w-6" />
        </EmptyMedia>
        <EmptyTitle className="text-slate-900">{copy.title}</EmptyTitle>
        <EmptyDescription className="max-w-lg text-slate-600">
          {copy.description}
        </EmptyDescription>
      </EmptyHeader>

      <EmptyContent className="max-w-xl">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          {copy.primaryActionSource ? (
            <Button
              className="w-full gap-2 sm:w-auto"
              onClick={() => onSwitchToSource(copy.primaryActionSource)}
            >
              {copy.primaryActionSource === 'development' ? (
                <Building2 className="h-4 w-4" />
              ) : (
                <Home className="h-4 w-4" />
              )}
              {copy.primaryActionLabel}
            </Button>
          ) : (
            <Button className="w-full gap-2 sm:w-auto" onClick={onClearAllFilters}>
              <SlidersHorizontal className="h-4 w-4" />
              {copy.primaryActionLabel}
            </Button>
          )}

          {filters.listingSource && (
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => onSwitchToSource(undefined)}
            >
              Show All Results
            </Button>
          )}

          <Button variant="outline" className="w-full sm:w-auto" onClick={onClearAllFilters}>
            Clear Search Filters
          </Button>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          {locationContext?.type === 'suburb' &&
            locationContext.ids?.cityId &&
            locationContext.hierarchy?.city &&
            onBroadenToCity && (
              <Button variant="secondary" className="w-full gap-2 sm:w-auto" onClick={onBroadenToCity}>
                <MapPin className="h-4 w-4" />
                Search all {locationContext.hierarchy.city}
              </Button>
            )}

          {locationContext?.type === 'city' &&
            locationContext.hierarchy?.province &&
            onBroadenToProvince && (
              <Button
                variant="secondary"
                className="w-full gap-2 sm:w-auto"
                onClick={onBroadenToProvince}
              >
                <MapPin className="h-4 w-4" />
                Search all {locationContext.hierarchy.province}
              </Button>
            )}
        </div>
      </EmptyContent>
    </Empty>
  );
}
