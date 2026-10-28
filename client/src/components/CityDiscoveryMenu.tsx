import { ChevronRight, MapPin } from 'lucide-react';
import { Link } from 'wouter';

import { LocationAutosuggest } from '@/components/LocationAutosuggest';
import { buildLocationDiscoveryPath } from '@/lib/locationDiscovery';
import { PUBLIC_CITY_ENTRY } from '@/lib/publicNavigation';
import type { LocationNode } from '@/types/location';

type CityDiscoveryMenuProps = {
  onNavigate: (href: string) => void;
};

/** A location menu can navigate only with a path returned by the Place projection. */
export function locationHref(location: LocationNode): string {
  return buildLocationDiscoveryPath(location) ?? PUBLIC_CITY_ENTRY.href;
}

export function CityDiscoveryMenu({ onNavigate }: CityDiscoveryMenuProps) {
  return (
    <div className="public-navbar__city-panel">
      <div className="public-navbar__city-grid">
        <section aria-label="Find a place" className="public-navbar__city-column">
          <h2 className="public-navbar__section-heading">Find a place</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Search admitted cities, towns, suburbs, and localities.
          </p>
          <LocationAutosuggest
            placeholder="Search South African places"
            onSelect={location => onNavigate(locationHref(location))}
          />
        </section>

        <aside className="public-navbar__city-discovery">
          <div className="public-navbar__city-summary">
            <p className="public-navbar__menu-kicker">Place Authority</p>
            <h2 className="public-navbar__city-title">Browse South Africa</h2>
            <p className="public-navbar__city-count-summary">
              Open the national place catalogue and choose a canonical place.
            </p>
          </div>
          <div className="public-navbar__city-actions">
            <Link
              href={PUBLIC_CITY_ENTRY.href}
              onClick={() => onNavigate(PUBLIC_CITY_ENTRY.href)}
              className="public-navbar__city-primary-action"
            >
              Browse all locations
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
            <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
          </div>
        </aside>
      </div>
    </div>
  );
}
