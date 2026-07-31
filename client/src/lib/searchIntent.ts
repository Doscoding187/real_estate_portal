import { PROVINCE_SLUGS } from './locationUtils';

/**
 * CORE PHILOSOPHY:
 * - Search captures intent, not keywords.
 * - Geography is sacred and hierarchical.
 * - Filters refine — they never redefine geography silently.
 */

export type TransactionType = 'for-sale' | 'to-rent' | 'developments';
export type GeographyLevel = 'province' | 'city' | 'locality' | 'development' | 'country';
export type SearchRouteMode = 'seo' | 'results';

export interface GeographyIntent {
  level: GeographyLevel;
  province?: string;
  city?: string;
  suburb?: string; // "locality" in the spec, but we use suburb in the codebase usually
  locationId?: string; // Numeric ID from P24 pattern
  slug?: string; // For development specific pages or as fallback
}

export interface SearchDefaults {
  propertyCategory: string; // e.g. 'residential'
  sort: string; // e.g. 'relevance'
}

export interface SearchIntent {
  transactionType: TransactionType;
  geography: GeographyIntent;
  filters: Record<string, any>; // The query params refing the search
  defaults: SearchDefaults;
  /**
   * Controls the destination shape without changing search meaning.
   * SEO pages remain the default for direct path-based province routes;
   * hero submissions explicitly target the results authority.
   */
  routeMode?: SearchRouteMode;
}

/**
 * Resolves the search intent from the URL parameters and query string.
 * This is the SINGLE SOURCE OF TRUTH for converting URL state to UI state.
 *
 * @param pathParams - The parameters from the route (e.g., /:action/:suburb/:city/:province/:locationId)
 * @param searchParams - The query string parameters (e.g., ?price_min=1000)
 * @returns A structured SearchIntent object
 */
export function resolveSearchIntent(
  path: string,
  pathParams: Record<string, string | undefined>,
  searchParams: URLSearchParams,
): SearchIntent {
  // 1. Determine Transaction Type
  let transactionType: TransactionType = 'for-sale'; // Default
  if (path.includes('property-to-rent') || path.includes('to-rent')) {
    transactionType = 'to-rent';
  } else if (path.includes('new-developments') || path.includes('developments')) {
    transactionType = 'developments';
  }

  // 2. Determine Geography (Sacred & Hierarchical)
  const geography: GeographyIntent = {
    level: 'country', // Default
  };

  // ============================================================
  // PRIORITY: Query params ALWAYS win for SRP routing
  // This ensures /property-for-sale?city=alberton works correctly
  // ============================================================

  const queryProvince = searchParams.get('province');
  const queryCity = searchParams.get('city');
  const queryLocationId = searchParams.get('locationId');
  const queryLocationIds = searchParams
    .getAll('locationIds')
    .map(value => value.trim())
    .filter(Boolean);
  const querySuburbs = searchParams
    .getAll('suburb')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
  const querySuburb = querySuburbs[0];

  if (querySuburb && querySuburbs.length === 1) {
    geography.level = 'locality';
    geography.suburb = querySuburb;
  } else if (querySuburbs.length > 1 && queryCity) {
    geography.level = 'city';
  }

  if (queryCity) {
    if (!geography.suburb) geography.level = 'city';
    geography.city = queryCity.toLowerCase();
  }

  if (queryProvince) {
    if (!geography.city && !geography.suburb) geography.level = 'province';
    geography.province = queryProvince.toLowerCase();
  }

  if (queryLocationId?.trim()) geography.locationId = queryLocationId.trim();

  // Fallback to path params if no query params for geography
  // This handles SEO page routes like /property-for-sale/gauteng
  if (!geography.province && !geography.city && !geography.suburb) {
    if (pathParams.locationId) {
      geography.locationId = pathParams.locationId;
    }

    if (pathParams.province) {
      geography.level = 'province';
      geography.province = pathParams.province.toLowerCase();
    }

    if (pathParams.city) {
      geography.level = 'city';
      geography.city = pathParams.city.toLowerCase();
    }

    if (pathParams.suburb) {
      geography.level = 'locality';
      geography.suburb = pathParams.suburb.toLowerCase();
    }

    // Handle Legacy "Slug" or Development specific routes if needed
    if (pathParams.slug) {
      if (!geography.city && !geography.suburb && !geography.province) {
        if (PROVINCE_SLUGS.includes(pathParams.slug.toLowerCase())) {
          geography.level = 'province';
          geography.province = pathParams.slug.toLowerCase();
        } else {
          geography.level = 'city';
          geography.city = pathParams.slug.toLowerCase();
        }
      }
      geography.slug = pathParams.slug;
    }
  }

  // 3. Extract Filters (Query Params)
  // We explicitly exclude geography keys from filters to avoid duplication
  const filters: Record<string, any> = {};

  // Explicitly handle array parameters
  const locations = searchParams.getAll('locations');
  const legacyLocations = searchParams.getAll('locations[]');
  const normalizedLocations = locations.length > 0 ? locations : legacyLocations;
  if (normalizedLocations.length > 0) {
    filters.locations = normalizedLocations;
  }
  if (queryLocationIds.length > 0) {
    filters.locationIds = queryLocationIds;
  }

  if (querySuburbs.length > 1) {
    filters.suburb = querySuburbs;
  } else if (querySuburbs.length === 1) {
    filters.suburb = querySuburbs[0];
  }

  if (
    !geography.province &&
    !geography.city &&
    !geography.suburb &&
    normalizedLocations.length === 1
  ) {
    const [locationSlug] = normalizedLocations;
    if (PROVINCE_SLUGS.includes(locationSlug.toLowerCase())) {
      geography.level = 'province';
      geography.province = locationSlug.toLowerCase();
    } else {
      geography.level = 'city';
      geography.city = locationSlug.toLowerCase();
    }
  }

  searchParams.forEach((value, key) => {
    // Skip geography keys - they're handled above
    if (
      key === 'province' ||
      key === 'city' ||
      key === 'suburb' ||
      key === 'locationId' ||
      key === 'locationIds'
    )
      return;
    // Skip array keys handled explicitly
    if (key === 'locations' || key === 'locations[]') return;

    if (
      [
        'minPrice',
        'maxPrice',
        'minBedrooms',
        'maxBedrooms',
        'minBathrooms',
        'minArea',
        'maxArea',
      ].includes(key)
    ) {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed >= 0) filters[key] = parsed;
      return;
    }

    filters[key] = value;
  });

  // Ensure listingType matches transactionType (Synchronization)
  filters.listingType = transactionType === 'to-rent' ? 'rent' : 'sale';

  return {
    transactionType,
    geography,
    filters,
    defaults: {
      propertyCategory: 'residential',
      sort: 'relevance',
    },
    routeMode:
      path.split('?')[0] === '/property-for-sale' || path.split('?')[0] === '/property-to-rent'
        ? 'results'
        : 'seo',
  };
}

/**
 * Reconstructs the canonical URL from a SearchIntent object.
 *
 * CRITICAL ROUTING RULE (2025 Architecture):
 * - Province searches → Path-based SEO URLs (/property-for-sale/gauteng)
 * - City/Suburb searches → Query-based SRP URLs (/property-for-sale?city=alberton)
 *
 * This ensures:
 * - SEO pages are for discovery (provinces only)
 * - SRP pages fulfill user intent (cities/suburbs with listings)
 */
export function generateIntentUrl(intent: SearchIntent): string {
  const { transactionType, geography, filters } = intent;

  // 1. Determine base path
  let basePath = transactionType === 'to-rent' ? '/property-to-rent' : '/property-for-sale';

  if (transactionType === 'developments') {
    basePath = '/new-developments';
  }

  // 2. Build query params from filters
  const queryParams = new URLSearchParams();
  const normalizedSuburbs = (() => {
    if (Array.isArray(filters.suburb)) {
      return filters.suburb.map(value => String(value).trim().toLowerCase()).filter(Boolean);
    }

    if (typeof filters.suburb === 'string' && filters.suburb.trim()) {
      return [filters.suburb.trim().toLowerCase()];
    }

    return [];
  })();

  Object.entries(filters).forEach(([key, value]) => {
    // Skip internal keys that shouldn't appear in URL
    if (key === 'listingType') return;
    if (key === 'suburb') return;
    if (!value) return;

    if (Array.isArray(value)) {
      value.forEach(v => {
        if (key === 'locations') {
          if (typeof v === 'string' && v.trim()) {
            queryParams.append(key, v);
            return;
          }

          if (v && typeof v === 'object' && 'slug' in v) {
            const slug = String((v as { slug?: unknown }).slug || '').trim();
            if (slug) {
              queryParams.append(key, slug);
            }
          }
          return;
        }

        queryParams.append(key, String(v));
      });
    } else {
      queryParams.set(key, String(value));
    }
  });

  if (geography.locationId && geography.level !== 'province' && !queryParams.has('locationId')) {
    queryParams.set('locationId', geography.locationId);
  }

  if (normalizedSuburbs.length > 0) {
    queryParams.delete('suburb');
    normalizedSuburbs.forEach(suburb => queryParams.append('suburb', suburb));
  }

  // ============================================================
  // CRITICAL: City/Suburb searches MUST use query-based URLs
  // Path-based URLs are ONLY for province-level SEO pages
  // ============================================================

  if (geography.suburb) {
    // Suburb search → Query-based SRP
    if (normalizedSuburbs.length === 0) {
      queryParams.set('suburb', geography.suburb);
    }
    if (geography.city) queryParams.set('city', geography.city);
    if (geography.province) queryParams.set('province', geography.province);

    const queryString = queryParams.toString();
    return `${basePath}${queryString ? `?${queryString}` : ''}`;
  }

  if (geography.city) {
    // City search → Query-based SRP
    queryParams.set('city', geography.city);
    if (geography.province) queryParams.set('province', geography.province);

    const queryString = queryParams.toString();
    return `${basePath}${queryString ? `?${queryString}` : ''}`;
  }

  // Province-only search → path-based SEO page by default. Hero submissions
  // explicitly target the results authority so they remain usable when the
  // SEO catalog page is not populated in the active environment.
  if (geography.province && geography.level === 'province') {
    if (intent.routeMode === 'results') {
      queryParams.set('province', geography.province);
      const queryString = queryParams.toString();
      return `${basePath}${queryString ? `?${queryString}` : ''}`;
    }

    const queryString = queryParams.toString();
    return `${basePath}/${geography.province}${queryString ? `?${queryString}` : ''}`;
  }

  // Country-level / no geography → Base transaction root
  const queryString = queryParams.toString();
  return `${basePath}${queryString ? `?${queryString}` : ''}`;
}
