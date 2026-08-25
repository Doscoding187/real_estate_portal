import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BadgeCheck,
  Bath,
  BedDouble,
  Building2,
  BriefcaseBusiness,
  ChevronDown,
  CircleDollarSign,
  GitCompareArrows,
  Home,
  Key,
  Map,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
} from 'lucide-react';
import { LocationAutosuggest } from './LocationAutosuggest';
import { trpc } from '@/lib/trpc';
import { VITE_SEARCH_DISCOVERY_AUTOSUGGEST_ENABLED } from '@/const';
import {
  getHomepageHeroJourneys,
  getPublicHeroJourney,
  isHomepageHeroJourneyEnabled,
  normalizePublicHeroJourney,
  type PublicHeroJourneyKey,
} from '@/lib/publicNavigation';
import {
  buildBuySearchUrl,
  buildDevelopmentsSearchUrl,
  buildPropertySearchUrl,
  BUY_PROPERTY_TYPE_OPTIONS,
  getPriceRangeError,
  resolveCanonicalLocationSelection,
} from '@/lib/heroJourneySearch';
import { RENT_PUBLIC_PROPERTY_TYPES } from '@shared/property-taxonomy';
import { buildLocationDiscoveryPath, hasCanonicalLocationIdentity } from '@/lib/locationDiscovery';
import { buildConsumerJourneyUrl } from '@/lib/consumerJourneyRouter';
import { parseCanonicalLocationId } from '@shared/locationAuthority';
import type { LocationNode } from '@/types/location';
import type { SearchAreaDiscoveryResult, SearchDiscoveryResult } from '@shared/searchDiscovery';
import type { SearchJourneyId } from '@shared/searchScope';

export interface EnhancedHeroProps {
  variant?: 'home' | 'location';
  title?: ReactNode;
  subtitle?: string;
  backgroundImage?: string;
  heroMode?: 'standard' | 'province' | 'city';
  navigationItems?: { label: string; path: string; active?: boolean }[];
  customShortcuts?: { label: string; icon?: unknown; path?: string; filters?: unknown }[];
  initialSearchQuery?: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}
type HeroFilters = {
  propertyType: string;
  priceMin: string;
  priceMax: string;
  minBedrooms: string;
  minBathrooms: string;
  budgetMax: string;
  developmentType: string;
  developmentStatus: string;
  market: string;
  maxPrice: string;
  classification: string;
};
type FilterKey = keyof HeroFilters;
type FilterDefinition = {
  key: FilterKey;
  label: string;
  emptyLabel: string;
  icon: typeof Home;
  options: readonly { value: string; label: string }[];
};

const JOURNEY_ICONS: Record<PublicHeroJourneyKey, typeof Home> = {
  buy: Home,
  rent: Key,
  developments: Building2,
  shared_living: Users,
  plot_land: MapPin,
  commercial: BriefcaseBusiness,
  find_agent: Users,
};
const PRICE_OPTIONS = [
  { value: '500000', label: 'R500k' },
  { value: '1000000', label: 'R1m' },
  { value: '1500000', label: 'R1.5m' },
  { value: '2000000', label: 'R2m' },
  { value: '2500000', label: 'R2.5m' },
  { value: '5000000', label: 'R5m' },
  { value: '10000000', label: 'R10m+' },
] as const;
const FILTER_TRIGGER_CLASS =
  'h-11 data-[size=default]:!h-11 gap-2 rounded-lg border border-slate-200 bg-blue-50/45 px-3 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 focus:ring-2 focus:ring-blue-600 focus:ring-offset-1';
const FILTER_WIDTH_CLASS: Partial<Record<FilterKey, string>> = {
  propertyType: 'lg:w-[184px]',
  minBedrooms: 'lg:w-[202px]',
  minBathrooms: 'lg:w-[202px]',
};
const BEDROOM_OPTIONS = [1, 2, 3, 4, 5].map(value => ({
  value: String(value),
  label: value === 5 ? '5+' : `${value}+`,
}));
const BATHROOM_OPTIONS = [1, 2, 3, 4].map(value => ({ value: String(value), label: `${value}+` }));
const RENT_TYPES = RENT_PUBLIC_PROPERTY_TYPES.map(value => ({
  value,
  label: value === 'cluster_home' ? 'Cluster home' : value[0].toUpperCase() + value.slice(1),
}));

/** Journey-owned visual/filter declarations; canonical URL adapters stay in heroJourneySearch. */
const JOURNEY_PRESENTATION: Partial<
  Record<
    PublicHeroJourneyKey,
    { placeholder: string; guidance: string; primaryFilters: readonly FilterDefinition[] }
  >
> = {
  buy: {
    placeholder: 'Search by city, suburb, or area...',
    guidance: 'Find the right property with smarter search and expert guidance.',
    primaryFilters: [
      {
        key: 'propertyType',
        label: 'Property Type',
        emptyLabel: 'Any type',
        icon: Home,
        options: BUY_PROPERTY_TYPE_OPTIONS,
      },
      {
        key: 'priceMax',
        label: 'Price Range',
        emptyLabel: 'Any price',
        icon: CircleDollarSign,
        options: PRICE_OPTIONS,
      },
      {
        key: 'minBedrooms',
        label: 'Bedrooms',
        emptyLabel: 'Any Bedrooms',
        icon: BedDouble,
        options: BEDROOM_OPTIONS,
      },
      {
        key: 'minBathrooms',
        label: 'Bathrooms',
        emptyLabel: 'Any Bathrooms',
        icon: Bath,
        options: BATHROOM_OPTIONS,
      },
    ],
  },
  rent: {
    placeholder: 'Search rentals by city, suburb, or area...',
    guidance: 'Find a rental that suits your area, budget, and lifestyle.',
    primaryFilters: [
      {
        key: 'propertyType',
        label: 'Property Type',
        emptyLabel: 'Any type',
        icon: Home,
        options: RENT_TYPES,
      },
      {
        key: 'budgetMax',
        label: 'Monthly budget',
        emptyLabel: 'Any budget',
        icon: CircleDollarSign,
        options: PRICE_OPTIONS,
      },
    ],
  },
  developments: {
    placeholder: 'Search by city, suburb, developer, or project...',
    guidance: 'Discover new developments and compare opportunities by area.',
    primaryFilters: [
      {
        key: 'developmentType',
        label: 'Development type',
        emptyLabel: 'Any type',
        icon: Building2,
        options: [
          { value: 'residential', label: 'Residential' },
          { value: 'commercial', label: 'Commercial' },
          { value: 'mixed_use', label: 'Mixed use' },
        ],
      },
      {
        key: 'developmentStatus',
        label: 'Availability',
        emptyLabel: 'Any status',
        icon: BadgeCheck,
        options: [
          { value: 'launching-soon', label: 'Launching soon' },
          { value: 'selling', label: 'Selling' },
          { value: 'sold-out', label: 'Sold out' },
        ],
      },
    ],
  },
  plot_land: {
    placeholder: 'Search plots and land by city, suburb, or area...',
    guidance: 'Explore available plots and land in the places that matter to you.',
    primaryFilters: [],
  },
  commercial: {
    placeholder: 'Search commercial locations...',
    guidance: 'Find office leasing opportunities in the right location.',
    primaryFilters: [],
  },
  shared_living: {
    placeholder: 'Search rooms, cottages, and small places...',
    guidance: 'Find a room, cottage, or small place with honest costs.',
    primaryFilters: [
      {
        key: 'market',
        label: 'Market',
        emptyLabel: 'All markets',
        icon: Users,
        options: [
          { value: 'room_share', label: 'Rooms' },
          { value: 'independent_micro', label: 'Cottages & Small Places' },
          { value: 'student', label: 'Student Living' },
        ],
      },
      {
        key: 'maxPrice',
        label: 'Monthly rent',
        emptyLabel: 'Any budget',
        icon: CircleDollarSign,
        options: PRICE_OPTIONS,
      },
    ],
  },
};
const UTILITY_ITEMS = [
  {
    label: 'Published properties',
    description: 'Browse homes for sale',
    path: '/property-for-sale',
    icon: ShieldCheck,
  },
  { label: 'Location search', description: 'Explore areas', path: '/explore/map', icon: Map },
  {
    label: 'Compare homes',
    description: 'Review properties side by side',
    path: '/compare',
    icon: GitCompareArrows,
  },
  {
    label: 'Find an agent',
    description: 'Connect with professionals',
    path: '/agents',
    icon: Users,
  },
] as const;

function formatLocationNames(locations: readonly LocationNode[]) {
  const names = locations.map(location => location.name).filter(Boolean);
  return names.length <= 1 ? names[0] || 'the selected area' : names.join(' and ');
}

function formatCompactZar(value: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `R${millions % 1 === 0 ? millions : millions.toFixed(1)}m`;
  }
  return `R${Math.round(amount / 1_000)}k`;
}

function FilterControl({
  definition,
  value,
  onChange,
  onInteractionStart,
}: {
  definition: FilterDefinition;
  value: string;
  onChange: (value: string) => void;
  onInteractionStart?: () => void;
}) {
  const Icon = definition.icon;
  return (
    <div
      className={`min-w-0 border-l border-slate-200/80 px-3 first:border-l-0 sm:px-4 ${FILTER_WIDTH_CLASS[definition.key] || 'lg:w-[170px]'}`}
    >
      <Label className="mb-1.5 block text-xs font-semibold text-slate-600">
        {definition.label}
      </Label>
      <Select value={value || 'any'} onValueChange={next => onChange(next === 'any' ? '' : next)}>
        <SelectTrigger
          className={`${FILTER_TRIGGER_CLASS} w-full`}
          onPointerDown={onInteractionStart}
          onFocus={onInteractionStart}
        >
          <Icon className="h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
          <SelectValue placeholder={definition.emptyLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">{definition.emptyLabel}</SelectItem>
          {definition.options.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
function PriceRangeControl({
  filters,
  onChange,
  error,
  open,
  onOpenChange,
}: {
  filters: HeroFilters;
  onChange: (key: FilterKey, value: string) => void;
  error: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const summary =
    filters.priceMin && filters.priceMax
      ? `${formatCompactZar(filters.priceMin)} – ${formatCompactZar(filters.priceMax)}`
      : filters.priceMin
        ? `From ${formatCompactZar(filters.priceMin)}`
        : filters.priceMax
          ? `Up to ${formatCompactZar(filters.priceMax)}`
          : 'Any price';
  return (
    <div
      data-price-range-root
      className="min-w-0 border-l border-slate-200/80 px-3 sm:px-4 lg:w-[208px]"
      onPointerDown={event => event.stopPropagation()}
    >
      <Label className="mb-1.5 block text-xs font-semibold text-slate-600">Price Range</Label>
      <div className="relative">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => {
            onOpenChange(!open);
          }}
          className={`flex w-full cursor-pointer items-center ${FILTER_TRIGGER_CLASS} ${open ? 'border-blue-600' : ''} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600`}
        >
          <CircleDollarSign className="h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{summary}</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {open ? (
          <div className="absolute left-0 z-40 mt-2 grid w-[384px] max-w-[calc(100vw-2rem)] grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/15 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Minimum price
              </Label>
              <Select
                value={filters.priceMin || 'any'}
                onValueChange={value => onChange('priceMin', value === 'any' ? '' : value)}
              >
                <SelectTrigger className={`${FILTER_TRIGGER_CLASS} w-full`}>
                  <SelectValue placeholder="No min" />
                </SelectTrigger>
                <SelectContent data-price-range-menu>
                  <SelectItem value="any">No min</SelectItem>
                  {PRICE_OPTIONS.map(option => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      disabled={
                        Boolean(filters.priceMax) && Number(option.value) > Number(filters.priceMax)
                      }
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Maximum price
              </Label>
              <Select
                value={filters.priceMax || 'any'}
                onValueChange={value => onChange('priceMax', value === 'any' ? '' : value)}
              >
                <SelectTrigger className={`${FILTER_TRIGGER_CLASS} w-full`}>
                  <SelectValue placeholder="No max" />
                </SelectTrigger>
                <SelectContent data-price-range-menu>
                  <SelectItem value="any">No max</SelectItem>
                  {PRICE_OPTIONS.map(option => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      disabled={
                        Boolean(filters.priceMin) && Number(option.value) < Number(filters.priceMin)
                      }
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error ? (
              <p className="text-xs font-medium text-rose-700 sm:col-span-2" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function EnhancedHero({
  title,
  subtitle,
  backgroundImage,
  initialSearchQuery = '',
  activeTab: controlledTab,
  onTabChange,
}: EnhancedHeroProps) {
  const [, setLocation] = useLocation();
  const [internalTab, setInternalTab] = useState('');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedLocations, setSelectedLocations] = useState<LocationNode[]>([]);
  const [selectedSearchArea, setSelectedSearchArea] = useState<SearchAreaDiscoveryResult | null>(
    null,
  );
  const [showIntentResolver, setShowIntentResolver] = useState(false);
  const [locationSelectionNotice, setLocationSelectionNotice] = useState<string | null>(null);
  const [priceRangeOpen, setPriceRangeOpen] = useState(false);
  const [filters, setFilters] = useState<HeroFilters>({
    propertyType: '',
    priceMin: '',
    priceMax: '',
    minBedrooms: '',
    minBathrooms: '',
    budgetMax: '',
    developmentType: '',
    developmentStatus: '',
    market: '',
    maxPrice: '',
    classification: '',
  });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const activeTab = controlledTab || internalTab;
  const requestedJourney = activeTab ? normalizePublicHeroJourney(activeTab) : null;
  const journey =
    requestedJourney && isHomepageHeroJourneyEnabled(requestedJourney) ? requestedJourney : '';
  const presentation =
    JOURNEY_PRESENTATION[journey as PublicHeroJourneyKey] || JOURNEY_PRESENTATION.buy!;
  const priceRangeError = getPriceRangeError(filters.priceMin, filters.priceMax) || null;
  const hasCanonicalLocations =
    selectedLocations.length > 0 &&
    selectedLocations.every(
      location => location.type !== 'area' && hasCanonicalLocationIdentity(location),
    );
  const canSubmitSearch = hasCanonicalLocations || Boolean(selectedSearchArea);
  const discoveryJourney = ['buy', 'rent', 'developments', 'plot_land', 'commercial'].includes(
    journey,
  )
    ? (journey as SearchJourneyId)
    : undefined;
  const { data: serverDiscoverySuggestions } = trpc.location.searchDiscoverySuggestions.useQuery(
    { query: searchQuery, limit: 6, journey: discoveryJourney },
    {
      enabled: VITE_SEARCH_DISCOVERY_AUTOSUGGEST_ENABLED === '1' && searchQuery.trim().length >= 2,
    },
  );
  const discoverySuggestions = useMemo(
    () =>
      VITE_SEARCH_DISCOVERY_AUTOSUGGEST_ENABLED === '1' ? serverDiscoverySuggestions || [] : [],
    [serverDiscoverySuggestions],
  );
  useEffect(() => {
    if (!priceRangeOpen) return;
    const closeWhenOutside = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        (target.closest('[data-price-range-root]') || target.closest('[data-price-range-menu]'))
      ) {
        return;
      }
      setPriceRangeOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPriceRangeOpen(false);
    };
    document.addEventListener('pointerdown', closeWhenOutside, true);
    document.addEventListener('keydown', closeOnEscape, true);
    return () => {
      document.removeEventListener('pointerdown', closeWhenOutside, true);
      document.removeEventListener('keydown', closeOnEscape, true);
    };
  }, [priceRangeOpen]);
  useEffect(() => {
    if (journey === 'buy') inputRef.current?.focus();
  }, [journey]);
  const updateFilter = (key: FilterKey, value: string) =>
    setFilters(current => ({ ...current, [key]: value }));
  const selectJourney = (key: PublicHeroJourneyKey) => {
    setPriceRangeOpen(false);
    if (key === 'find_agent') {
      onTabChange?.(key);
      setLocation('/agents');
      return;
    }
    setInternalTab(key);
    onTabChange?.(key);
    setShowIntentResolver(false);
  };
  const selectCanonicalLocation = (location: LocationNode) => {
    const resolution = resolveCanonicalLocationSelection(selectedLocations, location, 5);
    setSearchQuery('');
    setSelectedSearchArea(null);
    setSelectedLocations(resolution.locations);
    setShowIntentResolver(false);
    setLocationSelectionNotice(
      resolution.outcome === 'replaced-incompatible'
        ? `${location.name} replaces the previous area. Multi-area search combines sibling locations at the same level.`
        : resolution.outcome === 'limit-reached'
          ? 'You can search up to five areas together.'
          : resolution.outcome === 'invalid'
            ? 'Choose a Property Listify city, suburb, or province suggestion to search.'
            : null,
    );
  };
  const submitSearch = () => {
    setPriceRangeOpen(false);
    if (!canSubmitSearch || priceRangeError) return;
    if (!journey) {
      const path =
        !selectedSearchArea && selectedLocations.length === 1
          ? buildLocationDiscoveryPath(selectedLocations[0])
          : undefined;
      if (path) {
        setLocation(path);
        return;
      }
      setShowIntentResolver(true);
      return;
    }
    const searchScope = selectedSearchArea
      ? { kind: 'search_area' as const, searchAreaId: selectedSearchArea.searchAreaId }
      : undefined;
    if (journey === 'buy') {
      setLocation(
        buildBuySearchUrl({
          searchQuery,
          selectedLocations: selectedSearchArea ? [] : selectedLocations,
          searchScope,
          searchAreaAvailability: selectedSearchArea?.availability,
          propertyType: filters.propertyType,
          minPrice: filters.priceMin,
          maxPrice: filters.priceMax,
          minBedrooms: filters.minBedrooms,
          minBathrooms: filters.minBathrooms,
        }),
      );
      return;
    }
    if (journey === 'rent') {
      setLocation(
        buildPropertySearchUrl({
          transactionType: 'to-rent',
          searchQuery,
          selectedLocations: selectedSearchArea ? [] : selectedLocations,
          searchScope,
          searchAreaAvailability: selectedSearchArea?.availability,
          propertyType: filters.propertyType,
          maxPrice: filters.budgetMax,
        }),
      );
      return;
    }
    if (journey === 'developments') {
      setLocation(
        buildDevelopmentsSearchUrl({
          selectedLocations,
          developmentType: filters.developmentType,
          developmentStatus: filters.developmentStatus,
          minPrice: filters.priceMin,
          maxPrice: filters.priceMax,
        }),
      );
      return;
    }
    if (journey === 'commercial') {
      // Commercial handoff preserves location intent; its own page owns the
      // search contract.
      setLocation(
        buildConsumerJourneyUrl({
          intent: 'rent',
          journey,
          selectedLocations,
        }),
      );
      return;
    }
    if (journey === 'shared_living') {
      // Shared Living owns /shared-living with its own search contract.
      // Pass geography + any active SL-specific filter selections so the
      // discovery page receives them as URL params.
      const search = new URLSearchParams();
      if (selectedSearchArea) {
        search.set('searchAreaId', selectedSearchArea.searchAreaId);
      } else if (selectedLocations.length === 1) {
        const id = selectedLocations[0].canonicalLocationId || selectedLocations[0].id;
        if (id) search.set('locationId', id);
      } else if (selectedLocations.length > 1) {
        selectedLocations.forEach(loc => {
          const id = loc.canonicalLocationId || loc.id;
          if (id) search.append('locationIds', id);
        });
      }
      if (filters.market) search.set('market', String(filters.market));
      if (filters.maxPrice) search.set('maxPrice', String(filters.maxPrice));
      setLocation(`/shared-living?${search.toString()}`);
      return;
    }
    setLocation(getPublicHeroJourney(journey).destination);
  };
  const categories = getHomepageHeroJourneys();
  return (
    <section className="relative isolate overflow-visible border-b border-slate-100 bg-[radial-gradient(circle_at_90%_25%,rgba(186,230,253,0.58),transparent_28rem),radial-gradient(circle_at_5%_75%,rgba(219,234,254,0.72),transparent_28rem),linear-gradient(180deg,#f8fbff_0%,#fff_82%)] text-slate-900">
      {backgroundImage ? (
        <img
          src={backgroundImage}
          alt=""
          className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-[0.05]"
        />
      ) : null}
      <div className="container py-10 sm:py-14 lg:py-16">
        <header className="mx-auto max-w-5xl text-center">
          {title ? (
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              {title}
            </h1>
          ) : (
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              <span className="block">South Africa&apos;s smarter</span>
              <span className="block bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                property platform
              </span>
            </h1>
          )}
          <p className="mx-auto mt-5 max-w-3xl text-base font-medium leading-7 text-slate-600 sm:text-lg">
            {subtitle ||
              'Search homes, discover new developments, explore local insights, and connect with trusted property professionals.'}
          </p>
        </header>
        <div className="mx-auto mt-8 max-w-[1180px] overflow-x-auto px-1 pb-2 [scrollbar-width:none] sm:mt-10">
          <div className="flex min-w-max rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)] backdrop-blur-sm sm:justify-center">
            {categories.map(category => {
              const Icon = JOURNEY_ICONS[category.key];
              const selected = journey === category.key;
              return (
                <button
                  key={category.key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => selectJourney(category.key)}
                  onFocus={() => setPriceRangeOpen(false)}
                  className={`flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 active:translate-y-px sm:px-4 ${selected ? 'bg-blue-700 text-white shadow-md shadow-blue-700/25' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'}`}
                >
                  <Icon className="h-4 w-4" />
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ maxWidth: 'var(--plds-home-hero-search-max-width, 1180px)' }} className="relative mx-auto mt-3 w-full rounded-[1.5rem] border border-slate-200/90 bg-white shadow-[0_24px_54px_-28px_rgba(15,23,42,0.38)] sm:mt-4">
          <div className="flex flex-col gap-3 rounded-t-[1.45rem] bg-gradient-to-r from-blue-100/90 via-blue-50/70 to-cyan-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div>
              <h2 className="font-semibold text-slate-950">Start your property journey</h2>
              <p
                id="homepage-journey-selection-prompt"
                role="status"
                aria-live="polite"
                className="mt-0.5 text-sm text-slate-600"
              >
                {journey
                  ? presentation.guidance
                  : selectedLocations.length > 0
                    ? `What are you looking for in ${formatLocationNames(selectedLocations)}?`
                    : 'Choose how you would like to start.'}
              </p>
            </div>
            <span className="hidden items-center gap-1.5 rounded-full border border-cyan-300 bg-white/80 px-3 py-1.5 text-sm font-semibold text-cyan-700 md:inline-flex">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Search, compare, connect
            </span>
          </div>
          <div className="p-4 sm:p-6">
            <form
              className="flex flex-col gap-3 md:flex-row"
              onSubmit={event => {
                event.preventDefault();
                submitSearch();
              }}
            >
              <div
                className="relative min-w-0 flex-1"
                onPointerDown={() => setPriceRangeOpen(false)}
                onFocusCapture={() => setPriceRangeOpen(false)}
              >
                <MapPin className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-blue-700" />
                <LocationAutosuggest
                  placeholder={presentation.placeholder}
                  className="w-full"
                  inputClassName="h-14 w-full rounded-xl border-slate-200 bg-white pl-11 pr-4 text-base text-slate-800 shadow-[0_2px_5px_rgba(15,23,42,0.06)] transition-all placeholder:text-slate-500 hover:border-blue-200 focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/25"
                  showIcon={false}
                  inputRef={inputRef}
                  inputAriaDescribedBy="homepage-journey-selection-prompt"
                  selectedLocations={selectedLocations}
                  onRemove={index => {
                    setSelectedSearchArea(null);
                    setSelectedLocations(items =>
                      items.filter((_, itemIndex) => itemIndex !== index),
                    );
                  }}
                  onChange={setSearchQuery}
                  onSelect={selectCanonicalLocation}
                  onSubmit={submitSearch}
                  maxLocations={5}
                  discoverySuggestions={discoverySuggestions as SearchDiscoveryResult[]}
                  onDiscoverySelect={(suggestion: SearchDiscoveryResult) => {
                    if (suggestion.kind === 'search_area') {
                      if (suggestion.availability !== 'available' || !suggestion.publicEligible)
                        return;
                      setSearchQuery('');
                      setSelectedSearchArea(suggestion);
                      setSelectedLocations([
                        {
                          id: suggestion.searchAreaId,
                          searchAreaId: suggestion.searchAreaId,
                          name: suggestion.label,
                          slug:
                            suggestion.publicSlug ||
                            suggestion.label.toLowerCase().replace(/\s+/g, '-'),
                          type: 'area',
                          selectionKind: 'search_area',
                        },
                      ]);
                      return;
                    }
                    const parsed = parseCanonicalLocationId(suggestion.canonicalLocationId);
                    if (!parsed) return;
                    selectCanonicalLocation({
                      id: suggestion.canonicalLocationId,
                      canonicalLocationId: suggestion.canonicalLocationId,
                      name: suggestion.label,
                      slug: suggestion.suburbSlug || suggestion.citySlug || suggestion.provinceSlug,
                      type:
                        parsed.level === 'province'
                          ? 'province'
                          : parsed.level === 'city'
                            ? 'city'
                            : 'suburb',
                      provinceSlug: suggestion.provinceSlug,
                      citySlug: suggestion.citySlug,
                    });
                  }}
                  onDiscoveryNavigate={setLocation}
                />
              </div>
              <Button
                type="submit"
                disabled={!canSubmitSearch || Boolean(priceRangeError)}
                onFocus={() => setPriceRangeOpen(false)}
                className="h-14 min-w-[150px] rounded-xl bg-blue-700 px-7 text-base font-semibold text-white shadow-md shadow-blue-700/25 transition-all hover:-translate-y-px hover:bg-blue-800 hover:shadow-lg hover:shadow-blue-700/25 active:translate-y-0 active:shadow-sm disabled:bg-slate-200 disabled:text-slate-500"
              >
                <Search className="mr-2 h-5 w-5" />
                Search
              </Button>
            </form>
            {locationSelectionNotice ? (
              <p className="mt-3 text-sm text-slate-600" role="status">
                {locationSelectionNotice}
              </p>
            ) : null}
            {showIntentResolver && !journey ? (
              <section
                className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4"
                aria-labelledby="homepage-location-intent-heading"
              >
                <h2 id="homepage-location-intent-heading" className="font-semibold text-slate-950">
                  What are you looking for in {formatLocationNames(selectedLocations)}?
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Choose a journey to continue with this location.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    data-testid="homepage-location-intent-buy"
                    className="bg-blue-700 hover:bg-blue-800"
                    onClick={() => {
                      selectJourney('buy');
                      setShowIntentResolver(false);
                      setLocation(
                        buildBuySearchUrl({
                          searchQuery,
                          selectedLocations: selectedSearchArea ? [] : selectedLocations,
                          searchScope: selectedSearchArea
                            ? { kind: 'search_area', searchAreaId: selectedSearchArea.searchAreaId }
                            : undefined,
                          searchAreaAvailability: selectedSearchArea?.availability,
                          propertyType: filters.propertyType,
                          minPrice: filters.priceMin,
                          maxPrice: filters.priceMax,
                          minBedrooms: filters.minBedrooms,
                          minBathrooms: filters.minBathrooms,
                        }),
                      );
                    }}
                  >
                    Buy
                  </Button>
                  <Button type="button" variant="outline" onClick={() => selectJourney('rent')}>
                    Rent
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
                  <p className="mt-3 text-xs text-slate-600" role="status">
                    Search both selected areas together. Results can match either area.
                  </p>
                ) : null}
              </section>
            ) : null}
          </div>
          {journey && (
            <div className="border-t border-slate-200/80 bg-slate-50/80 p-3 sm:p-4">
              <div
                className="grid gap-3 sm:grid-cols-2 lg:flex lg:items-end lg:gap-0"
                onPointerDown={() => setPriceRangeOpen(false)}
                onFocusCapture={event => {
                  if (
                    !(
                      event.target instanceof Element &&
                      event.target.closest('[data-price-range-root]')
                    )
                  ) {
                    setPriceRangeOpen(false);
                  }
                }}
              >
                {presentation.primaryFilters.map(definition =>
                  definition.key === 'priceMax' && journey === 'buy' ? (
                    <PriceRangeControl
                      key="price"
                      filters={filters}
                      onChange={updateFilter}
                      error={priceRangeError}
                      open={priceRangeOpen}
                      onOpenChange={setPriceRangeOpen}
                    />
                  ) : (
                    <FilterControl
                      key={definition.key}
                      definition={definition}
                      value={filters[definition.key]}
                      onChange={value => updateFilter(definition.key, value)}
                      onInteractionStart={() => setPriceRangeOpen(false)}
                    />
                  ),
                )}
                <div className="flex min-w-0 flex-col lg:w-[184px] lg:pl-4">
                  <span
                    aria-hidden="true"
                    className="mb-1.5 block text-xs font-semibold leading-[18px] text-transparent"
                  >
                    More Filters
                  </span>
                  <button
                    type="button"
                    onFocus={() => setPriceRangeOpen(false)}
                    onClick={() => {
                      setPriceRangeOpen(false);
                      submitSearch();
                    }}
                    disabled={!canSubmitSearch || Boolean(priceRangeError)}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-blue-300 bg-white px-4 text-sm font-semibold text-blue-700 shadow-sm transition-all hover:-translate-y-px hover:border-blue-600 hover:bg-blue-50 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 active:translate-y-0 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    More Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="mx-auto mt-4 grid max-w-[1260px] gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {UTILITY_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setLocation(item.path)}
                className="flex min-h-20 items-center gap-3 rounded-xl border border-slate-200 bg-white/90 px-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{item.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{item.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
