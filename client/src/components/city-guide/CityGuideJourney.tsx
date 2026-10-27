import { useEffect, useId, useState } from 'react';
import { Link } from 'wouter';
import {
  ArrowRight,
  Compass,
  Home,
  KeyRound,
  LandPlot,
  MapPin,
  Search,
  Users,
  X,
  BriefcaseBusiness,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import type { CityGuideContent } from '@shared/cityGuideContent';
import type { LocationNode } from '@/types/location';
import { cityGuideChoices, guidePlaceNode } from '@/lib/cityGuideDiscovery';
import {
  buildPropertySearchUrl,
  BUY_PROPERTY_TYPE_OPTIONS,
  RENT_PROPERTY_TYPE_OPTIONS,
} from '@/lib/heroJourneySearch';
import { buildConsumerJourneyUrl } from '@/lib/consumerJourneyRouter';
import { getPublicHeroJourney } from '@/lib/publicNavigation';

export function CitySuburbFinder({
  guide,
  citySlug,
  onSelect,
  label,
}: {
  guide: CityGuideContent;
  citySlug?: string;
  onSelect: (place: LocationNode) => void;
  label: string;
}) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 180);
    return () => clearTimeout(timer);
  }, [query]);
  const lookup = trpc.location.placeSuggestions.useQuery(
    { query: debounced, limit: 20 },
    { enabled: citySlug !== undefined && debounced.length >= 2, retry: false, staleTime: 600000 },
  );
  const pending = query.trim() !== debounced || lookup.isFetching;
  const local = cityGuideChoices(lookup.data || [], guide, citySlug);
  const separate = cityGuideChoices(lookup.data || [], guide).filter(
    place => place.factualLevel === 'city' && place.citySlug !== citySlug,
  );
  const groups = [
    { label: `Suburbs in ${guide.name}`, places: local },
    { label: `Separate places in ${guide.provinceName}`, places: separate },
  ].filter(group => group.places.length);
  const count = local.length + separate.length;
  return (
    <div
      className="city-suburb-finder"
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={event => {
        if (event.key === 'Escape') setOpen(false);
      }}
    >
      <label htmlFor={id}>{label}</label>
      <div className="city-suburb-input">
        <Search size={17} aria-hidden="true" />
        <input
          id={id}
          type="search"
          placeholder="Enter a suburb or place name"
          value={query}
          disabled={citySlug === undefined}
          onFocus={() => setOpen(true)}
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          maxLength={100}
          autoComplete="off"
        />
        <span className="sr-only" aria-live="polite">
          {query.trim().length >= 2 && !pending && !lookup.isError ? `${count} matching areas` : ''}
        </span>
      </div>
      {open && query.trim().length > 0 && (
        <div className="city-suburb-results">
          {query.trim().length < 2 ? (
            <p role="status">Enter at least two letters.</p>
          ) : pending ? (
            <p role="status">Searching suburbs…</p>
          ) : lookup.isError ? (
            <p role="alert">
              Suburb search is unavailable.{' '}
              <button type="button" onClick={() => void lookup.refetch()}>
                Try again
              </button>
            </p>
          ) : count ? (
            <>
              {groups.map(group => (
                <div key={group.label}>
                  <h4>{group.label}</h4>
                  <ul>
                    {group.places.map(place => (
                      <li key={place.canonicalLocationId}>
                        <button
                          type="button"
                          aria-label={`Select ${place.label} ${place.display.typeLabel} in ${place.cityName || place.display.contextLabel || guide.provinceName}`}
                          onClick={() => {
                            onSelect(guidePlaceNode(place));
                            setQuery('');
                          }}
                        >
                          <MapPin size={15} aria-hidden="true" />
                          <span>
                            <strong>{place.label}</strong>
                            <small>
                              {place.display.typeLabel} ·{' '}
                              {place.cityName || place.display.contextLabel || guide.provinceName}
                            </small>
                          </span>
                          <ArrowRight size={15} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          ) : (
            <p>
              No matching area found. Try a more specific name; your selected area has not changed.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
const journeys = [
  { id: 'buy', label: 'Buy', icon: Home, release: 'buy' },
  { id: 'rent', label: 'Rent', icon: KeyRound, release: 'rent' },
  { id: 'explore', label: 'Explore areas', icon: Compass, release: undefined },
  { id: 'land', label: 'Land & plots', icon: LandPlot, release: 'plot_land' },
  { id: 'commercial', label: 'Commercial', icon: BriefcaseBusiness, release: 'commercial' },
  { id: 'shared_living', label: 'Shared Living', icon: Users, release: 'shared_living' },
] as const;
type Journey = (typeof journeys)[number]['id'];
export function CityGuideJourney({
  guide,
  city,
}: {
  guide: CityGuideContent;
  city?: LocationNode;
}) {
  const [journey, setJourney] = useState<Journey>();
  const [place, setPlace] = useState<LocationNode>();
  const [type, setType] = useState('');
  const [budget, setBudget] = useState('');
  const validBudget = budget === '' || (Number.isSafeInteger(Number(budget)) && Number(budget) > 0);
  const href =
    place && journey && validBudget
      ? journey === 'buy' || journey === 'rent'
        ? buildPropertySearchUrl({
            transactionType: journey === 'buy' ? 'for-sale' : 'to-rent',
            selectedLocations: [place],
            propertyType: type,
            maxPrice: budget,
          })
        : journey === 'explore'
            ? undefined
            : buildConsumerJourneyUrl({
                intent: journey === 'land' ? 'buy' : 'rent',
                journey,
                selectedLocations: [place],
              })
      : undefined;
  const types = journey === 'rent' ? RENT_PROPERTY_TYPE_OPTIONS : BUY_PROPERTY_TYPE_OPTIONS;
  return (
    <section
      id="city-property-search"
      className="city-journey provincial-rail"
      aria-labelledby="city-journey-heading"
    >
      <div className="city-journey-heading">
        <h2 id="city-journey-heading">What would you like to explore?</h2>
        <span>{place ? `${place.name} selected` : 'Choose your next step'}</span>
      </div>
      <div className="city-journey-pills" role="group" aria-label="Property journey">
        {journeys.map(item => {
          const allowed = !item.release || getPublicHeroJourney(item.release).homepageEnabled;
          return item.id === 'explore' ? (
            <a href="#city-suburbs" key={item.id}>
              <item.icon size={15} aria-hidden="true" />
              {item.label}
            </a>
          ) : (
            <button
              type="button"
              key={item.id}
              aria-pressed={journey === item.id}
              disabled={!allowed}
              onClick={() => {
                setJourney(item.id);
                setType('');
                setBudget('');
              }}
            >
              <item.icon size={15} aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </div>
      <div
        className={`city-journey-fields ${journey === 'buy' || journey === 'rent' ? 'city-journey-fields--filters' : ''}`}
      >
        <div>
          <CitySuburbFinder
            guide={guide}
            citySlug={city?.slug}
            label={`Choose an area to explore`}
            onSelect={setPlace}
          />
          {place ? (
            <div className="city-selected-area">
              <MapPin size={13} aria-hidden="true" />
              {place.name}
              <button
                type="button"
                aria-label={`Remove ${place.name}`}
                onClick={() => setPlace(undefined)}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            city && (
              <button type="button" className="city-use-whole" onClick={() => setPlace(city)}>
                Or choose all {guide.name} areas
              </button>
            )
          )}
        </div>
        {(journey === 'buy' || journey === 'rent') && (
          <>
            <label className="city-field">
              Property type
              <select
                aria-label="Property type"
                value={type}
                onChange={e => setType(e.target.value)}
              >
                <option value="">Any type</option>
                {types.map(item => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="city-field">
              {journey === 'rent' ? 'Maximum monthly rent' : 'Maximum price'}
              <input
                type="number"
                min="1"
                step="1"
                value={budget}
                onChange={e => setBudget(e.target.value)}
                placeholder="Any budget"
              />
            </label>
          </>
        )}
        {href && !new URL(href, 'http://localhost').searchParams.has('searchError') ? (
          <Link href={href} className="city-search-action">
            {journey === 'buy'
              ? 'Search for sale'
              : journey === 'rent'
                ? 'Search rentals'
                : 'Continue'}
            <ArrowRight size={17} />
          </Link>
        ) : (
          <button type="button" className="city-search-action" disabled>
            {!validBudget ? 'Check budget' : journey ? 'Choose an area' : 'Choose a journey'}
            <ArrowRight size={17} />
          </button>
        )}
      </div>
    </section>
  );
}
