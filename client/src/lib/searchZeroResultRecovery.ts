import {
  encodeCanonicalLocationId,
  parseCanonicalLocationId,
} from '../../../shared/locationAuthority';
import type { SearchIntent } from './searchIntent';

export type SearchResultsDisplayState =
  | 'loading'
  | 'error'
  | 'invalid'
  | 'unavailable'
  | 'page-normalizing'
  | 'zero'
  | 'results'
  | 'integrity';

export type PublicLocationState =
  | 'not_requested'
  | 'resolved'
  | 'unresolved'
  | 'ambiguous'
  | 'unavailable';

export interface SearchResultsDisplayInput {
  isLoading: boolean;
  hasError: boolean;
  isTransactionalJourney: boolean;
  hasValidation: boolean;
  hasResponse: boolean;
  locationState?: PublicLocationState;
  total: number;
  hasRenderableResults: boolean;
  pageNeedsNormalization: boolean;
}

export function getSearchResultsDisplayState(
  input: SearchResultsDisplayInput,
): SearchResultsDisplayState {
  if (input.isLoading) return 'loading';
  if (input.hasError) return 'error';
  if (!input.isTransactionalJourney || input.hasValidation) return 'invalid';
  if (input.pageNeedsNormalization) return 'page-normalizing';
  if (!input.hasResponse) return 'unavailable';
  if (input.locationState !== 'resolved' && input.locationState !== 'not_requested') {
    return 'unavailable';
  }
  if (input.total === 0) return 'zero';
  return input.hasRenderableResults ? 'results' : 'integrity';
}

export interface RecoveryLocationContext {
  type?: 'province' | 'city' | 'suburb';
  hierarchy?: {
    province?: string;
    city?: string;
  };
  ids?: {
    provinceId?: number | string;
    cityId?: number | string;
  };
}

export interface RecoverySearchAreaContext {
  parentCanonicalLocationId: string;
  parentLabel?: string;
}

export interface ParentRecoveryTarget {
  level: 'province' | 'city';
  canonicalLocationId: string;
  label?: string;
}

function canonicalIdFor(level: 'province' | 'city', value: number | string | undefined) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? encodeCanonicalLocationId(level, id) : undefined;
}

/**
 * Returns only parent scopes explicitly supplied by the canonical resolver.
 * Labels are display context; the returned ID is the navigation authority.
 */
export function getExplicitParentRecoveryTarget(
  locationContext?: RecoveryLocationContext | null,
  searchAreaContext?: RecoverySearchAreaContext | null,
): ParentRecoveryTarget | undefined {
  if (locationContext?.type === 'suburb') {
    const canonicalLocationId = canonicalIdFor('city', locationContext.ids?.cityId);
    if (canonicalLocationId) {
      return {
        level: 'city',
        canonicalLocationId,
        label: locationContext.hierarchy?.city,
      };
    }
  }

  if (locationContext?.type === 'city') {
    const canonicalLocationId = canonicalIdFor('province', locationContext.ids?.provinceId);
    if (canonicalLocationId) {
      return {
        level: 'province',
        canonicalLocationId,
        label: locationContext.hierarchy?.province,
      };
    }
  }

  if (!locationContext && searchAreaContext) {
    const parsed = parseCanonicalLocationId(searchAreaContext.parentCanonicalLocationId);
    if (parsed?.level === 'city') {
      return {
        level: 'city',
        canonicalLocationId: encodeCanonicalLocationId(parsed.level, parsed.id),
        label: searchAreaContext.parentLabel,
      };
    }
  }

  return undefined;
}

const GEOGRAPHY_FILTER_KEYS = [
  'province',
  'city',
  'suburb',
  'locationId',
  'locationIds',
  'locations',
  'locations[]',
  'searchAreaId',
  'searchAreaIds',
] as const;

export function clearSearchIntentFilters(
  intent: SearchIntent,
  keys: readonly string[],
): SearchIntent {
  const filters = { ...intent.filters };
  keys.forEach(key => delete filters[key]);

  return {
    ...intent,
    filters,
    resultState: {
      ...intent.resultState,
      page: 0,
    },
  };
}

export function clearAllOptionalSearchFilters(intent: SearchIntent): SearchIntent {
  return {
    ...intent,
    filters: {},
    resultState: {
      ...intent.resultState,
      page: 0,
    },
  };
}

export function buildParentRecoveryIntent(
  intent: SearchIntent,
  target: ParentRecoveryTarget,
): SearchIntent {
  const filters = { ...intent.filters };
  GEOGRAPHY_FILTER_KEYS.forEach(key => delete filters[key]);

  return {
    ...intent,
    geography: {
      level: target.level,
      locationId: target.canonicalLocationId,
    },
    filters,
    resultState: {
      ...intent.resultState,
      page: 0,
    },
  };
}

export interface ZeroResultDescriptionInput {
  transactionType: 'for-sale' | 'to-rent';
  locationName?: string;
  locationNames?: readonly string[];
  searchAreaName?: string;
}

function joinLocationNames(names: readonly string[]): string | undefined {
  const cleanNames = names.map(name => name.trim()).filter(Boolean);
  if (cleanNames.length === 0) return undefined;
  if (cleanNames.length === 1) return cleanNames[0];
  if (cleanNames.length === 2) return `${cleanNames[0]} and ${cleanNames[1]}`;
  return `${cleanNames.slice(0, -1).join(', ')}, and ${cleanNames[cleanNames.length - 1]}`;
}

export function buildZeroResultDescription(input: ZeroResultDescriptionInput): string {
  const noun = input.transactionType === 'for-sale' ? 'homes for sale' : 'rentals';
  const location =
    input.locationName?.trim() ||
    joinLocationNames(input.locationNames || []) ||
    input.searchAreaName?.trim();

  return location
    ? `No ${noun} match your search in ${location}.`
    : `No ${noun} match your current search.`;
}
