import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Compass, Home, KeyRound, MapPin, X } from 'lucide-react';
import { useLocation, useSearch } from 'wouter';
import { LocationAutosuggest } from '@/components/LocationAutosuggest';
import { buildLocationDiscoveryPath } from '@/lib/locationDiscovery';
import { buildBuySearchUrl, buildPropertySearchUrl } from '@/lib/heroJourneySearch';
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

function locationNodeFromQuery(
  state: ReturnType<typeof resolveProvincialQueryState>,
  province: ProvincialComposerProps['province'],
): LocationNode | null {
  const canonical = parseCanonicalLocationId(state.locationId);
  const level =
    state.locationLevel || (state.suburbSlug ? 'suburb' : state.citySlug ? 'city' : 'province');
  if (!canonical && level !== 'province') return null;

  const deepestSlug =
    state.suburbSlug ||
    state.citySlug ||
    state.provinceSlug ||
    (canonical ? `${canonical.level}-${canonical.id}` : undefined);
  if (!deepestSlug) return null;

  const canonicalId =
    canonical?.level === 'province' || level === 'province'
      ? province.canonicalLocationId
      : state.locationId;
  return {
    id: canonicalId || `${level}:0`,
    canonicalLocationId: canonicalId,
    name: humanizeSlug(deepestSlug),
    slug: deepestSlug,
    type: level,
    provinceSlug: state.provinceSlug || province.slug,
    citySlug: state.citySlug,
  };
}

function journeyFromConfig(config: ProvincialConfig, id?: ProvincialJourneyId) {
  return config.supportedJourneys.find(journey => journey.id === id);
}

export function ProvincialComposer({
  config,
  province,
  marketLocations = [],
}: ProvincialComposerProps) {
  const [location, navigate] = useLocation();
  const search = useSearch();
  const [selectedLocation, setSelectedLocation] = useState<LocationNode | null>(null);
  const [locationError, setLocationError] = useState('');

  const state = useMemo(() => resolveProvincialQueryState(new URLSearchParams(search)), [search]);
  const requestedJourney = journeyFromConfig(config, state.journey);
  const activeJourney = requestedJourney?.state === 'active' ? requestedJourney : undefined;
  const selectedLocationFromQuery = useMemo(
    () => locationNodeFromQuery(state, province),
    [province, state],
  );

  useEffect(() => {
    setSelectedLocation(selectedLocationFromQuery);
  }, [selectedLocationFromQuery]);

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

  const selectLocation = (nextLocation: LocationNode) => {
    const canonical = parseCanonicalLocationId(nextLocation.canonicalLocationId || nextLocation.id);
    if (!canonical || canonical.level !== nextLocation.type) {
      setLocationError(
        'Choose a location from the Property Listify suggestions so we can preserve its identity.',
      );
      return;
    }

    const nextState = {
      locationId: nextLocation.canonicalLocationId || nextLocation.id,
      province: nextLocation.provinceSlug || province.slug,
      city:
        nextLocation.type === 'city' || nextLocation.type === 'suburb'
          ? nextLocation.citySlug || nextLocation.slug
          : undefined,
      suburb: nextLocation.type === 'suburb' ? nextLocation.slug : undefined,
    };
    setLocationError('');
    setSelectedLocation(nextLocation);
    updateQuery(nextState);
  };

  const clearLocation = () => {
    setSelectedLocation(null);
    setLocationError('');
    updateQuery({ locationId: undefined, city: undefined, suburb: undefined }, true);
  };

  const updateFilter = (key: string, value: string) => {
    updateQuery({ [key]: value === 'all' ? undefined : value }, true);
  };

  const provinceLocation: LocationNode = {
    id: province.canonicalLocationId,
    canonicalLocationId: province.canonicalLocationId,
    name: province.name,
    slug: province.slug,
    type: 'province',
    provinceSlug: province.slug,
  };

  const effectiveLocation = selectedLocation || provinceLocation;
  const hasCanonicalSelectedLocation = Boolean(
    parseCanonicalLocationId(effectiveLocation.canonicalLocationId || effectiveLocation.id),
  );

  const buildJourneyHref = (journeyId: ProvincialJourneyId, locationNode = effectiveLocation) => {
    if (journeyId === 'explore') {
      return buildLocationDiscoveryPath(locationNode) || `/${province.slug}`;
    }

    if (journeyId === 'buy') {
      return buildBuySearchUrl({
        selectedLocations: [locationNode],
        propertyType: state.filters.propertyType,
        minPrice: state.filters.minPrice,
        maxPrice: state.filters.maxPrice,
        minBedrooms: state.filters.minBedrooms,
        minBathrooms: state.filters.minBathrooms,
      });
    }

    if (journeyId === 'rent') {
      return buildPropertySearchUrl({
        transactionType: 'to-rent',
        selectedLocations: [locationNode],
        propertyType: state.filters.propertyType,
        minPrice: state.filters.minPrice,
        maxPrice: state.filters.maxPrice,
      });
    }

    if (journeyId === 'developments') {
      const params = new URLSearchParams({ province: province.slug });
      if (locationNode.type === 'city' || locationNode.type === 'suburb') {
        params.set('city', locationNode.citySlug || locationNode.slug);
      }
      if (locationNode.type === 'suburb') params.set('suburb', locationNode.slug);
      return `/new-developments?${params.toString()}`;
    }

    return undefined;
  };

  const continueJourney = () => {
    if (!activeJourney || activeJourney.state !== 'active') return;
    if (state.invalidLocationIdentity) {
      setLocationError(
        'That location link is inconsistent. Choose a canonical location to continue.',
      );
      return;
    }
    if (!hasCanonicalSelectedLocation) {
      setLocationError('Choose a supported location or keep the province selected.');
      return;
    }
    const href = buildJourneyHref(activeJourney.id);
    if (!href) return;
    navigate(href);
  };

  const budgets = activeJourney?.id === 'rent' ? RENT_BUDGETS : BUY_BUDGETS;
  const isTransactional = activeJourney?.id === 'buy' || activeJourney?.id === 'rent';
  const locationLabel = selectedLocation
    ? selectedLocation.type === 'province'
      ? selectedLocation.name
      : `${selectedLocation.name}, ${province.name}`
    : `Anywhere in ${province.name}`;

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
            {selectedLocation ? (
              <div className="provincial-location-chip">
                <span>{locationLabel}</span>
                <button
                  type="button"
                  aria-label={`Remove ${selectedLocation.name}`}
                  onClick={clearLocation}
                >
                  <X aria-hidden="true" size={15} />
                </button>
              </div>
            ) : (
              <LocationAutosuggest
                placeholder={`Search a city, suburb or area`}
                inputId="provincial-location-input"
                selectedLocations={[]}
                onSelect={selectLocation}
                inputAriaDescribedBy={locationError ? 'provincial-location-error' : undefined}
                className="provincial-location-autosuggest"
                inputClassName="provincial-location-input"
                showIcon={false}
              />
            )}
          </div>
          <p className="provincial-field__helper">
            {selectedLocation
              ? 'Canonical location preserved for your next journey.'
              : 'Or keep the whole province selected.'}
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
          disabled={!activeJourney}
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
            return (
              <button
                key={market.slug}
                type="button"
                onClick={() => {
                  const href =
                    activeJourney &&
                    activeJourney.state === 'active' &&
                    canonicalMarket?.canonicalLocationId
                      ? buildJourneyHref(activeJourney.id, marketLocation)
                      : `/${province.slug}/${market.slug}`;
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
