import { isCanonicalPlaceId } from '../../../shared/placeAuthority';
import {
  validatePublicSearchInput,
  type PublicSearchInputValidationIssue,
} from '../../../shared/publicSearchValidation';
import {
  BUY_TRANSACTION_TYPE,
  parseBuySearchParams,
  sanitizeBuySearchFilters,
} from '../../../shared/buySearchContract';
import {
  RENT_TRANSACTION_TYPE,
  parseRentSearchParams,
  sanitizeRentSearchFilters,
} from '../../../shared/rentSearchContract';
import {
  appendTransactionalResultState,
  parseTransactionalResultState,
  SEARCH_RESULT_PAGE_PARAM,
  SEARCH_RESULT_SORT_PARAM,
  type TransactionalResultState,
} from '../../../shared/transactionalSearchState';

export type TransactionType = 'for-sale' | 'to-rent' | 'developments';
export type GeographyLevel = 'canonical_place' | 'country';
export type SearchRouteMode = 'seo' | 'results';

export type SearchIntentValidationCode =
  | 'invalid-place-authority'
  | 'missing-transaction-intent'
  | 'invalid-transaction-intent';

export interface SearchIntentValidation {
  code: SearchIntentValidationCode;
  message: string;
}

export interface GeographyIntent {
  level: GeographyLevel;
  canonicalPlaceId?: string;
}

export interface SearchDefaults {
  propertyCategory: string;
  sort: string;
}

export interface SearchIntent {
  transactionType: TransactionType | null;
  geography: GeographyIntent;
  filters: Record<string, any>;
  resultState: TransactionalResultState;
  defaults: SearchDefaults;
  validation?: SearchIntentValidation;
  routeMode?: SearchRouteMode;
}

const RETIRED_GEOGRAPHY_KEYS = [
  'province',
  'city',
  'suburb',
  'location',
  'slug',
  'locationId',
  'factualLocationId',
  'locationIds',
  'locations',
  'locations[]',
  'canonicalPlaceIds',
  'searchAreaId',
  'searchAreaIds',
] as const;

const RESERVED_QUERY_KEYS = new Set<string>([
  ...RETIRED_GEOGRAPHY_KEYS,
  'canonicalPlaceId',
  'searchAreaId',
  'searchError',
  'intent',
  'transactionType',
  'listingType',
  SEARCH_RESULT_SORT_PARAM,
  SEARCH_RESULT_PAGE_PARAM,
]);

function filterGeographyCriteria(criteria: Record<string, unknown>) {
  const result = { ...criteria };
  RESERVED_QUERY_KEYS.forEach(key => delete result[key]);
  return result;
}

/** Serialize saved-search filters; Place authority is stored in saved_searches.place_id. */
export function buildCanonicalSavedSearchCriteria(intent: SearchIntent): Record<string, unknown> {
  const criteria: Record<string, unknown> = filterGeographyCriteria(intent.filters);
  if (intent.transactionType === 'for-sale') criteria.listingType = 'sale';
  else if (intent.transactionType === 'to-rent') criteria.listingType = 'rent';

  const issue = validatePublicSearchInput({
    canonicalPlaceId: intent.geography.canonicalPlaceId,
  });
  if (issue) throw new Error(issue.message);
  return criteria;
}

const SEARCH_VALIDATION_MESSAGES: Record<SearchIntentValidationCode, string> = {
  'invalid-place-authority':
    'Choose one canonical Place. Search Area and legacy geography links are no longer accepted.',
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
  const pathType = canonicalPathType[pathname] ?? null;
  // On the developments route, transactionType is a result refinement
  // (for_sale / for_rent). The path already fixes the journey type.
  const intentKeys =
    pathname === '/new-developments'
      ? ['intent', 'listingType']
      : ['intent', 'transactionType', 'listingType'];
  const rawValues = intentKeys
    .map(key => searchParams.get(key)?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value));
  const resolvedValues = rawValues.map(value => TRANSACTION_TYPE_ALIASES[value] ?? null);
  if (resolvedValues.some(value => value === null)) {
    return { transactionType: null, invalid: true };
  }
  const uniqueValues = new Set(resolvedValues);
  if (uniqueValues.size > 1) return { transactionType: null, invalid: true };
  const queryType = resolvedValues[0] ?? null;
  if (pathType && queryType && pathType !== queryType) {
    return { transactionType: null, invalid: true };
  }
  return { transactionType: pathType ?? queryType, invalid: false };
}

function hasRetiredGeographyQuery(searchParams: URLSearchParams): boolean {
  return RETIRED_GEOGRAPHY_KEYS.some(key => searchParams.has(key));
}

/** Parses one canonical Place identity or an intentionally country-wide search. */
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

  const placeIds = searchParams.getAll('canonicalPlaceId').map(value => value.trim());
  const hasRetiredPathGeography = ['province', 'city', 'suburb', 'locationId', 'slug'].some(
    key => Boolean(pathParams[key]),
  );

  if (hasRetiredGeographyQuery(searchParams) || hasRetiredPathGeography) {
    validation ||= createSearchIntentValidation('invalid-place-authority');
  }

  if (placeIds.length > 1) {
    validation ||= createSearchIntentValidation('invalid-place-authority');
  } else if (placeIds.length === 1) {
    if (!isCanonicalPlaceId(placeIds[0])) {
      validation ||= createSearchIntentValidation('invalid-place-authority');
    } else {
      geography.level = 'canonical_place';
      geography.canonicalPlaceId = placeIds[0];
    }
  }

  const resultState = parseTransactionalResultState(searchParams);
  const filters: Record<string, any> =
    transactionType === BUY_TRANSACTION_TYPE
      ? parseBuySearchParams(searchParams)
      : transactionType === RENT_TRANSACTION_TYPE
        ? parseRentSearchParams(searchParams)
        : {};

  if (transactionType === 'developments') {
    const allowedValues: Record<string, readonly string[]> = {
      developmentType: ['residential', 'commercial', 'mixed_use', 'land'],
      developmentStatus: ['launching-soon', 'selling', 'sold-out'],
      transactionType: ['for_sale', 'for_rent'],
      availability: ['available', 'sold_out'],
    };
    for (const [key, values] of Object.entries(allowedValues)) {
      const value = searchParams.get(key);
      if (value && values.includes(value)) filters[key] = value;
    }

    for (const key of ['minPrice', 'maxPrice', 'minBedrooms', 'maxBedrooms']) {
      const raw = searchParams.get(key);
      if (raw === null || raw.trim() === '') continue;
      const value = Number(raw);
      if (Number.isFinite(value) && value >= 0) filters[key] = value;
    }

    if (
      filters.minPrice !== undefined &&
      filters.maxPrice !== undefined &&
      filters.minPrice > filters.maxPrice
    ) {
      delete filters.minPrice;
      delete filters.maxPrice;
    }
    if (
      filters.minBedrooms !== undefined &&
      filters.maxBedrooms !== undefined &&
      filters.minBedrooms > filters.maxBedrooms
    ) {
      delete filters.minBedrooms;
      delete filters.maxBedrooms;
    }
  }

  if (transactionType === RENT_TRANSACTION_TYPE) {
    searchParams.forEach((value, key) => {
      if (RESERVED_QUERY_KEYS.has(key)) return;
      if (
        [
          'minPrice',
          'maxPrice',
          'minBedrooms',
          'maxBedrooms',
          'minBathrooms',
          'maxBathrooms',
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

  Object.keys(filters).forEach(key => {
    if (
      RESERVED_QUERY_KEYS.has(key) &&
      !(transactionType === 'developments' && key === 'transactionType')
    ) {
      delete filters[key];
    }
  });
  if (transactionType === BUY_TRANSACTION_TYPE) filters.listingType = 'sale';
  if (transactionType === RENT_TRANSACTION_TYPE) filters.listingType = 'rent';

  return {
    transactionType,
    geography,
    filters,
    resultState,
    defaults: { propertyCategory: 'residential', sort: 'relevance' },
    ...(validation ? { validation } : {}),
    routeMode:
      path.split('?')[0] === '/property-for-sale' || path.split('?')[0] === '/property-to-rent'
        ? 'results'
        : 'seo',
  };
}

/** Every transaction uses one result root. Geography is carried only by identity. */
export function generateIntentUrl(intent: SearchIntent): string {
  const { transactionType, geography, filters } = intent;
  if (!transactionType) return '/';

  const basePath =
    transactionType === 'to-rent'
      ? '/property-to-rent'
      : transactionType === 'developments'
        ? '/new-developments'
        : '/property-for-sale';
  const queryParams = new URLSearchParams();
  const serializableFilters =
    transactionType === BUY_TRANSACTION_TYPE
      ? sanitizeBuySearchFilters(filters)
      : transactionType === RENT_TRANSACTION_TYPE
        ? sanitizeRentSearchFilters(filters)
        : filters;

  Object.entries(serializableFilters).forEach(([key, value]) => {
    if (
      (RESERVED_QUERY_KEYS.has(key) &&
        !(transactionType === 'developments' && key === 'transactionType')) ||
      key === 'listingType' ||
      key === 'searchError'
    ) {
      return;
    }
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach(item => {
        if (item !== undefined && item !== null && item !== '') queryParams.append(key, String(item));
      });
    } else {
      queryParams.set(key, String(value));
    }
  });

  appendTransactionalResultState(queryParams, intent.resultState);
  const issue: PublicSearchInputValidationIssue | undefined = validatePublicSearchInput({
    canonicalPlaceId: geography.canonicalPlaceId,
  });
  if (issue) throw new Error(issue.message);
  if (geography.canonicalPlaceId) queryParams.set('canonicalPlaceId', geography.canonicalPlaceId);
  if (intent.validation) queryParams.set('searchError', intent.validation.code);

  const query = queryParams.toString();
  return `${basePath}${query ? `?${query}` : ''}`;
}
