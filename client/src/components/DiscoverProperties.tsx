import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { HomeAreaPicker } from '@/components/HomeAreaPicker';
import {
  CanonicalPlaceSelector,
  type CanonicalPlaceSelection,
} from '@/components/location/CanonicalPlaceSelector';
import { useHomeSearch, type HomeAreaSelection } from '@/contexts/HomeSearchContext';
import { needsHomeAreaClarification } from '@/lib/homeAreaSelection';
import useEmblaCarousel from 'embla-carousel-react';
import {
  Building,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightIcon,
  Gem,
  Home,
  KeyRound,
  Landmark,
  LayoutGrid,
  MapPin,
  Sparkles,
  Tag,
  Trees,
  type LucideIcon,
} from 'lucide-react';
import {
  buildDiscoverBrowseHref,
  buildDiscoverCardHref,
  buildSelectedDiscoverHref,
} from '@/lib/publicDiscoveryRoutes';
import { isHomepageHeroJourneyEnabled } from '@/lib/publicNavigation';
import { Button } from '@/components/ui/button';
import { buildDevelopmentsSearchUrl } from '@/lib/heroJourneySearch';

function DiscoveryAction({
  href,
  onChoose,
  className,
  children,
}: {
  href: string;
  onChoose?: () => void;
  className: string;
  children: ReactNode;
}) {
  return onChoose ? (
    <button type="button" onClick={onChoose} className={`${className} w-full text-left`}>
      {children}
    </button>
  ) : (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

interface PropertyType {
  type: string;
  icon: LucideIcon;
  /** Tailwind classes for the tinted tile and its icon chip. */
  tint: string;
  chip: string;
  listingType: 'sale' | 'rent' | 'developments';
}

const TINT_BLUE = { tint: 'bg-blue-50 border-blue-100', chip: 'bg-blue-100 text-blue-700' };
const TINT_EMERALD = {
  tint: 'bg-emerald-50 border-emerald-100',
  chip: 'bg-emerald-100 text-emerald-700',
};
const TINT_AMBER = { tint: 'bg-amber-50 border-amber-100', chip: 'bg-amber-100 text-amber-700' };
const TINT_VIOLET = {
  tint: 'bg-violet-50 border-violet-100',
  chip: 'bg-violet-100 text-violet-700',
};

const propertyTypes: PropertyType[] = [
  // Sale Properties
  { type: 'Houses', icon: Home, ...TINT_BLUE, listingType: 'sale' },
  { type: 'Apartments', icon: Building2, ...TINT_EMERALD, listingType: 'sale' },
  { type: 'Townhouses', icon: Building, ...TINT_AMBER, listingType: 'sale' },
  { type: 'Villas', icon: Landmark, ...TINT_VIOLET, listingType: 'sale' },
  { type: 'Cluster Homes', icon: LayoutGrid, ...TINT_BLUE, listingType: 'sale' },
  { type: 'Farms', icon: Trees, ...TINT_EMERALD, listingType: 'sale' },
  // Rent Properties
  { type: 'Apartments', icon: Building2, ...TINT_EMERALD, listingType: 'rent' },
  { type: 'Houses', icon: Home, ...TINT_BLUE, listingType: 'rent' },
  { type: 'Townhouses', icon: Building, ...TINT_AMBER, listingType: 'rent' },
  // New Developments (held at launch; hidden while the developments journey is held)
  { type: 'Ready to Move', icon: KeyRound, ...TINT_BLUE, listingType: 'developments' },
  { type: 'New Launch', icon: Sparkles, ...TINT_AMBER, listingType: 'developments' },
  { type: 'Affordable Housing', icon: Tag, ...TINT_EMERALD, listingType: 'developments' },
  { type: 'Luxury Projects', icon: Gem, ...TINT_VIOLET, listingType: 'developments' },
];

interface DiscoverPropertiesProps {
  title?: string;
  subtitle?: string;
  locationName?: string;
  /** Use the full homepage content rail rather than adding a second container. */
  withinContentRail?: boolean;
}

export function DiscoverProperties({
  title,
  subtitle,
  locationName = 'South Africa',
  withinContentRail = false,
}: DiscoverPropertiesProps = {}) {
  const homeSearch = useHomeSearch();
  const [, setLocation] = useLocation();
  const [picker, setPicker] = useState<{
    type: 'sale' | 'rent' | 'developments';
    category?: string;
    id: number;
    edit?: boolean;
  } | null>(null);
  const rentJourneyEnabled = isHomepageHeroJourneyEnabled('rent');
  const developmentsJourneyEnabled = isHomepageHeroJourneyEnabled('developments');
  const defaultTitle = `Browse by city, category, and property journey`;
  const defaultSubtitle =
    rentJourneyEnabled && developmentsJourneyEnabled
      ? `Not sure what to search yet? Explore homes, rentals, and new developments across ${locationName}${locationName.endsWith('s') ? "'" : "'s"} leading markets.`
      : rentJourneyEnabled
        ? `Not sure what to search yet? Explore homes and rentals across ${locationName}${locationName.endsWith('s') ? "'" : "'s"} leading markets.`
        : developmentsJourneyEnabled
          ? `Not sure what to search yet? Explore homes and new developments across ${locationName}${locationName.endsWith('s') ? "'" : "'s"} leading markets.`
          : `Not sure what to search yet? Explore homes across ${locationName}${locationName.endsWith('s') ? "'" : "'s"} leading markets.`;

  const displayTitle = title || defaultTitle;
  const displaySubtitle = subtitle || defaultSubtitle;

  const [developmentPlace, setDevelopmentPlace] = useState<CanonicalPlaceSelection | null>(null);

  const [listingType, setListingType] = useState<'sale' | 'rent' | 'developments'>('sale');
  const [saleExpanded, setSaleExpanded] = useState(true);
  const [rentExpanded, setRentExpanded] = useState(false);
  const [developmentsExpanded, setDevelopmentsExpanded] = useState(false);
  const sharedJourney = homeSearch?.journey;
  useEffect(() => {
    if (sharedJourney === undefined) return;
    const next =
      sharedJourney === 'rent'
        ? 'rent'
        : sharedJourney === 'developments'
          ? 'developments'
          : 'sale';
    setListingType(next);
    setSaleExpanded(next === 'sale');
    setRentExpanded(next === 'rent');
    setDevelopmentsExpanded(next === 'developments');
  }, [sharedJourney]);
  const selection: HomeAreaSelection = {
    locations: homeSearch?.locations || [],
  };
  const areaLabel = homeSearch
    ? selection.locations.map(location => location.name).join(' + ')
    : '';
  const locationPhrase = areaLabel ? `in ${areaLabel}` : 'in your chosen area';
  const broadConfirmed =
    needsHomeAreaClarification(selection) &&
    Boolean(selection.locations[0]) &&
    homeSearch?.confirmedBroadPlaceId === selection.locations[0]?.canonicalPlaceId;
  const chooseCategory = (type: 'sale' | 'rent' | 'developments', category?: string) => {
    if (type === 'developments') {
      if (developmentPlace) {
        setLocation(
          buildDevelopmentsSearchUrl({ canonicalPlaceId: developmentPlace.canonicalPlaceId }),
        );
      } else {
        document.getElementById('discover-development-place')?.focus();
      }
      return;
    }
    if (!homeSearch) return;
    const href = buildSelectedDiscoverHref(type, selection, homeSearch.filters, category);
    if (
      href &&
      (!needsHomeAreaClarification(selection) ||
        homeSearch.confirmedBroadPlaceId === selection.locations[0]?.canonicalPlaceId)
    ) {
      setLocation(href);
      return;
    }
    setPicker({ type, category, id: Date.now() });
  };

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    slidesToScroll: 1,
    containScroll: 'trimSnaps',
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const filteredProperties = propertyTypes.filter(
    p =>
      p.listingType === listingType &&
      (p.listingType !== 'developments' || developmentsJourneyEnabled),
  );
  const mobileSectionCopy: Record<
    'sale' | 'rent' | 'developments',
    { title: string; description: string; cta: string }
  > = {
    sale: {
      title: 'Properties for Sale',
      description: `Explore apartments, houses, and townhomes for sale ${locationPhrase}.`,
      cta: 'View Sale Listings',
    },
    rent: {
      title: 'Properties for Rent',
      description: `Browse apartments, cottages, and flexible rentals now available ${locationPhrase}.`,
      cta: 'View Rental Listings',
    },
    developments: {
      title: 'New Developments',
      description: `See the newest off-plan and ready-to-move developments ${locationPhrase}.`,
      cta: 'View Developments',
    },
  };
  const mobileActiveCopy = mobileSectionCopy[listingType];
  const developmentBrowseHref = buildDiscoverBrowseHref('developments', developmentPlace);
  const mobileActiveHref =
    listingType === 'developments'
      ? developmentBrowseHref
      : buildDiscoverBrowseHref(listingType);
  const browseDevelopment = () => chooseCategory('developments');

  const handleSaleClick = () => {
    homeSearch?.onJourneyChange('buy');
    setSaleExpanded(!saleExpanded);
    if (!saleExpanded) {
      setListingType('sale');
      setRentExpanded(false);
      setDevelopmentsExpanded(false);
    }
  };

  const handleRentClick = () => {
    if (!rentJourneyEnabled) return;
    homeSearch?.onJourneyChange('rent');
    setRentExpanded(!rentExpanded);
    if (!rentExpanded) {
      setListingType('rent');
      setSaleExpanded(false);
      setDevelopmentsExpanded(false);
    }
  };

  const handleDevelopmentsClick = () => {
    if (!developmentsJourneyEnabled) return;
    homeSearch?.onJourneyChange('developments');
    setDevelopmentsExpanded(!developmentsExpanded);
    if (!developmentsExpanded) {
      setListingType('developments');
      setSaleExpanded(false);
      setRentExpanded(false);
    }
  };

  return (
    <div className="home-section bg-gradient-to-b from-white to-muted/20">
      <div className={withinContentRail ? 'home-section-content' : 'container'}>
        <div className="home-section-header">
          <h2 className="home-section-title text-[1.125rem] sm:text-xl md:text-[26px] font-bold text-slate-900">
            {displayTitle}
          </h2>
          <p className="text-muted-foreground text-xs md:text-sm max-w-2xl">{displaySubtitle}</p>
        </div>

        {homeSearch && listingType !== 'developments' && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/40 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-[#2774AE]" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {areaLabel || 'Where would you like to look?'}
                  {broadConfirmed ? ' · All areas' : ''}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  {needsHomeAreaClarification(selection) && !broadConfirmed
                    ? 'Choose an area before opening property results.'
                    : 'Your selected area carries through to the category you choose.'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="min-h-11 border-blue-200 bg-white text-[#2774AE]"
              onClick={() => setPicker({ type: listingType, id: Date.now(), edit: true })}
            >
              {areaLabel ? 'Choose or change area' : 'Choose an area'}
            </Button>
          </div>
        )}
        {listingType === 'developments' ? (
          <div id="discover-development-place" className="mb-4 max-w-xl">
            <CanonicalPlaceSelector
              value={developmentPlace}
              onChange={setDevelopmentPlace}
              purpose="search"
              label="Project Place"
              placeholder="Search approved Places"
              hint="Only developments assigned to this exact reviewed Place match."
            />
          </div>
        ) : null}
        <div className="mb-4 lg:hidden">
          <div className="flex items-center gap-6 border-b border-slate-200">
            {(
              [
                { id: 'sale', label: 'Buy' },
                { id: 'rent', label: 'Rent' },
                { id: 'developments', label: 'Developments' },
              ] as const
            )
              .filter(
                tab =>
                  (tab.id !== 'rent' || rentJourneyEnabled) &&
                  (tab.id !== 'developments' || developmentsJourneyEnabled),
              )
              .map(tab => {
                const isActive = listingType === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setListingType(tab.id);
                      homeSearch?.onJourneyChange(tab.id === 'sale' ? 'buy' : tab.id);
                      setSaleExpanded(tab.id === 'sale');
                      setRentExpanded(tab.id === 'rent');
                      setDevelopmentsExpanded(tab.id === 'developments');
                    }}
                    className={`relative pb-3 text-sm font-semibold transition-colors ${
                      isActive ? 'text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    {tab.label}
                    {isActive ? (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-slate-900" />
                    ) : null}
                  </button>
                );
              })}
          </div>
          <div className="pt-4">
            <p className="text-sm text-slate-600 leading-relaxed">{mobileActiveCopy.description}</p>
            <DiscoveryAction
              href={mobileActiveHref}
              onChoose={
                listingType === 'developments'
                  ? browseDevelopment
                  : homeSearch
                    ? () => chooseCategory(listingType)
                    : undefined
              }
              className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors group"
            >
              {mobileActiveCopy.cta}
              <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </DiscoveryAction>
          </div>
        </div>

        <div className="home-card-grid grid grid-cols-1 lg:grid-cols-12">
          {/* Left Sidebar - Listing Type Toggle */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="rounded-2xl border border-slate-200 shadow-xl bg-white overflow-hidden h-full flex flex-col">
              {/* Properties for Sale */}
              <div className="border-b border-slate-100">
                <button
                  onClick={handleSaleClick}
                  className={`w-full p-3.5 sm:p-4 flex items-center justify-between transition-all duration-300 ${
                    saleExpanded
                      ? 'bg-blue-50/80 text-blue-700'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="font-bold text-base">Properties for Sale</span>
                  <div
                    className={`rounded-full p-1 transition-colors ${saleExpanded ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}
                  >
                    <ChevronRightIcon
                      className={`h-4 w-4 transition-transform duration-300 ${saleExpanded ? 'rotate-90' : ''}`}
                    />
                  </div>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    saleExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-5 pb-5 pt-2 bg-blue-50/30">
                    <p className="text-sm text-slate-600 leading-relaxed mb-5">
                      Explore apartments, houses, and townhomes for sale {locationPhrase}.
                    </p>
                    <DiscoveryAction
                      href={buildDiscoverBrowseHref('sale')}
                      onChoose={homeSearch ? () => chooseCategory('sale') : undefined}
                      className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors group"
                    >
                      View Sale Listings
                      <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </DiscoveryAction>
                  </div>
                </div>
              </div>

              {rentJourneyEnabled ? (
                <div className="border-b border-slate-100">
                  <button
                    onClick={handleRentClick}
                    className={`w-full p-3.5 sm:p-4 flex items-center justify-between transition-all duration-300 ${
                      rentExpanded
                        ? 'bg-blue-50/80 text-blue-700'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="font-bold text-base">Properties for Rent</span>
                    <div
                      className={`rounded-full p-1 transition-colors ${rentExpanded ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}
                    >
                      <ChevronRightIcon
                        className={`h-4 w-4 transition-transform duration-300 ${rentExpanded ? 'rotate-90' : ''}`}
                      />
                    </div>
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      rentExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="px-5 pb-5 pt-2 bg-blue-50/30">
                      <p className="text-sm text-slate-600 leading-relaxed mb-5">
                        Browse apartments, cottages, and flexible rentals now available in{' '}
                        {areaLabel || 'your chosen area'}.
                      </p>
                      <DiscoveryAction
                        href={buildDiscoverBrowseHref('rent')}
                        onChoose={homeSearch ? () => chooseCategory('rent') : undefined}
                        className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors group"
                      >
                        View Rental Listings
                        <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </DiscoveryAction>
                    </div>
                  </div>
                </div>
              ) : null}

              {developmentsJourneyEnabled ? (
                <>
                  {/* New Developments */}
                  <div>
                    <button
                      onClick={handleDevelopmentsClick}
                      className={`w-full p-3.5 sm:p-4 flex items-center justify-between transition-all duration-300 ${
                        developmentsExpanded
                          ? 'bg-blue-50/80 text-blue-700'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="font-bold text-base">New Developments</span>
                      <div
                        className={`rounded-full p-1 transition-colors ${developmentsExpanded ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}
                      >
                        <ChevronRightIcon
                          className={`h-4 w-4 transition-transform duration-300 ${developmentsExpanded ? 'rotate-90' : ''}`}
                        />
                      </div>
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        developmentsExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="px-5 pb-5 pt-2 bg-blue-50/30">
                        <p className="text-sm text-slate-600 leading-relaxed mb-5">
                          See the newest off-plan and ready-to-move developments {locationPhrase}.
                        </p>
                        <DiscoveryAction
                          href={developmentBrowseHref}
                          onChoose={browseDevelopment}
                          className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors group"
                        >
                          View Developments
                          <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </DiscoveryAction>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {/* Right Side - Property Carousel */}
          <div className="lg:col-span-9 relative group/carousel">
            <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
              <div className="home-card-grid flex py-0.5">
                {filteredProperties.map((property, idx) => (
                  <div
                    key={idx}
                    className="flex-[0_0_62%] min-w-0 sm:flex-[0_0_48%] lg:flex-[0_0_32%]"
                  >
                    <DiscoveryAction
                      onChoose={
                        property.listingType === 'developments'
                          ? browseDevelopment
                          : homeSearch
                            ? () => chooseCategory(property.listingType, property.type)
                            : undefined
                      }
                      href={buildDiscoverCardHref(
                        property.type,
                        property.listingType,
                        developmentPlace,
                      )}
                      className={`group flex h-[168px] flex-col justify-between rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2774AE] focus-visible:ring-offset-2 sm:h-[200px] sm:p-5 ${property.tint}`}
                    >
                      <span
                        className={`flex h-12 w-12 items-center justify-center rounded-xl ${property.chip}`}
                      >
                        <property.icon className="h-6 w-6" aria-hidden="true" />
                      </span>
                      <span className="block">
                        <span className="block text-lg font-bold text-slate-900 sm:text-xl">
                          {property.type}
                        </span>
                        <span className="mt-1 block text-xs font-medium text-slate-600">
                          <span className="rounded bg-white/70 px-2 py-0.5 uppercase tracking-wider">
                            {listingType === 'sale'
                              ? 'For Sale'
                              : listingType === 'rent'
                                ? 'For Rent'
                                : 'New Development'}
                          </span>
                          <span className="mt-1 block truncate">{locationPhrase}</span>
                        </span>
                      </span>
                    </DiscoveryAction>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Buttons - Visible on large screens or hover */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full h-12 w-12 shadow-xl z-20 opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:scale-110 bg-white/90 hover:bg-white text-slate-900 hover:text-blue-600 border border-slate-200 hidden md:flex"
              onClick={scrollPrev}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full h-12 w-12 shadow-xl z-20 opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:scale-110 bg-white/90 hover:bg-white text-slate-900 hover:text-blue-600 border border-slate-200 hidden md:flex"
              onClick={scrollNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
        </div>
        {homeSearch && picker && (
          <HomeAreaPicker
            key={picker.id}
            open
            onOpenChange={open => {
              if (!open) setPicker(null);
            }}
            journey={picker.type === 'sale' ? 'buy' : picker.type}
            category={picker.category}
            initialSelection={selection}
            onConfirm={next => {
              homeSearch.setLocations(next.locations);
              homeSearch.setConfirmedBroadPlaceId(
                needsHomeAreaClarification(next)
                  ? (next.locations[0]?.canonicalPlaceId ?? null)
                  : null,
              );
              const href = buildSelectedDiscoverHref(
                picker.type,
                next,
                homeSearch.filters,
                picker.category,
              );
              setPicker(null);
              if (!picker.edit && href) setLocation(href);
            }}
          />
        )}
      </div>
    </div>
  );
}
