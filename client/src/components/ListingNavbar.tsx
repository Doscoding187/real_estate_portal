import { Button } from './ui/button';
import { Search, User, ChevronDown, X } from 'lucide-react';
import { LocationAutosuggest } from './LocationAutosuggest';
import { Badge } from './ui/badge';
import { useLocation, useSearch } from 'wouter';
import { useEffect, useMemo, useState } from 'react';
import {
  buildPropertySearchUrl,
  extractActiveSearchRefinementFilters,
} from '@/lib/heroJourneySearch';
import { getListingTypeForPath } from '@/lib/searchNavigation';
import { createCanonicalSearchLocation } from '@/lib/geographySearchHandoff';
import type { LocationNode } from '@/types/location';
import { useAuth } from '@/_core/hooks/useAuth';
import type { SearchAreaSummary } from '../../../shared/searchScope';

export interface ListingNavbarLocation {
  name: string;
  slug: string;
  type: 'province' | 'city' | 'suburb';
  provinceSlug?: string;
  citySlug?: string;
  fullAddress: string;
  id?: string;
  canonicalLocationId?: string;
  parentCanonicalLocationId?: string;
}

const EMPTY_LISTING_NAVBAR_LOCATIONS: ListingNavbarLocation[] = [];

export function reconstructCanonicalLocations(
  locations: readonly (Pick<
    ListingNavbarLocation,
    'name' | 'slug' | 'type' | 'canonicalLocationId' | 'parentCanonicalLocationId'
  > & { canonicalLocationId: string })[],
): ListingNavbarLocation[] {
  return locations
    .map(location => ({
      name: location.name,
      slug: location.slug,
      type: location.type,
      fullAddress: location.name,
      id: location.canonicalLocationId,
      canonicalLocationId: location.canonicalLocationId,
      parentCanonicalLocationId: location.parentCanonicalLocationId,
    }))
    .sort((left, right) =>
      (left.canonicalLocationId || '').localeCompare(right.canonicalLocationId || ''),
    );
}

interface ListingNavbarProps {
  neutralSearch?: boolean;
  defaultLocations?: ListingNavbarLocation[];
  defaultSearchArea?: Pick<SearchAreaSummary, 'searchAreaId' | 'label' | 'availability'>;
  onClearSearchArea?: () => void;
  showMobileLocationSearch?: boolean;
}

export const LISTING_NAVBAR_LOCATION_INPUT_IDS = {
  desktop: 'listing-navbar-location-input',
  mobile: 'listing-navbar-location-input-mobile',
} as const;

export function focusListingNavbarLocationInput(preferMobile?: boolean) {
  if (typeof document === 'undefined') return false;

  const shouldPreferMobile =
    preferMobile ??
    (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches);
  const inputIds = shouldPreferMobile
    ? [LISTING_NAVBAR_LOCATION_INPUT_IDS.mobile, LISTING_NAVBAR_LOCATION_INPUT_IDS.desktop]
    : [LISTING_NAVBAR_LOCATION_INPUT_IDS.desktop, LISTING_NAVBAR_LOCATION_INPUT_IDS.mobile];
  const input = inputIds
    .map(inputId => document.getElementById(inputId))
    .find(element => element instanceof HTMLInputElement);

  if (!(input instanceof HTMLInputElement)) return false;

  input.focus();
  input.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return true;
}

/**
 * Client-side compatibility guard only. The server remains authoritative for
 * canonical sibling validation when the resulting search is submitted.
 */
export function canAddCanonicalLocation(
  selectedLocations: readonly ListingNavbarLocation[],
  candidate: LocationNode,
): boolean {
  const canonicalSelection = createCanonicalSearchLocation(candidate);
  if (!canonicalSelection) return false;

  const candidateIdentity =
    'canonicalLocationId' in canonicalSelection.scope
      ? canonicalSelection.scope.canonicalLocationId
      : undefined;
  if (!candidateIdentity) return false;

  if (
    selectedLocations.some(
      location => (location.canonicalLocationId || location.id) === candidateIdentity,
    )
  ) {
    return false;
  }

  return selectedLocations.every(location => {
    const identity = location.canonicalLocationId || location.id;
    if (!identity) return false;

    const existingSelection = createCanonicalSearchLocation({ ...location, id: identity });
    if (!existingSelection || existingSelection.scope.kind !== canonicalSelection.scope.kind) {
      return false;
    }

    if (canonicalSelection.scope.kind === 'province') return true;

    return Boolean(
      location.parentCanonicalLocationId &&
      candidate.parentCanonicalLocationId &&
      location.parentCanonicalLocationId === candidate.parentCanonicalLocationId,
    );
  });
}

export function ListingNavbar({
  neutralSearch = false,
  defaultLocations = EMPTY_LISTING_NAVBAR_LOCATIONS,
  defaultSearchArea,
  onClearSearchArea,
  showMobileLocationSearch = false,
}: ListingNavbarProps) {
  const [currentPath, setLocation] = useLocation();
  const search = useSearch();
  const { isAuthenticated } = useAuth();
  const routeListingType = useMemo(
    () => getListingTypeForPath(currentPath, search),
    [currentPath, search],
  );
  const [listingType, setListingType] = useState<'sale' | 'rent' | null>(
    neutralSearch ? null : routeListingType,
  );

  useEffect(() => {
    setListingType(neutralSearch ? null : routeListingType);
  }, [neutralSearch, routeListingType]);

  // Multi-location state
  const [selectedLocations, setSelectedLocations] = useState<ListingNavbarLocation[]>(
    Array.isArray(defaultLocations) ? defaultLocations : [],
  );

  const defaultLocationKey = useMemo(
    () =>
      defaultLocations
        .map(
          location =>
            `${location.canonicalLocationId || location.id || location.slug}:${location.name}:${location.type}:${location.parentCanonicalLocationId || ''}`,
        )
        .join('|'),
    [defaultLocations],
  );

  useEffect(() => {
    setSelectedLocations(currentLocations => {
      const currentLocationKey = currentLocations
        .map(
          location =>
            `${location.canonicalLocationId || location.id || location.slug}:${location.name}:${location.type}:${location.parentCanonicalLocationId || ''}`,
        )
        .join('|');

      return currentLocationKey === defaultLocationKey ? currentLocations : defaultLocations;
    });
  }, [defaultLocationKey, defaultLocations]);

  // Buy/Rent Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Hierarchy order for sorting
  const typeOrder: Record<string, number> = { province: 1, city: 2, suburb: 3 };

  const handleSearch = () => {
    if (!listingType) return;

    const preserveSearchArea = defaultSearchArea && selectedLocations.length === 0;
    // A consumer who refined results (price, bedrooms, source, ...) and then
    // searches a new location from the navbar keeps those refinements instead
    // of silently losing them. Buy-only this phase; rent preservation is part
    // of the Rent journey convergence.
    const preservedRefinements =
      listingType === 'sale' ? extractActiveSearchRefinementFilters(window.location.search) : {};
    const url = buildPropertySearchUrl({
      transactionType: listingType === 'rent' ? 'to-rent' : 'for-sale',
      selectedLocations: selectedLocations as LocationNode[],
      searchScope: preserveSearchArea
        ? { kind: 'search_area', searchAreaId: defaultSearchArea.searchAreaId }
        : undefined,
      searchAreaAvailability: preserveSearchArea ? defaultSearchArea.availability : undefined,
      ...preservedRefinements,
    });
    setLocation(url);
  };

  const handleLocationSelect = (loc: LocationNode) => {
    if (loc.type !== 'province' && loc.type !== 'city' && loc.type !== 'suburb') return;

    const canonicalSelection = createCanonicalSearchLocation(loc);
    if (!canonicalSelection) return;

    const canonicalLocationId =
      'canonicalLocationId' in canonicalSelection.scope
        ? canonicalSelection.scope.canonicalLocationId
        : undefined;
    if (!canonicalLocationId) return;

    if (!canAddCanonicalLocation(selectedLocations, loc)) return;

    if (selectedLocations.length >= 10) return;

    const newLocation: ListingNavbarLocation = {
      name: loc.name,
      slug: loc.slug,
      type: loc.type === 'province' ? 'province' : loc.type === 'city' ? 'city' : 'suburb',
      provinceSlug: loc.provinceSlug,
      citySlug: loc.citySlug,
      fullAddress: loc.name,
      id: canonicalLocationId,
      canonicalLocationId,
      parentCanonicalLocationId: loc.parentCanonicalLocationId,
    };
    let newLocations = [...selectedLocations, newLocation];
    newLocations.sort((a, b) => (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99));

    setSelectedLocations(newLocations);
  };

  const removeLocation = (identity: string) => {
    const nextLocations = selectedLocations.filter(
      location => (location.canonicalLocationId || location.id || location.slug) !== identity,
    );
    setSelectedLocations(nextLocations);
    if (listingType) {
      const preservedRefinements =
        listingType === 'sale' ? extractActiveSearchRefinementFilters(window.location.search) : {};
      setLocation(
        buildPropertySearchUrl({
          transactionType: listingType === 'rent' ? 'to-rent' : 'for-sale',
          selectedLocations: nextLocations as LocationNode[],
          ...preservedRefinements,
        }),
      );
    }
  };

  const removeLocationAtIndex = (index: number) => {
    const location = selectedLocations[index];
    if (!location) return;
    removeLocation(location.canonicalLocationId || location.id || location.slug);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-[#005ca8] h-16 flex items-center px-4 md:px-8 shadow-md">
      {/* Logo Section */}
      <button
        type="button"
        aria-label="Go to Property Listify home"
        className="mr-8 flex items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        onClick={() => setLocation('/')}
      >
        <span className="text-2xl font-bold tracking-tight text-white">Property Listify</span>
      </button>

      {/* Central Search Bar */}
      <div className="hidden md:flex flex-1 max-w-3xl mx-auto">
        <div className="flex w-full bg-white rounded-md h-10 items-center relative">
          {/* Buy/Rent Dropdown */}
          <div className="relative h-full min-w-[80px] border-r border-gray-200">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={isDropdownOpen}
              className="flex h-full w-full items-center px-3 text-left hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
              onClick={() => setIsDropdownOpen(open => !open)}
            >
              <span className="text-sm font-medium capitalize text-gray-700">
                {listingType === null ? 'Search' : listingType === 'sale' ? 'Buy' : 'Rent'}
              </span>
              <ChevronDown className="ml-1 h-4 w-4 text-gray-500" aria-hidden="true" />
            </button>

            {isDropdownOpen && (
              <div
                role="menu"
                className="absolute left-0 top-full z-50 mt-1 w-32 rounded-md border border-gray-100 bg-white py-1 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 focus-visible:bg-blue-50 focus-visible:outline-none"
                  onClick={() => {
                    setListingType('sale');
                    setIsDropdownOpen(false);
                  }}
                >
                  Buy
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 focus-visible:bg-blue-50 focus-visible:outline-none"
                  onClick={() => {
                    setListingType('rent');
                    setIsDropdownOpen(false);
                  }}
                >
                  Rent
                </button>
              </div>
            )}
          </div>

          {/* Chips & Input Container */}
          <div className="flex-1 flex items-center px-2 min-w-0 gap-2">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-[50%] flex-shrink-0">
              {defaultSearchArea && selectedLocations.length === 0 ? (
                <div
                  className="flex-shrink-0 flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full border border-blue-100 whitespace-nowrap"
                  aria-label={`${defaultSearchArea.label}, Property market area`}
                >
                  <span className="flex flex-col leading-tight">
                    <span>{defaultSearchArea.label}</span>
                    <span className="text-[10px] text-blue-500">Property market area</span>
                  </span>
                  {onClearSearchArea ? (
                    <button
                      type="button"
                      aria-label={`Clear ${defaultSearchArea.label} Search Area`}
                      onClick={event => {
                        event.stopPropagation();
                        onClearSearchArea();
                      }}
                    >
                      <X className="h-3 w-3 hover:text-blue-900" />
                    </button>
                  ) : null}
                </div>
              ) : null}
              {selectedLocations.map(loc => (
                <div
                  key={loc.canonicalLocationId || loc.id || loc.slug}
                  className="flex-shrink-0 flex items-center bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full border border-blue-100 whitespace-nowrap"
                >
                  <span>{loc.name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${loc.name}`}
                    className="ml-1 rounded-full p-0.5 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
                    onClick={() => removeLocation(loc.canonicalLocationId || loc.id || loc.slug)}
                  >
                    <X className="h-3 w-3 hover:text-blue-900" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex-1 min-w-[120px] relative">
              <LocationAutosuggest
                selectedLocations={selectedLocations as LocationNode[]}
                onRemove={removeLocationAtIndex}
                inputId={LISTING_NAVBAR_LOCATION_INPUT_IDS.desktop}
                placeholder={selectedLocations.length > 0 ? 'Add more...' : 'City, Suburb, or Area'}
                inputClassName="w-full py-2 text-sm outline-none text-gray-700 placeholder:text-gray-400 bg-transparent border-none h-full focus-visible:ring-0 shadow-none px-1"
                className="w-full h-full"
                showIcon={false}
                maxLocations={10}
                renderSelectedLocations={false}
                onSelect={handleLocationSelect}
              />
            </div>
          </div>

          {/* Icons */}
          <div className="flex items-center px-2 gap-2 flex-shrink-0">
            <div className="h-6 w-px bg-gray-200 mx-1"></div>
            <button
              type="button"
              aria-label={listingType ? 'Search properties' : 'Choose Buy or Rent first'}
              disabled={!listingType}
              className="rounded p-1 text-gray-600 transition-colors hover:text-gray-800 disabled:cursor-not-allowed disabled:text-gray-300"
              onClick={handleSearch}
            >
              <Search className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4 ml-auto">
        <Button
          variant="secondary"
          className="hidden md:flex bg-white hover:bg-gray-100 text-gray-900 font-medium text-sm h-9 px-4 gap-2"
          onClick={() => setLocation('/listings/create')}
        >
          Post property
          <Badge className="bg-green-700 hover:bg-green-800 text-[10px] px-1 py-0 h-4 rounded text-white border-0">
            FREE
          </Badge>
        </Button>
        <button
          type="button"
          aria-label={isAuthenticated ? 'Open account menu' : 'Open login and account menu'}
          className="relative rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          onClick={() => setLocation(isAuthenticated ? '/dashboard' : '/login')}
          title={isAuthenticated ? 'Account' : 'Sign In'}
        >
          <User className="h-6 w-6 text-white" aria-hidden="true" />
          {!isAuthenticated && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-[#005ca8]"></span>
          )}
        </button>

        <Button
          variant="ghost"
          className="hidden text-white hover:bg-white/10 hover:text-white md:inline-flex"
          disabled={!listingType}
          onClick={handleSearch}
        >
          {listingType ? 'Search' : 'Choose journey'}
        </Button>
      </div>

      {showMobileLocationSearch && (
        <div
          className="absolute left-0 right-0 top-16 border-t border-white/15 bg-[#005ca8] px-4 pb-3 md:hidden"
          data-testid="listing-navbar-mobile-location-search"
        >
          {selectedLocations.length > 0 && (
            <div
              className="scrollbar-hide flex gap-1.5 overflow-x-auto py-2"
              aria-label="Selected search locations"
            >
              {selectedLocations.map(location => (
                <span
                  key={location.canonicalLocationId || location.id || location.slug}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white"
                >
                  <span className="max-w-[180px] truncate">{location.name}</span>
                  <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/70"
                    aria-label={`Remove ${location.name}`}
                    onClick={() =>
                      removeLocation(location.canonicalLocationId || location.id || location.slug)
                    }
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className={`flex items-center gap-2 ${selectedLocations.length > 0 ? '' : 'pt-2'}`}>
            <LocationAutosuggest
              selectedLocations={selectedLocations as LocationNode[]}
              onRemove={removeLocationAtIndex}
              inputId={LISTING_NAVBAR_LOCATION_INPUT_IDS.mobile}
              placeholder="City, suburb, or area"
              inputClassName="!min-h-10 !rounded-xl !border-0 !bg-white !px-2 !py-0"
              className="min-w-0 flex-1"
              showIcon
              maxLocations={10}
              renderSelectedLocations={false}
              onSelect={handleLocationSelect}
            />
            <Button
              type="button"
              size="icon"
              aria-label={listingType ? 'Update property search' : 'Choose Buy or Rent first'}
              disabled={!listingType}
              className="h-10 w-10 shrink-0 rounded-xl bg-white text-[#005ca8] hover:bg-blue-50 disabled:bg-white/70 disabled:text-slate-400"
              onClick={handleSearch}
            >
              <Search className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
