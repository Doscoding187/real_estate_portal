import { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'wouter';
import { ListingNavbar } from '@/components/ListingNavbar';
import { SidebarFilters } from '@/components/SidebarFilters';
import PropertyCard from '@/components/PropertyCard';
import { GooglePropertyMap } from '@/components/maps/GooglePropertyMap';
import { getPrimaryListingBadge } from '@/lib/listingBadges';
import { normalizePropertyForUI } from '@/lib/normalizers';
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
    const propertyItems = (properties as any[]).map(property => ({
      kind: 'property' as const,
      value: property,
    }));
    const derivedDevelopmentItems = (developmentResults as any[]).map(development => ({
      kind: 'development' as const,
      value: development,
    }));

    return blendSearchResults(propertyItems, derivedDevelopmentItems, sortBy, filters);
  }, [developmentResults, filters, properties, sortBy]);

  const resolveDevelopmentListingHref = (item: any, normalized: any) => {
    if (typeof item?.href === 'string' && item.href.trim()) {
      return item.href;
    }

    const developmentSlug = normalized?.development?.slug || item?.development?.slug;
    const developmentId = normalized?.development?.id || item?.development?.id || item?.developmentId;
    const unitTypeId = item?.unitTypeId;

    if (developmentSlug && unitTypeId) {
      return `/development/${developmentSlug}/unit/${unitTypeId}`;
    }

    if (developmentId && unitTypeId) {
      return `/development/${developmentId}/unit/${unitTypeId}`;
    }

    if (developmentSlug) return `/development/${developmentSlug}`;
    if (developmentId) return `/development/${developmentId}`;
    return `/property/${normalized?.id || item?.id}`;
  };

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
              ? resolveDevelopmentListingHref(raw, item.normalized)
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
  const displayedManualCount = renderedResults.length - displayedDevelopmentCount;
  const resultCount = resultTotal;
  const canonicalUrl = useMemo(() => generateIntentUrl(searchIntent), [searchIntent]);
  const totalPages = resultCount > 0 ? Math.max(1, Math.ceil(resultCount / limit)) : 0;
  const pageSummaryText = useMemo(() => {
    if (!displayedResultCount || !totalPages) return undefined;

    if (filters.listingSource === 'manual') {
      return `Page ${page + 1} of ${totalPages} · Property listings only`;
    }

    if (filters.listingSource === 'development') {
      return `Page ${page + 1} of ${totalPages} · New developments only`;
    }

    const sourceBreakdown =
      displayedDevelopmentCount > 0
        ? `${displayedManualCount.toLocaleString()} property listings and ${displayedDevelopmentCount.toLocaleString()} development listings on this page`
        : `${displayedManualCount.toLocaleString()} property listings on this page`;

    return `Page ${page + 1} of ${totalPages} · ${sourceBreakdown}`;
  }, [
    displayedDevelopmentCount,
    displayedManualCount,
    displayedResultCount,
    filters.listingSource,
    page,
    totalPages,
  ]);
  const hasRenderableResults =
    viewMode === 'map' ? mapResults.length > 0 : renderedResults.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <MetaControl canonicalUrl={canonicalUrl} />
      <ListingNavbar
        defaultLocations={normalizedLocationFilters}
      />

      <div className="container pt-24 pb-8">
        <div className="mx-auto w-full max-w-[1260px]">
          {/* Header Section */}
          <div className="mb-3">
            <div className="mb-2">
              <Breadcrumbs items={breadcrumbs} />
            </div>

            <SearchFallbackNotice locationContext={locationContext} />

            <div className="border-b border-gray-200 pb-3">
              <ResultsHeader
                resultCount={resultCount}
                displayedCount={displayedResultCount}
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
          <div className="grid grid-cols-1 gap-4 px-2 sm:px-3 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6 lg:px-0">
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
                          const normalized = item.normalized;
                          const raw = item.value as any;
                          return (
                            <ListingResultCard
                              key={`prop-${normalized.id}-${index}`}
                              data={{
                                id: normalized.id,
                                href:
                                  item.kind === 'development'
                                    ? resolveDevelopmentListingHref(item.value, normalized)
                                    : undefined,
                                title: normalized.title,
                                location: normalized.location,
                                price: normalized.price,
                                image:
                                  typeof normalized.image === 'string'
                                    ? normalized.image
                                    : (normalized as any).mainImage ?? '/placeholder-property.jpg',
                                development: (normalized as any).development,
                                area: normalized.area,
                                yardSize: (normalized as any).yardSize,
                                bedrooms: normalized.bedrooms,
                                bathrooms: normalized.bathrooms,
                                highlights: Array.isArray(normalized.highlights)
                                  ? normalized.highlights
                                  : [],
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
                                whatsappNumber:
                                  (normalized as any).listingSource === 'development'
                                    ? raw?.developerPhone || raw?.developerBrand?.phone || undefined
                                    : raw?.agent?.whatsapp || undefined,
                                phoneNumber:
                                  (normalized as any).listingSource === 'development'
                                    ? raw?.developerPhone || raw?.developerBrand?.phone || undefined
                                    : raw?.agent?.phone || undefined,
                                contactEmail:
                                  (normalized as any).listingSource === 'development'
                                    ? raw?.developerBrand?.publicContactEmail || undefined
                                    : raw?.agent?.email || undefined,
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
                            href:
                              item.kind === 'development'
                                ? resolveDevelopmentListingHref(item.value, normalized)
                                : undefined,
                            development: (normalized as any).development,
                            developerBrand: (normalized as any).developerBrand,
                            listingSource: (normalized as any).listingSource,
                            listerType: (normalized as any).listerType,
                            image:
                              (normalized as any).image ??
                              (normalized as any).mainImage ??
                              (normalized as any).images?.[0] ??
                              '/placeholder-property.jpg',
                            hideSourceTag: true,
                            hideDevelopmentContext: true,
                            hideImageBadges: true,
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
                        {pageSummaryText && (
                          <span className="text-xs text-slate-500">{pageSummaryText}</span>
                        )}
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
