import { useState, useMemo, useEffect } from 'react';
import { useParams, useLocation, useSearch } from 'wouter';
import {
  ListingNavbar,
  reconstructCanonicalLocations,
  type ListingNavbarLocation,
} from '@/components/ListingNavbar';
import { SidebarFilters } from '@/components/SidebarFilters';
import PropertyCard from '@/components/PropertyCard';
import { GooglePropertyMap } from '@/components/maps/GooglePropertyMap';
import { getPrimaryListingBadge } from '@/lib/listingBadges';
import { searchCardResultToPropertyCardProps } from '@/lib/normalizers';
import { PROPERTY_IMAGE_FALLBACK } from '@/lib/mediaUtils';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  SearchFilters,
  unslugify,
} from '@/lib/urlUtils';
import { resolveSearchIntent, generateIntentUrl, SearchIntent } from '@/lib/searchIntent';
import { buildPropertiesCompatibilityRedirect } from '@/lib/searchNavigation';
import { PROVINCE_SLUGS } from '@/lib/locationUtils';
import { encodeCanonicalLocationId, parseCanonicalLocationId } from '@shared/locationAuthority';
import type { SearchCardResult } from '@/../../shared/types';
import {
  BUY_PROPERTY_TYPES,
  sanitizeBuySearchFilters,
  toBuyPublicSearchFilters,
} from '@/../../shared/buySearchContract';
import {
  canAdvancePublicSearchPage,
  getPublicSearchReachablePageCount,
  normalizePublicSearchPageForTotal,
  PUBLIC_SEARCH_MAX_PAGE_INDEX,
} from '@/../../shared/publicSearchPagination';

export default function SearchResults({
  province: propProvince,
  city: propCity,
  locationId: propLocationId,
}: { province?: string; city?: string; locationId?: string } = {}) {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const isLegacyPropertiesRoute = location.split('?')[0] === '/properties';
  const legacyPropertiesRedirect = useMemo(
    () => (isLegacyPropertiesRoute ? buildPropertiesCompatibilityRedirect(search) : null),
    [isLegacyPropertiesRoute, search],
  );

  useEffect(() => {
    if (!isLegacyPropertiesRoute || !legacyPropertiesRedirect) return;
    setLocation(legacyPropertiesRedirect, { replace: true });
  }, [isLegacyPropertiesRoute, legacyPropertiesRedirect, setLocation]);

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
    const searchParams = new URLSearchParams(search);
    // Merge props into params if they exist (for usage inside CityPage)
    // Note: This relies on the router params mainly.
    const effectiveParams = { ...params };
    if (propProvince && !effectiveParams.province) effectiveParams.province = propProvince;
    if (propCity && !effectiveParams.city) effectiveParams.city = propCity;
    if (propLocationId && !effectiveParams.locationId) effectiveParams.locationId = propLocationId;

    return resolveSearchIntent(location, effectiveParams, searchParams);
  }, [location, search, params, propProvince, propCity, propLocationId]);

  // Derived state from Intent
  const filters: SearchFilters = useMemo(() => {
    return {
      ...searchIntent.filters,
      // Ensure geography is represented in filters for the API call
      ...(searchIntent.geography.province && { province: searchIntent.geography.province }),
      ...(searchIntent.geography.city && { city: searchIntent.geography.city }),
      ...(searchIntent.geography.suburb && { suburb: searchIntent.geography.suburb }),
      ...(searchIntent.geography.locationId && { locationId: searchIntent.geography.locationId }),
      ...(searchIntent.transactionType
        ? { listingType: searchIntent.transactionType === 'to-rent' ? 'rent' : 'sale' }
        : {}),
    };
  }, [searchIntent]);

  const normalizedLocationFilters = useMemo<ListingNavbarLocation[]>(() => {
    const locations = (filters.locations ?? []).reduce<ListingNavbarLocation[]>((acc, location) => {
      if (typeof location === 'string') {
        const slug = location.trim();
        if (!slug) return acc;
        const type: ListingNavbarLocation['type'] = PROVINCE_SLUGS.includes(slug.toLowerCase())
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
            location.type === 'province' || location.type === 'city' || location.type === 'suburb'
              ? location.type
              : 'city',
          citySlug: (location as any).citySlug,
          provinceSlug: (location as any).provinceSlug,
          fullAddress: String((location as any).fullAddress || '').trim() || unslugify(slug),
        });
      }

      return acc;
    }, []);

    const canonicalLocationId = searchIntent.geography.locationId;
    const parsedCanonicalLocation = parseCanonicalLocationId(canonicalLocationId);
    const geographySlug =
      parsedCanonicalLocation?.level === 'province'
        ? searchIntent.geography.province
        : parsedCanonicalLocation?.level === 'city'
          ? searchIntent.geography.city
          : parsedCanonicalLocation?.level === 'suburb'
            ? searchIntent.geography.suburb
            : undefined;

    if (canonicalLocationId && parsedCanonicalLocation && geographySlug) {
      const alreadyPresent = locations.some(
        location => location.canonicalLocationId === canonicalLocationId,
      );
      if (!alreadyPresent) {
        locations.push({
          id: canonicalLocationId,
          canonicalLocationId,
          name: unslugify(geographySlug),
          slug: geographySlug,
          type: parsedCanonicalLocation.level,
          provinceSlug: searchIntent.geography.province,
          citySlug: searchIntent.geography.city,
          fullAddress: [
            searchIntent.geography.suburb,
            searchIntent.geography.city,
            searchIntent.geography.province,
          ]
            .filter(Boolean)
            .map(value => unslugify(String(value)))
            .join(', '),
        });
      }
    }

    (searchIntent.geography.locationIds || []).forEach(canonicalLocationId => {
      if (locations.some(location => location.canonicalLocationId === canonicalLocationId)) return;
      const parsed = parseCanonicalLocationId(canonicalLocationId);
      if (!parsed) return;
      const type: ListingNavbarLocation['type'] =
        parsed.level === 'province' ? 'province' : parsed.level === 'city' ? 'city' : 'suburb';
      locations.push({
        id: canonicalLocationId,
        canonicalLocationId,
        name: canonicalLocationId,
        slug: canonicalLocationId,
        type,
        fullAddress: canonicalLocationId,
      });
    });

    return locations;
  }, [filters.locations, searchIntent.geography]);

  const normalizedLocationSlugs = useMemo(
    () => normalizedLocationFilters.map(location => location.slug),
    [normalizedLocationFilters],
  );

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  // Sort and pagination are transactional URL state. View mode is deliberately
  // presentation-local for this slice and is not part of the public query.
  const sortBy = searchIntent.resultState.sort as SortOption;
  const page = searchIntent.resultState.page;
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

  // One server-authoritative request owns source selection, blending, counts,
  // pagination and location resolution. The browser receives only the page it
  // is allowed to render.
  const publicSearchQueryInput = useMemo(() => {
    const isBuySearch = searchIntent.transactionType === 'for-sale';
    const isRentSearch = searchIntent.transactionType === 'to-rent';
    const publicPropertyTypes = new Set([
      'apartment',
      'house',
      'villa',
      'plot',
      'commercial',
      'townhouse',
      'cluster_home',
      'farm',
      'shared_living',
    ]);
    const propertyType =
      typeof filters.propertyType === 'string' && publicPropertyTypes.has(filters.propertyType)
        ? (filters.propertyType as
            | 'apartment'
            | 'house'
            | 'villa'
            | 'plot'
            | 'commercial'
            | 'townhouse'
            | 'cluster_home'
            | 'farm'
            | 'shared_living')
        : undefined;
    const numericFilter = (value: unknown) =>
      typeof value === 'number' && Number.isFinite(value) ? value : undefined;
    const buyFilters = isBuySearch ? toBuyPublicSearchFilters(filters) : undefined;

    return {
      city: filters.city,
      province: filters.province,
      suburb: typeof filters.suburb === 'string' ? [filters.suburb] : filters.suburb,
      locations:
        searchIntent.geography.level === 'multi_location'
          ? undefined
          : isBuySearch
            ? undefined
            : normalizedLocationSlugs,
      locationId: filters.locationId,
      locationIds: searchIntent.geography.locationIds,
      searchAreaId: searchIntent.geography.searchAreaId,
      searchAreaIds: searchIntent.geography.searchAreaIds,
      propertyType: isBuySearch ? buyFilters?.propertyType : propertyType,
      listingType: isBuySearch
        ? buyFilters?.listingType
        : isRentSearch
          ? ('rent' as const)
          : undefined,
      listingSource: isBuySearch ? buyFilters?.listingSource : filters.listingSource,
      minPrice: isBuySearch ? buyFilters?.minPrice : numericFilter(filters.minPrice),
      maxPrice: isBuySearch ? buyFilters?.maxPrice : numericFilter(filters.maxPrice),
      minBedrooms: isBuySearch ? buyFilters?.minBedrooms : numericFilter(filters.minBedrooms),
      maxBedrooms: isBuySearch ? undefined : numericFilter(filters.maxBedrooms),
      minBathrooms: isBuySearch ? buyFilters?.minBathrooms : numericFilter(filters.minBathrooms),
      maxBathrooms: isBuySearch ? undefined : numericFilter(filters.maxBathrooms),
      minArea: isBuySearch ? undefined : numericFilter(filters.minArea),
      maxArea: isBuySearch ? undefined : numericFilter(filters.maxArea),
      minLat: isBuySearch ? buyFilters?.minLat : numericFilter(filters.minLat),
      maxLat: isBuySearch ? buyFilters?.maxLat : numericFilter(filters.maxLat),
      minLng: isBuySearch ? buyFilters?.minLng : numericFilter(filters.minLng),
      maxLng: isBuySearch ? buyFilters?.maxLng : numericFilter(filters.maxLng),
      sortOption: sortBy,
      page,
      pageSize: limit,
    };
  }, [
    filters,
    limit,
    normalizedLocationSlugs,
    page,
    searchIntent.geography.level,
    searchIntent.geography.locationIds,
    searchIntent.geography.searchAreaIds,
    searchIntent.geography.searchAreaId,
    searchIntent.transactionType,
    sortBy,
  ]);

  const isTransactionalJourney =
    searchIntent.transactionType === 'for-sale' || searchIntent.transactionType === 'to-rent';

  const {
    data: publicSearchResults,
    isLoading,
    error: publicSearchError,
  } = trpc.properties.searchPublicInventory.useQuery(publicSearchQueryInput, {
    retry: false,
    enabled: !isLegacyPropertiesRoute && isTransactionalJourney && !searchIntent.validation,
  });
  const hasSearchError = Boolean(publicSearchError);
  // Filter metadata is intentionally omitted until it is calculated by the
  // same public inventory authority as the returned cards and total.
  const filterCounts = undefined;

  const renderedResults: SearchCardResult[] = (publicSearchResults?.cards ??
    []) as SearchCardResult[];
  const resultTotal = publicSearchResults?.total ?? 0;
  const effectivePage = publicSearchResults
    ? normalizePublicSearchPageForTotal(
        publicSearchResults.page,
        publicSearchResults.total,
        publicSearchResults.pageSize,
      )
    : page;
  const locationContext = publicSearchResults?.locationContext;
  const locationMessage = publicSearchResults?.locationMessage ?? searchIntent.validation?.message;
  const navbarLocations = useMemo(() => {
    const multiContext = publicSearchResults?.multiLocationContext;
    if (multiContext) {
      return reconstructCanonicalLocations(multiContext.locations);
    }

    const locationContext = publicSearchResults?.locationContext;
    if (!locationContext) return normalizedLocationFilters;

    const parentCanonicalLocationId =
      locationContext.type === 'city'
        ? encodeCanonicalLocationId('province', locationContext.ids.provinceId)
        : locationContext.type === 'suburb' && locationContext.ids.cityId
          ? encodeCanonicalLocationId('city', locationContext.ids.cityId)
          : undefined;

    return normalizedLocationFilters.map(location => ({
      ...location,
      parentCanonicalLocationId,
    }));
  }, [
    normalizedLocationFilters,
    publicSearchResults?.locationContext,
    publicSearchResults?.multiLocationContext,
  ]);

  useEffect(() => {
    if (!publicSearchResults || effectivePage === page) return;

    setLocation(
      generateIntentUrl({
        ...searchIntent,
        resultState: {
          ...searchIntent.resultState,
          page: effectivePage,
        },
      }),
      { replace: true },
    );
  }, [effectivePage, page, publicSearchResults, searchIntent, setLocation]);

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
    const mergedFilters =
      Object.keys(newFilters).length === 0
        ? {}
        : {
            ...searchIntent.filters,
            ...newFilters,
          };
    const nextFilters =
      searchIntent.transactionType === 'for-sale'
        ? sanitizeBuySearchFilters(mergedFilters)
        : mergedFilters;

    const updatedIntent: SearchIntent = {
      ...searchIntent,
      filters: nextFilters,
      resultState: {
        ...searchIntent.resultState,
        page: 0,
      },
    };

    // Sanitize: We do not allow the sidebar to change the geography level keys (province, city, suburb) via 'filters'.
    // If the sidebar wants to change location, it should do so via navigation, not filtering.
    // For now, we just proceed.

    const newUrl = generateIntentUrl(updatedIntent);
    setLocation(newUrl);
  };

  // This is a special handler for "active chips" removal which might be cleaner
  const handleRemoveFilter = (key: keyof SearchFilters) => {
    const nextFilters = { ...searchIntent.filters };
    delete nextFilters[key];

    // Recursively remove from URL state
    const updatedIntent = {
      ...searchIntent,
      filters: nextFilters,
      resultState: {
        ...searchIntent.resultState,
        page: 0,
      },
    };
    setLocation(generateIntentUrl(updatedIntent));
  };

  const handleClearAllFilters = () => {
    // Keep only listing type (which is transactional)
    const updatedIntent = {
      ...searchIntent,
      filters: {}, // Clear all optional filters
      resultState: {
        ...searchIntent.resultState,
        page: 0,
      },
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
      resultState: {
        ...searchIntent.resultState,
        page: 0,
      },
    };

    setLocation(generateIntentUrl(updatedIntent));
  };

  const handleSortChange = (nextSort: SortOption) => {
    setLocation(
      generateIntentUrl({
        ...searchIntent,
        resultState: {
          sort: nextSort,
          page: 0,
        },
      }),
    );
  };

  const handlePageChange = (nextPage: number) => {
    setLocation(
      generateIntentUrl({
        ...searchIntent,
        resultState: {
          ...searchIntent.resultState,
          page: nextPage,
        },
      }),
    );
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
        locationIds: undefined,
        searchAreaId: undefined,
        searchAreaIds: undefined,
        slug: undefined,
      },
      filters: nextFilters,
      resultState: {
        ...searchIntent.resultState,
        page: 0,
      },
    };

    const newUrl = generateIntentUrl(mapIntent);
    setLocation(newUrl);
  };

  const mapResults = useMemo(
    () =>
      renderedResults
        .map((card, index) => {
          const latitude = parseFloat(String(card.latitude || ''));
          const longitude = parseFloat(String(card.longitude || ''));
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

          return {
            markerId:
              card.kind === 'development'
                ? -1 * (effectivePage * limit + index + 1)
                : Number(card.id),
            href: card.href,
            property: {
              id:
                card.kind === 'development'
                  ? -1 * (effectivePage * limit + index + 1)
                  : Number(card.id),
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
    [effectivePage, limit, renderedResults],
  );

  const resultCount = resultTotal;
  const canonicalUrl = useMemo(() => generateIntentUrl(searchIntent), [searchIntent]);
  const pageTitle = useMemo(() => generatePageTitle(filters), [filters]);
  const pageDescription = useMemo(() => generateMetaDescription(filters), [filters]);
  const totalPages = getPublicSearchReachablePageCount(resultCount, limit);
  const canAdvancePage = canAdvancePublicSearchPage(effectivePage, resultCount, limit);
  const hasRenderableResults =
    viewMode === 'map' ? mapResults.length > 0 : renderedResults.length > 0;

  const resolveCardImage = (card: SearchCardResult) => {
    const direct = typeof card.image === 'string' ? card.image.trim() : '';
    if (direct) return direct;

    if (Array.isArray(card.images)) {
      const firstImage = card.images
        .map(image => (typeof image?.url === 'string' ? image.url.trim() : ''))
        .find(Boolean);
      if (firstImage) return firstImage;
    }

    return PROPERTY_IMAGE_FALLBACK;
  };

  if (isLegacyPropertiesRoute) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
        <p className="text-sm text-slate-600">Returning you to the canonical search journey…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <MetaControl canonicalUrl={canonicalUrl} title={pageTitle} description={pageDescription} />
      <ListingNavbar defaultLocations={navbarLocations} />

      <div className="container pb-32 pt-24 lg:pb-12">
        <div className="mx-auto w-full max-w-[1280px]">
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
                onSortChange={handleSortChange}
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
          <div className="grid grid-cols-1 gap-5 px-2 sm:px-3 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-6 lg:px-0 xl:grid-cols-[340px_minmax(0,1fr)]">
            {/* LEFT SIDEBAR - FILTERS */}
            <div className="hidden lg:block">
              <div className="sticky top-24">
                <SidebarFilters
                  filters={filters}
                  filterCounts={filterCounts as any}
                  locationContext={locationContext}
                  onFilterChange={handleFilterChange}
                  onSaveSearch={handleSaveSearch}
                  allowedPropertyTypes={
                    searchIntent.transactionType === 'for-sale' ? BUY_PROPERTY_TYPES : undefined
                  }
                  showAmenities={searchIntent.transactionType !== 'for-sale'}
                  showLocationRefinement={searchIntent.transactionType !== 'for-sale'}
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
                ) : hasSearchError ? (
                  <div
                    role="alert"
                    className="mx-auto max-w-2xl border border-rose-200 bg-rose-50 px-6 py-14 text-center"
                  >
                    <h2 className="text-lg font-semibold text-rose-950">Search unavailable</h2>
                    <p className="mt-2 text-sm text-rose-800">
                      We could not load property results right now. Please try again shortly.
                    </p>
                    <Button className="mt-5" onClick={() => window.location.reload()}>
                      Try again
                    </Button>
                  </div>
                ) : hasRenderableResults ? (
                  <>
                    {viewMode === 'list' && (
                      <div className="flex flex-col gap-4 sm:gap-5 lg:gap-6">
                        {renderedResults.map((card, index) => {
                          return (
                            <ListingResultCard
                              key={`${card.kind}-${card.id}-${index}`}
                              data={{
                                id: card.id,
                                href: card.href,
                                title: card.title,
                                location: card.location,
                                price: card.price,
                                image: resolveCardImage(card),
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
                                agentId: card.identity?.agentId,
                                agencyId: card.identity?.agencyId,
                                developerBrandProfileId: card.identity?.developerBrandProfileId,
                                developmentId: card.developmentId,
                                postedBy: card.identity?.name,
                                agentAvatarUrl: card.identity?.avatarUrl ?? undefined,
                                contactPhone: card.identity?.phone ?? undefined,
                                contactWhatsapp: card.identity?.whatsapp ?? undefined,
                                contactEmail: card.identity?.email ?? undefined,
                              }}
                            />
                          );
                        })}
                      </div>
                    )}

                    {viewMode === 'grid' && (
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 2xl:grid-cols-3 2xl:gap-7">
                        {renderedResults.map(card => {
                          const cardProps = searchCardResultToPropertyCardProps(card);
                          return <PropertyCard key={`${card.kind}-${card.id}`} {...cardProps} />;
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
                            disabled={effectivePage === 0}
                            onClick={() => handlePageChange(Math.max(0, effectivePage - 1))}
                          >
                            Previous
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Page {effectivePage + 1} of {Math.max(1, totalPages)}
                          </span>
                          <Button
                            variant="outline"
                            disabled={!canAdvancePage}
                            onClick={() =>
                              handlePageChange(
                                Math.min(PUBLIC_SEARCH_MAX_PAGE_INDEX, effectivePage + 1),
                              )
                            }
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
                    locationMessage={locationMessage}
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
        onSortChange={handleSortChange}
        currentSort={sortBy}
        resultCount={resultCount}
      />

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
        allowedPropertyTypes={
          searchIntent.transactionType === 'for-sale' ? BUY_PROPERTY_TYPES : undefined
        }
        showAmenities={searchIntent.transactionType !== 'for-sale'}
        showLocationRefinement={searchIntent.transactionType !== 'for-sale'}
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
                  setSaveSearchNotificationFrequency(
                    value as typeof saveSearchNotificationFrequency,
                  )
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
            <Button onClick={confirmSaveSearch} disabled={saveSearchMutation.isPending}>
              {saveSearchMutation.isPending ? 'Saving...' : 'Save Search'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
