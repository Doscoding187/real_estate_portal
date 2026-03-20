import { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'wouter';
import { ListingNavbar } from '@/components/ListingNavbar';
import { SidebarFilters } from '@/components/SidebarFilters';
import PropertyCard from '@/components/PropertyCard';
import { GooglePropertyMap } from '@/components/maps/GooglePropertyMap';
import { getDisplayListingBadges, getPrimaryListingBadge } from '@/lib/listingBadges';
import { normalizePropertyForUI } from '@/lib/normalizers';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, Building2, Search, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Search components
import {
  Breadcrumbs,
  ActiveFilterChips,
  ResultsHeader,
  MobileFilterDrawer,
  MobileStickyControls,
  ViewMode,
  SortOption,
} from '@/components/search';
import { SearchFallbackNotice } from '@/components/search/SearchFallbackNotice';
import { ListingResultCard } from '@/components/property-results/ListingResultCard';

// URL utilities
import { MetaControl } from '@/components/seo/MetaControl';
import {
  generateBreadcrumbs,
  generatePageTitle,
  generateMetaDescription,
  generatePropertyUrl,
  SearchFilters,
} from '@/lib/urlUtils';
import { resolveSearchIntent, generateIntentUrl, SearchIntent } from '@/lib/searchIntent';

export default function SearchResults({
  province: propProvince,
  city: propCity,
  locationId: propLocationId,
}: { province?: string; city?: string; locationId?: string } = {}) {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  // Get URL params from wouter
  const params = useParams<{
    listingType?: string;
    propertyType?: string;
    location?: string;
    suburb?: string;
    province?: string;
    city?: string;
    locationId?: string;
  }>();

  // --- CORE SEARCH INTENT ---
  // We resolve the intent once from the URL state
  const searchIntent = useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search);
    // Merge props into params if they exist (for usage inside CityPage)
    // Note: This relies on the router params mainly.
    const effectiveParams = { ...params };
    if (propProvince && !effectiveParams.province) effectiveParams.province = propProvince;
    if (propCity && !effectiveParams.city) effectiveParams.city = propCity;
    if (propLocationId && !effectiveParams.locationId) effectiveParams.locationId = propLocationId;

    return resolveSearchIntent(location, effectiveParams, searchParams);
  }, [location, window.location.search, params, propProvince, propCity, propLocationId]);

  // Derived state from Intent
  const filters: SearchFilters = useMemo(() => {
    return {
      ...searchIntent.filters,
      // Ensure geography is represented in filters for the API call
      ...(searchIntent.geography.province && { province: searchIntent.geography.province }),
      ...(searchIntent.geography.city && { city: searchIntent.geography.city }),
      ...(searchIntent.geography.suburb && { suburb: searchIntent.geography.suburb }),
      ...(searchIntent.geography.locationId && { locationId: searchIntent.geography.locationId }),
      listingType: searchIntent.transactionType === 'to-rent' ? 'rent' : 'sale',
    };
  }, [searchIntent]);

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [page, setPage] = useState(0);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isSaveSearchOpen, setIsSaveSearchOpen] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');

  const limit = 12;
  const blendFetchLimit = Math.max(limit, (page + 1) * limit);
  const backendSortOption = sortBy === 'relevance' ? undefined : sortBy;
  const shouldFetchManualListings = filters.listingSource !== 'development';
  const shouldFetchDevelopmentListings = filters.listingSource !== 'manual';

  // SEO
  useEffect(() => {
    document.title = generatePageTitle(filters);
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', generateMetaDescription(filters));
    }
  }, [filters]);

  const breadcrumbs = useMemo(() => generateBreadcrumbs(filters), [filters]);

  // Build query input for tRPC
  const propertyQueryInput = useMemo(
    () => ({
      ...filters,
      city: filters.city, // Explicitly ensure these are passed
      province: filters.province,
      suburb: typeof filters.suburb === 'string' ? [filters.suburb] : filters.suburb,
      locations: filters.locations?.map(l => l.slug),
      locationId: filters.locationId, // Pass locationId if backend supports it (optional filter usually)
      propertyType: filters.propertyType as any,
      listingType: filters.listingType as any,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      minBedrooms: filters.minBedrooms,
      status: 'available' as const,
      limit: blendFetchLimit,
      offset: 0,
      sortOption: backendSortOption,
      includeDevelopments: false,
    }),
    [backendSortOption, blendFetchLimit, filters],
  );

  const developmentListingQueryInput = useMemo(
    () => ({
      city: filters.city,
      province: filters.province,
      suburb: typeof filters.suburb === 'string' ? [filters.suburb] : filters.suburb,
      propertyType: filters.propertyType as any,
      listingType: filters.listingType as any,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      minBedrooms: filters.minBedrooms,
      maxBedrooms: filters.maxBedrooms,
      minBathrooms: filters.minBathrooms,
      limit: blendFetchLimit,
      offset: 0,
      sortOption: backendSortOption,
    }),
    [backendSortOption, blendFetchLimit, filters],
  );

  const { data: propertySearchResults, isLoading: isPropertySearchLoading } =
    trpc.properties.search.useQuery(propertyQueryInput, {
      enabled: shouldFetchManualListings,
    });
  const { data: developmentListingResults, isLoading: isDevelopmentSearchLoading } =
    trpc.properties.searchDevelopmentListings.useQuery(developmentListingQueryInput, {
      enabled: shouldFetchDevelopmentListings,
    });
  const isLoading = isPropertySearchLoading || isDevelopmentSearchLoading;
  const { data: filterCounts } = trpc.properties.getFilterCounts.useQuery(
    {
      filters: {
        city: filters.city,
        province: filters.province,
        suburb: typeof filters.suburb === 'string' ? [filters.suburb] : filters.suburb,
        listingType: filters.listingType,
        propertyType: filters.propertyType,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        minBedrooms: filters.minBedrooms,
        maxBedrooms: filters.maxBedrooms,
      },
    },
    {
      enabled: shouldFetchManualListings,
    },
  );

  const properties =
    shouldFetchManualListings
      ? (propertySearchResults as any)?.items ?? (propertySearchResults as any)?.properties ?? []
      : [];
  const developmentResults = shouldFetchDevelopmentListings
    ? (developmentListingResults as any)?.items ?? []
    : [];
  const resultTotal =
    (shouldFetchManualListings ? (propertySearchResults as any)?.total ?? 0 : 0) +
    (shouldFetchDevelopmentListings ? (developmentListingResults as any)?.total ?? 0 : 0);
  const locationContext = (propertySearchResults as any)?.locationContext;

  // Mutations
  const saveSearchMutation = trpc.savedSearch.create.useMutation({
    onSuccess: () => {
      toast.success('Search saved successfully');
      setIsSaveSearchOpen(false);
      setSaveSearchName('');
    },
    onError: error => toast.error(error.message),
  });

  // Handlers
  const handleFilterChange = (newFilters: SearchFilters) => {
    // Current Intent + New Filters -> New Intent -> New URL
    // We treat 'newFilters' as a delta or override.

    // HOWEVER: The SidebarFilters component currently returns the ENTIRE filter set, including geography potentially.
    // We need to be careful not to overwrite the "Sacred Geography" with undefined if the sidebar logic doesn't include it.

    // Ideally, we pass the new filters to `generateIntentUrl` by mixing them into the current intent.
    const updatedIntent: SearchIntent = {
      ...searchIntent,
      filters: {
        ...searchIntent.filters,
        ...newFilters,
      },
    };

    // Sanitize: We do not allow the sidebar to change the geography level keys (province, city, suburb) via 'filters'.
    // If the sidebar wants to change location, it should do so via navigation, not filtering.
    // For now, we just proceed.

    const newUrl = generateIntentUrl(updatedIntent);
    setLocation(newUrl);
    setPage(0);
  };

  // This is a special handler for "active chips" removal which might be cleaner
  const handleRemoveFilter = (key: keyof SearchFilters) => {
    const nextFilters = { ...searchIntent.filters };
    delete nextFilters[key];

    // Recursively remove from URL state
    const updatedIntent = {
      ...searchIntent,
      filters: nextFilters,
    };
    setLocation(generateIntentUrl(updatedIntent));
  };

  const handleClearAllFilters = () => {
    // Keep only listing type (which is transactional)
    const updatedIntent = {
      ...searchIntent,
      filters: {}, // Clear all optional filters
    };
    setLocation(generateIntentUrl(updatedIntent));
  };

  const handleSaveSearch = () => {
    if (!isAuthenticated) {
      toast.error('Please login to save searches');
      return;
    }
    setIsSaveSearchOpen(true);
  };

  const confirmSaveSearch = () => {
    if (!saveSearchName.trim()) return;
    saveSearchMutation.mutate({
      name: saveSearchName,
      criteria: filters,
      notificationFrequency: 'weekly',
    });
  };

  const handleBoundsChange = (bounds: google.maps.LatLngBounds) => {
    // Map Lens Logic:
    // 1. Reset specific geography (we are now searching via coordinates)
    // 2. Apply bounds to filters

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    const nextFilters = {
      ...searchIntent.filters,
      minLat: sw.lat(),
      maxLat: ne.lat(),
      minLng: sw.lng(),
      maxLng: ne.lng(),
    };

    // Construct new intent clearing named geography
    const mapIntent: SearchIntent = {
      ...searchIntent,
      geography: {
        level: 'country', // Reset to top level
        // Explicitly undefined to ensure they are cleared
        province: undefined,
        city: undefined,
        suburb: undefined,
        locationId: undefined,
        slug: undefined,
      },
      filters: nextFilters,
    };

    const newUrl = generateIntentUrl(mapIntent);
    setLocation(newUrl);
    setPage(0);
  };

  const combinedSearchResults = useMemo(() => {
    const propertyItems = (properties as any[]).map(property => ({
      kind: 'property' as const,
      value: property,
    }));
    const derivedDevelopmentItems = (developmentResults as any[]).map(development => ({
      kind: 'development' as const,
      value: development,
    }));

    if (!derivedDevelopmentItems.length) return propertyItems;
    if (!propertyItems.length) return derivedDevelopmentItems;

    if (sortBy === 'price_asc' || sortBy === 'price_desc') {
      return [...propertyItems, ...derivedDevelopmentItems].sort((left, right) => {
        const leftPrice = Number((left.value as any)?.price || 0);
        const rightPrice = Number((right.value as any)?.price || 0);
        return sortBy === 'price_asc' ? leftPrice - rightPrice : rightPrice - leftPrice;
      });
    }

    if (sortBy === 'date_asc' || sortBy === 'date_desc') {
      return [...propertyItems, ...derivedDevelopmentItems].sort((left, right) => {
        const leftDate = new Date((left.value as any)?.listedDate || (left.value as any)?.createdAt || 0);
        const rightDate = new Date((right.value as any)?.listedDate || (right.value as any)?.createdAt || 0);
        return sortBy === 'date_asc'
          ? leftDate.getTime() - rightDate.getTime()
          : rightDate.getTime() - leftDate.getTime();
      });
    }

    const mixed: Array<
      | { kind: 'property'; value: (typeof propertyItems)[number]['value'] }
      | { kind: 'development'; value: (typeof derivedDevelopmentItems)[number]['value'] }
    > = [];

    let propertyIndex = 0;
    let developmentIndex = 0;
    while (propertyIndex < propertyItems.length || developmentIndex < derivedDevelopmentItems.length) {
      if (developmentIndex < derivedDevelopmentItems.length) {
        mixed.push(derivedDevelopmentItems[developmentIndex]);
        developmentIndex += 1;
      }

      let insertedProperties = 0;
      while (propertyIndex < propertyItems.length && insertedProperties < 3) {
        mixed.push(propertyItems[propertyIndex]);
        propertyIndex += 1;
        insertedProperties += 1;
      }
    }

    return mixed;
  }, [developmentResults, properties, sortBy]);

  const pagedResults = useMemo(() => {
    const start = page * limit;
    return combinedSearchResults.slice(start, start + limit);
  }, [combinedSearchResults, limit, page]);

  const renderedResults = useMemo(
    () =>
      pagedResults
        .map(item => {
          const normalized = normalizePropertyForUI(item.value);
          return normalized ? { ...item, normalized } : null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    [pagedResults],
  );

  const mapResults = useMemo(
    () =>
      renderedResults
        .map((item, index) => {
          const raw = item.value as any;
          const latitude = parseFloat(String(raw.latitude || ''));
          const longitude = parseFloat(String(raw.longitude || ''));
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

          const navigationHref =
            item.kind === 'development'
              ? item.normalized.development?.slug
                ? `/development/${item.normalized.development.slug}`
                : item.normalized.development?.id
                  ? `/development/${item.normalized.development.id}`
                  : `/property/${item.normalized.id}`
              : `/property/${item.normalized.id}`;

          return {
            markerId: item.kind === 'development' ? -1 * (page * limit + index + 1) : Number(item.normalized.id),
            href: navigationHref,
            property: {
              id: item.kind === 'development' ? -1 * (page * limit + index + 1) : Number(item.normalized.id),
              title: item.normalized.title,
              price: item.normalized.price,
              propertyType: item.normalized.propertyType ?? 'unknown',
              listingType: item.normalized.listingType ?? 'sale',
              listingSource: (item.normalized as any).listingSource,
              listerType: (item.normalized as any).listerType,
              primaryBadge: getPrimaryListingBadge((item.normalized as any).badges),
              latitude,
              longitude,
              mainImage:
                (item.normalized as any).image ??
                (item.normalized as any).mainImage ??
                (item.normalized as any).images?.[0],
              address: (item.normalized as any).address,
              city: (item.normalized as any).city,
              bedrooms: item.normalized.bedrooms,
              bathrooms: item.normalized.bathrooms,
              area: item.normalized.area,
            },
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    [limit, page, renderedResults],
  );

  const displayedResultCount = renderedResults.length;
  const displayedDevelopmentCount = renderedResults.filter(item => item.kind === 'development').length;
  const resultCount = resultTotal;
  const canonicalUrl = useMemo(() => generateIntentUrl(searchIntent), [searchIntent]);
  const hasRenderableResults =
    viewMode === 'map' ? mapResults.length > 0 : renderedResults.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <MetaControl canonicalUrl={canonicalUrl} />
      <ListingNavbar
        defaultLocations={(filters.locations ?? []).map(l => ({
          name: (l as any).name ?? l.slug,
          slug: l.slug,
          type: l.type,
          citySlug: l.citySlug,
          provinceSlug: l.provinceSlug,
          fullAddress: (l as any).fullAddress ?? l.slug,
        }))}
      />

      <div className="container pt-24 pb-8">
        <div className="mx-auto w-full max-w-[1180px]">
          {/* Header Section */}
          <div className="mb-3">
            <div className="mb-2">
              <Breadcrumbs items={breadcrumbs} />
            </div>

            <SearchFallbackNotice locationContext={locationContext} />

            <div className="border-b border-gray-200 pb-3">
              <ResultsHeader
                filters={filters}
                resultCount={resultCount}
                displayedPropertyCount={displayedResultCount}
                developmentCount={displayedDevelopmentCount}
                isLoading={isLoading}
                viewMode={viewMode}
                sortBy={sortBy}
                onViewModeChange={setViewMode}
                onSortChange={setSortBy}
                onOpenFilters={() => setIsMobileFilterOpen(true)}
              />
              <div className="mt-2">
                <ActiveFilterChips
                  filters={searchIntent.filters} // Only show actual removable filters, not geography path
                  onRemoveFilter={handleRemoveFilter}
                  onClearAll={handleClearAllFilters}
                />
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="grid grid-cols-1 gap-2 px-2 sm:px-3 lg:grid-cols-[292px_minmax(0,760px)] lg:justify-center lg:gap-3 lg:px-0">
            {/* LEFT SIDEBAR - FILTERS */}
            <div className="hidden lg:block">
              <div className="sticky top-24">
                <SidebarFilters
                  filters={filters}
                  filterCounts={shouldFetchManualListings ? (filterCounts as any) : undefined}
                  locationContext={locationContext}
                  onFilterChange={handleFilterChange}
                  onSaveSearch={handleSaveSearch}
                />
              </div>
            </div>

            {/* Main Content - Results */}
            <div className="col-span-1">
              {/* Results Grid */}
              <div className="">
                {isLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : hasRenderableResults ? (
                  <>
                    {viewMode === 'list' && (
                      <div className="flex flex-col items-start gap-4">
                        {renderedResults.map((item, index) => {
                          const normalized = item.normalized;
                          return (
                            <ListingResultCard
                              key={`prop-${normalized.id}-${index}`}
                              data={{
                                id: normalized.id,
                                title: normalized.title,
                                location: normalized.location,
                                price: normalized.price,
                                image:
                                  typeof normalized.image === 'string'
                                    ? normalized.image
                                    : (normalized as any).mainImage ?? '/placeholder-property.jpg',
                                development: (normalized as any).development,
                                area: normalized.area,
                                bedrooms: normalized.bedrooms,
                                bathrooms: normalized.bathrooms,
                                floor:
                                  typeof (normalized as any).yardSize === 'number' &&
                                  (normalized as any).yardSize > 0
                                    ? `${(normalized as any).yardSize}m2`
                                    : '-',
                                highlights: Array.isArray(normalized.highlights)
                                  ? normalized.highlights
                                  : [],
                                badges: getDisplayListingBadges((normalized as any).badges),
                                description: normalized.description ?? undefined,
                                listingSource: (normalized as any).listingSource,
                                listerType: (normalized as any).listerType,
                                contactRole:
                                  (normalized as any).listingSource === 'development'
                                    ? 'developer'
                                    : (normalized as any).listerType === 'private'
                                      ? 'private'
                                      : 'agent',
                                postedBy:
                                  (normalized as any).listingSource === 'development'
                                    ? (normalized as any).developerBrand?.brandName ||
                                      'Developer Team'
                                    : normalized.agent?.name || 'Private Seller',
                                agentAvatarUrl:
                                  (normalized as any).listingSource === 'development'
                                    ? (normalized as any).developerBrand?.logoUrl || undefined
                                    : normalized.agent?.image || undefined,
                              }}
                            />
                          );
                        })}
                      </div>
                    )}

                    {viewMode === 'grid' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        {renderedResults.map(item => {
                          const normalized = item.normalized;
                          const cardProps = {
                            ...normalized,
                            development: (normalized as any).development,
                            developerBrand: (normalized as any).developerBrand,
                            listingSource: (normalized as any).listingSource,
                            listerType: (normalized as any).listerType,
                            image:
                              (normalized as any).image ??
                              (normalized as any).mainImage ??
                              (normalized as any).images?.[0] ??
                              '/placeholder-property.jpg',
                          };
                          return <PropertyCard key={normalized.id} {...(cardProps as any)} />;
                        })}
                      </div>
                    )}

                    {viewMode === 'map' && (
                      <GooglePropertyMap
                        properties={mapResults.map(item => item.property)}
                        onPropertySelect={id => {
                          const target = mapResults.find(item => item.markerId === id);
                          if (target) {
                            window.location.href = target.href;
                          }
                        }}
                        onBoundsChange={handleBoundsChange}
                      />
                    )}

                    {/* Pagination */}
                    {resultCount >= limit && (
                      <div className="mt-8 flex items-center justify-center gap-4">
                        <Button
                          variant="outline"
                          disabled={page === 0}
                          onClick={() => setPage(p => Math.max(0, p - 1))}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">Page {page + 1}</span>
                        <Button
                          variant="outline"
                          disabled={(page + 1) * limit >= resultCount}
                          onClick={() => setPage(p => p + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mx-auto flex max-w-lg flex-col items-center justify-center py-20 text-center">
                    <div className="relative mb-6 rounded-full bg-slate-50 p-4">
                      <Building2 className="h-12 w-12 text-slate-300" />
                      <div className="absolute -bottom-1 -right-1 rounded-full border border-slate-200 bg-white p-1">
                        <Search className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>

                    <h3 className="mb-2 text-xl font-bold text-slate-800">
                      No matching properties found
                    </h3>

                    <p className="mb-8 max-w-md text-slate-500">
                      We couldn't find any properties matching your exact criteria in
                      <span className="font-semibold text-slate-700"> coverage area</span>.
                    </p>

                    <div className="flex w-full max-w-xs flex-col gap-3">
                      {locationContext &&
                        locationContext.type === 'suburb' &&
                        locationContext.ids?.cityId && (
                          <Button
                            className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
                            onClick={() => {
                              const newFilters = { ...filters };
                              delete newFilters.suburb;
                              newFilters.city = locationContext.hierarchy.city;
                              handleFilterChange(newFilters);
                            }}
                          >
                            <MapPin className="h-4 w-4" />
                            Search all {locationContext.hierarchy.city}
                          </Button>
                        )}

                      {locationContext && locationContext.type === 'city' && (
                        <Button
                          variant="secondary"
                          className="w-full gap-2"
                          onClick={() => {
                            const newFilters = { ...filters };
                            delete newFilters.city;
                            newFilters.province = locationContext.hierarchy.province;
                            handleFilterChange(newFilters);
                          }}
                        >
                          <MapPin className="h-4 w-4" />
                          Search all {locationContext.hierarchy.province}
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleClearAllFilters}
                      >
                        Clear Filters & Broaden Search
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Controls (Persistent Bottom Bar) */}
      <MobileStickyControls
        onOpenFilters={() => setIsMobileFilterOpen(true)}
        currentView={viewMode}
        onViewChange={setViewMode}
        onSortChange={setSortBy}
        currentSort={sortBy}
        resultCount={resultCount}
      />

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {/* Save Search Dialog */}
      <Dialog open={isSaveSearchOpen} onOpenChange={setIsSaveSearchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
            <DialogDescription>
              Save your current search criteria to get notified about new properties.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="search-name">Search Name</Label>
              <Input
                id="search-name"
                placeholder="e.g. 2 Bed Apartments in Sandton"
                value={saveSearchName}
                onChange={e => setSaveSearchName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveSearchOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmSaveSearch}
              disabled={saveSearchMutation.isPending || !saveSearchName.trim()}
            >
              {saveSearchMutation.isPending ? 'Saving...' : 'Save Search'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
