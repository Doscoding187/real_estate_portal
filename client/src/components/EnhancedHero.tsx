// @ts-nocheck
import { useState, useMemo } from 'react';
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
  Mic,
  MapPinned,
  Loader2,
  Key,
  Building,
  ShieldCheck,
  Map,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { generatePropertyUrl } from '@/lib/urlUtils';
import { LocationAutosuggest } from './LocationAutosuggest';
import { trpc } from '@/lib/trpc';
import { normalizeLocationKey, getProvinceForCity, isProvinceSearch } from '@/lib/locationUtils';
import { LocationNode } from '@/types/location';
import { VITE_SEARCH_DISCOVERY_AUTOSUGGEST_ENABLED } from '@/const';
import { getSearchDiscoverySuggestions } from '@/lib/searchDiscovery';
import type { SearchDiscoverySuggestion } from '@/lib/searchDiscovery';

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

const HERO_CATEGORIES = [
  { id: 'buy', label: 'Buy', mobileLabel: 'Buy', icon: Home },
  { id: 'rental', label: 'Rental', mobileLabel: 'Rent', icon: Key },
  { id: 'projects', label: 'Developments', mobileLabel: 'Developments', icon: Building2 },
  { id: 'pg', label: 'Shared Living', mobileLabel: 'Shared', icon: Users },
  { id: 'plot', label: 'Plots & Land', mobileLabel: 'Plots & Land', icon: MapPinned },
  { id: 'commercial', label: 'Commercial', mobileLabel: 'Commercial', icon: Briefcase },
  { id: 'agents', label: 'Agents', mobileLabel: 'Agents', icon: Users },
] as const;

const INTENT_HELPER_COPY: Record<string, string> = {
  buy: 'Search homes for sale by suburb, city, or province.',
  rental: 'Find rentals by area, budget, and property type.',
  projects: 'Search new developments by city, suburb, developer, or project name.',
  pg: 'Find shared living options that match your lifestyle and budget.',
  plot: 'Explore land and plots across South Africa.',
  commercial: 'Find offices, retail spaces, industrial property, and commercial opportunities.',
  agents: 'Find trusted agents and property professionals.',
};

const TRUST_ITEMS = [
  { label: 'Verified Listings', icon: ShieldCheck },
  { label: 'New Developments', icon: Building2 },
  { label: 'Local Insights', icon: Map },
  { label: 'Agent Tools', icon: Users },
] as const;

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
  const activeTab = controlledTab ?? internalTab;

  const handleTabChange = (tab: string) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedLocations, setSelectedLocations] = useState<LocationNode[]>([]);
  // computed for backward compatibility in single-select logic
  const selectedLocation = selectedLocations.length === 1 ? selectedLocations[0] : null;
  const hasActiveSearchInput = searchQuery.trim().length > 0 || selectedLocations.length > 0;

  // Search Discovery Engine — foundation mode
  const isDiscoveryEnabled = VITE_SEARCH_DISCOVERY_AUTOSUGGEST_ENABLED === '1';
  const discoverySuggestions: SearchDiscoverySuggestion[] = useMemo(() => {
    if (!isDiscoveryEnabled) return [];
    return getSearchDiscoverySuggestions(searchQuery);
  }, [isDiscoveryEnabled, searchQuery]);

  // Filter panel state
  const [showFilters, setShowFilters] = useState(false);

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
    rental: {
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
    projects: {
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
    plot: {
      types: ['Residential', 'Commercial', 'Agricultural', 'Industrial'],
    },
    commercial: {
      useTypes: ['Office', 'Retail', 'Industrial', 'Warehouse', 'Medical', 'Mixed-Use'],
    },
    pg: {
      roomTypes: ['Room in Apartment', 'Room in House', 'Co-Living', 'Student Accommodation'],
      genderOptions: ['Male Only', 'Female Only', 'Mixed'],
    },
  };

  // Comprehensive South African location data with context

  const handleCategoryClick = (categoryId: string) => {
    handleTabChange(categoryId);
    if (categoryId === 'agents') {
      setLocation('/agents');
      setShowFilters(false);
    } else {
      setShowFilters(true);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // --- LIVE COUNT LOGIC ---
  const countQueryFilters = useMemo(() => {
    // Construct filters based on current selection to get live count
    const activeFilters: any = {};

    // Location
    if (selectedLocation) {
      if (selectedLocation.type === 'city') activeFilters.city = selectedLocation.name;
      if (selectedLocation.type === 'suburb') activeFilters.suburb = [selectedLocation.name];
      if (selectedLocation.provinceSlug) activeFilters.province = selectedLocation.provinceSlug; // Heuristic
    }

    // Active Tab Filters
    if (activeTab === 'buy') {
      activeFilters.listingType = 'sale';
      if (filters.propertyTypes.length > 0)
        activeFilters.propertyType = filters.propertyTypes.map(t => t.toLowerCase());
      if (filters.priceMin) activeFilters.minPrice = parseInt(filters.priceMin);
      if (filters.priceMax) activeFilters.maxPrice = parseInt(filters.priceMax);
    } else if (activeTab === 'rental') {
      activeFilters.listingType = 'rent';
      if (filters.propertyTypes.length > 0)
        activeFilters.propertyType = filters.propertyTypes.map(t => t.toLowerCase());
      if (filters.budgetMin) activeFilters.minPrice = parseInt(filters.budgetMin);
      if (filters.budgetMax) activeFilters.maxPrice = parseInt(filters.budgetMax);
    }

    return activeFilters;
  }, [activeTab, filters, selectedLocation]);

  // Fetch count
  const { data: countData, isLoading: isCountLoading } = trpc.properties.getFilterCounts.useQuery(
    { filters: countQueryFilters },
    {
      enabled: !!selectedLocation || !!filters.propertyIntent || !!filters.priceMax, // Only fetch if user has interacted
      staleTime: 30000,
    },
  );

  const resultCount = countData?.total || 0;

  const handleSearch = () => {
    console.log(
      '[handleSearch] Called. selectedLocation:',
      selectedLocation,
      'searchQuery:',
      searchQuery,
      'activeTab:',
      activeTab,
    );

    // Intelligent Routing Logic
    // We utilize the structured location data from LocationAutosuggest directly.

    // Default to 'buy' if no tab selected
    const effectiveTab = activeTab || 'buy';

    if (effectiveTab === 'buy' || effectiveTab === 'rental') {
      const listingType = effectiveTab === 'rental' ? 'rent' : 'sale';

      // 1. Single or Multi Selection Logic
      if (selectedLocations.length > 0) {
        console.log('[handleSearch] selectedLocations:', selectedLocations);

        const root = listingType === 'rent' ? '/property-to-rent' : '/property-for-sale';
        const params = new URLSearchParams();

        // CASE A: Single Location (Preserve SEO structure)
        if (selectedLocations.length === 1) {
          const loc = selectedLocations[0];
          const isProvince = loc.type === 'province';

          // Province -> SEO Discovery
          if (isProvince) {
            const provinceSlug = normalizeLocationKey(loc.name);
            setLocation(`${root}/${provinceSlug}`);
            return;
          }

          // City/Suburb -> SEO Path
          const locationSlug = normalizeLocationKey(loc.name);
          const resolvedProvince = loc.provinceSlug || getProvinceForCity(loc.name);

          if (loc.type === 'suburb') {
            params.set('suburb', locationSlug);
            if (loc.citySlug) params.set('city', normalizeLocationKey(loc.citySlug));
          } else {
            params.set('city', locationSlug);
          }
          if (resolvedProvince) params.set('province', resolvedProvince);
        }
        // CASE B: Multi-Location (Canonical Query Params)
        else {
          selectedLocations.forEach(loc => {
            params.append('locations[]', loc.slug);
          });
          // Note: We don't set 'city'/'province' params here to avoid conflict.
          // The backend should derive context from the slugs.
        }

        // Common Filters
        // Add price filters
        if (activeTab === 'buy') {
          if (filters.priceMin) params.set('minPrice', filters.priceMin);
          if (filters.priceMax) params.set('maxPrice', filters.priceMax);
        } else {
          if (filters.budgetMin) params.set('minPrice', filters.budgetMin);
          if (filters.budgetMax) params.set('maxPrice', filters.budgetMax);
        }

        if (filters.propertyTypes.length > 0) {
          params.set('propertyType', filters.propertyTypes[0].toLowerCase());
        }

        const queryString = params.toString();
        setLocation(`${root}?${queryString}`);
        return;
      }

      // 2. Text Search Fallback (no structured location selected)
      // CRITICAL: Check if text matches a province BEFORE treating as city
      if (searchQuery) {
        const root = listingType === 'rent' ? '/property-to-rent' : '/property-for-sale';

        // Check if the text input is actually a province
        const matchedProvince = isProvinceSearch(searchQuery);
        if (matchedProvince) {
          // Province search → SEO discovery page (path-based)
          setLocation(`${root}/${matchedProvince}`);
          return;
        }

        // Not a province → treat as city search (query-based SRP)
        const citySlug = normalizeLocationKey(searchQuery);
        const province = getProvinceForCity(searchQuery);

        const params = new URLSearchParams();
        params.set('city', citySlug);
        if (province) params.set('province', province);

        setLocation(`${root}?${params.toString()}`);
        return;
      }

      // 3. No location selected - go to base transaction root
      const root = listingType === 'rent' ? '/property-to-rent' : '/property-for-sale';
      setLocation(root);
      return;
    }

    // Fallback Routing for Empty Searches or Special Categories
    switch (activeTab) {
      case 'buy': {
        const url = generatePropertyUrl({
          listingType: 'sale',
          propertyType: filters.propertyTypes[0]?.toLowerCase(),
          minPrice: filters.priceMin ? parseInt(filters.priceMin) : undefined,
          maxPrice: filters.priceMax ? parseInt(filters.priceMax) : undefined,
        });
        setLocation(url);
        break;
      }

      case 'rental': {
        const url = generatePropertyUrl({
          listingType: 'rent',
          propertyType: filters.propertyTypes[0]?.toLowerCase(),
          minPrice: filters.budgetMin ? parseInt(filters.budgetMin) : undefined,
          maxPrice: filters.budgetMax ? parseInt(filters.budgetMax) : undefined,
          furnished: filters.furnished,
        });
        setLocation(url);
        break;
      }

      case 'projects': {
        const params = new URLSearchParams();
        if (searchQuery) params.set('search', searchQuery);
        if (filters.developmentType) params.set('type', filters.developmentType);
        if (filters.developmentStatus) params.set('status', filters.developmentStatus);
        if (filters.priceMin) params.set('minPrice', filters.priceMin);
        if (filters.priceMax) params.set('maxPrice', filters.priceMax);
        setLocation(`/developments?${params.toString()}`);
        break;
      }

      case 'plot': {
        const url = generatePropertyUrl({
          listingType: 'sale',
          propertyType: 'land',
          city: searchQuery || undefined,
          minPrice: filters.priceMin ? parseInt(filters.priceMin) : undefined,
          maxPrice: filters.priceMax ? parseInt(filters.priceMax) : undefined,
        });
        setLocation(url);
        break;
      }

      case 'commercial': {
        const url = generatePropertyUrl({
          listingType: filters.saleOrRent as 'sale' | 'rent',
          propertyType: 'commercial',
          city: searchQuery || undefined,
        });
        setLocation(url);
        break;
      }

      case 'pg': {
        const url = generatePropertyUrl({
          listingType: 'rent',
          propertyType: 'shared_living',
          city: searchQuery || undefined,
          minPrice: filters.budgetMin ? parseInt(filters.budgetMin) : undefined,
          maxPrice: filters.budgetMax ? parseInt(filters.budgetMax) : undefined,
        });
        setLocation(url);
        break;
      }

      case 'agents':
        setLocation('/agents');
        break;

      default: {
        const url = generatePropertyUrl({
          city: searchQuery || undefined,
        });
        setLocation(url);
      }
    }
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
  const normalizedActiveTab = String(activeTab || '')
    .trim()
    .toLowerCase();
  const effectiveIntent = normalizedActiveTab || 'buy';
  const intentHelperCopy = INTENT_HELPER_COPY[effectiveIntent] || INTENT_HELPER_COPY.buy;

  return (
    <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-blue-50/70 via-white to-white text-slate-900">
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
        <div className="mx-auto mb-7 max-w-[24rem] text-center sm:mb-8 sm:max-w-4xl md:max-w-5xl">
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
                    onClick={() => handleCategoryClick(category.id)}
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
                    onClick={() => handleCategoryClick(category.id)}
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
        <div className="mx-auto w-full max-w-4xl">
          <Card className="overflow-hidden rounded-[1rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70 sm:rounded-2xl">
            <CardContent className="p-0">
              <div className="bg-gradient-to-r from-blue-700 to-cyan-600 px-4 py-4 text-white sm:px-6">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em]">
                      Start with your property journey
                    </p>
                    <p className="mt-1 text-sm font-medium text-blue-50">{intentHelperCopy}</p>
                  </div>
                  <div className="hidden rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white md:block">
                    Search, compare, connect
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {/* Main Search Row */}
                <div className="flex flex-col gap-2 md:flex-row sm:gap-4">
                  {/* Unified Search Input */}
                  <div className="flex-1 relative group">
                    <LocationAutosuggest
                      placeholder="Search by city, suburb, or area..."
                      className="w-full"
                      inputClassName="h-11 w-full rounded-xl border border-slate-200 bg-white pl-4 pr-20 text-[15px] shadow-sm transition-colors hover:border-blue-300 focus:border-blue-600 sm:h-12 sm:pr-24 sm:text-base"
                      showIcon={false}
                      selectedLocations={selectedLocations}
                      onRemove={index => {
                        setSelectedLocations(prev => prev.filter((_, i) => i !== index));
                      }}
                      onChange={value => {
                        setSearchQuery(value);
                      }}
                      onSelect={loc => {
                        // Optimistic Search Query Update (shows last selected name temporarily if needed, but pills handle UX)
                        setSearchQuery('');

                        setSelectedLocations(prev => {
                          // 1. Prevent Duplicates
                          if (prev.some(p => p.slug === loc.slug)) return prev;

                          // 2. Hierarchy / Conflict Handling (Property24 style)
                          // "Prevent selecting a child if parent is already selected" or vice versa
                          // Case A: User creates specific list (e.g. Sea Point + Green Point).
                          // Case B: User selects Province (Western Cape). Should we remove cities?
                          // For V1, we append unique locations.

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

                    {/* Action Buttons (Voice/Location) */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1.5 z-10">
                      <Button
                        onClick={handleSearch}
                        size="icon"
                        className={`h-8 w-8 rounded-lg shadow-sm transition-all sm:hidden ${
                          hasActiveSearchInput
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                        title="Search"
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hidden h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-700 sm:inline-flex"
                        title="Use current location"
                      >
                        <MapPinned className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-700"
                        title="Voice search"
                      >
                        <Mic className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Search Button */}
                  <Button
                    onClick={handleSearch}
                    className="hidden h-11 min-w-[120px] rounded-xl bg-blue-700 px-6 text-sm font-semibold text-white shadow-md shadow-blue-700/20 transition-all hover:bg-blue-800 hover:shadow-lg sm:inline-flex sm:h-12 sm:min-w-[132px] sm:px-7 sm:text-base"
                    size="lg"
                  >
                    {isCountLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <div className="flex flex-col items-center leading-none">
                        <span className="flex items-center gap-2">
                          <Search className="h-4 w-4" /> Search
                        </span>
                      </div>
                    )}
                  </Button>
                </div>

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
                {showFilters && activeTab !== 'agents' && (
                  <div className="mt-5 border-t border-slate-100 pt-5 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* BUY FILTERS */}
                      {activeTab === 'buy' && (
                        <>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Property Category
                            </Label>
                            <Select
                              value={filters.propertyIntent}
                              onValueChange={val => handleFilterChange('propertyIntent', val)}
                            >
                              <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                                <SelectValue placeholder="Any Category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Any Category</SelectItem>
                                {filterConfig.buy.intents.map(intent => (
                                  <SelectItem key={intent} value={intent}>
                                    {intent}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-[10px] text-muted-foreground">
                              Choose the main type of property you’re looking for
                            </p>
                          </div>

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
                                {(filters.propertyIntent &&
                                filterConfig.buy.propertyTypes[
                                  filters.propertyIntent as keyof typeof filterConfig.buy.propertyTypes
                                ]
                                  ? filterConfig.buy.propertyTypes[
                                      filters.propertyIntent as keyof typeof filterConfig.buy.propertyTypes
                                    ]
                                  : Object.values(filterConfig.buy.propertyTypes).flat()
                                ).map((type: string) => (
                                  <SelectItem key={type} value={type}>
                                    {type}
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
                              <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
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
                              <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
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
                      {activeTab === 'rental' && (
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
                                {Object.values(filterConfig.rental.propertyTypes)
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
                                {filterConfig.rental.leaseTerms.map(term => (
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
                      {activeTab === 'projects' && (
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
                                {filterConfig.projects.types.map(type => (
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
                                {filterConfig.projects.statuses.map(status => (
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
                      {activeTab === 'plot' && (
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
                                {filterConfig.plot.types.map(type => (
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
                      {activeTab === 'pg' && (
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
                                {filterConfig.pg.roomTypes.map(type => (
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
                                {filterConfig.pg.genderOptions.map(opt => (
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
