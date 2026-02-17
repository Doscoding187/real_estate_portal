import { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'wouter';
import { ListingNavbar } from '@/components/ListingNavbar';
import { SidebarFilters } from '@/components/SidebarFilters';
import PropertyCard from '@/components/PropertyCard';
import { GooglePropertyMap } from '@/components/maps/GooglePropertyMap';
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
import { DevelopmentResultCard } from '@/components/property-results/DevelopmentResultCard';
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
  const queryInput = useMemo(
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
      limit,
      offset: page * limit,
      includeDevelopments: true,
    }),
    [filters, page],
  );

  // Fetch properties
  const { data: searchResults, isLoading } = trpc.properties.search.useQuery(queryInput);
  const { data: filterCounts } = trpc.properties.getFilterCounts.useQuery({
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
  });

  const properties = (searchResults as any)?.items ?? (searchResults as any)?.properties ?? [];
  const developmentResults = (searchResults as any)?.developments?.items ?? [];
  const resultTotal = (searchResults as any)?.total ?? 0;
  const locationContext = (searchResults as any)?.locationContext;

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

  // Only show real properties
  const displayProperties = properties || [];

  // Client-side sort fallback
  const sortedProperties = useMemo(() => {
    const propsToUse = displayProperties as any[];
    if (!propsToUse.length) return [];

    const sorted = [...propsToUse];
    switch (sortBy) {
      case 'price_asc':
        sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_desc':
        sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      default:
        break;
    }
    return sorted;
  }, [displayProperties, sortBy]);

  const mixedListResults = useMemo(() => {
    const propertyItems = sortedProperties.map(property => ({
      kind: 'property' as const,
      value: property,
    }));
    const developmentItems = (developmentResults as any[]).map(development => ({
      kind: 'development' as const,
      value: development,
    }));

    if (!developmentItems.length) return propertyItems;
    if (!propertyItems.length) return developmentItems;

    const mixed: Array<
      | { kind: 'property'; value: (typeof propertyItems)[number]['value'] }
      | { kind: 'development'; value: (typeof developmentItems)[number]['value'] }
    > = [];

    let p = 0;
    let d = 0;
    while (p < propertyItems.length || d < developmentItems.length) {
      if (d < developmentItems.length) {
        mixed.push(developmentItems[d]);
        d += 1;
      }
      let inserted = 0;
      while (p < propertyItems.length && inserted < 3) {
        mixed.push(propertyItems[p]);
        p += 1;
        inserted += 1;
      }
    }

    return mixed;
  }, [sortedProperties, developmentResults]);

  const resultCount = resultTotal;
  const canonicalUrl = useMemo(() => generateIntentUrl(searchIntent), [searchIntent]);
  const hasRenderableResults =
    viewMode === 'list' ? mixedListResults.length > 0 : sortedProperties.length > 0;

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
                displayedPropertyCount={sortedProperties.length}
                developmentCount={developmentResults.length}
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
                  filterCounts={filterCounts as any}
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
                      {mixedListResults.map((item, index) => {
                        if (item.kind === 'development') {
                          const development = item.value as any;
                          return (
                            <DevelopmentResultCard
                              key={`dev-${development.id}-${index}`}
                              id={development.id}
                              name={development.name}
                              slug={development.slug}
                                suburb={development.suburb}
                                city={development.city}
                              province={development.province}
                              status={development.status}
                              isFeatured={development.isFeatured}
                              rating={development.rating}
                              highlights={Array.isArray(development.highlights) ? development.highlights : []}
                              builderName={development.builderName}
                              builderLogoUrl={development.builderLogoUrl}
                              description={development.description ?? null}
                              configurations={development.configurations}
                              images={development.images}
                              />
                            );
                          }

                          const normalized = normalizePropertyForUI(item.value);
                        if (!normalized) return null;
                        return (
                          <ListingResultCard
                            key={`prop-${normalized.id}-${index}`}
                            data={{
                                id: normalized.id,
                                title: normalized.title,
                                location: normalized.location,
                                price: normalized.price,
                                image:
                                  typeof (normalized as any).image === 'string'
                                    ? (normalized as any).image
                                    : (normalized as any).mainImage ??
                                  '/placeholder-property.jpg',
                              area: normalized.area,
                              bedrooms: normalized.bedrooms,
                              bathrooms: normalized.bathrooms,
                              floor:
                                typeof (normalized as any).yardSize === 'number' &&
                                (normalized as any).yardSize > 0
                                  ? `${(normalized as any).yardSize}m2`
                                  : '-',
                              highlights: Array.isArray(normalized.highlights) ? normalized.highlights : [],
                              description: normalized.description ?? undefined,
                              postedBy: normalized.agent?.name,
                              agentAvatarUrl: normalized.agent?.image ?? undefined,
                            }}
                          />
                        );
                        })}
                      </div>
                    )}

                  {viewMode === 'grid' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      {sortedProperties.map(property => {
                        const normalized = normalizePropertyForUI(property);
                        if (!normalized) return null;
                        const cardProps = {
                          ...normalized,
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
                      properties={sortedProperties
                        .map(p => {
                          const normalized = normalizePropertyForUI(p);
                          if (!normalized) return null;
                          return {
                            id: parseInt(normalized.id),
                            title: normalized.title,
                            price: normalized.price,
                            propertyType: normalized.propertyType ?? 'unknown',
                            listingType: normalized.listingType ?? 'sale',
                            latitude: parseFloat(p.latitude || '-26.2041'),
                            longitude: parseFloat(p.longitude || '28.0473'),
                            mainImage:
                              (normalized as any).image ??
                              (normalized as any).mainImage ??
                              (normalized as any).images?.[0],
                            address: (normalized as any).address,
                            city: (normalized as any).city,
                            bedrooms: normalized.bedrooms,
                            bathrooms: normalized.bathrooms,
                            area: normalized.area,
                          };
                        })
                        .filter((p): p is NonNullable<typeof p> => p !== null)}
                      onPropertySelect={id => {
                        window.location.href = `/property/${id}`;
                      }}
                      onBoundsChange={handleBoundsChange}
                    />
                  )}

                  {/* Pagination */}
                  {resultCount >= limit && (
                    <div className="flex justify-center items-center gap-4 mt-8">
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
                        disabled={resultCount < limit}
                        onClick={() => setPage(p => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center max-w-lg mx-auto">
                  <div className="bg-slate-50 p-4 rounded-full mb-6 relative">
                    <Building2 className="h-12 w-12 text-slate-300" />
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 border border-slate-200">
                      <Search className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-slate-800 mb-2">
                    No matching properties found
                  </h3>

                  <p className="text-slate-500 mb-8 max-w-md">
                    We couldn't find any properties matching your exact criteria in
                    <span className="font-semibold text-slate-700"> coverage area</span>.
                  </p>

                  <div className="flex flex-col gap-3 w-full max-w-xs">
                    {/* Smart Fallback Suggestions */}
                    {locationContext &&
                      locationContext.type === 'suburb' &&
                      locationContext.ids?.cityId && (
                        <Button
                          className="w-full bg-blue-600 hover:bg-blue-700 gap-2"
                          onClick={() => {
                            // Keep filters, but expand location to City
                            const newFilters = { ...filters };
                            delete newFilters.suburb;
                            newFilters.city = locationContext.hierarchy.city; // Fallback to city name
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
                          // Keep filters, but expand location to Province
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

                    <Button variant="outline" className="w-full" onClick={handleClearAllFilters}>
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
