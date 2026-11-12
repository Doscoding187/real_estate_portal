// Why this section exists, its categories, destinations and history:
// docs/product/homepage/browse-by-category.md — update that file with any change here.
import { useState, useCallback, useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { HomeAreaPicker } from '@/components/HomeAreaPicker';
import {
  CanonicalPlaceSelector,
  type CanonicalPlaceSelection,
} from '@/components/location/CanonicalPlaceSelector';
import { useHomeSearch, type HomeAreaSelection } from '@/contexts/HomeSearchContext';
import { needsHomeAreaClarification } from '@/lib/homeAreaSelection';
import { ChevronLeft, ChevronRight, ChevronRight as ChevronRightIcon, MapPin } from 'lucide-react';
import {
  buildDiscoverBrowseHref,
  buildDiscoverCardHref,
  buildSelectedDiscoverHref,
  placeFromLocation,
} from '@/lib/publicDiscoveryRoutes';
import { isHomepageHeroJourneyEnabled } from '@/lib/publicNavigation';
import { Button } from '@/components/ui/button';
import { buildDevelopmentsSearchUrl } from '@/lib/heroJourneySearch';
import { HOME_BROWSE_CITIES, type BrowseCity } from '@/lib/cityGuides';
import { CATEGORY_IMAGES } from '@/lib/categoryImages.generated';
import type { LocationNode } from '@/types/location';

type ListingType = 'sale' | 'rent' | 'developments';

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
  /** Base name of the generated photo in /images/categories; absent means no photo supplied. */
  image?: string;
  listingType: ListingType;
}

const propertyTypes: PropertyType[] = [
  // Sale
  { type: 'Houses', image: 'houses', listingType: 'sale' },
  { type: 'Apartments', image: 'apartments', listingType: 'sale' },
  { type: 'Townhouses', image: 'townhouses', listingType: 'sale' },
  { type: 'Cluster Homes', image: 'cluster-homes', listingType: 'sale' },
  { type: 'Farms', image: 'farms', listingType: 'sale' },
  { type: 'Plots & Land', image: 'plots-and-land', listingType: 'sale' },
  { type: 'Offices', image: 'offices', listingType: 'sale' },
  { type: 'Shops', image: 'shops', listingType: 'sale' },
  // Rent
  { type: 'Apartments', image: 'apartments', listingType: 'rent' },
  { type: 'Houses', image: 'houses', listingType: 'rent' },
  { type: 'Townhouses', image: 'townhouses', listingType: 'rent' },
  { type: 'Offices', image: 'offices', listingType: 'rent' },
  { type: 'Shops', image: 'shops', listingType: 'rent' },
  // New Developments (no photos supplied yet; held at launch)
  { type: 'Ready to Move', listingType: 'developments' },
  { type: 'New Launch', listingType: 'developments' },
  { type: 'Affordable Housing', listingType: 'developments' },
  { type: 'Luxury Projects', listingType: 'developments' },
];

const CHIP_LABEL: Record<ListingType, string> = {
  sale: 'For sale',
  rent: 'To rent',
  developments: 'New development',
};

/** Matches the card widths set on the rail items below. */
const CARD_SIZES =
  '(min-width: 1280px) 225px, (min-width: 1024px) 215px, (min-width: 768px) 24vw, 152px';

/**
 * Cards are always 7:10 portrait (owner reference, 2026-11-12: about 210 x 300). Width is set per
 * breakpoint and the height follows from the ratio, so the shape never changes. Phone: 152 px, two
 * and a peek. Tablet: three and a peek. Desktop: exactly 3 (1024-1279) or 4 (1280+) whole cards.
 */
const CARD_WIDTH_CLASS =
  'w-[9.5rem] md:w-[calc((100%-2rem)/3.3)] lg:w-[calc((100%-2rem)/3)] xl:w-[calc((100%-3rem)/4)]';

function cityToLocation(city: BrowseCity): LocationNode {
  return {
    canonicalPlaceId: city.canonicalPlaceId,
    factualType: 'city',
    slug: city.slug,
    name: city.name,
    type: 'city',
    provinceSlug: city.provinceSlug,
    citySlug: city.slug,
    canonicalPath: city.canonicalPath,
  };
}

function CategoryImage({ name, alt }: { name: string; alt: string }) {
  const image = CATEGORY_IMAGES[name];
  if (!image) return null;
  const base = `/images/categories/${name}`;
  return (
    <img
      src={`${base}-${image.width}.webp`}
      srcSet={image.widths.map(width => `${base}-${width}.webp ${width}w`).join(', ')}
      sizes={CARD_SIZES}
      width={image.width}
      height={image.height}
      loading="lazy"
      decoding="async"
      alt={alt}
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
    />
  );
}

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
    type: ListingType;
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
  // Without the homepage search context (other pages) the city pills keep their own selection.
  const [localLocations, setLocalLocations] = useState<LocationNode[]>([]);

  const [listingType, setListingType] = useState<ListingType>('sale');
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

  const locations = homeSearch ? homeSearch.locations : localLocations;
  const selection: HomeAreaSelection = { locations };
  const areaLabel = locations.map(location => location.name).join(' + ');
  const singleLocation = locations.length === 1 ? locations[0] : null;
  const cardPlace = singleLocation ? placeFromLocation(singleLocation) : null;
  const locationPhrase = areaLabel ? `in ${areaLabel}` : 'in your chosen area';
  const chooseCity = (city: BrowseCity) => {
    const selected = singleLocation?.canonicalPlaceId === city.canonicalPlaceId;
    const next = selected ? [] : [cityToLocation(city)];
    if (homeSearch) {
      homeSearch.setLocations(next);
      // Picking a city pill is the explicit choice of that city.
      homeSearch.setConfirmedBroadPlaceId(selected ? null : city.canonicalPlaceId);
    } else {
      setLocalLocations(next);
    }
  };
  const chooseCategory = (type: ListingType, category?: string) => {
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

  // Native scroll-snap rail; the arrows page it on larger screens.
  const railRef = useRef<HTMLDivElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const updateArrows = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    setCanPrev(rail.scrollLeft > 4);
    setCanNext(rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 4);
  }, []);
  const pageRail = (direction: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * rail.clientWidth * 0.8, behavior: 'smooth' });
  };
  useEffect(() => {
    if (railRef.current) railRef.current.scrollLeft = 0;
    updateArrows();
    window.addEventListener('resize', updateArrows);
    return () => window.removeEventListener('resize', updateArrows);
  }, [listingType, updateArrows]);

  const filteredProperties = propertyTypes.filter(
    p =>
      p.listingType === listingType &&
      (p.listingType !== 'developments' || developmentsJourneyEnabled),
  );
  const mobileSectionCopy: Record<
    ListingType,
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
      : buildDiscoverBrowseHref(listingType, cardPlace);
  const browseDevelopment = () => chooseCategory('developments');

  const selectJourney = (next: ListingType) => {
    homeSearch?.onJourneyChange(next === 'sale' ? 'buy' : next);
    setListingType(next);
    setSaleExpanded(next === 'sale');
    setRentExpanded(next === 'rent');
    setDevelopmentsExpanded(next === 'developments');
  };

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

  const cardHref = (property: PropertyType) =>
    property.listingType === 'developments'
      ? developmentPlace
        ? buildDiscoverCardHref(property.type, 'developments', developmentPlace)
        : '/new-developments'
      : buildDiscoverCardHref(property.type, property.listingType, cardPlace);

  const onCardClick = (
    event: MouseEvent<HTMLAnchorElement>,
    property: PropertyType,
    href: string,
  ) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    if (property.listingType === 'developments' && !developmentPlace) {
      browseDevelopment();
      return;
    }
    setLocation(href);
  };

  const accordionRows: Array<{
    id: ListingType;
    label: string;
    expanded: boolean;
    onToggle: () => void;
    description: ReactNode;
    cta: string;
    href: string;
    onChoose?: () => void;
    enabled: boolean;
  }> = [
    {
      id: 'sale',
      label: 'Properties for Sale',
      expanded: saleExpanded,
      onToggle: handleSaleClick,
      description: `Explore apartments, houses, and townhomes for sale ${locationPhrase}.`,
      cta: 'View Sale Listings',
      href: buildDiscoverBrowseHref('sale'),
      onChoose: homeSearch ? () => chooseCategory('sale') : undefined,
      enabled: true,
    },
    {
      id: 'rent',
      label: 'Properties for Rent',
      expanded: rentExpanded,
      onToggle: handleRentClick,
      description: `Browse apartments, cottages, and flexible rentals now available ${locationPhrase}.`,
      cta: 'View Rental Listings',
      href: buildDiscoverBrowseHref('rent'),
      onChoose: homeSearch ? () => chooseCategory('rent') : undefined,
      enabled: rentJourneyEnabled,
    },
    {
      id: 'developments',
      label: 'New Developments',
      expanded: developmentsExpanded,
      onToggle: handleDevelopmentsClick,
      description: `See the newest off-plan and ready-to-move developments ${locationPhrase}.`,
      cta: 'View Developments',
      href: developmentBrowseHref,
      onChoose: browseDevelopment,
      enabled: developmentsJourneyEnabled,
    },
  ];

  return (
    <div className="home-section bg-gradient-to-b from-white to-muted/20">
      <div className={withinContentRail ? 'home-section-content' : 'container'}>
        <div className="home-section-header">
          <h2 className="home-section-title text-[1.125rem] sm:text-xl md:text-[26px] font-bold text-slate-900">
            {displayTitle}
          </h2>
          <p className="text-muted-foreground text-xs md:text-sm max-w-2xl">{displaySubtitle}</p>
        </div>

        {/* City pills are only for the property journeys. */}
        {listingType !== 'developments' ? (
          <div className="home-section-tabs scrollbar-hide -mx-4 flex justify-start overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            <div
              role="group"
              aria-label="City"
              className="inline-flex h-auto flex-nowrap justify-start gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1.5"
            >
              {HOME_BROWSE_CITIES.map(city => {
                const active = singleLocation?.canonicalPlaceId === city.canonicalPlaceId;
                return (
                  <button
                    key={city.canonicalPlaceId}
                    type="button"
                    aria-pressed={active}
                    onClick={() => chooseCity(city)}
                    className={`min-h-11 shrink-0 whitespace-nowrap rounded-lg border border-transparent px-3 py-2 text-[13px] font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 md:px-4 md:text-sm ${
                      active
                        ? 'bg-[#2774AE] text-white shadow-sm'
                        : 'bg-transparent text-slate-600 hover:bg-white hover:text-[#2774AE]'
                    }`}
                  >
                    {city.name}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {homeSearch && listingType !== 'developments' && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/40 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-[#2774AE]" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {areaLabel || 'Where would you like to look?'}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  {areaLabel
                    ? 'Your selected area carries through to the category you choose.'
                    : 'Pick a city above or choose an area. Without one, categories open results for all of South Africa.'}
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
              label="Area"
              placeholder="Search areas"
              hint="Only developments in this area match."
            />
          </div>
        ) : null}

        {/* Below 1024px the accordion becomes a segmented control. */}
        <div className="mb-4 lg:hidden">
          <div
            role="group"
            aria-label="Property journey"
            className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1"
          >
            {(
              [
                { id: 'sale', label: 'Sale' },
                { id: 'rent', label: 'Rent' },
                { id: 'developments', label: 'New Developments' },
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
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => selectJourney(tab.id)}
                    className={`min-h-11 rounded-lg px-2 text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:text-sm ${
                      isActive
                        ? 'bg-white text-[#1d5a8e] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
          </div>
          <div className="pt-3">
            <p className="text-sm leading-relaxed text-slate-600">{mobileActiveCopy.description}</p>
            <DiscoveryAction
              href={mobileActiveHref}
              onChoose={
                listingType === 'developments'
                  ? browseDevelopment
                  : homeSearch
                    ? () => chooseCategory(listingType)
                    : undefined
              }
              className="group mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-blue-700 transition-colors hover:text-blue-900"
            >
              {mobileActiveCopy.cta}
              <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </DiscoveryAction>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(15rem,18.5rem)_minmax(0,1fr)] lg:gap-6">
          {/* Accordion column (1024px and up) */}
          <div className="relative hidden lg:block">
            <div className="flex flex-col overflow-y-auto overflow-x-hidden absolute inset-0 rounded-2xl border border-slate-200 bg-white shadow-xl">
              {accordionRows
                .filter(row => row.enabled)
                .map(row => (
                  <div key={row.id} className="border-b border-slate-100 last:border-b-0">
                    <button
                      type="button"
                      onClick={row.onToggle}
                      aria-expanded={row.expanded}
                      className={`flex min-h-12 w-full items-center justify-between p-3.5 transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-700 sm:p-4 ${
                        row.expanded
                          ? 'bg-blue-50/80 text-blue-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-base font-bold">{row.label}</span>
                      <span
                        className={`rounded-full p-1 transition-colors ${row.expanded ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}
                      >
                        <ChevronRightIcon
                          className={`h-4 w-4 transition-transform duration-300 ${row.expanded ? 'rotate-90' : ''}`}
                          aria-hidden="true"
                        />
                      </span>
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        row.expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="bg-blue-50/30 px-5 pb-5 pt-2">
                        <p className="mb-4 text-sm leading-relaxed text-slate-600">
                          {row.description}
                        </p>
                        <DiscoveryAction
                          href={row.href}
                          onChoose={row.onChoose}
                          className="group flex items-center gap-1 text-sm font-bold text-blue-700 transition-colors hover:text-blue-900"
                        >
                          {row.cta}
                          <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </DiscoveryAction>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Category cards: one rail from phone to desktop. The cards set the height (7:10); the accordion stretches to it. */}
          <div className="relative min-w-0">
            <div
              ref={railRef}
              onScroll={updateArrows}
              data-testid="discover-card-rail"
              className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth p-1 md:gap-4"
            >
              {filteredProperties.map(property => {
                const href = cardHref(property);
                const imageName = property.image;
                const hasPhoto = Boolean(imageName && CATEGORY_IMAGES[imageName]);
                const chipArea = singleLocation && property.listingType !== 'developments';
                return (
                  <a
                    key={`${property.listingType}-${property.type}`}
                    href={href}
                    onClick={event => onCardClick(event, property, href)}
                    data-card={`${property.listingType}:${property.type}`}
                    className={`group relative block aspect-[7/10] shrink-0 snap-start overflow-hidden rounded-xl bg-slate-800 shadow-sm transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2774AE] focus-visible:ring-offset-2 ${CARD_WIDTH_CLASS}`}
                  >
                    {hasPhoto && imageName ? (
                      <CategoryImage
                        name={imageName}
                        alt={`${property.type} ${property.listingType === 'rent' ? 'to rent' : 'for sale'}`}
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-br from-[#2774AE] via-[#1d5a8e] to-[#0f2f4d]"
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 via-40% to-transparent"
                    />
                    <span className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-1.5 p-3 sm:p-4">
                      <span className="text-lg font-bold leading-tight text-white sm:text-xl">
                        {property.type}
                      </span>
                      <span className="flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-white">
                        <span className="rounded bg-black/50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-white/30">
                          {CHIP_LABEL[property.listingType]}
                        </span>
                        {chipArea ? (
                          <span className="max-w-full truncate">in {singleLocation.name}</span>
                        ) : null}
                      </span>
                    </span>
                  </a>
                );
              })}
            </div>

            {canPrev ? (
              <Button
                variant="secondary"
                size="icon"
                aria-label="Previous categories"
                className="absolute left-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 rounded-full border border-slate-200 bg-white/95 text-slate-900 shadow-xl hover:bg-white hover:text-blue-700 md:flex"
                onClick={() => pageRail(-1)}
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </Button>
            ) : null}
            {canNext ? (
              <Button
                variant="secondary"
                size="icon"
                aria-label="Next categories"
                className="absolute right-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 rounded-full border border-slate-200 bg-white/95 text-slate-900 shadow-xl hover:bg-white hover:text-blue-700 md:flex"
                onClick={() => pageRail(1)}
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            ) : null}
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
