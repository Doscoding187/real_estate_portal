import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Building2, ChevronLeft, ChevronRight, List, Loader2, X } from 'lucide-react';

import { DevelopmentCard } from '@/components/DevelopmentCard';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { LocationAutosuggest } from '@/components/LocationAutosuggest';
import { MetaControl } from '@/components/seo/MetaControl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import {
  createCanonicalSearchLocation,
  type GeographySearchContext,
} from '@/lib/geographySearchHandoff';
import { generateIntentUrl, resolveSearchIntent, type SearchIntent } from '@/lib/searchIntent';
import { normalizeLocationKey } from '@/lib/locationUtils';
import {
  appendDevelopmentSearchReturn,
  normalizeDevelopmentSearchReturn,
} from '@/lib/developmentJourneyContinuity';
import type { LocationNode } from '@/types/location';
import { PROPERTY_IMAGE_FALLBACK } from '@/lib/mediaUtils';
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
  for (const key of ['search', 'province', 'city', 'suburb', 'locations', 'locations[]']) {
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

function canonicalLocationFromContext(context: {
  canonicalLocationId: string;
  type: 'province' | 'city' | 'suburb';
  name: string;
  slug: string;
  hierarchy: { province: string; city?: string; suburb?: string };
}): LocationNode {
  return {
    id: context.canonicalLocationId,
    canonicalLocationId: context.canonicalLocationId,
    slug: context.slug,
    name: context.name,
    type: context.type,
    provinceSlug: normalizeLocationKey(context.hierarchy.province),
    citySlug: context.hierarchy.city ? normalizeLocationKey(context.hierarchy.city) : undefined,
  };
}

export default function DevelopmentsDemo() {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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
      locationId: intent.geography.locationId,
      locationIds: intent.geography.locationIds,
      searchAreaId: intent.geography.searchAreaId,
      searchAreaIds: intent.geography.searchAreaIds,
      province: intent.geography.province,
      city: intent.geography.city,
      suburb: intent.geography.suburb,
      locations: Array.isArray(intent.filters.locations)
        ? intent.filters.locations.filter(
            (value: unknown): value is string => typeof value === 'string',
          )
        : undefined,
      search: typeof intent.filters.search === 'string' ? intent.filters.search : undefined,
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
  }, [intent]);

  const { data, error, isLoading, isFetching } = trpc.properties.searchDevelopments.useQuery(
    queryInput,
    { enabled: !intent.validation },
  );

  // Text and slug compatibility paths are accepted only at the server boundary. Once that
  // boundary resolves a location, the browser replaces the compatibility URL with its canonical
  // location ID so refresh/share/back all carry the same geography authority.
  useEffect(() => {
    const context = data?.locationContext;
    if (intent.validation || error || !context || data?.locationState !== 'resolved') return;

    const hasCanonicalGeography = Boolean(
      intent.geography.locationId ||
      intent.geography.locationIds?.length ||
      intent.geography.searchAreaId ||
      intent.geography.searchAreaIds?.length,
    );
    const shouldCanonicalizeLocation = !hasCanonicalGeography;
    const shouldNormalizePage = data.page !== intent.resultState.page;
    if (!shouldCanonicalizeLocation && !shouldNormalizePage) return;

    const nextGeography = shouldCanonicalizeLocation
      ? {
          level: context.type,
          locationId: context.canonicalLocationId,
          province: normalizeLocationKey(context.hierarchy.province),
          city: context.hierarchy.city ? normalizeLocationKey(context.hierarchy.city) : undefined,
          suburb: context.hierarchy.suburb
            ? normalizeLocationKey(context.hierarchy.suburb)
            : undefined,
        }
      : intent.geography;

    updateIntentUrl(
      setLocation,
      intent,
      {
        geography: nextGeography,
        filters: shouldCanonicalizeLocation
          ? removeTextLocationFilters(intent.filters)
          : intent.filters,
        resultState: { page: data.page },
      },
      { replace: true },
    );
  }, [data, error, intent, setLocation]);

  const currentLocation = data?.locationContext
    ? canonicalLocationFromContext(data.locationContext)
    : undefined;
  const locationMessage = data?.locationMessage || intent.validation?.message;
  const hasLocationError = Boolean(
    error ||
    intent.validation ||
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

  const selectLocation = (selected: LocationNode) => {
    const canonical = createCanonicalSearchLocation(selected);
    if (!canonical) return;

    const geography: SearchIntent['geography'] = { level: 'country' };
    if (canonical.scope.kind === 'province') {
      geography.level = 'province';
      geography.locationId = canonical.scope.canonicalLocationId;
    } else if (canonical.scope.kind === 'metro_city') {
      geography.level = 'city';
      geography.locationId = canonical.scope.canonicalLocationId;
    } else if (canonical.scope.kind === 'locality') {
      geography.level = 'suburb';
      geography.locationId = canonical.scope.canonicalLocationId;
    } else {
      return;
    }

    Object.assign(geography, canonical.context as GeographySearchContext);
    updateIntentUrl(setLocation, intent, {
      geography,
      filters: removeTextLocationFilters(intent.filters),
      resultState: { page: 0 },
    });
  };

  const clearLocation = () => {
    updateIntentUrl(setLocation, intent, {
      geography: { level: 'country' },
      filters: removeTextLocationFilters(intent.filters),
      resultState: { page: 0 },
    });
  };

  const filterPanel = (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Refine results</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Every control changes the server-owned development result set.
        </p>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Development type
        <select
          value={intent.filters.developmentType || ''}
          onChange={event => changeFilter('developmentType', event.target.value)}
          className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="">Any type</option>
          {DEVELOPMENT_TYPE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Status
        <select
          value={intent.filters.developmentStatus || ''}
          onChange={event => changeFilter('developmentStatus', event.target.value)}
          className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="">Any status</option>
          {DEVELOPMENT_STATUS_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Transaction
        <select
          value={intent.filters.transactionType || ''}
          onChange={event => changeFilter('transactionType', event.target.value)}
          className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="">Sale or rent</option>
          {TRANSACTION_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-slate-700">
          Price from
          <Input
            type="number"
            min="0"
            value={intent.filters.minPrice ?? ''}
            onChange={event => changeFilter('minPrice', event.target.value)}
            placeholder="Any"
            className="mt-1.5"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Price to
          <Input
            type="number"
            min="0"
            value={intent.filters.maxPrice ?? ''}
            onChange={event => changeFilter('maxPrice', event.target.value)}
            placeholder="Any"
            className="mt-1.5"
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Bedrooms
        <select
          value={intent.filters.minBedrooms ?? ''}
          onChange={event => changeFilter('minBedrooms', event.target.value)}
          className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="">Any bedroom count</option>
          {[1, 2, 3, 4, 5].map(value => (
            <option key={value} value={value}>
              {value}+ bedrooms
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Availability
        <select
          value={intent.filters.availability || ''}
          onChange={event => changeFilter('availability', event.target.value)}
          className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="">Any availability</option>
          {AVAILABILITY_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() =>
          updateIntentUrl(setLocation, intent, {
            filters: removeTextLocationFilters({}),
            resultState: { page: 0 },
          })
        }
      >
        Clear refinements
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <MetaControl
        title="New Developments | Property Listify"
        description="Browse new property developments with current unit availability, pricing and sales progress — direct from the developers marketing them."
      />
      <EnhancedNavbar />

      <div className="container mx-auto px-4 pb-12 pt-24 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <LocationAutosuggest
                placeholder="Search by canonical city, suburb, or province..."
                selectedLocations={[]}
                maxLocations={1}
                inputClassName="h-11 w-full rounded-xl border-slate-200 bg-white"
                onSelect={selectLocation}
              />
            </div>
            {currentLocation ? (
              <div className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800">
                <span>Searching {currentLocation.name}</span>
                <button
                  type="button"
                  onClick={clearLocation}
                  aria-label="Clear development location"
                  className="rounded-full p-0.5 hover:bg-blue-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
          {hasLocationError ? (
            <p className="mt-3 text-sm font-medium text-amber-700" role="status">
              {locationMessage}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          <aside className="hidden lg:col-span-3 lg:block">
            <div className="sticky top-24">{filterPanel}</div>
          </aside>

          <main className="col-span-1 lg:col-span-9">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-800">
                  {isLoading || (isFetching && !data) ? (
                    <span className="text-slate-400">Finding developments…</span>
                  ) : (
                    `${resultCount} New Developments Found`
                  )}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Development-first results with current unit, price, and availability facts.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="border-slate-200 text-slate-600 lg:hidden"
                  onClick={() => setShowMobileFilters(value => !value)}
                >
                  <List className="mr-2 h-4 w-4" /> Filters
                </Button>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <span className="hidden sm:inline">Sort by</span>
                  <select
                    value={intent.resultState.sort}
                    onChange={event => changeSort(event.target.value)}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="price_asc">Price: low to high</option>
                    <option value="price_desc">Price: high to low</option>
                    <option value="date_desc">Newest</option>
                    <option value="date_asc">Oldest</option>
                  </select>
                </label>
              </div>
            </div>

            {showMobileFilters ? <div className="mb-6 lg:hidden">{filterPanel}</div> : null}

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
                <div className="flex flex-col gap-6">
                  {data.items.map(development => (
                    <DevelopmentCard
                      key={development.id}
                      id={String(development.id)}
                      canonicalRoute={appendDevelopmentSearchReturn(
                        development.canonicalRoute,
                        searchReturnPath,
                      )}
                      title={development.name}
                      rating={development.rating ?? undefined}
                      location={`${development.suburb ? `${development.suburb}, ` : ''}${development.city}, ${development.province}`}
                      description={development.description}
                      image={development.images[0] || PROPERTY_IMAGE_FALLBACK}
                      unitTypes={development.unitTypes.map(unit => ({
                        bedrooms: unit.bedrooms,
                        label: unit.label,
                        priceFrom: unit.priceFrom,
                      }))}
                      highlights={development.highlights}
                      developer={{
                        name: development.publisher.name,
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
                  ))}
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5">
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
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Building2 className="mb-4 h-16 w-16 text-slate-300" />
                <h2 className="mb-2 text-lg font-semibold text-slate-700">No developments found</h2>
                <p className="max-w-md text-slate-500">
                  Try another canonical location or adjust the development refinements.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
