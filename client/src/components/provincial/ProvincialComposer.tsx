import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Compass, Home, KeyRound, MapPin } from 'lucide-react';
import { useLocation, useSearch } from 'wouter';
import { LocationAutosuggest } from '@/components/LocationAutosuggest';
import { buildLocationDiscoveryPath, hasCanonicalLocationIdentity } from '@/lib/locationDiscovery';
import { buildProvincialJourneyHref } from '@/lib/provincialSearchHandoff';
import type { LocationNode } from '@/types/location';
import {
  resolveProvincialQueryState,
  type ProvincialConfig,
  type ProvincialJourneyConfig,
  type ProvincialJourneyId,
} from '@shared/provincialDiscovery';
import { parseCanonicalLocationId } from '@shared/locationAuthority';

interface ProvincialComposerProps {
  config: ProvincialConfig;
  province: {
    id: number;
    canonicalLocationId: string;
    name: string;
    slug: string;
  };
  marketLocations?: readonly {
    name: string;
    slug: string;
    canonicalLocationId?: string | null;
  }[];
}

const EMPTY_MARKET_LOCATIONS: NonNullable<ProvincialComposerProps['marketLocations']> = [];

const JOURNEY_ICONS = {
  buy: Home,
  rent: KeyRound,
  developments: Compass,
  explore: MapPin,
  land: Compass,
  commercial: Compass,
  shared_living: Compass,
} satisfies Record<ProvincialJourneyId, typeof Home>;

const PROPERTY_TYPES = [
  { value: 'house', label: 'House' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'villa', label: 'Villa' },
  { value: 'cluster_home', label: 'Cluster home' },
  { value: 'farm', label: 'Farm' },
] as const;

const BUY_BUDGETS = [
  { value: '500000', label: 'R500k' },
  { value: '1000000', label: 'R1m' },
  { value: '2000000', label: 'R2m' },
  { value: '5000000', label: 'R5m' },
] as const;

const RENT_BUDGETS = [
  { value: '5000', label: 'R5k / month' },
  { value: '10000', label: 'R10k / month' },
  { value: '20000', label: 'R20k / month' },
] as const;

function humanizeSlug(value?: string) {
  return String(value || '')
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function locationNodeFromCanonicalId(
  canonicalLocationId: string,
  state: ReturnType<typeof resolveProvincialQueryState>,
  province: ProvincialComposerProps['province'],
  knownLocations: ReadonlyMap<string, LocationNode>,
): LocationNode | null {
  const canonical = parseCanonicalLocationId(canonicalLocationId);
  if (!canonical) return null;

  const knownLocation = knownLocations.get(canonicalLocationId);
  if (knownLocation) return knownLocation;

  const level = canonical.level;
  const slug =
    level === 'province'
      ? province.slug
      : level === 'city'
        ? state.citySlug || ''
        : state.suburbSlug || '';
  const name = slug ? humanizeSlug(slug) : `${humanizeSlug(level)} ${canonical.id}`;
  return {
    id: canonicalLocationId,
    canonicalLocationId,
    name,
    slug,
    type: level,
    provinceSlug: province.slug,
    citySlug: state.citySlug,
  };
}

function locationsFromQuery(
  state: ReturnType<typeof resolveProvincialQueryState>,
  province: ProvincialComposerProps['province'],
  knownLocations: ReadonlyMap<string, LocationNode>,
): LocationNode[] {
  const canonicalLocationIds = state.locationIds?.length
    ? state.locationIds
    : state.locationId
      ? [state.locationId]
      : [];

  return canonicalLocationIds
    .map(locationId => locationNodeFromCanonicalId(locationId, state, province, knownLocations))
    .filter((location): location is LocationNode => Boolean(location));
}

function journeyFromConfig(config: ProvincialConfig, id?: ProvincialJourneyId) {
  return config.supportedJourneys.find(journey => journey.id === id);
}

export function ProvincialComposer({
  config,
  province,
  marketLocations = EMPTY_MARKET_LOCATIONS,
}: ProvincialComposerProps) {
  const [location, navigate] = useLocation();
  const search = useSearch();
  const [selectedLocations, setSelectedLocations] = useState<LocationNode[]>([]);
  const [locationError, setLocationError] = useState('');
  const [locationMemory, setLocationMemory] = useState<Map<string, LocationNode>>(() => new Map());

  const provinceLocation = useMemo<LocationNode>(
    () => ({
      id: province.canonicalLocationId,
      canonicalLocationId: province.canonicalLocationId,
      name: province.name,
      slug: province.slug,
      type: 'province',
      provinceSlug: province.slug,
    }),
    [province],
  );
  const knownLocations = useMemo(() => {
    const locations = new Map<string, LocationNode>();
    marketLocations.forEach(market => {
      if (market.canonicalLocationId) {
        locations.set(market.canonicalLocationId, {
          id: market.canonicalLocationId,
          canonicalLocationId: market.canonicalLocationId,
          name: market.name,
          slug: market.slug,
          type: 'city',
          provinceSlug: province.slug,
          citySlug: market.slug,
        });
      }
    });
    return locations;
  }, [marketLocations, province.slug]);

  const state = useMemo(() => resolveProvincialQueryState(new URLSearchParams(search)), [search]);
  const requestedJourney = journeyFromConfig(config, state.journey);
  const activeJourney = requestedJourney?.state === 'active' ? requestedJourney : undefined;
  const hasLocationQuery = Boolean(state.locationId || state.locationIds?.length);
  const selectedLocationsFromQuery = useMemo(
    () =>
      locationsFromQuery(
        state,
        province,
        new Map([...knownLocations, ...locationMemory.entries()]),
      ),
    [knownLocations, locationMemory, province, state],
  );

  useEffect(() => {
    if (!hasLocationQuery) return;

    setLocationMemory(previous => {
      const next = new Map(previous);
      let changed = false;
      selectedLocationsFromQuery.forEach(selected => {
        const canonicalId = selected.canonicalLocationId || selected.id;
        if (next.get(canonicalId) !== selected) {
          next.set(canonicalId, selected);
          changed = true;
        }
      });
      return changed ? next : previous;
    });
    setSelectedLocations(selectedLocationsFromQuery);
  }, [hasLocationQuery, selectedLocationsFromQuery]);

  const updateQuery = (updates: Record<string, string | undefined>, replace = false) => {
    const currentSearch = typeof window !== 'undefined' ? window.location.search : search;
    const next = new URLSearchParams(currentSearch);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, value);
    });
    const query = next.toString();
    const path = location + (query ? `?${query}` : '');
    navigate(path, { replace });
  };

  const selectJourney = (journey: ProvincialJourneyConfig) => {
    if (journey.state !== 'active') return;
    setLocationError('');
    updateQuery({ journey: journey.id });
  };

  const writeLocationQuery = (nextLocations: readonly LocationNode[], replace = false) => {
    const currentSearch = typeof window !== 'undefined' ? window.location.search : search;
    const next = new URLSearchParams(currentSearch);
    next.delete('locationId');
    next.delete('locationIds');
    next.delete('city');
    next.delete('suburb');

    if (nextLocations.length === 1) {
      const [selected] = nextLocations;
      const canonicalLocationId = selected.canonicalLocationId || selected.id;
      next.set('locationId', canonicalLocationId);
      next.set('province', selected.provinceSlug || province.slug);
      if (selected.type === 'city' || selected.type === 'suburb') {
        next.set('city', selected.citySlug || selected.slug);
      }
      if (selected.type === 'suburb') next.set('suburb', selected.slug);
    } else if (nextLocations.length > 1) {
      next.set('province', province.slug);
      nextLocations.forEach(selected => {
        next.append('locationIds', selected.canonicalLocationId || selected.id);
      });
    }

    const query = next.toString();
    navigate(`${location}${query ? `?${query}` : ''}`, { replace });
  };

  const selectLocation = (nextLocation: LocationNode) => {
    const canonical = parseCanonicalLocationId(nextLocation.canonicalLocationId || nextLocation.id);
    if (!canonical || canonical.level !== nextLocation.type) {
      setLocationError(
        'Choose a location from the Property Listify suggestions so we can preserve its identity.',
      );
      return;
    }

    const selectedProvince = String(nextLocation.provinceSlug || '')
      .trim()
      .toLowerCase();
    if (
      (nextLocation.type === 'province' &&
        (nextLocation.canonicalLocationId || nextLocation.id) !== province.canonicalLocationId) ||
      (nextLocation.type !== 'province' && selectedProvince && selectedProvince !== province.slug)
    ) {
      setLocationError(`Choose a location within ${province.name}.`);
      return;
    }

    const existingNonProvince = selectedLocations.filter(selected => selected.type !== 'province');
    if (
      nextLocation.type !== 'province' &&
      existingNonProvince.some(selected => selected.type !== nextLocation.type)
    ) {
      setLocationError('Choose locations at the same level so the explicit OR stays precise.');
      return;
    }

    const nextSelection =
      nextLocation.type === 'province'
        ? [nextLocation]
        : [...existingNonProvince, nextLocation].filter(
            (selected, index, locations) =>
              locations.findIndex(
                candidate =>
                  (candidate.canonicalLocationId || candidate.id) ===
                  (selected.canonicalLocationId || selected.id),
              ) === index,
          );

    if (nextSelection.length > 10) {
      setLocationError('Choose up to ten locations in one deliberate OR search.');
      return;
    }

    nextSelection.forEach(selected => {
      setLocationMemory(previous => {
        const next = new Map(previous);
        const canonicalId = selected.canonicalLocationId || selected.id;
        next.set(canonicalId, selected);
        return next;
      });
    });
    setLocationError('');
    setSelectedLocations(nextSelection);
    writeLocationQuery(nextSelection);
  };

  const removeLocation = (index: number) => {
    const nextSelection = selectedLocations.filter((_, locationIndex) => locationIndex !== index);
    setSelectedLocations(nextSelection);
    setLocationError('');
    writeLocationQuery(nextSelection, true);
  };

  const updateFilter = (key: string, value: string) => {
    updateQuery({ [key]: value === 'all' ? undefined : value }, true);
  };

  const continueJourney = () => {
    if (!activeJourney || activeJourney.state !== 'active') return;
    if (state.invalidLocationIdentity) {
      setLocationError(
        'That location link is inconsistent. Choose a canonical location to continue.',
      );
      return;
    }
    const effectiveLocations = selectedLocations.length ? selectedLocations : [provinceLocation];
    if (!effectiveLocations.every(locationNode => hasCanonicalLocationIdentity(locationNode))) {
      setLocationError('Choose a supported location or keep the province selected.');
      return;
    }
    if (activeJourney.id === 'explore' && effectiveLocations.length > 1) {
      setLocationError('Choose one location to explore, or select Buy or Rent for an OR search.');
      return;
    }
    const href = buildProvincialJourneyHref({
      journey: activeJourney.id,
      province: provinceLocation,
      selectedLocations,
      filters: {
        propertyType: state.filters.propertyType,
        maxPrice: state.filters.maxPrice,
      },
    });
    if (!href) return;
    navigate(href);
  };

  const budgets = activeJourney?.id === 'rent' ? RENT_BUDGETS : BUY_BUDGETS;
  const isTransactional = activeJourney?.id === 'buy' || activeJourney?.id === 'rent';
  const canContinue =
    Boolean(activeJourney) && !(activeJourney?.id === 'explore' && selectedLocations.length > 1);
  const locationHelper =
    selectedLocations.length > 1
      ? 'Explicit OR: these locations stay separate in the results.'
      : selectedLocations.length === 1
        ? 'Canonical location preserved for your next journey.'
        : 'Or keep the whole province selected.';

  return (
    <section className="provincial-composer" aria-labelledby="provincial-composer-title">
      <div className="provincial-composer__topline">
        <div>
          <p className="provincial-eyebrow">Choose your next move</p>
          <h2 id="provincial-composer-title">Start with intent, then refine the place.</h2>
        </div>
        {activeJourney ? (
          <span className="provincial-composer__state" data-testid="active-journey-state">
            <Check aria-hidden="true" size={15} /> {activeJourney.label} selected
          </span>
        ) : requestedJourney?.state === 'unavailable' ? (
          <span className="provincial-composer__hint">This journey is not active yet</span>
        ) : state.unsupportedJourney ? (
          <span className="provincial-composer__hint">Choose an available journey below</span>
        ) : (
          <span className="provincial-composer__hint">No journey selected yet</span>
        )}
      </div>

      <div className="provincial-journeys" role="tablist" aria-label="Property journeys">
        {config.supportedJourneys.map(journey => {
          const Icon = JOURNEY_ICONS[journey.id];
          const isActive = activeJourney?.id === journey.id && journey.state === 'active';
          const unavailable = journey.state !== 'active';
          return (
            <button
              key={`${journey.id}-${journey.label}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-disabled={unavailable}
              disabled={unavailable}
              title={unavailable ? journey.unavailableReason : journey.description}
              className={`provincial-journey ${isActive ? 'is-active' : ''} ${unavailable ? 'is-unavailable' : ''}`}
              onClick={() => selectJourney(journey)}
            >
              <span className="provincial-journey__icon">
                <Icon aria-hidden="true" size={17} />
              </span>
              <span>
                <strong>{journey.label}</strong>
                <small>{unavailable ? 'Coming later' : journey.shortLabel}</small>
              </span>
            </button>
          );
        })}
      </div>

      <div className="provincial-composer__fields">
        <div className="provincial-field provincial-field--location">
          <label htmlFor="provincial-location-input">Where in {province.name}?</label>
          <div className="provincial-location-control">
            <MapPin aria-hidden="true" size={18} />
            <LocationAutosuggest
              placeholder={`Search a city, suburb or area`}
              inputId="provincial-location-input"
              selectedLocations={selectedLocations}
              onSelect={selectLocation}
              onRemove={removeLocation}
              maxLocations={10}
              inputAriaDescribedBy={locationError ? 'provincial-location-error' : undefined}
              className="provincial-location-autosuggest"
              inputClassName="provincial-location-input"
              showIcon={false}
            />
          </div>
          <p className="provincial-field__helper" data-testid="provincial-location-helper">
            {locationHelper}
          </p>
          {locationError && (
            <p id="provincial-location-error" className="provincial-field__error" role="alert">
              {locationError}
            </p>
          )}
        </div>

        <div className="provincial-field">
          <label htmlFor="provincial-property-type">Property type</label>
          <div className="provincial-select-wrap">
            <select
              id="provincial-property-type"
              value={state.filters.propertyType || 'all'}
              disabled={!isTransactional}
              onChange={event => updateFilter('propertyType', event.target.value)}
            >
              <option value="all">Any type</option>
              {PROPERTY_TYPES.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" size={16} />
          </div>
          <p className="provincial-field__helper">Optional refinement</p>
        </div>

        <div className="provincial-field">
          <label htmlFor="provincial-budget">Budget</label>
          <div className="provincial-select-wrap">
            <select
              id="provincial-budget"
              value={state.filters.maxPrice?.toString() || 'all'}
              disabled={!isTransactional}
              onChange={event => updateFilter('maxPrice', event.target.value)}
            >
              <option value="all">Any budget</option>
              {budgets.map(option => (
                <option key={option.value} value={option.value}>
                  Up to {option.label}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" size={16} />
          </div>
          <p className="provincial-field__helper">Optional refinement</p>
        </div>

        <button
          type="button"
          className="provincial-composer__cta"
          disabled={!canContinue}
          onClick={continueJourney}
          data-testid="provincial-primary-cta"
        >
          <span>{activeJourney ? activeJourney.ctaLabel : 'Choose a journey above'}</span>
          <ArrowRight aria-hidden="true" size={18} />
        </button>
      </div>

      <div className="provincial-composer__footer">
        <span>Popular in {province.name}</span>
        <div className="provincial-quick-links">
          {config.majorMarkets.slice(0, 4).map(market => {
            const canonicalMarket = marketLocations.find(
              candidate => candidate.slug === market.slug,
            );
            const marketLocation: LocationNode = {
              id: canonicalMarket?.canonicalLocationId || `city:0`,
              canonicalLocationId: canonicalMarket?.canonicalLocationId || undefined,
              name: market.name,
              slug: market.slug,
              type: 'city',
              provinceSlug: province.slug,
            };
            const hasCanonicalMarket = Boolean(canonicalMarket?.canonicalLocationId);
            return (
              <button
                key={market.slug}
                type="button"
                disabled={!hasCanonicalMarket}
                onClick={() => {
                  if (!hasCanonicalMarket) return;
                  const href = activeJourney
                    ? buildProvincialJourneyHref({
                        journey: activeJourney.id,
                        province: provinceLocation,
                        selectedLocations: [marketLocation],
                        filters: {
                          propertyType: state.filters.propertyType,
                          maxPrice: state.filters.maxPrice,
                        },
                      })
                    : buildLocationDiscoveryPath(marketLocation);
                  if (href) navigate(href);
                }}
              >
                {market.name}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
