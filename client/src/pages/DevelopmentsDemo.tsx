import { SectionEmptyState } from '@/components/ui/SectionEmptyState';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Building2,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Loader2,
  SlidersHorizontal,
  X,
} from 'lucide-react';

import { DevelopmentCard } from '@/components/DevelopmentCard';
import { DevelopmentSearchAdRail } from '@/components/developments/DevelopmentSearchAdRail';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import {
  CanonicalPlaceSelector,
  type CanonicalPlaceSelection,
} from '@/components/location/CanonicalPlaceSelector';
import { MetaControl } from '@/components/seo/MetaControl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { generateIntentUrl, resolveSearchIntent, type SearchIntent } from '@/lib/searchIntent';
import { canonicalPlaceSelectionFromResolved } from '@/lib/canonicalPlaceSelection';
import {
  appendDevelopmentSearchReturn,
  normalizeDevelopmentSearchReturn,
} from '@/lib/developmentJourneyContinuity';
import { isCanonicalPlaceId } from '@shared/placeAuthority';
import { PROPERTY_IMAGE_FALLBACK } from '@/lib/mediaUtils';
import { useSavedUnitTypes } from '@/lib/savedUnitTypes';
import { useSavedDevelopments } from '@/lib/savedDevelopments';
import type {
  PublicDevelopmentSearchAvailability,
  PublicDevelopmentSearchDevelopmentType,
  PublicDevelopmentSearchStatus,
} from '@shared/publicDevelopmentSearch';

const PAGE_SIZE = 12;

const DEVELOPMENT_TYPE_OPTIONS: Array<{
  value: PublicDevelopmentSearchDevelopmentType;
  label: string;
}> = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'mixed_use', label: 'Mixed use' },
  { value: 'land', label: 'Land' },
];

const DEVELOPMENT_STATUS_OPTIONS: Array<{
  value: PublicDevelopmentSearchStatus;
  label: string;
}> = [
  { value: 'launching-soon', label: 'Launching soon' },
  { value: 'selling', label: 'Selling' },
  { value: 'sold-out', label: 'Sold out' },
];

const AVAILABILITY_OPTIONS: Array<{
  value: PublicDevelopmentSearchAvailability;
  label: string;
}> = [
  { value: 'available', label: 'Has available units' },
  { value: 'sold_out', label: 'Sold out' },
];

const TRANSACTION_OPTIONS = [
  { value: 'for_sale' as const, label: 'For sale' },
  { value: 'for_rent' as const, label: 'For rent' },
];

function removeTextLocationFilters(filters: Record<string, any>) {
  const next = { ...filters };
  for (const key of [
    'search',
    'province',
    'city',
    'suburb',
    'locationId',
    'locationIds',
    'searchAreaId',
    'searchAreaIds',
    'locations',
    'locations[]',
    'canonicalPlaceId',
  ]) {
    delete next[key];
  }
  return next;
}

function updateIntentUrl(
  setLocation: (path: string, options?: { replace?: boolean }) => void,
  intent: SearchIntent,
  changes: Partial<Pick<SearchIntent, 'geography' | 'filters'>> & {
    resultState?: Partial<SearchIntent['resultState']>;
  },
  options?: { replace?: boolean },
) {
  setLocation(
    generateIntentUrl({
      ...intent,
      ...changes,
      resultState: {
        ...intent.resultState,
        ...(changes.resultState || {}),
      },
    }),
    options,
  );
}

export default function DevelopmentsDemo() {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const savedUnitTypes = useSavedUnitTypes();
  const savedDevelopments = useSavedDevelopments();
  const [placeSelection, setPlaceSelection] = useState<CanonicalPlaceSelection | null | undefined>(
    undefined,
  );
  const [placeQueryUnselected, setPlaceQueryUnselected] = useState(false);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    setLocation('/');
  };

  const intent = useMemo(
    () =>
      resolveSearchIntent(
        location.split('?')[0] || '/new-developments',
        {},
        new URLSearchParams(search),
      ),
    [location, search],
  );

  const searchReturnPath = useMemo(
    () =>
      normalizeDevelopmentSearchReturn(
        `${location.split('?')[0] || '/new-developments'}${search ? `?${search}` : ''}`,
      ),
    [location, search],
  );

  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const placeIds = searchParams.getAll('canonicalPlaceId').map(value => value.trim());
  const selectedCanonicalPlaceId =
    placeIds.length === 1 && isCanonicalPlaceId(placeIds[0]) ? placeIds[0] : undefined;
  const resolvedPlaceQuery = trpc.placeAuthority.resolveSearchPlace.useQuery(
    { placeId: selectedCanonicalPlaceId || '' },
    {
      enabled: Boolean(selectedCanonicalPlaceId),
      refetchOnWindowFocus: false,
      staleTime: 300_000,
    },
  );
  const resolvedPlace = useMemo(
    () => canonicalPlaceSelectionFromResolved(resolvedPlaceQuery.data),
    [resolvedPlaceQuery.data],
  );
  const activePlace = placeSelection === undefined ? resolvedPlace : placeSelection;
  const hasRetiredGeography = [
    'province',
    'city',
    'suburb',
    'locationId',
    'locationIds',
    'searchAreaId',
    'searchAreaIds',
    'locations',
    'locations[]',
    'search',
  ].some(key => searchParams.has(key));
  const invalidPlaceSelection =
    hasRetiredGeography ||
    placeIds.length > 1 ||
    (placeIds.length === 1 && !selectedCanonicalPlaceId) ||
    placeQueryUnselected;

  useEffect(() => {
    setPlaceSelection(undefined);
    setPlaceQueryUnselected(false);
  }, [selectedCanonicalPlaceId]);

  const queryInput = useMemo(() => {
    const developmentType = DEVELOPMENT_TYPE_OPTIONS.find(
      option => option.value === intent.filters.developmentType,
    )?.value;
    const developmentStatus = DEVELOPMENT_STATUS_OPTIONS.find(
      option => option.value === intent.filters.developmentStatus,
    )?.value;
    const availability = AVAILABILITY_OPTIONS.find(
      option => option.value === intent.filters.availability,
    )?.value;

    return {
      canonicalPlaceId: selectedCanonicalPlaceId,
      developmentType,
      developmentStatus,
      transactionType:
        intent.filters.transactionType === 'for_sale' ||
        intent.filters.transactionType === 'for_rent'
          ? intent.filters.transactionType
          : undefined,
      minPrice: typeof intent.filters.minPrice === 'number' ? intent.filters.minPrice : undefined,
      maxPrice: typeof intent.filters.maxPrice === 'number' ? intent.filters.maxPrice : undefined,
      minBedrooms:
        typeof intent.filters.minBedrooms === 'number' ? intent.filters.minBedrooms : undefined,
      maxBedrooms:
        typeof intent.filters.maxBedrooms === 'number' ? intent.filters.maxBedrooms : undefined,
      availability,
      sortOption: intent.resultState.sort,
      page: intent.resultState.page,
      pageSize: PAGE_SIZE,
    };
  }, [intent, selectedCanonicalPlaceId]);

  const { data, error, isLoading, isFetching } = trpc.properties.searchDevelopments.useQuery(
    queryInput,
    { enabled: !intent.validation && !invalidPlaceSelection },
  );

  useEffect(() => {
    if (intent.validation || error || !data || data.page === intent.resultState.page) return;
    updateIntentUrl(
      setLocation,
      intent,
      {
        resultState: { page: data.page },
      },
      { replace: true },
    );
  }, [data, error, intent, setLocation]);

  const locationMessage =
    intent.validation?.message ||
    (hasRetiredGeography ||
    placeIds.length > 1 ||
    (placeIds.length === 1 && !selectedCanonicalPlaceId)
      ? 'Choose one area from the suggestions to search.'
      : placeQueryUnselected
        ? 'Select an area from the results or clear the area filter before searching.'
        : undefined);
  const hasLocationError = Boolean(
    intent.validation ||
    invalidPlaceSelection ||
    data?.locationState === 'unavailable' ||
    data?.locationState === 'unresolved' ||
    data?.locationState === 'ambiguous',
  );
  const resultCount = data?.total ?? 0;
  const page = data?.page ?? intent.resultState.page;
  const hasPreviousPage = page > 0;
  const hasNextPage = Boolean(data?.hasMore);

  const changeFilter = (key: string, value: string) => {
    const nextFilters = { ...intent.filters };
    if (!value) {
      delete nextFilters[key];
    } else if (['minPrice', 'maxPrice', 'minBedrooms', 'maxBedrooms'].includes(key)) {
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue) || numericValue < 0) delete nextFilters[key];
      else nextFilters[key] = numericValue;
    } else {
      nextFilters[key] = value;
    }

    updateIntentUrl(setLocation, intent, {
      filters: nextFilters,
      resultState: { page: 0 },
    });
  };

  const changeSort = (value: string) => {
    updateIntentUrl(setLocation, intent, {
      resultState: {
        sort: value as SearchIntent['resultState']['sort'],
        page: 0,
      },
    });
  };

  const changePage = (nextPage: number) => {
    updateIntentUrl(setLocation, intent, { resultState: { page: nextPage } });
  };

  const selectPlace = (selected: CanonicalPlaceSelection | null) => {
    setPlaceSelection(selected);
    if (!selected) {
      setPlaceQueryUnselected(true);
      return;
    }
    setPlaceQueryUnselected(false);
    updateIntentUrl(setLocation, intent, {
      geography: {
        level: 'canonical_place',
        canonicalPlaceId: selected.canonicalPlaceId,
      },
      filters: removeTextLocationFilters(intent.filters),
      resultState: { page: 0 },
    });
  };

  const clearPlace = () => {
    setPlaceSelection(null);
    setPlaceQueryUnselected(false);
    updateIntentUrl(setLocation, intent, {
      geography: { level: 'country' },
      filters: removeTextLocationFilters(intent.filters),
      resultState: { page: 0 },
    });
  };

  const activeFilterChips: Array<{ key: string; label: string }> = [];
  const selectedDevelopmentType = DEVELOPMENT_TYPE_OPTIONS.find(
    option => option.value === intent.filters.developmentType,
  );
  const selectedDevelopmentStatus = DEVELOPMENT_STATUS_OPTIONS.find(
    option => option.value === intent.filters.developmentStatus,
  );
  const selectedTransaction = TRANSACTION_OPTIONS.find(
    option => option.value === intent.filters.transactionType,
  );
  const selectedAvailability = AVAILABILITY_OPTIONS.find(
    option => option.value === intent.filters.availability,
  );
  if (selectedDevelopmentType) {
    activeFilterChips.push({ key: 'developmentType', label: selectedDevelopmentType.label });
  }
  if (selectedDevelopmentStatus) {
    activeFilterChips.push({ key: 'developmentStatus', label: selectedDevelopmentStatus.label });
  }
  if (selectedTransaction) {
    activeFilterChips.push({ key: 'transactionType', label: selectedTransaction.label });
  }
  if (typeof intent.filters.minPrice === 'number') {
    activeFilterChips.push({
      key: 'minPrice',
      label: `From R ${intent.filters.minPrice.toLocaleString('en-ZA')}`,
    });
  }
  if (typeof intent.filters.maxPrice === 'number') {
    activeFilterChips.push({
      key: 'maxPrice',
      label: `Up to R ${intent.filters.maxPrice.toLocaleString('en-ZA')}`,
    });
  }
  if (typeof intent.filters.minBedrooms === 'number') {
    activeFilterChips.push({
      key: 'minBedrooms',
      label: `${intent.filters.minBedrooms}+ bedrooms`,
    });
  }
  if (typeof intent.filters.maxBedrooms === 'number') {
    activeFilterChips.push({
      key: 'maxBedrooms',
      label: `Up to ${intent.filters.maxBedrooms} bedrooms`,
    });
  }
  if (selectedAvailability) {
    activeFilterChips.push({ key: 'availability', label: selectedAvailability.label });
  }
  const activeFilterCount = activeFilterChips.length + Number(Boolean(activePlace));
  const advancedFilterCount =
    Number(Boolean(selectedDevelopmentStatus)) +
    Number(Boolean(selectedTransaction)) +
    Number(Boolean(selectedAvailability)) +
    Number(typeof intent.filters.minPrice === 'number') +
    Number(typeof intent.filters.maxPrice === 'number') +
    Number(typeof intent.filters.minBedrooms === 'number') +
    Number(typeof intent.filters.maxBedrooms === 'number');
  const clearRefinements = () => {
    setPlaceSelection(null);
    setPlaceQueryUnselected(false);
    updateIntentUrl(setLocation, intent, {
      filters: removeTextLocationFilters({}),
      geography: { level: 'country' },
      resultState: { page: 0 },
    });
  };

  const filterPanel = (
    <section className="mb-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-3.5">
      <div className="grid grid-cols-2 items-end gap-2.5 lg:grid-cols-4 xl:grid-cols-[minmax(230px,1.35fr)_minmax(160px,.9fr)_minmax(150px,.85fr)_minmax(250px,1.35fr)_auto]">
        <div className="relative col-span-2 min-w-0 xl:col-span-1">
          <CanonicalPlaceSelector
            value={activePlace}
            onChange={selectPlace}
            purpose="search"
            label="Area"
            placeholder="Suburb or city"
            compact
          />
          {selectedCanonicalPlaceId ? (
            <button
              type="button"
              onClick={clearPlace}
              aria-label="Clear selected area"
              title="Clear selected area"
              className="absolute right-1 top-[23px] flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
          {hasLocationError ? (
            <p className="mt-1 text-[11px] leading-4 text-amber-700" role="status">
              {locationMessage || 'Choose one area from the suggestions.'}
            </p>
          ) : null}
        </div>

        <label className="block min-w-0 text-[11px] font-medium text-slate-600">
          Development type
          <select
            value={intent.filters.developmentType || ''}
            onChange={event => changeFilter('developmentType', event.target.value)}
            className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-800"
          >
            <option value="">Any type</option>
            {DEVELOPMENT_TYPE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="hidden min-w-0 text-[11px] font-medium text-slate-600 sm:block">
          Bedrooms
          <select
            value={intent.filters.minBedrooms ?? ''}
            onChange={event => changeFilter('minBedrooms', event.target.value)}
            className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-800"
          >
            <option value="">Any bedrooms</option>
            {[1, 2, 3, 4, 5].map(value => (
              <option key={value} value={value}>
                {value}+ bedrooms
              </option>
            ))}
          </select>
        </label>

        <div className="col-span-2 hidden min-w-0 sm:block xl:col-span-1">
          <span className="text-[11px] font-medium text-slate-600">Price range</span>
          <div className="mt-1 flex items-center gap-2">
            <Input
              aria-label="Minimum price"
              type="number"
              min="0"
              value={intent.filters.minPrice ?? ''}
              onChange={event => changeFilter('minPrice', event.target.value)}
              placeholder="Min price"
              className="h-10 min-w-0 px-2.5 text-sm"
            />
            <span aria-hidden="true" className="text-xs text-slate-400">
              to
            </span>
            <Input
              aria-label="Maximum price"
              type="number"
              min="0"
              value={intent.filters.maxPrice ?? ''}
              onChange={event => changeFilter('maxPrice', event.target.value)}
              placeholder="Max price"
              className="h-10 min-w-0 px-2.5 text-sm"
            />
          </div>
        </div>

        <button
          type="button"
          aria-expanded={advancedFiltersOpen}
          aria-controls="development-advanced-filters"
          onClick={() => setAdvancedFiltersOpen(open => !open)}
          className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 sm:gap-2 sm:px-3 sm:text-sm"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          <span className="truncate">More filters</span>
          {advancedFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-100 px-1 text-[11px] text-blue-800">
              {advancedFilterCount}
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${advancedFiltersOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {advancedFiltersOpen && (
        <div
          id="development-advanced-filters"
          className="mt-3 grid gap-2.5 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <label className="block min-w-0 text-[11px] font-medium text-slate-600 sm:hidden">
            Bedrooms
            <select
              value={intent.filters.minBedrooms ?? ''}
              onChange={event => changeFilter('minBedrooms', event.target.value)}
              className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-800"
            >
              <option value="">Any bedrooms</option>
              {[1, 2, 3, 4, 5].map(value => (
                <option key={value} value={value}>
                  {value}+ bedrooms
                </option>
              ))}
            </select>
          </label>
          <div className="min-w-0 sm:hidden">
            <span className="text-[11px] font-medium text-slate-600">Price range</span>
            <div className="mt-1 flex items-center gap-2">
              <Input
                aria-label="Minimum price"
                type="number"
                min="0"
                value={intent.filters.minPrice ?? ''}
                onChange={event => changeFilter('minPrice', event.target.value)}
                placeholder="Min price"
                className="h-10 min-w-0 px-2.5 text-sm"
              />
              <span aria-hidden="true" className="text-xs text-slate-400">
                to
              </span>
              <Input
                aria-label="Maximum price"
                type="number"
                min="0"
                value={intent.filters.maxPrice ?? ''}
                onChange={event => changeFilter('maxPrice', event.target.value)}
                placeholder="Max price"
                className="h-10 min-w-0 px-2.5 text-sm"
              />
            </div>
          </div>
          <label className="block min-w-0 text-[11px] font-medium text-slate-600">
            Development stage
            <select
              value={intent.filters.developmentStatus || ''}
              onChange={event => changeFilter('developmentStatus', event.target.value)}
              className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-800"
            >
              <option value="">Any stage</option>
              {DEVELOPMENT_STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0 text-[11px] font-medium text-slate-600">
            Buy or rent
            <select
              value={intent.filters.transactionType || ''}
              onChange={event => changeFilter('transactionType', event.target.value)}
              className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-800"
            >
              <option value="">Sale or rent</option>
              {TRANSACTION_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0 text-[11px] font-medium text-slate-600">
            Availability
            <select
              value={intent.filters.availability || ''}
              onChange={event => changeFilter('availability', event.target.value)}
              className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-800"
            >
              <option value="">Any availability</option>
              {AVAILABILITY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {activeFilterChips.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5">
          {activeFilterChips.map(chip => (
            <button
              key={chip.key}
              type="button"
              onClick={() => changeFilter(chip.key, '')}
              aria-label={`Remove ${chip.label} filter`}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800 hover:bg-blue-100"
            >
              {chip.label} <X className="h-3 w-3" aria-hidden="true" />
            </button>
          ))}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearRefinements}
              className="ml-auto text-xs font-semibold text-blue-700 hover:text-blue-900"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </section>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <MetaControl
        title="New Developments | Property Listify"
        description="Browse new property developments with current unit availability, pricing and sales progress — direct from the developers marketing them."
      />
      <EnhancedNavbar />

      <div className="mx-auto w-full max-w-[1520px] px-4 pb-12 pt-12 sm:px-6 sm:pt-14 xl:px-8">
        <div className="mb-2 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="-ml-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back
          </Button>
          <p className="text-xs font-medium text-slate-400">Home / New developments</p>
        </div>

        {filterPanel}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 xl:gap-6">
          <main className="min-w-0 xl:col-span-9">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3 px-1">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <h1 className="text-base font-bold leading-tight text-slate-900">
                    New developments
                  </h1>
                  <span className="text-xs text-slate-500">
                    {isLoading || (isFetching && !data)
                      ? 'Finding developments…'
                      : error || resultCount === 0
                        ? 'No developments found'
                        : `${resultCount} ${resultCount === 1 ? 'development' : 'developments'}${activePlace ? ` in ${activePlace.label}` : ''}`}
                  </span>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
                Sort
                <select
                  aria-label="Sort developments"
                  value={intent.resultState.sort}
                  onChange={event => changeSort(event.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-700"
                >
                  <option value="relevance">Relevance</option>
                  <option value="price_asc">Price: low to high</option>
                  <option value="price_desc">Price: high to low</option>
                  <option value="date_desc">Newest</option>
                  <option value="date_asc">Oldest</option>
                </select>
              </label>
            </div>

            {isLoading || (isFetching && !data) ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Building2 className="mb-4 h-16 w-16 text-slate-300" />
                <h2 className="mb-2 text-lg font-semibold text-slate-700">
                  Developments search is temporarily unavailable
                </h2>
                <p className="max-w-md text-slate-500">
                  Please try again shortly. Your search URL and refinements have been preserved.
                </p>
              </div>
            ) : data?.items && data.items.length > 0 ? (
              <>
                {Boolean(data.unpricedHiddenCount) && (
                  <p
                    role="note"
                    className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
                  >
                    {data.unpricedHiddenCount}{' '}
                    {data.unpricedHiddenCount === 1 ? 'development' : 'developments'} without a
                    published price are hidden by your price filter. Clear the price fields to see
                    them.
                  </p>
                )}
                <div className="flex flex-col gap-4">
                  {data.items.map(development => {
                    const developmentId = String(development.id);
                    const developmentRoute = appendDevelopmentSearchReturn(
                      development.canonicalRoute,
                      searchReturnPath,
                    );
                    const developmentLocation =
                      development.locationLabels.join(', ') || 'Area to be confirmed';
                    const developmentImage = development.images[0] || PROPERTY_IMAGE_FALLBACK;
                    const publisherTrustLabel =
                      development.publisher.authorityKind === 'developer_first_party'
                        ? 'Direct developer'
                        : development.publisher.lastVerifiedAt
                          ? 'Source reviewed'
                          : development.publisher.sourceAttribution
                            ? 'Source cited'
                            : undefined;
                    const classificationLabel = DEVELOPMENT_TYPE_OPTIONS.find(
                      option => option.value === development.developmentType,
                    )?.label;

                    return (
                      <DevelopmentCard
                        key={development.id}
                        id={developmentId}
                        canonicalRoute={developmentRoute}
                        title={development.name}
                        rating={development.rating ?? undefined}
                        location={developmentLocation}
                        description={development.description}
                        image={developmentImage}
                        publisherTrustLabel={publisherTrustLabel}
                        classificationLabel={classificationLabel}
                        unitTypes={development.unitTypes.map(unit => ({
                          id: unit.id,
                          bedrooms: unit.bedrooms,
                          label: unit.label,
                          priceFrom: unit.priceFrom,
                          isSaved: unit.id ? savedUnitTypes.isSaved(String(unit.id)) : false,
                        }))}
                        onUnitTypeFavoriteClick={unit => {
                          if (!unit.id) return;
                          const nowSaved = savedUnitTypes.toggle({
                            unitTypeId: String(unit.id),
                            developmentId,
                            href: developmentRoute,
                            title: unit.label,
                            developmentName: development.name,
                          });
                          toast.success(
                            nowSaved
                              ? 'Saved on this device. Sign-in sync for new developments is coming.'
                              : 'Removed from saved home types.',
                          );
                        }}
                        isFavorite={savedDevelopments.isSaved(developmentId)}
                        onFavoriteClick={() => {
                          const nowSaved = savedDevelopments.toggle({
                            developmentId,
                            href: developmentRoute,
                            title: development.name,
                            location: developmentLocation,
                            image: developmentImage,
                          });
                          toast.success(
                            nowSaved
                              ? 'Development saved on this device.'
                              : 'Development removed from saved.',
                          );
                        }}
                        highlights={development.highlights}
                        developer={{
                          name: development.publisher.name,
                          logoUrl: development.publisher.logoUrl,
                          isFeatured: development.isFeatured,
                        }}
                        imageCount={development.images.length}
                        isFeatured={development.isFeatured}
                        isNewBooking={false}
                        transactionType={development.transactionType}
                        status={development.status}
                        availabilityState={development.availabilityState}
                        nature={development.nature}
                        primaryActionLabel="View development"
                      />
                    );
                  })}
                </div>

                {(resultCount > PAGE_SIZE || page > 0 || hasNextPage) && (
                  <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
                    <Button
                      variant="outline"
                      disabled={!hasPreviousPage || isFetching}
                      onClick={() => changePage(page - 1)}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                    </Button>
                    <span className="text-sm text-slate-500">Page {page + 1}</span>
                    <Button
                      variant="outline"
                      disabled={!hasNextPage || isFetching}
                      onClick={() => changePage(page + 1)}
                    >
                      Next <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <SectionEmptyState
                icon={Building2}
                title="No developments found"
                titleAs="h3"
                message="No new developments are listed yet. Try another area or change your filters."
                action={{
                  label: 'Talk to us about listing your development',
                  href: '/contact?area=developer_operations',
                }}
              />
            )}
          </main>
          <aside className="xl:col-span-3 xl:col-start-10">
            <div className="xl:sticky xl:top-24">
              <DevelopmentSearchAdRail />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
