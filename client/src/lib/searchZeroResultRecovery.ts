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

export function clearSearchIntentFilters(
  intent: SearchIntent,
  keys: readonly string[],
): SearchIntent {
  const filters = { ...intent.filters };
  keys.forEach(key => delete filters[key]);

  return {
    ...intent,
    filters,
    resultState: { ...intent.resultState, page: 0 },
  };
}

export function clearAllOptionalSearchFilters(intent: SearchIntent): SearchIntent {
  return {
    ...intent,
    filters: {},
    resultState: { ...intent.resultState, page: 0 },
  };
}

export interface ZeroResultDescriptionInput {
  transactionType: 'for-sale' | 'to-rent';
  locationName?: string;
}

export function buildZeroResultDescription(input: ZeroResultDescriptionInput): string {
  const noun = input.transactionType === 'for-sale' ? 'homes for sale' : 'rentals';
  const location = input.locationName?.trim();
  return location
    ? `No ${noun} match your search in ${location}.`
    : `No ${noun} match your current search.`;
}
