import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, MapPin } from 'lucide-react';
import { Link } from 'wouter';

import { LocationAutosuggest } from '@/components/LocationAutosuggest';
import { resolveLocationMenuCities, type NavLocationLink } from '@/lib/locationDataAdapter';
import { trpc } from '@/lib/trpc';
import { PUBLIC_CITY_ENTRY } from '@/lib/publicNavigation';

type LocationSelection = {
  citySlug?: string;
  name?: string;
  provinceSlug?: string;
  slug?: string;
  type?: string;
};

type CityDiscoveryMenuProps = {
  onNavigate: (href: string) => void;
};

const COUNT_FORMATTER = new Intl.NumberFormat('en-ZA');

function formatListingCount(count: unknown): string | null {
  if (count === undefined || count === null || count === '') return null;
  const value = Number(count);
  return Number.isFinite(value) && value >= 0 ? COUNT_FORMATTER.format(value) : null;
}

function listingCountLabel(count: unknown): string {
  const formatted = formatListingCount(count);
  if (formatted === null) return 'Live listing count unavailable';
  if (Number(count) === 0) return 'No active listings';
  return `${formatted} active listing${Number(count) === 1 ? '' : 's'}`;
}

function locationHref(location: LocationSelection): string {
  if (location.type === 'suburb' && location.provinceSlug && location.citySlug && location.slug) {
    return `/${location.provinceSlug}/${location.citySlug}/${location.slug}`;
  }
  if (location.type === 'city' && location.provinceSlug && (location.slug || location.citySlug)) {
    return `/${location.provinceSlug}/${location.slug || location.citySlug}`;
  }
  return PUBLIC_CITY_ENTRY.href;
}

function CityLink({
  city,
  active,
  onActivate,
  onNavigate,
}: {
  city: NavLocationLink;
  active: boolean;
  onActivate: () => void;
  onNavigate: (href: string) => void;
}) {
  return (
    <Link
      href={city.href}
      onClick={() => onNavigate(city.href)}
      onMouseEnter={onActivate}
      onFocus={onActivate}
      className="public-navbar__city-link"
      data-active={active}
      aria-current={active ? 'true' : undefined}
    >
      <span className="public-navbar__city-link-main">
        <MapPin className="size-4" aria-hidden="true" />
        <span>{city.label}</span>
      </span>
    </Link>
  );
}

export function CityDiscoveryMenu({ onNavigate }: CityDiscoveryMenuProps) {
  const popularCitiesQuery = trpc.locationPages.getPopularCities.useQuery(
    { limit: 6 },
    {
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      retry: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  );
  const cityResolution = useMemo(
    () =>
      resolveLocationMenuCities({
        popularCities: popularCitiesQuery.data,
        limit: 6,
      }),
    [popularCitiesQuery.data],
  );
  const { cities } = cityResolution;
  const [activeCityHref, setActiveCityHref] = useState<string | null>(null);
  const [activeSuburbSlug, setActiveSuburbSlug] = useState<string | null>(null);
  const activeCity = popularCitiesQuery.isLoading
    ? undefined
    : (cities.find(city => city.href === activeCityHref) ?? cities[0]);

  useEffect(() => {
    if (activeCity && activeCity.href !== activeCityHref) {
      setActiveCityHref(activeCity.href);
      setActiveSuburbSlug(null);
    }
  }, [activeCity, activeCityHref]);

  const cityDataQuery = trpc.locationPages.getCityData.useQuery(
    { provinceSlug: activeCity?.provinceSlug ?? '', citySlug: activeCity?.citySlug ?? '' },
    {
      enabled: Boolean(activeCity?.provinceSlug && activeCity?.citySlug),
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      retry: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  );
  const cityData = cityDataQuery.data;
  const city = cityData?.city;
  const suburbs = cityData?.suburbs ?? [];
  const activeSuburb = suburbs.find(suburb => suburb.slug === activeSuburbSlug);
  const cityName = city?.name ?? activeCity?.label ?? 'Choose a location';
  const cityHref = activeCity?.href ?? PUBLIC_CITY_ENTRY.href;
  const cityCount = cityData?.stats?.totalListings;
  const cityColumnLabel = cityResolution.heading;
  const areaColumnLabel = activeCity ? `Areas in ${cityName}` : 'Areas and suburbs';

  const activateCity = (cityLink: NavLocationLink) => {
    if (cityLink.href === activeCityHref) return;
    setActiveCityHref(cityLink.href);
    setActiveSuburbSlug(null);
  };

  const suburbHref = (suburb: { slug?: string }) =>
    activeCity?.provinceSlug && activeCity.citySlug && suburb.slug
      ? `/${activeCity.provinceSlug}/${activeCity.citySlug}/${suburb.slug}`
      : cityHref;

  return (
    <div className="public-navbar__city-panel">
      <div className="public-navbar__city-grid">
        <section aria-label={cityColumnLabel} className="public-navbar__city-column">
          <h2 className="public-navbar__section-heading">{cityColumnLabel}</h2>
          <div className="public-navbar__menu-section-list" aria-live="polite">
            {popularCitiesQuery.isLoading ? (
              Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="public-navbar__city-skeleton" aria-hidden="true" />
              ))
            ) : cities.length > 0 ? (
              cities.map(cityLink => (
                <CityLink
                  key={cityLink.href}
                  city={cityLink}
                  active={cityLink.href === activeCity?.href}
                  onActivate={() => activateCity(cityLink)}
                  onNavigate={onNavigate}
                />
              ))
            ) : (
              <>
                <p className="public-navbar__city-empty">No featured cities are available yet.</p>
                <p className="public-navbar__city-status">Search for your city, suburb or area.</p>
              </>
            )}
          </div>
        </section>

        <section aria-label={areaColumnLabel} className="public-navbar__city-column">
          <h2 className="public-navbar__section-heading">{areaColumnLabel}</h2>
          <div className="public-navbar__menu-section-list" aria-live="polite">
            {!activeCity ? (
              <p className="public-navbar__city-empty">
                Choose a city to see its suburbs and areas.
              </p>
            ) : cityDataQuery.isLoading ? (
              Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="public-navbar__city-skeleton" aria-hidden="true" />
              ))
            ) : suburbs.length > 0 ? (
              suburbs.slice(0, 6).map(suburb => {
                const href = suburbHref(suburb);
                const active = suburb.slug === activeSuburbSlug;
                return (
                  <Link
                    key={suburb.slug ?? suburb.name}
                    href={href}
                    onClick={() => onNavigate(href)}
                    onMouseEnter={() => setActiveSuburbSlug(suburb.slug ?? null)}
                    onFocus={() => setActiveSuburbSlug(suburb.slug ?? null)}
                    className="public-navbar__city-link"
                    data-active={active}
                    aria-current={active ? 'true' : undefined}
                  >
                    <span className="public-navbar__city-link-main">
                      <MapPin className="size-4" aria-hidden="true" />
                      <span>{suburb.name}</span>
                    </span>
                  </Link>
                );
              })
            ) : cityDataQuery.isError ? (
              <p className="public-navbar__city-empty">Unable to load areas right now.</p>
            ) : (
              <p className="public-navbar__city-empty">
                No active areas are available for this city yet.
              </p>
            )}
          </div>
        </section>

        <aside className="public-navbar__city-discovery">
          <div className="public-navbar__city-summary">
            <p className="public-navbar__menu-kicker">Selected location</p>
            <h2 className="public-navbar__city-title">{activeSuburb?.name ?? cityName}</h2>
            {activeSuburb ? <p className="public-navbar__city-parent">{cityName}</p> : null}
            <p className="public-navbar__city-count-summary">
              {activeCity
                ? activeSuburb
                  ? listingCountLabel(activeSuburb.listingCount)
                  : listingCountLabel(cityCount)
                : 'Choose a city to see live inventory'}
            </p>
          </div>

          <div className="public-navbar__city-search-block">
            <p className="public-navbar__city-search-label">Search another location</p>
            <LocationAutosuggest
              placeholder="Search a city, suburb, or area"
              onSelect={location => onNavigate(locationHref(location))}
            />
          </div>

          <div className="public-navbar__city-action-divider" aria-hidden="true">
            <span>or</span>
          </div>

          <div className="public-navbar__city-actions">
            {activeCity ? (
              <>
                <Link
                  href={activeSuburb ? suburbHref(activeSuburb) : cityHref}
                  onClick={() => onNavigate(activeSuburb ? suburbHref(activeSuburb) : cityHref)}
                  className="public-navbar__city-primary-action"
                >
                  View all properties in {activeSuburb?.name ?? cityName}
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Link>
                <Link
                  href={PUBLIC_CITY_ENTRY.href}
                  onClick={() => onNavigate(PUBLIC_CITY_ENTRY.href)}
                  className="public-navbar__city-secondary-action"
                >
                  Browse all locations
                </Link>
              </>
            ) : (
              <Link
                href={PUBLIC_CITY_ENTRY.href}
                onClick={() => onNavigate(PUBLIC_CITY_ENTRY.href)}
                className="public-navbar__city-primary-action"
              >
                Browse all locations
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
