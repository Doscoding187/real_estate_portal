import { PROVINCE_SLUGS } from './locationUtils';
import {
  encodeCanonicalLocationId,
  parseCanonicalLocationId,
} from '../../../shared/locationAuthority';
import { isSearchAreaId, parseSearchScope, type SearchScope } from '../../../shared/searchScope';
import {
  BUY_TRANSACTION_TYPE,
  parseBuySearchParams,
  sanitizeBuySearchFilters,
} from '../../../shared/buySearchContract';
import {
  appendTransactionalResultState,
  parseTransactionalResultState,
  SEARCH_RESULT_PAGE_PARAM,
  SEARCH_RESULT_SORT_PARAM,
  type TransactionalResultState,
} from '../../../shared/transactionalSearchState';

/**
 * CORE PHILOSOPHY:
 * - Search captures intent, not keywords.
 * - Geography is sacred and hierarchical.
 * - Filters refine — they never redefine geography silently.
 */

export type TransactionType = 'for-sale' | 'to-rent' | 'developments';
export type GeographyLevel =
  | 'province'
  | 'city'
  | 'search_area'
  | 'multi_location'
  | 'suburb'
  | 'development'
  | 'country';
export type SearchRouteMode = 'seo' | 'results';

export type SearchIntentValidationCode =
  | 'canonical-location-required'
  | 'invalid-location-id'
  | 'location-identity-mismatch'
  | 'multiple-locations-unsupported'
  | 'invalid-multi-location'
  | 'invalid-search-area-id'
  | 'search-area-location-conflict'
  | 'missing-transaction-intent'
  | 'invalid-transaction-intent';

export interface SearchIntentValidation {
  code: SearchIntentValidationCode;
  message: string;
}

export interface GeographyIntent {
  level: GeographyLevel;
  province?: string;
  city?: string;
  suburb?: string;
  locationId?: string;
  locationIds?: string[];
  searchAreaId?: string;
  searchAreaIds?: string[];
  slug?: string; // For development specific pages or as fallback
}

export interface SearchDefaults {
  propertyCategory: string; // e.g. 'residential'
  sort: string; // e.g. 'relevance'
}

export interface SearchIntent {
  transactionType: TransactionType | null;
  geography: GeographyIntent;
  filters: Record<string, any>; // The query params refing the search
  resultState: TransactionalResultState;
  defaults: SearchDefaults;
  validation?: SearchIntentValidation;
  /**
   * Records whether an intent came from a neutral geography page or a
   * transactional result route without creating a second transaction URL
   * family.
   */
  routeMode?: SearchRouteMode;
}

/**
 * Serializes the public search intent into the criteria contract used by
 * saved searches. Geography is kept in its canonical scope representation;
 * it is not reconstructed from display labels or legacy `locations` values.
 */
export function buildCanonicalSavedSearchCriteria(intent: SearchIntent): Record<string, unknown> {
  const criteria: Record<string, unknown> = { ...intent.filters };

  delete criteria.province;
  delete criteria.city;
  delete criteria.suburb;
  delete criteria.locationId;
  delete criteria.locationIds;
  delete criteria.searchAreaId;
  delete criteria.searchAreaIds;
  delete criteria.locations;
  delete criteria['locations[]'];

  if (intent.transactionType === 'for-sale') {
    criteria.listingType = 'sale';
  } else if (intent.transactionType === 'to-rent') {
    criteria.listingType = 'rent';
  }

  const { geography } = intent;

  if (geography.level === 'multi_location') {
    const rawLocationIds = geography.locationIds || [];
    const normalizedLocationIds = Array.from(
      new Set(
        rawLocationIds
          .map(value => parseCanonicalLocationId(value))
          .filter((value): value is NonNullable<typeof value> => Boolean(value))
          .map(value => encodeCanonicalLocationId(value.level, value.id)),
      ),
    ).sort();
    const rawSearchAreaIds = geography.searchAreaIds || [];
    const normalizedSearchAreaIds = Array.from(
      new Set(rawSearchAreaIds.map(value => String(value).trim()).filter(isSearchAreaId)),
    ).sort();

    if (
      normalizedLocationIds.length === rawLocationIds.length &&
      normalizedLocationIds.length > 0
    ) {
      criteria.locationIds = normalizedLocationIds;
    } else if (
      normalizedSearchAreaIds.length === rawSearchAreaIds.length &&
      normalizedSearchAreaIds.length > 0
    ) {
      criteria.searchAreaIds = normalizedSearchAreaIds;
    } else if (rawLocationIds.length > 0) {
      // Preserve malformed state for the server boundary to reject rather
      // than silently widening a saved search to the whole country.
      criteria.locationIds = rawLocationIds;
    } else if (rawSearchAreaIds.length > 0) {
      criteria.searchAreaIds = rawSearchAreaIds;
    }

    return criteria;
  }

  if (geography.searchAreaId && isSearchAreaId(geography.searchAreaId)) {
    criteria.searchAreaId = geography.searchAreaId;
    const parsedLocationId = geography.locationId
      ? parseCanonicalLocationId(geography.locationId)
      : undefined;
    if (parsedLocationId) {
      criteria.locationId = encodeCanonicalLocationId(parsedLocationId.level, parsedLocationId.id);
    }
    return criteria;
  }

  if (geography.province) criteria.province = geography.province;
  if (geography.city) criteria.city = geography.city;
  if (geography.suburb) criteria.suburb = geography.suburb;
  const parsedLocationId = geography.locationId
    ? parseCanonicalLocationId(geography.locationId)
    : undefined;
  if (parsedLocationId) {
    criteria.locationId = encodeCanonicalLocationId(parsedLocationId.level, parsedLocationId.id);
  }

  return criteria;
}

const SEARCH_VALIDATION_MESSAGES: Record<SearchIntentValidationCode, string> = {
  'canonical-location-required':
    'Choose a canonical province, city, or suburb suggestion before searching.',
  'invalid-location-id': 'The selected location does not match its canonical identity.',
  'location-identity-mismatch': 'The selected location does not match its canonical hierarchy.',
  'multiple-locations-unsupported':
    'Choose one canonical province, city, or suburb before searching.',
  'invalid-multi-location': 'Choose two to ten compatible canonical locations before searching.',
  'invalid-search-area-id': 'The selected Search Area does not match its stable identity.',
  'search-area-location-conflict': 'A Search Area may only be refined by one canonical locality.',
  'missing-transaction-intent': 'Choose Buy or Rent before opening transactional results.',
  'invalid-transaction-intent': 'The requested search journey is not supported.',
};

function getSearchIntentValidation(
  value: string | null | undefined,
): SearchIntentValidation | undefined {
  if (!value || !(value in SEARCH_VALIDATION_MESSAGES)) return undefined;
  const code = value as SearchIntentValidationCode;
  return { code, message: SEARCH_VALIDATION_MESSAGES[code] };
}

export function createSearchIntentValidation(
  code: SearchIntentValidationCode,
): SearchIntentValidation {
  return { code, message: SEARCH_VALIDATION_MESSAGES[code] };
}

function applyScopeToGeography(geography: GeographyIntent, scope: SearchScope): void {
  if (scope.kind === 'province') {
    geography.level = 'province';
    geography.locationId = scope.canonicalLocationId;
    return;
  }

  if (scope.kind === 'metro_city') {
    geography.level = 'city';
    geography.locationId = scope.canonicalLocationId;
    return;
  }

  if (scope.kind === 'locality') {
    geography.level = 'suburb';
    geography.locationId = scope.canonicalLocationId;
    return;
  }

  if (scope.kind === 'search_area') {
    geography.level = 'search_area';
    geography.searchAreaId = scope.searchAreaId;
    return;
  }

  geography.level = 'multi_location';
  const canonicalMembers = scope.members.filter(member => member.kind !== 'search_area');
  if (canonicalMembers.length > 0) {
    geography.locationIds = canonicalMembers.map(member => member.canonicalLocationId);
  } else {
    geography.searchAreaIds = scope.members
      .filter(member => member.kind === 'search_area')
      .map(member => member.searchAreaId);
  }
}

export interface ExplicitTransactionResolution {
  transactionType: TransactionType | null;
  invalid: boolean;
}

const TRANSACTION_TYPE_ALIASES: Record<string, TransactionType> = {
  buy: 'for-sale',
  sale: 'for-sale',
  'for-sale': 'for-sale',
  rent: 'to-rent',
  rental: 'to-rent',
  'to-rent': 'to-rent',
  'for-rent': 'to-rent',
  developments: 'developments',
  development: 'developments',
  projects: 'developments',
};

/**
 * Resolves only declared transaction context. Missing or unknown context is
 * deliberately not converted into Buy.
 */
export function resolveExplicitTransactionType(
  path: string,
  searchParams: URLSearchParams,
): ExplicitTransactionResolution {
  const pathname = path.split('?')[0] || '/';
  const canonicalPathType: Record<string, TransactionType> = {
    '/property-for-sale': 'for-sale',
    '/property-to-rent': 'to-rent',
    '/new-developments': 'developments',
  };

  const canonicalType = canonicalPathType[pathname];
  if (canonicalType) return { transactionType: canonicalType, invalid: false };

  const rawValues = ['intent', 'transactionType', 'listingType']
    .map(key => searchParams.get(key)?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value));

  if (rawValues.length === 0) return { transactionType: null, invalid: false };

  const resolvedValues = rawValues.map(value => TRANSACTION_TYPE_ALIASES[value] ?? null);
  if (resolvedValues.some(value => value === null)) {
    return { transactionType: null, invalid: true };
  }

  const uniqueValues = new Set(resolvedValues);
  if (uniqueValues.size !== 1) return { transactionType: null, invalid: true };

  return { transactionType: resolvedValues[0], invalid: false };
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
  const transactionResolution = resolveExplicitTransactionType(path, searchParams);
  const transactionType = transactionResolution.transactionType;

  const geography: GeographyIntent = { level: 'country' };
  let validation = getSearchIntentValidation(searchParams.get('searchError'));
  if (transactionResolution.invalid) {
    validation ||= createSearchIntentValidation('invalid-transaction-intent');
  } else if (!transactionType) {
    validation ||= createSearchIntentValidation('missing-transaction-intent');
  }
  const resultState = parseTransactionalResultState(searchParams);

  const queryProvince = searchParams.get('province')?.trim().toLowerCase() || undefined;
  const queryCity = searchParams.get('city')?.trim().toLowerCase() || undefined;
  const queryLocationId = searchParams.get('locationId')?.trim() || undefined;
  const querySearchAreaId = searchParams.get('searchAreaId')?.trim() || undefined;
  const hasSearchArea = Boolean(querySearchAreaId && isSearchAreaId(querySearchAreaId));
  const canonicalQueryLocation = parseCanonicalLocationId(queryLocationId);
  const queryLocationIds = searchParams
    .getAll('locationIds')
    .map(value => value.trim())
    .filter(Boolean);
  const querySearchAreaIds = searchParams
    .getAll('searchAreaIds')
    .map(value => value.trim())
    .filter(Boolean);
  const querySuburbs = searchParams
    .getAll('suburb')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
  const querySuburb = querySuburbs[0];
  const locations = searchParams
    .getAll('locations')
    .concat(searchParams.getAll('locations[]'))
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);

  if (queryLocationId && !canonicalQueryLocation) {
    validation ||= {
      code: 'invalid-location-id',
      message: SEARCH_VALIDATION_MESSAGES['invalid-location-id'],
    };
  }

  if (querySearchAreaId && !hasSearchArea) {
    validation ||= {
      code: 'invalid-search-area-id',
      message: SEARCH_VALIDATION_MESSAGES['invalid-search-area-id'],
    };
  }

  const hasMultiLocationQuery = queryLocationIds.length > 0 || querySearchAreaIds.length > 0;
  let multiLocationScope: SearchScope | undefined;
  if (hasMultiLocationQuery) {
    const hasConflictingGeography = Boolean(
      queryLocationId ||
      querySearchAreaId ||
      queryProvince ||
      queryCity ||
      querySuburbs.length ||
      locations.length,
    );

    if (queryLocationIds.length > 0 && querySearchAreaIds.length > 0) {
      validation ||= createSearchIntentValidation('invalid-multi-location');
    } else if (hasConflictingGeography) {
      validation ||= createSearchIntentValidation('invalid-multi-location');
    } else {
      const members =
        queryLocationIds.length > 0
          ? queryLocationIds.map(locationId => {
              const parsed = parseCanonicalLocationId(locationId);
              if (!parsed) return { kind: 'locality' as const, canonicalLocationId: locationId };
              const kind =
                parsed.level === 'province'
                  ? 'province'
                  : parsed.level === 'city'
                    ? 'metro_city'
                    : 'locality';
              return {
                kind,
                canonicalLocationId: encodeCanonicalLocationId(parsed.level, parsed.id),
              };
            })
          : querySearchAreaIds.map(searchAreaId => ({
              kind: 'search_area' as const,
              searchAreaId,
            }));
      const parsedMultiLocation = parseSearchScope({ kind: 'multi_location', members });
      if (!parsedMultiLocation.ok) {
        validation ||= createSearchIntentValidation('invalid-multi-location');
      } else {
        multiLocationScope = parsedMultiLocation.scope;
      }
    }
  }

  if (
    hasSearchArea &&
    (queryProvince ||
      queryCity ||
      querySuburbs.length > 0 ||
      queryLocationIds.length > 0 ||
      querySearchAreaIds.length > 0 ||
      locations.length > 0)
  ) {
    validation ||= {
      code: 'search-area-location-conflict',
      message: SEARCH_VALIDATION_MESSAGES['search-area-location-conflict'],
    };
  }

  if (querySuburbs.length > 1 || locations.length > 1) {
    validation ||= {
      code: 'multiple-locations-unsupported',
      message: SEARCH_VALIDATION_MESSAGES['multiple-locations-unsupported'],
    };
  }

  if (multiLocationScope) {
    applyScopeToGeography(geography, multiLocationScope);
  } else if (hasSearchArea) {
    geography.searchAreaId = querySearchAreaId;
    geography.level = canonicalQueryLocation?.level === 'suburb' ? 'suburb' : 'search_area';
    if (canonicalQueryLocation?.level === 'suburb') {
      geography.locationId = queryLocationId;
    } else if (canonicalQueryLocation) {
      validation ||= {
        code: 'search-area-location-conflict',
        message: SEARCH_VALIDATION_MESSAGES['search-area-location-conflict'],
      };
    }
  } else {
    if (querySuburb && querySuburbs.length === 1) {
      geography.level = 'suburb';
      geography.suburb = querySuburb;
    }

    if (queryCity) {
      if (!geography.suburb) geography.level = 'city';
      geography.city = queryCity;
    }

    if (queryProvince) {
      if (!geography.city && !geography.suburb) geography.level = 'province';
      geography.province = queryProvince;
    }

    if (canonicalQueryLocation) {
      geography.locationId = queryLocationId;
      if (!queryProvince && !queryCity && !querySuburb) {
        geography.level = canonicalQueryLocation.level;
      } else {
        const deepestQueryLevel = querySuburb ? 'suburb' : queryCity ? 'city' : 'province';
        if (deepestQueryLevel !== canonicalQueryLocation.level) {
          validation ||= {
            code: 'location-identity-mismatch',
            message: SEARCH_VALIDATION_MESSAGES['location-identity-mismatch'],
          };
        }
      }
    }
  }

  // Preserve existing path-based SEO routes. S1 does not decide the broader
  // discovery-routing policy, but it does preserve typed IDs when supplied.
  if (
    !geography.province &&
    !geography.city &&
    !geography.suburb &&
    !geography.searchAreaId &&
    !geography.locationIds?.length &&
    !geography.searchAreaIds?.length &&
    !locations.length &&
    !queryLocationId &&
    !hasMultiLocationQuery
  ) {
    const pathLocationId = pathParams.locationId?.trim() || undefined;
    const canonicalPathLocation = parseCanonicalLocationId(pathLocationId);

    if (pathLocationId && !canonicalPathLocation) {
      validation ||= {
        code: 'invalid-location-id',
        message: SEARCH_VALIDATION_MESSAGES['invalid-location-id'],
      };
    }

    if (canonicalPathLocation) {
      geography.locationId = pathLocationId;
      geography.level = canonicalPathLocation.level;
    }

    if (pathParams.province) {
      geography.level = 'province';
      geography.province = pathParams.province.trim().toLowerCase();
    }

    if (pathParams.city) {
      geography.level = 'city';
      geography.city = pathParams.city.trim().toLowerCase();
    }

    if (pathParams.suburb) {
      geography.level = 'suburb';
      geography.suburb = pathParams.suburb.trim().toLowerCase();
    }

    if (canonicalPathLocation && (pathParams.province || pathParams.city || pathParams.suburb)) {
      const deepestPathLevel = pathParams.suburb ? 'suburb' : pathParams.city ? 'city' : 'province';
      if (deepestPathLevel !== canonicalPathLocation.level) {
        validation ||= {
          code: 'location-identity-mismatch',
          message: SEARCH_VALIDATION_MESSAGES['location-identity-mismatch'],
        };
      }
    }

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

  // A single legacy locations slug remains readable for compatibility, but
  // S1 never generates it and never treats it as canonical identity.
  if (
    !geography.province &&
    !geography.city &&
    !geography.suburb &&
    !geography.searchAreaId &&
    locations.length === 1
  ) {
    const [locationSlug] = locations;
    if (PROVINCE_SLUGS.includes(locationSlug)) {
      geography.level = 'province';
      geography.province = locationSlug;
    } else {
      geography.level = 'city';
      geography.city = locationSlug;
    }
  }

  const filters: Record<string, any> =
    transactionType === BUY_TRANSACTION_TYPE ? parseBuySearchParams(searchParams) : {};

  if (transactionType && transactionType !== BUY_TRANSACTION_TYPE) {
    if (locations.length > 0) filters.locations = locations;
    if (querySuburbs.length > 1) {
      filters.suburb = querySuburbs;
    } else if (querySuburbs.length === 1) {
      filters.suburb = querySuburbs[0];
    }

    searchParams.forEach((value, key) => {
      if (
        key === 'province' ||
        key === 'city' ||
        key === 'suburb' ||
        key === 'locationId' ||
        key === 'locationIds' ||
        key === 'searchAreaIds' ||
        key === 'locations' ||
        key === 'locations[]' ||
        key === 'searchAreaId' ||
        key === 'searchError' ||
        key === SEARCH_RESULT_SORT_PARAM ||
        key === SEARCH_RESULT_PAGE_PARAM
      ) {
        return;
      }

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
  }

  if (transactionType === 'for-sale') filters.listingType = 'sale';
  if (transactionType === 'to-rent') filters.listingType = 'rent';

  return {
    transactionType,
    geography,
    filters,
    resultState,
    defaults: {
      propertyCategory: 'residential',
      sort: 'relevance',
    },
    ...(validation ? { validation } : {}),
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
 * - Neutral geography searches use bare geography routes (/gauteng)
 * - Transactional searches always use the transaction root with query state
 *
 * This ensures:
 * - Geography pages are neutral discovery authorities
 * - Results pages fulfill declared transactional intent
 */
export function generateIntentUrl(intent: SearchIntent): string {
  const { transactionType, geography, filters } = intent;

  if (!transactionType) return '/';

  // 1. Determine base path
  let basePath = transactionType === 'to-rent' ? '/property-to-rent' : '/property-for-sale';

  if (transactionType === 'developments') {
    basePath = '/new-developments';
  }

  // 2. Build query params from filters
  const queryParams = new URLSearchParams();
  const normalizedSuburbs =
    transactionType === BUY_TRANSACTION_TYPE
      ? []
      : (() => {
          if (Array.isArray(filters.suburb)) {
            return filters.suburb.map(value => String(value).trim().toLowerCase()).filter(Boolean);
          }

          if (typeof filters.suburb === 'string' && filters.suburb.trim()) {
            return [filters.suburb.trim().toLowerCase()];
          }

          return [];
        })();

  const serializableFilters =
    transactionType === BUY_TRANSACTION_TYPE ? sanitizeBuySearchFilters(filters) : filters;

  const normalizedLocationIds = Array.from(
    new Set(
      (geography.locationIds || [])
        .map(value => parseCanonicalLocationId(value))
        .filter((value): value is NonNullable<typeof value> => Boolean(value))
        .map(value => encodeCanonicalLocationId(value.level, value.id)),
    ),
  ).sort();
  const normalizedSearchAreaIds = Array.from(
    new Set(
      (geography.searchAreaIds || []).map(value => String(value).trim()).filter(isSearchAreaId),
    ),
  ).sort();

  Object.entries(serializableFilters).forEach(([key, value]) => {
    // Skip internal keys that shouldn't appear in URL
    if (key === 'listingType' || key === 'searchError') return;
    if (key === SEARCH_RESULT_SORT_PARAM || key === SEARCH_RESULT_PAGE_PARAM) return;
    if (
      key === 'suburb' ||
      key === 'locationId' ||
      key === 'locationIds' ||
      key === 'searchAreaId' ||
      key === 'searchAreaIds'
    )
      return;
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

  appendTransactionalResultState(queryParams, intent.resultState);

  const canonicalLocationId = geography.locationId;
  const parsedCanonicalLocationId = parseCanonicalLocationId(canonicalLocationId);
  if (parsedCanonicalLocationId && !queryParams.has('locationId')) {
    queryParams.set(
      'locationId',
      encodeCanonicalLocationId(parsedCanonicalLocationId.level, parsedCanonicalLocationId.id),
    );
  }

  if (intent.validation) {
    queryParams.set('searchError', intent.validation.code);
  }

  if (normalizedSuburbs.length > 0) {
    queryParams.delete('suburb');
    normalizedSuburbs.forEach(suburb => queryParams.append('suburb', suburb));
  }

  if (geography.level === 'multi_location') {
    queryParams.delete('province');
    queryParams.delete('city');
    queryParams.delete('suburb');
    queryParams.delete('locationId');
    queryParams.delete('locations');
    queryParams.delete('locations[]');
    queryParams.delete('searchAreaId');
    queryParams.delete('locationIds');
    queryParams.delete('searchAreaIds');

    normalizedLocationIds.forEach(locationId => queryParams.append('locationIds', locationId));
    normalizedSearchAreaIds.forEach(searchAreaId =>
      queryParams.append('searchAreaIds', searchAreaId),
    );

    const queryString = queryParams.toString();
    return `${basePath}${queryString ? `?${queryString}` : ''}`;
  }

  if (geography.searchAreaId && isSearchAreaId(geography.searchAreaId)) {
    queryParams.set('searchAreaId', geography.searchAreaId);
    queryParams.delete('province');
    queryParams.delete('city');
    queryParams.delete('suburb');
    queryParams.delete('locations');
    queryParams.delete('locations[]');
    queryParams.delete('locationIds');
    queryParams.delete('searchAreaIds');
  }

  // ============================================================
  // Transactional searches always use the root route. Bare geography paths
  // belong to neutral discovery and are built by locationDiscovery.ts.
  // ============================================================

  if (geography.searchAreaId) {
    const queryString = queryParams.toString();
    return `${basePath}${queryString ? `?${queryString}` : ''}`;
  }

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

  if (geography.province && geography.level === 'province') {
    queryParams.set('province', geography.province);
    const queryString = queryParams.toString();
    return `${basePath}${queryString ? `?${queryString}` : ''}`;
  }

  // Country-level / no geography → Base transaction root
  const queryString = queryParams.toString();
  return `${basePath}${queryString ? `?${queryString}` : ''}`;
}
