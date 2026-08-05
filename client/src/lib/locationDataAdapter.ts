export type NavLocationType =
  | 'province'
  | 'city'
  | 'suburb'
  | 'metro'
  | 'municipality'
  | 'township'
  | 'town'
  | 'estate'
  | 'development';

export interface NavLocationLink {
  label: string;
  href: string;
  provinceSlug: string;
  citySlug?: string;
  suburbSlug?: string;
  listingCount?: number;
  type: NavLocationType;
}

export interface CityToNavLinkOptions {
  transactionType?: 'sale' | 'rent' | 'discovery';
}

export interface PopularCitiesToNavLinksOptions extends CityToNavLinkOptions {
  limit?: number;
}

function transactionRoot(transactionType: 'sale' | 'rent'): string {
  return transactionType === 'rent' ? '/property-to-rent' : '/property-for-sale';
}

function neutralLocationPath(provinceSlug: string, citySlug: string): string {
  return `/${provinceSlug}/${citySlug}`;
}

/**
 * Static safety fallback only.
 *
 * These links preserve a non-empty nav if dynamic location data is unavailable.
 * They are not the recommendation/ranking algorithm and should not be treated
 * as the final source of truth for popular or trending locations.
 *
 * Real ranking belongs in the future Search Discovery Engine API, using signals
 * like active inventory, search popularity, trend momentum, user intent,
 * proximity, and recent user behaviour.
 */
export const FALLBACK_CITY_LINKS: NavLocationLink[] = [
  {
    label: 'Johannesburg',
    href: '/gauteng/johannesburg',
    provinceSlug: 'gauteng',
    citySlug: 'johannesburg',
    listingCount: undefined,
    type: 'city',
  },
  {
    label: 'Cape Town',
    href: '/property-to-rent?city=cape-town&province=western-cape',
    provinceSlug: 'western-cape',
    citySlug: 'cape-town',
    listingCount: undefined,
    type: 'city',
  },
  {
    label: 'Kimberley',
    href: '/northern-cape/kimberley',
    provinceSlug: 'northern-cape',
    citySlug: 'kimberley',
    listingCount: undefined,
    type: 'city',
  },
  {
    label: 'Durban',
    href: '/kwazulu-natal/durban',
    provinceSlug: 'kwazulu-natal',
    citySlug: 'durban',
    listingCount: undefined,
    type: 'city',
  },
  {
    label: 'Gqeberha',
    href: '/eastern-cape/gqeberha',
    provinceSlug: 'eastern-cape',
    citySlug: 'gqeberha',
    listingCount: undefined,
    type: 'city',
  },
  {
    label: 'Bloemfontein',
    href: '/free-state/bloemfontein',
    provinceSlug: 'free-state',
    citySlug: 'bloemfontein',
    listingCount: undefined,
    type: 'city',
  },
  {
    label: 'Polokwane',
    href: '/limpopo/polokwane',
    provinceSlug: 'limpopo',
    citySlug: 'polokwane',
    listingCount: undefined,
    type: 'city',
  },
  {
    label: 'Mbombela',
    href: '/mpumalanga/mbombela',
    provinceSlug: 'mpumalanga',
    citySlug: 'mbombela',
    listingCount: undefined,
    type: 'city',
  },
  {
    label: 'Mahikeng',
    href: '/north-west/mahikeng',
    provinceSlug: 'north-west',
    citySlug: 'mahikeng',
    listingCount: undefined,
    type: 'city',
  },
  {
    label: 'Pretoria',
    href: '/gauteng/pretoria',
    provinceSlug: 'gauteng',
    citySlug: 'pretoria',
    listingCount: undefined,
    type: 'city',
  },
  {
    label: 'Port Elizabeth',
    href: '/eastern-cape/port-elizabeth',
    provinceSlug: 'eastern-cape',
    citySlug: 'port-elizabeth',
    listingCount: undefined,
    type: 'city',
  },
  {
    label: 'Sandton',
    href: '/gauteng/johannesburg/sandton',
    provinceSlug: 'gauteng',
    citySlug: 'johannesburg',
    suburbSlug: 'sandton',
    listingCount: undefined,
    type: 'suburb',
  },
  {
    label: 'Cape Town',
    href: '/western-cape/cape-town',
    provinceSlug: 'western-cape',
    citySlug: 'cape-town',
    listingCount: undefined,
    type: 'city',
  },
];

function resolveCityName(raw: Record<string, unknown>): string | null {
  const name =
    typeof raw.name === 'string' && raw.name.trim()
      ? raw.name.trim()
      : typeof raw.cityName === 'string' && raw.cityName.trim()
        ? raw.cityName.trim()
        : null;
  return name;
}

function resolveCitySlug(raw: Record<string, unknown>): string | null {
  const slug =
    typeof raw.slug === 'string' && raw.slug.trim()
      ? raw.slug.trim()
      : typeof raw.citySlug === 'string' && raw.citySlug.trim()
        ? raw.citySlug.trim()
        : null;
  return slug;
}

function resolveProvinceSlug(raw: Record<string, unknown>): string | null {
  const slug =
    typeof raw.provinceSlug === 'string' && raw.provinceSlug.trim()
      ? raw.provinceSlug.trim()
      : null;
  return slug;
}

function resolveListingCount(raw: Record<string, unknown>): number | undefined {
  const count = raw.listingCount ?? raw.propertyCount ?? raw.activeListings ?? undefined;
  if (count === undefined || count === null) return undefined;
  const num = Number(count);
  return Number.isFinite(num) && num >= 0 ? num : undefined;
}

export function cityToNavLink(
  city: unknown,
  options?: CityToNavLinkOptions,
): NavLocationLink | null {
  if (!city || typeof city !== 'object') return null;

  const raw = city as Record<string, unknown>;
  const name = resolveCityName(raw);
  const slug = resolveCitySlug(raw);
  const provinceSlug = resolveProvinceSlug(raw);
  const listingCount = resolveListingCount(raw);

  if (!name || !slug) return null;

  if (!provinceSlug) return null;

  const txType = options?.transactionType ?? 'discovery';
  const href =
    txType === 'discovery'
      ? neutralLocationPath(provinceSlug, slug)
      : (() => {
          const params = new URLSearchParams({
            city: slug,
            province: provinceSlug,
          });
          if (typeof raw.id === 'number' && Number.isInteger(raw.id)) {
            params.set('locationId', `city:${raw.id}`);
          }
          return `${transactionRoot(txType)}?${params.toString()}`;
        })();

  return {
    label: name,
    href,
    provinceSlug,
    citySlug: slug,
    listingCount,
    type: 'city',
  };
}

export function popularCitiesToNavLinks(
  cities: unknown,
  options?: PopularCitiesToNavLinksOptions,
): NavLocationLink[] {
  if (!Array.isArray(cities)) return [];

  const seen = new Set<string>();
  const limit = options?.limit ?? 9;
  const result: NavLocationLink[] = [];

  for (const item of cities) {
    if (result.length >= limit) break;

    const link = cityToNavLink(item, options);
    if (!link) continue;

    if (seen.has(link.href)) continue;
    seen.add(link.href);

    result.push(link);
  }

  return result;
}

export type LocationMenuCitySource = 'popular' | 'featured' | 'empty';

export type LocationMenuCityResolution = {
  cities: NavLocationLink[];
  heading: 'Popular cities' | 'Featured cities' | 'Find a location';
  source: LocationMenuCitySource;
};

export type ResolveLocationMenuCitiesOptions = {
  featuredLaunchCities?: unknown;
  limit?: number;
  popularCities: unknown;
};

/**
 * Resolve the Location menu from governed data sources in product order.
 *
 * The component deliberately does not own a city list. Dynamic inventory
 * remains authoritative; a future centrally governed launch-market catalogue
 * can be supplied as `featuredLaunchCities` without changing presentation.
 */
export function resolveLocationMenuCities({
  featuredLaunchCities,
  limit = 6,
  popularCities,
}: ResolveLocationMenuCitiesOptions): LocationMenuCityResolution {
  const popular = popularCitiesToNavLinks(popularCities, { limit }).filter(
    city => city.listingCount !== undefined && city.listingCount > 0,
  );
  if (popular.length > 0) {
    return { cities: popular, heading: 'Popular cities', source: 'popular' };
  }

  const featured = popularCitiesToNavLinks(featuredLaunchCities, { limit });
  if (featured.length > 0) {
    return { cities: featured, heading: 'Featured cities', source: 'featured' };
  }

  return { cities: [], heading: 'Find a location', source: 'empty' };
}
