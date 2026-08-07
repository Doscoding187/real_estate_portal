import { Button } from './ui/button';
import { Search, User, ChevronDown, X } from 'lucide-react';
import { LocationAutosuggest } from './LocationAutosuggest';
import { Badge } from './ui/badge';
import { useLocation, useSearch } from 'wouter';
import { useEffect, useMemo, useState } from 'react';
import { buildPropertySearchUrl } from '@/lib/heroJourneySearch';
import { getListingTypeForPath } from '@/lib/searchNavigation';
import { createCanonicalSearchLocation } from '@/lib/geographySearchHandoff';
import type { LocationNode } from '@/types/location';
import { useAuth } from '@/_core/hooks/useAuth';

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

    const url = buildPropertySearchUrl({
      transactionType: listingType === 'rent' ? 'to-rent' : 'for-sale',
      selectedLocations: selectedLocations as LocationNode[],
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
      setLocation(
        buildPropertySearchUrl({
          transactionType: listingType === 'rent' ? 'to-rent' : 'for-sale',
          selectedLocations: nextLocations as LocationNode[],
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
      <div className="flex items-center gap-2 cursor-pointer mr-8" onClick={() => setLocation('/')}>
        <h1 className="text-2xl font-bold text-white tracking-tight">Property Listify</h1>
      </div>

      {/* Central Search Bar */}
      <div className="hidden md:flex flex-1 max-w-3xl mx-auto">
        <div className="flex w-full bg-white rounded-md h-10 items-center relative">
          {/* Buy/Rent Dropdown */}
          <div
            className="relative flex items-center px-3 border-r border-gray-200 cursor-pointer hover:bg-gray-50 h-full min-w-[80px]"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <span className="text-sm text-gray-700 font-medium capitalize">
              {listingType === null ? 'Search' : listingType === 'sale' ? 'Buy' : 'Rent'}
            </span>
            <ChevronDown className="h-4 w-4 ml-1 text-gray-500" />

            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-32 bg-white rounded-md shadow-lg py-1 border border-gray-100 z-50">
                <div
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer"
                  onClick={e => {
                    e.stopPropagation();
                    setListingType('sale');
                    setIsDropdownOpen(false);
                  }}
                >
                  Buy
                </div>
                <div
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer"
                  onClick={e => {
                    e.stopPropagation();
                    setListingType('rent');
                    setIsDropdownOpen(false);
                  }}
                >
                  Rent
                </div>
              </div>
            )}
          </div>

          {/* Chips & Input Container */}
          <div className="flex-1 flex items-center px-2 min-w-0 gap-2">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-[50%] flex-shrink-0">
              {selectedLocations.map(loc => (
                <div
                  key={loc.canonicalLocationId || loc.id || loc.slug}
                  className="flex-shrink-0 flex items-center bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full border border-blue-100 whitespace-nowrap"
                >
                  <span>{loc.name}</span>
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer hover:text-blue-900"
                    onClick={() => removeLocation(loc.canonicalLocationId || loc.id || loc.slug)}
                  />
                </div>
              ))}
            </div>

            <div className="flex-1 min-w-[120px] relative">
              <LocationAutosuggest
                selectedLocations={selectedLocations as LocationNode[]}
                onRemove={removeLocationAtIndex}
                inputId="listing-navbar-location-input"
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
        <div
          className="relative cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setLocation(isAuthenticated ? '/dashboard' : '/login')}
          title={isAuthenticated ? 'Account' : 'Sign In'}
        >
          <User className="h-6 w-6 text-white" />
          {!isAuthenticated && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-[#005ca8]"></span>
          )}
        </div>

        <Button
          variant="ghost"
          className="hidden text-white hover:bg-white/10 hover:text-white md:inline-flex"
          disabled={!listingType}
          onClick={handleSearch}
        >
          {listingType ? 'Search' : 'Choose journey'}
        </Button>
      </div>
    </header>
  );
}
