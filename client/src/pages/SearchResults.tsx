import { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'wouter';
import { ListingNavbar } from '@/components/ListingNavbar';
import { SidebarFilters } from '@/components/SidebarFilters';
import PropertyCard from '@/components/PropertyCard';
import { GooglePropertyMap } from '@/components/maps/GooglePropertyMap';
import { getPrimaryListingBadge } from '@/lib/listingBadges';
import { searchCardResultToPropertyCardProps } from '@/lib/normalizers';
import { blendSearchResults } from '@/lib/searchBlend';
import {
  DEFAULT_SAVED_SEARCH_DELIVERY_PREFERENCES,
  getSavedSearchNotificationDescription,
  getSavedSearchSuggestedName,
} from '@/lib/savedSearchUtils';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
import { SearchResultsEmptyState } from '@/components/search/SearchResultsEmptyState';
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
  unslugify,
} from '@/lib/urlUtils';
import { resolveSearchIntent, generateIntentUrl, SearchIntent } from '@/lib/searchIntent';
import { PROVINCE_SLUGS } from '@/lib/locationUtils';
import type { SearchCardResult } from '@/../../shared/types';

export default function SearchResults({
  province: propProvince,
  city: propCity,
  locationId: propLocationId,
}: { province?: string; city?: string; locationId?: string } = {}) {
  type NavbarLocation = {
    name: string;
    slug: string;
    type: 'province' | 'city' | 'suburb';
    provinceSlug?: string;
    citySlug?: string;
    fullAddress: string;
  };

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

  const normalizedLocationFilters = useMemo<NavbarLocation[]>(
    () =>
      (filters.locations ?? [])
        .reduce<NavbarLocation[]>((acc, location) => {
          if (typeof location === 'string') {
            const slug = location.trim();
            if (!slug) return acc;
            const type: NavbarLocation['type'] = PROVINCE_SLUGS.includes(slug.toLowerCase())
              ? 'province'
              : 'city';
            acc.push({
              name: unslugify(slug),
              slug,
              type,
              provinceSlug: type === 'province' ? slug : undefined,
              citySlug: type === 'city' ? slug : undefined,
              fullAddress: unslugify(slug),
            });
            return acc;
          }

          if (location && typeof location === 'object' && 'slug' in location) {
            const slug = String(location.slug || '').trim();
            if (!slug) return acc;
            acc.push({
              name: String((location as any).name || '').trim() || unslugify(slug),
              slug,
              type:
                location.type === 'province' ||
                location.type === 'city' ||
                location.type === 'suburb'
                  ? location.type
                  : 'city',
              citySlug: (location as any).citySlug,
              provinceSlug: (location as any).provinceSlug,
              fullAddress: String((location as any).fullAddress || '').trim() || unslugify(slug),
            });
          }

          return acc;
        }, []),
    [filters.locations],
  );

  const normalizedLocationSlugs = useMemo(
    () => normalizedLocationFilters.map(location => location.slug),
    [normalizedLocationFilters],
  );

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [page, setPage] = useState(0);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isSaveSearchOpen, setIsSaveSearchOpen] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [saveSearchNotificationFrequency, setSaveSearchNotificationFrequency] = useState<
    'instant' | 'daily' | 'weekly' | 'never'
  >('weekly');
  const [saveSearchEmailEnabled, setSaveSearchEmailEnabled] = useState(
    DEFAULT_SAVED_SEARCH_DELIVERY_PREFERENCES.emailEnabled,
  );
  const [saveSearchInAppEnabled, setSaveSearchInAppEnabled] = useState(
    DEFAULT_SAVED_SEARCH_DELIVERY_PREFERENCES.inAppEnabled,
  );

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
  const suggestedSaveSearchName = useMemo(() => getSavedSearchSuggestedName(filters), [filters]);
  const saveSearchDescription = useMemo(
    () =>
      getSavedSearchNotificationDescription(filters, saveSearchNotificationFrequency, {
        emailEnabled: saveSearchEmailEnabled,
        inAppEnabled: saveSearchInAppEnabled,
      }),
    [filters, saveSearchEmailEnabled, saveSearchInAppEnabled, saveSearchNotificationFrequency],
  );

  // Build query input for tRPC
  const propertyQueryInput = useMemo(
    () => ({
      ...filters,
      city: filters.city, // Explicitly ensure these are passed
      province: filters.province,
      suburb: typeof filters.suburb === 'string' ? [filters.suburb] : filters.suburb,
      locations: normalizedLocationSlugs,
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
    [backendSortOption, blendFetchLimit, filters, normalizedLocationSlugs],
  );

  const developmentListingQueryInput = useMemo(
    () => ({
      city: filters.city,
      province: filters.province,
      suburb: typeof filters.suburb === 'string' ? [filters.suburb] : filters.suburb,
      locations: normalizedLocationSlugs,
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
    [backendSortOption, blendFetchLimit, filters, normalizedLocationSlugs],
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
        locations: normalizedLocationSlugs,
        listingType: filters.listingType,
        listingSource: filters.listingSource,
        propertyType: filters.propertyType,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        minBedrooms: filters.minBedrooms,
        maxBedrooms: filters.maxBedrooms,
      },
    },
  );

  const propertyCards: SearchCardResult[] =
    shouldFetchManualListings ? ((propertySearchResults as any)?.cards ?? []) : [];
  const developmentCards: SearchCardResult[] =
    shouldFetchDevelopmentListings ? ((developmentListingResults as any)?.cards ?? []) : [];
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
      setSaveSearchNotificationFrequency('weekly');
      setSaveSearchEmailEnabled(DEFAULT_SAVED_SEARCH_DELIVERY_PREFERENCES.emailEnabled);
      setSaveSearchInAppEnabled(DEFAULT_SAVED_SEARCH_DELIVERY_PREFERENCES.inAppEnabled);
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

  const handleListingSourceChange = (source?: SearchFilters['listingSource']) => {
    const nextFilters = { ...searchIntent.filters };
    if (source) {
      nextFilters.listingSource = source;
    } else {
      delete nextFilters.listingSource;
    }

    const updatedIntent: SearchIntent = {
      ...searchIntent,
      filters: nextFilters,
    };

    setLocation(generateIntentUrl(updatedIntent));
    setPage(0);
  };

  const handleSaveSearch = () => {
    if (!isAuthenticated) {
      toast.error('Please login to save searches');
      return;
    }
    setSaveSearchName(current => current.trim() || suggestedSaveSearchName);
    setIsSaveSearchOpen(true);
  };

  const confirmSaveSearch = () => {
    const resolvedSearchName = saveSearchName.trim() || suggestedSaveSearchName;
    if (!resolvedSearchName) return;
    saveSearchMutation.mutate({
      name: resolvedSearchName,
      criteria: filters,
      notificationFrequency: saveSearchNotificationFrequency,
      emailEnabled: saveSearchEmailEnabled,
      inAppEnabled: saveSearchInAppEnabled,
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
    const propertyItems = propertyCards.map(property => ({
      kind: 'property' as const,
      value: property,
    }));
    const derivedDevelopmentItems = developmentCards.map(development => ({
      kind: 'development' as const,
      value: development,
    }));

    return blendSearchResults(propertyItems, derivedDevelopmentItems, sortBy, filters);
  }, [developmentCards, filters, propertyCards, sortBy]);

  const pagedResults = useMemo(() => {
    const start = page * limit;
    return combinedSearchResults.slice(start, start + limit);
  }, [combinedSearchResults, limit, page]);

  const renderedResults = pagedResults;

  const mapResults = useMemo(
    () =>
      renderedResults
        .map((item, index) => {
          const card = item.value as SearchCardResult;
          const latitude = parseFloat(String(card.latitude || ''));
          const longitude = parseFloat(String(card.longitude || ''));
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

          return {
            markerId: item.kind === 'development' ? -1 * (page * limit + index + 1) : Number(card.id),
            href: card.href,
            property: {
              id: item.kind === 'development' ? -1 * (page * limit + index + 1) : Number(card.id),
              title: card.title,
              price: card.price,
              propertyType: card.propertyType ?? 'unknown',
              listingType: card.listingType ?? 'sale',
              listingSource: card.listingSource,
              listerType: card.listerType,
              primaryBadge: getPrimaryListingBadge(card.badges),
              latitude,
              longitude,
              mainImage: card.image || card.images?.[0]?.url,
              address: card.address || card.location || '',
              city: card.city,
              bedrooms: card.bedrooms,
              bathrooms: card.bathrooms,
              area: card.area,
            },
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    [limit, page, renderedResults],
  );

  const resultCount = resultTotal;
  const canonicalUrl = useMemo(() => generateIntentUrl(searchIntent), [searchIntent]);
  const totalPages = resultCount > 0 ? Math.max(1, Math.ceil(resultCount / limit)) : 0;
  const hasRenderableResults =
    viewMode === 'map' ? mapResults.length > 0 : renderedResults.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <MetaControl canonicalUrl={canonicalUrl} />
      <ListingNavbar
        defaultLocations={normalizedLocationFilters}
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
                resultCount={resultCount}
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
                        {renderedResults.map((item, index) => {
                          const card = item.value as SearchCardResult;
                          return (
                            <ListingResultCard
                              key={`prop-${card.id}-${index}`}
                              data={{
                                id: card.id,
                                href: card.href,
                                title: card.title,
                                location: card.location,
                                price: card.price,
                                image: card.image || '/placeholder-property.jpg',
                                development: card.development,
                                area: card.area,
                                bedrooms: card.bedrooms,
                                bathrooms: card.bathrooms,
                                floor:
                                  typeof card.yardSize === 'number' && card.yardSize > 0
                                    ? `${card.yardSize}m2`
                                    : undefined,
                                highlights: card.highlights,
                                description: card.description,
                                listingSource: card.listingSource,
                                listerType: card.listerType,
                                contactRole: card.contactRole,
                                propertyId: card.propertyId,
                                agentId: card.identity.agentId,
                                agencyId: card.identity.agencyId,
                                developerBrandProfileId: card.identity.developerBrandProfileId,
                                developmentId: card.developmentId,
                                postedBy: card.identity.name,
                                agentAvatarUrl: card.identity.avatarUrl || undefined,
                                contactPhone: card.identity.phone || undefined,
                                contactWhatsapp: card.identity.whatsapp || undefined,
                                contactEmail: card.identity.email || undefined,
                              }}
                            />
                          );
                        })}
                      </div>
                    )}

                    {viewMode === 'grid' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        {renderedResults.map(item => {
                          const card = item.value as SearchCardResult;
                          const cardProps = searchCardResultToPropertyCardProps(card);
                          return <PropertyCard key={card.id} {...cardProps} />;
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
                      <div className="mt-8 flex flex-col items-center justify-center gap-3">
                        <div className="flex items-center justify-center gap-4">
                          <Button
                            variant="outline"
                            disabled={page === 0}
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                          >
                            Previous
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Page {page + 1} of {Math.max(1, totalPages)}
                          </span>
                          <Button
                            variant="outline"
                            disabled={(page + 1) * limit >= resultCount}
                            onClick={() => setPage(p => p + 1)}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <SearchResultsEmptyState
                    filters={filters}
                    locationContext={locationContext as any}
                    onClearAllFilters={handleClearAllFilters}
                    onSwitchToSource={handleListingSourceChange}
                    onBroadenToCity={
                      locationContext &&
                      locationContext.type === 'suburb' &&
                      locationContext.ids?.cityId &&
                      locationContext.hierarchy?.city
                        ? () => {
                            const newFilters = { ...filters };
                            delete newFilters.suburb;
                            newFilters.city = locationContext.hierarchy.city;
                            handleFilterChange(newFilters);
                          }
                        : undefined
                    }
                    onBroadenToProvince={
                      locationContext &&
                      locationContext.type === 'city' &&
                      locationContext.hierarchy?.province
                        ? () => {
                            const newFilters = { ...filters };
                            delete newFilters.city;
                            newFilters.province = locationContext.hierarchy.province;
                            handleFilterChange(newFilters);
                          }
                        : undefined
                    }
                  />
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
            <DialogDescription>{saveSearchDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="search-name">Search Name</Label>
              <Input
                id="search-name"
                placeholder={suggestedSaveSearchName}
                value={saveSearchName}
                onChange={e => setSaveSearchName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="search-frequency">Alert Frequency</Label>
              <Select
                value={saveSearchNotificationFrequency}
                onValueChange={value =>
                  setSaveSearchNotificationFrequency(value as typeof saveSearchNotificationFrequency)
                }
              >
                <SelectTrigger id="search-frequency">
                  <SelectValue placeholder="Select alert frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">Instant</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="search-email-alerts">Email alerts</Label>
                  <p className="text-xs text-slate-500">Send new matches to your inbox.</p>
                </div>
                <Switch
                  id="search-email-alerts"
                  checked={saveSearchEmailEnabled}
                  onCheckedChange={checked => setSaveSearchEmailEnabled(Boolean(checked))}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="search-inapp-alerts">In-app alerts</Label>
                  <p className="text-xs text-slate-500">Keep updates in your dashboard.</p>
                </div>
                <Switch
                  id="search-inapp-alerts"
                  checked={saveSearchInAppEnabled}
                  onCheckedChange={checked => setSaveSearchInAppEnabled(Boolean(checked))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveSearchOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmSaveSearch}
              disabled={saveSearchMutation.isPending}
            >
              {saveSearchMutation.isPending ? 'Saving...' : 'Save Search'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
