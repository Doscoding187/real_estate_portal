import { useState, useMemo, useEffect } from 'react';
import { useParams, useLocation, useSearch } from 'wouter';
import {
  focusListingNavbarLocationInput,
  ListingNavbar,
  reconstructCanonicalLocations,
  type ListingNavbarLocation,
} from '@/components/ListingNavbar';
import { SidebarFilters } from '@/components/SidebarFilters';
import { GooglePropertyMap } from '@/components/maps/GooglePropertyMap';
import { getPrimaryListingBadge } from '@/lib/listingBadges';
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
  ResultsHeader,
  MobileFilterDrawer,
  MobileStickyControls,
  ViewMode,
  SortOption,
} from '@/components/search';
import {
  SearchResultsEmptyState,
  SearchResultsUnavailableState,
} from '@/components/search/SearchResultsEmptyState';
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
import {
  buildCanonicalSavedSearchCriteria,
  resolveSearchIntent,
  generateIntentUrl,
  SearchIntent,
} from '@/lib/searchIntent';
import {
  buildParentRecoveryIntent,
  buildZeroResultDescription,
  clearAllOptionalSearchFilters,
  clearSearchIntentFilters,
  getExplicitParentRecoveryTarget,
  getSearchResultsDisplayState,
} from '@/lib/searchZeroResultRecovery';
import { buildPropertiesCompatibilityRedirect } from '@/lib/searchNavigation';
import { PROVINCE_SLUGS } from '@/lib/locationUtils';
import { encodeCanonicalLocationId, parseCanonicalLocationId } from '@shared/locationAuthority';
import type { SearchCardResult } from '@/../../shared/types';
import type { PublicPropertyType } from '@shared/property-taxonomy';
import {
  HOMES_BUY_SELECTABLE_PROPERTY_TYPES,
  HOMES_RENT_SELECTABLE_PROPERTY_TYPES,
  PUBLIC_PROPERTY_TYPES,
} from '@shared/property-taxonomy';
import { rememberPropertySearchReturn } from '@/lib/searchReturnState';
import { useComparison } from '@/contexts/ComparisonContext';
import {
  sanitizeBuySearchFilters,
  toBuyPublicSearchFilters,
} from '@/../../shared/buySearchContract';
import {
  sanitizeRentSearchFilters,
  toRentPublicSearchFilters,
} from '@/../../shared/rentSearchContract';
import {
  canAdvancePublicSearchPage,
  getPublicSearchReachablePageCount,
  normalizePublicSearchPageForTotal,
  PUBLIC_SEARCH_MAX_PAGE_INDEX,
} from '@/../../shared/publicSearchPagination';

const DISCOVERY_PROPERTY_TYPE_COPY: Record<string, { plural: string; chip: string }> = {
  house: { plural: 'Houses', chip: 'House' },
  apartment: { plural: 'Apartments', chip: 'Apartment' },
  villa: { plural: 'Villas', chip: 'Villa' },
  townhouse: { plural: 'Townhouses', chip: 'Townhouse' },
  cluster_home: { plural: 'Cluster homes', chip: 'Cluster home' },
  farm: { plural: 'Farms', chip: 'Farm' },
  commercial: { plural: 'Commercial properties', chip: 'Commercial' },
  plot: { plural: 'Land and plots', chip: 'Land' },
};

export default function SearchResults({
  province: propProvince,
  city: propCity,
  locationId: propLocationId,
}: { province?: string; city?: string; locationId?: string } = {}) {
  const { isAuthenticated } = useAuth();
  const { data: favorites = [] } = trpc.properties.getFavorites.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { isInComparison, addToComparison, removeFromComparison, canAddMore } = useComparison();
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
  const isBuySearch = searchIntent.transactionType === 'for-sale';
  const isRentSearch = searchIntent.transactionType === 'to-rent';
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
    const publicPropertyTypes: ReadonlySet<string> = new Set(PUBLIC_PROPERTY_TYPES);
    const propertyType =
      typeof filters.propertyType === 'string' && publicPropertyTypes.has(filters.propertyType)
        ? (filters.propertyType as PublicPropertyType)
        : undefined;
    const rentPropertyType =
      typeof filters.propertyType === 'string'
        ? (filters.propertyType as PublicPropertyType)
        : undefined;
    const buyFilters = isBuySearch ? toBuyPublicSearchFilters(filters) : undefined;
    // The rent contract owns canonical composition (defaults dropped,
    // contradictory ranges rejected); propertyType intentionally stays on the
    // raw passthrough below so an unsupported direct Rent URL stays visible to
    // the server validation boundary rather than silently widening.
    const rentFilters = isRentSearch ? toRentPublicSearchFilters(filters) : undefined;

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
      factualLocationId: searchIntent.geography.factualLocationId,
      locationIds: searchIntent.geography.locationIds,
      searchAreaId: searchIntent.geography.searchAreaId,
      searchAreaIds: searchIntent.geography.searchAreaIds,
      // Keep an unsupported direct Rent URL visible to the server validation
      // boundary rather than silently widening it to all rental inventory.
      propertyType: isBuySearch
        ? buyFilters?.propertyType
        : isRentSearch
          ? rentPropertyType
          : propertyType,
      listingType: isBuySearch
        ? buyFilters?.listingType
        : isRentSearch
          ? ('rent' as const)
          : undefined,
      listingSource: isBuySearch ? buyFilters?.listingSource : rentFilters?.listingSource,
      minPrice: isBuySearch ? buyFilters?.minPrice : rentFilters?.minPrice,
      maxPrice: isBuySearch ? buyFilters?.maxPrice : rentFilters?.maxPrice,
      minBedrooms: isBuySearch ? buyFilters?.minBedrooms : rentFilters?.minBedrooms,
      maxBedrooms: isBuySearch ? undefined : rentFilters?.maxBedrooms,
      minBathrooms: isBuySearch ? buyFilters?.minBathrooms : rentFilters?.minBathrooms,
      maxBathrooms: isBuySearch ? undefined : rentFilters?.maxBathrooms,
      minArea: isBuySearch ? buyFilters?.minArea : rentFilters?.minArea,
      maxArea: isBuySearch ? buyFilters?.maxArea : rentFilters?.maxArea,
      minLat: isBuySearch ? buyFilters?.minLat : rentFilters?.minLat,
      maxLat: isBuySearch ? buyFilters?.maxLat : rentFilters?.maxLat,
      minLng: isBuySearch ? buyFilters?.minLng : rentFilters?.minLng,
      maxLng: isBuySearch ? buyFilters?.maxLng : rentFilters?.maxLng,
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
    searchIntent.geography.factualLocationId,
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
  const searchAreaContext = publicSearchResults?.searchAreaContext;
  const searchAreaContexts = publicSearchResults?.searchAreaContexts;
  const multiLocationContext = publicSearchResults?.multiLocationContext;
  const scopedBreadcrumbs = useMemo(() => {
    if (!searchAreaContext) return breadcrumbs;

    return [
      ...breadcrumbs,
      {
        label: `${searchAreaContext.label} · Property market area`,
        href: generateIntentUrl(searchIntent),
      },
    ];
  }, [breadcrumbs, searchAreaContext, searchIntent]);
  const pageNeedsNormalization = Boolean(publicSearchResults && effectivePage !== page);
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

  const zeroResultDescription = useMemo(() => {
    if (searchIntent.transactionType !== 'for-sale' && searchIntent.transactionType !== 'to-rent') {
      return '';
    }

    return buildZeroResultDescription({
      transactionType: searchIntent.transactionType,
      locationName: locationContext?.name,
      locationNames: multiLocationContext?.locations.map(location => location.name),
      searchAreaName:
        searchAreaContext?.label || searchAreaContexts?.map(context => context.label).join(' and '),
    });
  }, [
    locationContext?.name,
    multiLocationContext?.locations,
    searchAreaContext?.label,
    searchAreaContexts,
    searchIntent.transactionType,
  ]);

  const parentRecoveryTarget = getExplicitParentRecoveryTarget(locationContext, searchAreaContext);

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
  const utils = trpc.useUtils();
  const toggleFavoriteMutation = trpc.properties.toggleFavorite.useMutation({
    onSuccess: result => {
      void utils.properties.getFavorites.invalidate();
      toast.success(
        result.favorited ? 'Property saved to your homes.' : 'Property removed from saved homes.',
      );
    },
    onError: () => toast.error('Unable to update saved homes. Please try again.'),
  });
  const savedPropertyIds = useMemo(
    () =>
      new Set(
        (Array.isArray(favorites) ? favorites : []).map(favorite => Number(favorite.propertyId)),
      ),
    [favorites],
  );

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
        : searchIntent.transactionType === 'to-rent'
          ? sanitizeRentSearchFilters(mergedFilters)
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

  const handleClearFilterKeys = (keys: readonly string[]) => {
    setLocation(generateIntentUrl(clearSearchIntentFilters(searchIntent, keys)));
  };

  const handleClearAllFilters = () => {
    setLocation(generateIntentUrl(clearAllOptionalSearchFilters(searchIntent)));
  };

  const handleBroadenToParent = () => {
    if (!parentRecoveryTarget) return;
    setLocation(generateIntentUrl(buildParentRecoveryIntent(searchIntent, parentRecoveryTarget)));
  };

  const handleChangeLocations = () => {
    focusListingNavbarLocationInput();
  };

  const handleClearSearchArea = () => {
    setLocation(
      generateIntentUrl({
        ...searchIntent,
        geography: { level: 'country' },
        resultState: { ...searchIntent.resultState, page: 0 },
      }),
    );
  };

  const handleStartOver = () => {
    setLocation('/');
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

  const handleSaveProperty = (propertyId: number) => {
    if (!isAuthenticated) {
      toast.info('Sign in to save this property to your account.');
      setLocation(
        `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`,
      );
      return;
    }
    if (toggleFavoriteMutation.isPending) return;
    toggleFavoriteMutation.mutate({ propertyId });
  };

  const handleCompareProperty = (propertyId: number) => {
    if (!isBuySearch) return;
    if (!Number.isSafeInteger(propertyId) || propertyId <= 0) return;
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(
        'property-comparison-return',
        `${window.location.pathname}${window.location.search}`,
      );
    }
    if (isInComparison(propertyId)) {
      removeFromComparison(propertyId);
      toast.success('Property removed from comparison.');
      return;
    }
    if (!canAddMore) {
      toast.info('You can compare up to 4 properties at a time.');
      return;
    }
    addToComparison(propertyId);
    toast.success('Property added to comparison.');
  };

  const rememberSearchReturn = () => {
    if (
      (searchIntent.transactionType !== 'for-sale' && searchIntent.transactionType !== 'to-rent') ||
      typeof window === 'undefined'
    ) {
      return;
    }
    rememberPropertySearchReturn(
      window.sessionStorage,
      `${window.location.pathname}${window.location.search}`,
      searchIntent.transactionType,
    );
  };

  const confirmSaveSearch = () => {
    const resolvedSearchName = saveSearchName.trim() || suggestedSaveSearchName;
    if (!resolvedSearchName) return;
    saveSearchMutation.mutate({
      name: resolvedSearchName,
      criteria: buildCanonicalSavedSearchCriteria(searchIntent),
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
              identity: card.identity,
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
  const discoveryLocationLabel =
    searchAreaContext?.label ||
    (multiLocationContext
      ? multiLocationContext.locations.map(item => item.name).join(' and ')
      : locationContext?.name) ||
    (searchIntent.geography.suburb
      ? unslugify(searchIntent.geography.suburb)
      : searchIntent.geography.city
        ? unslugify(searchIntent.geography.city)
        : searchIntent.geography.province
          ? unslugify(searchIntent.geography.province)
          : 'South Africa');
  const propertyTypeCopy = filters.propertyType
    ? DISCOVERY_PROPERTY_TYPE_COPY[String(filters.propertyType)]
    : undefined;
  const discoveryHeading = `${propertyTypeCopy?.plural || 'Properties'} ${
    isRentSearch ? 'to rent' : 'for sale'
  } in ${discoveryLocationLabel}`;
  const discoveryScopeLabels = [
    isRentSearch ? 'To rent' : 'For sale',
    discoveryLocationLabel,
    ...(propertyTypeCopy ? [propertyTypeCopy.chip] : []),
  ];
  const totalPages = getPublicSearchReachablePageCount(resultCount, limit);
  const canAdvancePage = canAdvancePublicSearchPage(effectivePage, resultCount, limit);
  const hasRenderableResults =
    viewMode === 'map' ? mapResults.length > 0 : renderedResults.length > 0;
  const displayState = getSearchResultsDisplayState({
    isLoading,
    hasError: hasSearchError,
    isTransactionalJourney,
    hasValidation: Boolean(searchIntent.validation),
    hasResponse: Boolean(publicSearchResults),
    locationState: publicSearchResults?.locationState,
    total: resultTotal,
    hasRenderableResults,
    pageNeedsNormalization,
  });
  const mapLocationDisclosureUnavailable =
    displayState === 'integrity' &&
    viewMode === 'map' &&
    renderedResults.length > 0 &&
    mapResults.length === 0;

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
        <main id="main-content" tabIndex={-1} className="outline-none">
          <p className="text-sm text-slate-600">Returning you to the canonical search journey…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <MetaControl canonicalUrl={canonicalUrl} title={pageTitle} description={pageDescription} />
      <ListingNavbar
        defaultLocations={navbarLocations}
        defaultSearchArea={searchAreaContext}
        onClearSearchArea={searchAreaContext ? handleClearSearchArea : undefined}
        showMobileLocationSearch
      />

      {/* prettier-ignore */}
      <main id="main-content" tabIndex={-1} className="outline-none">
      <div className="mx-auto w-full max-w-[1480px] px-4 pb-32 pt-44 sm:px-6 md:pt-24 lg:px-8 lg:pb-16">
        <div className="w-full">
          {/* Header Section */}
          <div className="mb-5">
            <div className="mb-4">
              <Breadcrumbs items={scopedBreadcrumbs} />
            </div>

            {searchAreaContext ? (
              <div
                role="status"
                aria-label={`${searchAreaContext.label}, Property market area`}
                className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50/70 px-4 py-3"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                  Property market area
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-950">
                  {searchAreaContext.label}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Results are limited to this governed market area. Filters refine the results
                  without widening its geography.
                </div>
              </div>
            ) : null}

            <SearchFallbackNotice locationContext={locationContext} />

            <ResultsHeader
              title={discoveryHeading}
              scopeLabels={discoveryScopeLabels}
              resultCount={publicSearchResults ? resultCount : undefined}
              isLoading={isLoading}
              hasError={hasSearchError}
              viewMode={viewMode}
              sortBy={sortBy}
              onViewModeChange={setViewMode}
              onSortChange={handleSortChange}
              onOpenFilters={() => setIsMobileFilterOpen(true)}
              onSaveSearch={handleSaveSearch}
            />
          </div>

          {/* Content Section */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[292px_minmax(0,1fr)] lg:items-start lg:gap-7 xl:grid-cols-[308px_minmax(0,1fr)] xl:gap-8">
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
                    isBuySearch
                      ? HOMES_BUY_SELECTABLE_PROPERTY_TYPES
                      : isRentSearch
                        ? HOMES_RENT_SELECTABLE_PROPERTY_TYPES
                        : undefined
                  }
                  listingType={isBuySearch ? 'sale' : isRentSearch ? 'rent' : undefined}
                  // Public Buy/Rent inventory does not yet expose an
                  // authoritative amenities predicate. Do not render a
                  // Rent control that would be accepted by the URL but
                  // ignored by the public query.
                  showAmenities={false}
                  showLocationRefinement={searchIntent.transactionType !== 'for-sale'}
                />
              </div>
            </div>

            {/* Main Content - Results */}
            <div className="col-span-1">
              {/* Results Grid */}
              <div className="">
                {displayState === 'loading' ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : displayState === 'page-normalizing' ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-sm text-slate-600">Updating the result page…</p>
                  </div>
                ) : displayState === 'error' ? (
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
                ) : displayState === 'invalid' ? (
                  <SearchResultsUnavailableState
                    title={
                      !isTransactionalJourney
                        ? searchIntent.transactionType
                          ? 'Search journey unavailable'
                          : 'Choose Buy or Rent'
                        : 'Search request needs attention'
                    }
                    description={
                      searchIntent.validation?.message ||
                      'This search cannot open transactional inventory yet.'
                    }
                    onStartOver={handleStartOver}
                  />
                ) : displayState === 'unavailable' ? (
                  <SearchResultsUnavailableState
                    title="Search location unavailable"
                    description={
                      locationMessage ||
                      'The selected geography is unavailable for this transactional search.'
                    }
                    onStartOver={handleStartOver}
                  />
                ) : mapLocationDisclosureUnavailable ? (
                  <SearchResultsUnavailableState
                    title="No public map location available"
                    description="These results do not have publicly disclosed coordinates, so no map markers can be shown. Switch to List view to continue browsing."
                  />
                ) : displayState === 'integrity' ? (
                  <SearchResultsUnavailableState
                    title="Results temporarily unavailable"
                    description="The search returned a result total but no page of results. Please try again."
                    onStartOver={handleStartOver}
                  />
                ) : displayState === 'results' ? (
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
                                imageCount: card.imageCount,
                                listingType: card.listingType,
                                development: card.development,
                                area: card.area,
                                yardSize: card.yardSize,
                                bedrooms: card.bedrooms,
                                bathrooms: card.bathrooms,
                                highlights: card.highlights,
                                listingSource: card.listingSource,
                                listerType: card.listerType,
                                contactRole: card.contactRole,
                                identity: card.identity,
                                propertyId: card.propertyId,
                                postedBy: card.identity?.name,
                                agentAvatarUrl: card.identity?.avatarUrl ?? undefined,
                                isSaved: savedPropertyIds.has(card.propertyId || 0),
                                onSave: card.propertyId
                                  ? () => handleSaveProperty(card.propertyId as number)
                                  : undefined,
                                isCompared:
                                  isBuySearch && card.propertyId
                                    ? isInComparison(card.propertyId)
                                    : false,
                                onCompare:
                                  isBuySearch && card.propertyId
                                    ? () => handleCompareProperty(card.propertyId as number)
                                    : undefined,
                                compareDisabled:
                                  isBuySearch &&
                                  Boolean(card.propertyId) &&
                                  !isInComparison(card.propertyId as number) &&
                                  !canAddMore,
                                onOpen: rememberSearchReturn,
                              }}
                            />
                          );
                        })}
                      </div>
                    )}

                    {viewMode === 'map' && (
                      <GooglePropertyMap
                        properties={mapResults.map(item => item.property)}
                        onPropertySelect={id => {
                          const target = mapResults.find(item => item.markerId === id);
                          if (target) {
                            rememberSearchReturn();
                            window.location.href = target.href;
                          }
                        }}
                        onBoundsChange={handleBoundsChange}
                        onRecoveryViewChange={setViewMode}
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
                    transactionType={
                      searchIntent.transactionType === 'for-sale' ? 'for-sale' : 'to-rent'
                    }
                    searchDescription={zeroResultDescription}
                    onClearAllFilters={handleClearAllFilters}
                    onClearFilterKeys={handleClearFilterKeys}
                    onSwitchToSource={handleListingSourceChange}
                    onChangeLocations={handleChangeLocations}
                    onBroadenToParent={parentRecoveryTarget ? handleBroadenToParent : undefined}
                    parentRecoveryLabel={parentRecoveryTarget?.label}
                    onStartOver={handleStartOver}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </main>

      {/* Mobile Sticky Controls (Persistent Bottom Bar) */}
      {(displayState === 'results' || displayState === 'zero') && (
        <MobileStickyControls
          onOpenFilters={() => setIsMobileFilterOpen(true)}
          currentView={viewMode}
          onViewChange={setViewMode}
          onSortChange={handleSortChange}
          currentSort={sortBy}
          resultCount={publicSearchResults ? resultCount : undefined}
        />
      )}

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
        onSaveSearch={handleSaveSearch}
        allowedPropertyTypes={
          isBuySearch
            ? HOMES_BUY_SELECTABLE_PROPERTY_TYPES
            : isRentSearch
              ? HOMES_RENT_SELECTABLE_PROPERTY_TYPES
              : undefined
        }
        listingType={isBuySearch ? 'sale' : isRentSearch ? 'rent' : undefined}
        // Keep unsupported amenities out of the public Rent contract until
        // the same predicate can feed both result and count queries.
        showAmenities={false}
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
