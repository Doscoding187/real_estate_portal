// @ts-nocheck
import { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Home,
  Building2,
  Briefcase,
  Users,
  Search,
  MapPinned,
  Key,
  Building,
  ShieldCheck,
  Map,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { generatePropertyUrl } from '@/lib/urlUtils';
import {
  getHomepageHeroJourneys,
  normalizePublicHeroJourney,
  type PublicHeroJourneyKey,
} from '@/lib/publicNavigation';
import {
  buildBuySearchUrl,
  buildPropertySearchUrl,
  BUY_PROPERTY_TYPE_OPTIONS,
  getPriceRangeError,
} from '@/lib/heroJourneySearch';
import { LocationAutosuggest } from './LocationAutosuggest';
import { LocationNode } from '@/types/location';
import { VITE_SEARCH_DISCOVERY_AUTOSUGGEST_ENABLED } from '@/const';
import { getSearchDiscoverySuggestions } from '@/lib/searchDiscovery';
import type { SearchDiscoverySuggestion } from '@/lib/searchDiscovery';
import { buildLocationDiscoveryPath, hasCanonicalLocationIdentity } from '@/lib/locationDiscovery';

// ... imports
export interface EnhancedHeroProps {
  variant?: 'home' | 'location';
  title?: React.ReactNode;
  subtitle?: string;
  backgroundImage?: string;
  heroMode?: 'standard' | 'province' | 'city';
  navigationItems?: { label: string; path: string; active?: boolean }[];
  customShortcuts?: {
    label: string;
    icon?: any;
    path?: string;
    filters?: any;
  }[];
  initialSearchQuery?: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const JOURNEY_ICONS: Record<PublicHeroJourneyKey, any> = {
  buy: Home,
  rent: Key,
  developments: Building2,
  shared_living: Users,
  plot_land: MapPinned,
  commercial: Briefcase,
  find_agent: Users,
};

const HERO_CATEGORIES = getHomepageHeroJourneys().map(journey => ({
  ...journey,
  id: journey.key,
  icon: JOURNEY_ICONS[journey.key],
}));

const INTENT_HELPER_COPY: Record<string, string> = {
  buy: 'Search homes for sale by suburb, city, or province.',
  rent: 'Find rentals by area, budget, and property type.',
  developments: 'Search new developments by city, suburb, developer, or project name.',
  shared_living: 'Find shared living options that match your lifestyle and budget.',
  plot_land: 'Explore land and plots across South Africa.',
  commercial: 'Find offices, retail spaces, industrial property, and commercial opportunities.',
  find_agent: 'Find trusted agents and property professionals.',
};

const TRUST_ITEMS = [
  { label: 'Verified Listings', icon: ShieldCheck },
  { label: 'New Developments', icon: Building2 },
  { label: 'Local Insights', icon: Map },
  { label: 'Agent Tools', icon: Users },
] as const;

function formatLocationNames(locations: readonly LocationNode[]): string {
  const names = locations.map(location => location.name).filter(Boolean);
  if (names.length <= 1) return names[0] || 'the selected area';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

export function EnhancedHero({
  variant = 'home',
  title,
  subtitle,
  backgroundImage,
  heroMode = 'standard',
  navigationItems = [],
  customShortcuts,
  initialSearchQuery = '',
  activeTab: controlledTab,
  onTabChange,
}: EnhancedHeroProps) {
  const [, setLocation] = useLocation();
  const [internalTab, setInternalTab] = useState('');
  // An empty controlled value represents the neutral homepage state, not a
  // command to discard a journey selected locally in the composer. This lets
  // location-first and journey-first selection coexist while Home updates
  // the explicit intent URL.
  const activeTab = controlledTab || internalTab;
  const hasExplicitJourney = String(activeTab || '').trim().length > 0;
  const normalizedActiveTab = hasExplicitJourney ? normalizePublicHeroJourney(activeTab) || '' : '';
  const hasSelectedJourney = normalizedActiveTab.length > 0;
  const locationInputRef = useRef<HTMLInputElement>(null);
  const previousJourneyRef = useRef(normalizedActiveTab);

  const handleTabChange = (tab: string) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedLocations, setSelectedLocations] = useState<LocationNode[]>([]);
  const hasCanonicalLocations =
    selectedLocations.length > 0 && selectedLocations.every(hasCanonicalLocationIdentity);
  const canSubmitSearch = hasCanonicalLocations;
  const locationDiscoveryPath =
    selectedLocations.length === 1 ? buildLocationDiscoveryPath(selectedLocations[0]) : undefined;
  const [showIntentResolver, setShowIntentResolver] = useState(false);

  useEffect(() => {
    const previousJourney = previousJourneyRef.current;
    previousJourneyRef.current = normalizedActiveTab;

    if (variant === 'home' && previousJourney !== 'buy' && normalizedActiveTab === 'buy') {
      locationInputRef.current?.focus();
    }

    return undefined;
  }, [normalizedActiveTab, variant]);

  // Search Discovery Engine — foundation mode
  const isDiscoveryEnabled = VITE_SEARCH_DISCOVERY_AUTOSUGGEST_ENABLED === '1';
  const discoverySuggestions: SearchDiscoverySuggestion[] = useMemo(() => {
    if (!isDiscoveryEnabled) return [];
    return getSearchDiscoverySuggestions(searchQuery);
  }, [isDiscoveryEnabled, searchQuery]);

  // Filter panel state
  const [showFilters, setShowFilters] = useState(false);
  const [priceRangeError, setPriceRangeError] = useState<string | null>(null);

  // Filter values
  const [filters, setFilters] = useState({
    // Buy filters
    propertyIntent: '',
    propertyTypes: [] as string[],
    priceMin: '',
    priceMax: '',

    // Rental filters
    furnished: false,
    leaseTerm: '',
    budgetMin: '',
    budgetMax: '',

    // Development filters
    developmentType: '',
    developmentStatus: '',

    // Plot & Land filters
    landType: '',
    sizeMin: '',
    sizeMax: '',

    // Commercial filters
    commercialUseType: '',
    saleOrRent: 'sale',
    lotSizeMin: '',
    lotSizeMax: '',
    zoning: '',
    parkingSpaces: '',

    // Shared Living filters
    roomType: '',
    billsIncluded: false,
    genderPreference: '',

    // Agent filters
    agentName: '',
    agency: '',
  });

  // Filter configuration
  const filterConfig = {
    buy: {
      intents: ['Residential', 'Commercial', 'Land & Plots', 'Farms & Smallholdings'],
      propertyTypes: {
        Residential: ['House', 'Apartment', 'Townhouse', 'Cluster', 'Penthouse', 'Duplex', 'Villa'],
        Commercial: ['Office', 'Retail', 'Industrial', 'Warehouse', 'Mixed-Use'],
        'Land & Plots': ['Residential Stand', 'Commercial Stand', 'Agricultural Land'],
        'Farms & Smallholdings': ['Farm', 'Smallholding', 'Game Farm', 'Lifestyle Farm'],
      },
    },
    rent: {
      intents: ['Residential', 'Commercial', 'Shared Living'],
      propertyTypes: {
        Residential: ['House', 'Apartment', 'Townhouse', 'Cluster', 'Room', 'Studio'],
        Commercial: ['Office', 'Retail', 'Industrial', 'Warehouse'],
        'Shared Living': [
          'Room in Apartment',
          'Room in House',
          'Co-Living Space',
          'Student Accommodation',
        ],
      },
      leaseTerms: ['Month-to-month', '6 months', '12 months', '24+ months'],
    },
    developments: {
      types: [
        'Full Title',
        'Sectional Title',
        'Security Estate',
        'Retirement',
        'Co-Living',
        'Luxury',
        'Affordable Housing',
      ],
      statuses: ['Off-Plan', 'Under Construction', 'Completed', 'Launching Soon'],
    },
    plot_land: {
      types: ['Residential', 'Commercial', 'Agricultural', 'Industrial'],
    },
    commercial: {
      useTypes: ['Office', 'Retail', 'Industrial', 'Warehouse', 'Medical', 'Mixed-Use'],
    },
    shared_living: {
      roomTypes: ['Room in Apartment', 'Room in House', 'Co-Living', 'Student Accommodation'],
      genderOptions: ['Male Only', 'Female Only', 'Mixed'],
    },
  };

  // Comprehensive South African location data with context

  const handleCategoryClick = (categoryId: string) => {
    setShowIntentResolver(false);
    handleTabChange(categoryId);
    if (categoryId === 'find_agent') {
      setLocation('/agents');
      setShowFilters(false);
    } else {
      setShowFilters(true);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));

    if (key === 'priceMin' || key === 'priceMax') {
      const nextMin = key === 'priceMin' ? value : filters.priceMin;
      const nextMax = key === 'priceMax' ? value : filters.priceMax;
      setPriceRangeError(getPriceRangeError(nextMin, nextMax) || null);
    }
  };

  const submitBuySearch = () => {
    const nextPriceRangeError = getPriceRangeError(filters.priceMin, filters.priceMax);
    if (nextPriceRangeError) {
      setPriceRangeError(nextPriceRangeError);
      setShowFilters(true);
      return;
    }

    setPriceRangeError(null);
    setLocation(
      buildBuySearchUrl({
        searchQuery,
        selectedLocations,
        propertyType: filters.propertyTypes[0],
        minPrice: filters.priceMin,
        maxPrice: filters.priceMax,
      }),
    );
  };

  const handleSearch = () => {
    if (!canSubmitSearch) return;

    if (!hasSelectedJourney) {
      if (locationDiscoveryPath) {
        setShowIntentResolver(false);
        setLocation(locationDiscoveryPath);
        return;
      }

      setShowIntentResolver(true);
      return;
    }

    const effectiveJourney = normalizedActiveTab;

    if (effectiveJourney === 'find_agent') {
      setLocation('/agents');
      return;
    }

    if (effectiveJourney === 'buy') {
      submitBuySearch();
      return;
    }

    // Rent remains compatible with its existing route authority while its
    // dedicated journey is completed in the next implementation slice.
    if (effectiveJourney === 'rent') {
      setLocation(
        buildPropertySearchUrl({
          transactionType: 'to-rent',
          searchQuery,
          selectedLocations,
          propertyType: filters.propertyTypes[0],
          minPrice: filters.budgetMin,
          maxPrice: filters.budgetMax,
        }),
      );
      return;
    }

    setLocation('/');
  };

  // --- SMART SHORTCUTS ---
  const defaultShortcuts = [
    {
      label: '3 Bed Houses',
      icon: Home,
      filters: { listingType: 'sale', propertyType: ['house'], minBedrooms: 3 },
    },
    {
      label: 'Apartments < R1.5M',
      icon: Building,
      filters: { listingType: 'sale', propertyType: ['apartment'], maxPrice: 1500000 },
    },
    { label: 'New Developments', icon: Building2, path: '/new-developments' },
    { label: 'Cheap Rentals', icon: Key, filters: { listingType: 'rent', maxPrice: 6000 } },
  ];

  const shortcuts = customShortcuts || defaultShortcuts;

  const handleShortcutClick = (shortcut: any) => {
    if (shortcut.path) {
      setLocation(shortcut.path);
      return;
    }
    // If it's a filter shortcut
    // Resolving Intent isn't available here directly, but we can use generatePropertyUrl
    // assuming standard paths.
    // Or just map to URL:
    const url = generatePropertyUrl(shortcut.filters);
    setLocation(url);
  };

  const isNavigationMode = heroMode === 'province' || heroMode === 'city';
  const effectiveIntent = normalizedActiveTab;
  const intentHelperCopy = hasSelectedJourney
    ? INTENT_HELPER_COPY[effectiveIntent] || INTENT_HELPER_COPY.buy
    : selectedLocations.length > 0
      ? `What are you looking for in ${formatLocationNames(selectedLocations)}?`
      : 'Choose how you would like to start.';

  return (
    <div className="relative z-10 overflow-visible border-b border-slate-200 bg-gradient-to-b from-blue-50/70 via-white to-white text-slate-900">
      {backgroundImage ? (
        <div className="absolute inset-0 z-0">
          <img
            src={backgroundImage}
            alt="Hero Background"
            className="h-full w-full object-cover opacity-[0.04]"
          />
        </div>
      ) : null}

      <div className="container relative z-10 flex flex-col py-8 sm:py-12 md:py-16 lg:py-20">
        {/* Hero Title */}
        <div className="mx-auto mb-7 max-w-[var(--plds-home-hero-title-max-width)] text-center sm:mb-8 sm:max-w-4xl md:max-w-5xl">
          {title ? (
            // Location / Context Title
            <h1 className="mb-3 text-3xl font-bold leading-tight text-slate-950 sm:text-4xl md:text-5xl lg:text-6xl">
              {title}
            </h1>
          ) : (
            // Default Homepage Title
            <h1 className="mb-4 text-[2.45rem] font-bold leading-[1.04] text-slate-950 sm:text-5xl md:text-6xl lg:text-7xl">
              <span className="block">South Africa&apos;s smarter</span>
              <span className="block bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
                property platform
              </span>
            </h1>
          )}

          <p className="animate-fade-in text-base font-medium leading-7 text-slate-600 sm:mx-auto sm:block sm:max-w-2xl sm:text-lg md:text-xl md:leading-8">
            {subtitle || (
              <>
                Search homes, discover new developments, explore local insights, and connect with
                trusted property professionals.
              </>
            )}
          </p>
        </div>

        {/* Categories/Tabs */}
        <div className="mb-5 sm:mb-7">
          <div className="-mx-4 overflow-x-auto px-4 scrollbar-hide sm:mx-0 sm:overflow-visible sm:px-0">
            <div className="flex min-w-max items-stretch gap-0.5 sm:hidden">
              {HERO_CATEGORIES.map(category => {
                const Icon = category.icon;
                const isActive = normalizedActiveTab === category.id;

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleCategoryClick(category.id)}
                    aria-pressed={isActive}
                    className={`relative flex min-w-[3.7rem] flex-col items-center justify-center gap-0.5 rounded-2xl border px-1.5 py-1.5 text-[0.58rem] font-semibold transition-all ${
                      isActive
                        ? 'border-blue-100 bg-white text-blue-700 shadow-sm'
                        : 'border-transparent bg-transparent text-slate-500'
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-2xl ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-200/70'
                          : 'bg-white text-slate-500 shadow-sm'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="leading-tight text-center">{category.mobileLabel}</span>
                    {isActive ? (
                      <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-blue-600" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="hidden rounded-full border border-slate-200 bg-white/95 p-1 shadow-sm scrollbar-hide sm:mx-auto sm:flex sm:w-fit sm:max-w-none sm:overflow-visible">
              {HERO_CATEGORIES.map(category => {
                const Icon = category.icon;
                const isActive = normalizedActiveTab === category.id;

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleCategoryClick(category.id)}
                    aria-pressed={isActive}
                    className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition-all duration-200 sm:px-5 sm:text-sm whitespace-nowrap flex-shrink-0 ${
                      isActive
                        ? 'bg-blue-700 text-white shadow-md shadow-blue-700/20'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-blue-700'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    {category.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Search Card */}
        <div className="mx-auto w-full max-w-[var(--plds-home-hero-search-max-width)]">
          <Card className="relative z-20 overflow-visible rounded-[var(--plds-home-hero-search-radius)] border border-slate-200 bg-white shadow-xl shadow-slate-200/70 sm:rounded-2xl">
            <CardContent className="p-0">
              <div className="rounded-t-[var(--plds-home-hero-search-radius)] bg-gradient-to-r from-blue-700 to-cyan-600 px-4 py-4 text-white sm:rounded-t-2xl sm:px-6">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em]">
                      Start with your property journey
                    </p>
                    <p
                      id="homepage-journey-selection-prompt"
                      role="status"
                      aria-live="polite"
                      className="mt-1 text-sm font-medium text-blue-50"
                    >
                      {intentHelperCopy}
                    </p>
                  </div>
                  <div className="hidden rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white md:block">
                    Search, compare, connect
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {/* Main Search Row */}
                <form
                  className="flex flex-col gap-2 md:flex-row sm:gap-4"
                  onSubmit={event => {
                    event.preventDefault();
                    handleSearch();
                  }}
                >
                  {/* Unified Search Input */}
                  <div className="flex-1 relative group">
                    <LocationAutosuggest
                      placeholder="Search by city, suburb, or area..."
                      className="w-full"
                      inputClassName="h-11 w-full rounded-xl bg-white pl-4 pr-20 text-[15px] shadow-sm transition-colors hover:border-blue-300 sm:h-12 sm:pr-24 sm:text-base"
                      showIcon={false}
                      inputRef={locationInputRef}
                      inputAriaDescribedBy="homepage-journey-selection-prompt"
                      selectedLocations={selectedLocations}
                      onRemove={index => {
                        setSelectedLocations(prev => prev.filter((_, i) => i !== index));
                      }}
                      onChange={value => {
                        setSearchQuery(value);
                      }}
                      onSelect={loc => {
                        setSearchQuery('');

                        setSelectedLocations(prev => {
                          const isSameLocation = (candidate: LocationNode) =>
                            candidate.id === loc.id ||
                            (candidate.slug === loc.slug &&
                              candidate.type === loc.type &&
                              candidate.provinceSlug === loc.provinceSlug &&
                              candidate.citySlug === loc.citySlug);

                          if (prev.some(isSameLocation)) return prev;

                          return [...prev, loc];
                        });
                      }}
                      onSubmit={handleSearch}
                      maxLocations={5}
                      discoverySuggestions={discoverySuggestions}
                      onDiscoveryNavigate={(path: string) => {
                        setLocation(path);
                      }}
                    />

                    {/* Search action. Optional location and voice features are intentionally deferred. */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1.5 z-40">
                      <Button
                        type="submit"
                        size="icon"
                        className={`h-10 w-10 rounded-lg shadow-sm transition-all sm:hidden ${
                          canSubmitSearch && !priceRangeError
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                        disabled={!canSubmitSearch || Boolean(priceRangeError)}
                        aria-label="Search"
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Search Button */}
                  <Button
                    type="submit"
                    className={`hidden h-11 min-w-[120px] rounded-xl px-6 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 sm:inline-flex sm:h-12 sm:min-w-[132px] sm:px-7 sm:text-base ${
                      canSubmitSearch && !priceRangeError
                        ? 'bg-blue-700 text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 hover:shadow-lg'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                    size="lg"
                    disabled={!canSubmitSearch || Boolean(priceRangeError)}
                  >
                    <div className="flex flex-col items-center leading-none">
                      <span className="flex items-center gap-2">
                        <Search className="h-4 w-4" /> Search
                      </span>
                    </div>
                  </Button>
                </form>

                {showIntentResolver && !hasSelectedJourney && hasCanonicalLocations ? (
                  <section
                    className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4"
                    aria-labelledby="homepage-location-intent-heading"
                    role="region"
                  >
                    <h2
                      id="homepage-location-intent-heading"
                      className="text-sm font-semibold text-slate-900"
                    >
                      What are you looking for in {formatLocationNames(selectedLocations)}?
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Choose an available journey, or keep editing the selected locations.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        disabled
                        aria-describedby={
                          selectedLocations.length > 1 ? 'homepage-location-intent-note' : undefined
                        }
                        data-testid="homepage-location-intent-buy"
                        className="bg-blue-700 text-white hover:bg-blue-800"
                      >
                        Buy
                      </Button>
                      <Button type="button" variant="outline" disabled>
                        Rent (coming soon)
                      </Button>
                      <Button type="button" variant="outline" disabled>
                        Explore these areas (coming soon)
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowIntentResolver(false)}
                      >
                        Keep editing
                      </Button>
                    </div>
                    {selectedLocations.length > 1 ? (
                      <p
                        id="homepage-location-intent-note"
                        className="mt-3 text-xs text-slate-600"
                        role="status"
                      >
                        The current Buy results route supports one canonical area at a time. Your
                        selected areas remain available while multi-area Buy search is completed.
                      </p>
                    ) : null}
                  </section>
                ) : null}

                {/* FOOTER: Navigation Pills ONLY (Quick Searches hidden per request) */}
                {isNavigationMode && (
                  <div className="mt-4 sm:mt-6 flex gap-2 sm:gap-3 items-center border-t border-slate-100 pt-3 sm:pt-4 overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
                    {navigationItems.map((item, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        onClick={() => setLocation(item.path)}
                        className={`
                          h-7 sm:h-8 px-3 sm:px-4 rounded-full text-xs sm:text-sm font-medium border-blue-100 bg-blue-50/50 text-blue-700 
                          hover:bg-blue-100 hover:border-blue-200 hover:text-blue-800 transition-all whitespace-nowrap flex-shrink-0
                          ${item.active ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                        `}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Dynamic Filter Panel */}
                {showFilters && activeTab !== 'find_agent' && (
                  <div className="mt-5 border-t border-slate-100 pt-5 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* BUY FILTERS */}
                      {activeTab === 'buy' && (
                        <>
                          {priceRangeError && (
                            <p
                              id="buy-price-range-error"
                              role="alert"
                              className="md:col-span-2 text-sm font-medium text-rose-700"
                            >
                              {priceRangeError}
                            </p>
                          )}

                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Property Type
                            </Label>
                            <Select
                              value={filters.propertyTypes[0] || ''}
                              onValueChange={val => handleFilterChange('propertyTypes', [val])}
                            >
                              <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                                <SelectValue placeholder="Any Type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Any Type</SelectItem>
                                {BUY_PROPERTY_TYPE_OPTIONS.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Min Price
                            </Label>
                            <Select
                              value={filters.priceMin}
                              onValueChange={val => handleFilterChange('priceMin', val)}
                            >
                              <SelectTrigger
                                aria-describedby={
                                  priceRangeError ? 'buy-price-range-error' : undefined
                                }
                                aria-invalid={Boolean(priceRangeError)}
                                className="h-10 bg-gray-50/50 border-gray-200"
                              >
                                <SelectValue placeholder="No Min" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">R 0</SelectItem>
                                <SelectItem value="500000">R 500,000</SelectItem>
                                <SelectItem value="1000000">R 1,000,000</SelectItem>
                                <SelectItem value="2000000">R 2,000,000</SelectItem>
                                <SelectItem value="5000000">R 5,000,000</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Max Price
                            </Label>
                            <Select
                              value={filters.priceMax}
                              onValueChange={val => handleFilterChange('priceMax', val)}
                            >
                              <SelectTrigger
                                aria-describedby={
                                  priceRangeError ? 'buy-price-range-error' : undefined
                                }
                                aria-invalid={Boolean(priceRangeError)}
                                className="h-10 bg-gray-50/50 border-gray-200"
                              >
                                <SelectValue placeholder="No Max" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1000000">R 1,000,000</SelectItem>
                                <SelectItem value="2000000">R 2,000,000</SelectItem>
                                <SelectItem value="5000000">R 5,000,000</SelectItem>
                                <SelectItem value="10000000">R 10,000,000</SelectItem>
                                <SelectItem value="50000000">R 50,000,000+</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}

                      {/* RENTAL FILTERS */}
                      {activeTab === 'rent' && (
                        <>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Property Type
                            </Label>
                            <Select
                              value={filters.propertyTypes[0] || ''}
                              onValueChange={val => handleFilterChange('propertyTypes', [val])}
                            >
                              <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                                <SelectValue placeholder="Any Type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Any Type</SelectItem>
                                {Object.values(filterConfig.rent.propertyTypes)
                                  .flat()
                                  .map((type: string) => (
                                    <SelectItem key={type} value={type}>
                                      {type}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Lease Term
                            </Label>
                            <Select
                              value={filters.leaseTerm}
                              onValueChange={val => handleFilterChange('leaseTerm', val)}
                            >
                              <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                                <SelectValue placeholder="Any Term" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Any Term</SelectItem>
                                {filterConfig.rent.leaseTerms.map(term => (
                                  <SelectItem key={term} value={term}>
                                    {term}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Max Budget
                            </Label>
                            <Select
                              value={filters.budgetMax}
                              onValueChange={val => handleFilterChange('budgetMax', val)}
                            >
                              <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                                <SelectValue placeholder="Any Budget" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="5000">R 5,000</SelectItem>
                                <SelectItem value="10000">R 10,000</SelectItem>
                                <SelectItem value="20000">R 20,000</SelectItem>
                                <SelectItem value="50000">R 50,000+</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center space-x-2 h-10 mt-6">
                            <Checkbox
                              id="furnished"
                              checked={filters.furnished}
                              onCheckedChange={checked => handleFilterChange('furnished', checked)}
                            />
                            <Label htmlFor="furnished" className="font-normal cursor-pointer">
                              Furnished Only
                            </Label>
                          </div>
                        </>
                      )}

                      {/* DEVELOPMENTS FILTERS */}
                      {activeTab === 'developments' && (
                        <>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Development Type
                            </Label>
                            <Select
                              value={filters.developmentType}
                              onValueChange={val => handleFilterChange('developmentType', val)}
                            >
                              <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                                <SelectValue placeholder="Any Type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Any Type</SelectItem>
                                {filterConfig.developments.types.map(type => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Status
                            </Label>
                            <Select
                              value={filters.developmentStatus}
                              onValueChange={val => handleFilterChange('developmentStatus', val)}
                            >
                              <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                                <SelectValue placeholder="Any Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Any Status</SelectItem>
                                {filterConfig.developments.statuses.map(status => (
                                  <SelectItem key={status} value={status}>
                                    {status}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Min Price
                            </Label>
                            <Input
                              type="number"
                              placeholder="R Min"
                              className="h-10 bg-gray-50/50 border-gray-200"
                              value={filters.priceMin}
                              onChange={e => handleFilterChange('priceMin', e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Max Price
                            </Label>
                            <Input
                              type="number"
                              placeholder="R Max"
                              className="h-10 bg-gray-50/50 border-gray-200"
                              value={filters.priceMax}
                              onChange={e => handleFilterChange('priceMax', e.target.value)}
                            />
                          </div>
                        </>
                      )}

                      {/* PLOT & LAND FILTERS */}
                      {activeTab === 'plot_land' && (
                        <>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Land Type
                            </Label>
                            <Select
                              value={filters.landType}
                              onValueChange={val => handleFilterChange('landType', val)}
                            >
                              <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                                <SelectValue placeholder="Any Type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Any Type</SelectItem>
                                {filterConfig.plot_land.types.map(type => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Min Size (m²)
                            </Label>
                            <Input
                              type="number"
                              placeholder="Min m²"
                              className="h-10 bg-gray-50/50 border-gray-200"
                              value={filters.sizeMin}
                              onChange={e => handleFilterChange('sizeMin', e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Max Price
                            </Label>
                            <Select
                              value={filters.priceMax}
                              onValueChange={val => handleFilterChange('priceMax', val)}
                            >
                              <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                                <SelectValue placeholder="Any Price" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="500000">R 500k</SelectItem>
                                <SelectItem value="1000000">R 1M</SelectItem>
                                <SelectItem value="5000000">R 5M</SelectItem>
                                <SelectItem value="10000000">R 10M+</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}

                      {/* COMMERCIAL FILTERS */}
                      {activeTab === 'commercial' && (
                        <>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              I want to
                            </Label>
                            <div className="flex p-1 bg-gray-100 rounded-lg h-10">
                              <button
                                onClick={() => handleFilterChange('saleOrRent', 'sale')}
                                className={`flex-1 rounded-md text-sm font-medium transition-all ${filters.saleOrRent === 'sale' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                              >
                                Buy
                              </button>
                              <button
                                onClick={() => handleFilterChange('saleOrRent', 'rent')}
                                className={`flex-1 rounded-md text-sm font-medium transition-all ${filters.saleOrRent === 'rent' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                              >
                                Rent
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Use Type
                            </Label>
                            <Select
                              value={filters.commercialUseType}
                              onValueChange={val => handleFilterChange('commercialUseType', val)}
                            >
                              <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                                <SelectValue placeholder="Any Use" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Any Use</SelectItem>
                                {filterConfig.commercial.useTypes.map(type => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Min Size (m²)
                            </Label>
                            <Input
                              type="number"
                              placeholder="Min m²"
                              className="h-10 bg-gray-50/50 border-gray-200"
                              value={filters.lotSizeMin}
                              onChange={e => handleFilterChange('lotSizeMin', e.target.value)}
                            />
                          </div>
                        </>
                      )}

                      {/* SHARED LIVING FILTERS */}
                      {activeTab === 'shared_living' && (
                        <>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Room Type
                            </Label>
                            <Select
                              value={filters.roomType}
                              onValueChange={val => handleFilterChange('roomType', val)}
                            >
                              <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                                <SelectValue placeholder="Any Room" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Any Room</SelectItem>
                                {filterConfig.shared_living.roomTypes.map(type => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Gender Preference
                            </Label>
                            <Select
                              value={filters.genderPreference}
                              onValueChange={val => handleFilterChange('genderPreference', val)}
                            >
                              <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                                <SelectValue placeholder="Any" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Any</SelectItem>
                                {filterConfig.shared_living.genderOptions.map(opt => (
                                  <SelectItem key={opt} value={opt}>
                                    {opt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Max Budget
                            </Label>
                            <Select
                              value={filters.budgetMax}
                              onValueChange={val => handleFilterChange('budgetMax', val)}
                            >
                              <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                                <SelectValue placeholder="Any Budget" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="3000">R 3,000</SelectItem>
                                <SelectItem value="5000">R 5,000</SelectItem>
                                <SelectItem value="8000">R 8,000</SelectItem>
                                <SelectItem value="10000">R 10,000+</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {!isNavigationMode && (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TRUST_ITEMS.map(item => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-center shadow-sm"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center text-cyan-700">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="whitespace-nowrap text-xs font-semibold leading-none text-slate-700">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
