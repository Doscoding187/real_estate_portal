import { isCanonicalPlaceId } from '@shared/placeAuthority';
import {
  generateIntentUrl,
  resolveExplicitTransactionType,
  resolveSearchIntent,
  type TransactionType,
} from './searchIntent';

type SearchCriteria = Record<string, unknown>;

const RETIRED_GEOGRAPHY_KEYS = new Set([
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
  'searchAreaId',
  'searchAreaIds',
]);

const GEOGRAPHY_KEYS = new Set([...RETIRED_GEOGRAPHY_KEYS, 'canonicalPlaceId']);

function canonicalTransactionPath(transactionType: TransactionType): string {
  if (transactionType === 'to-rent') return '/property-to-rent';
  if (transactionType === 'developments') return '/new-developments';
  return '/property-for-sale';
}

/**
 * Builds a saved-search URL only when its geography uses the current Place
 * identity. Old display text and runtime row IDs fail
 * closed instead of silently becoming a broader country search.
 */
export function buildCanonicalSearchUrl(criteria: SearchCriteria): string {
  if (
    [...RETIRED_GEOGRAPHY_KEYS].some(
      key => criteria[key] !== undefined && criteria[key] !== null && criteria[key] !== '',
    )
  ) {
    return '/';
  }

  const canonicalPlaceId = criteria.canonicalPlaceId;
  if (canonicalPlaceId !== undefined &&
      (typeof canonicalPlaceId !== 'string' || !isCanonicalPlaceId(canonicalPlaceId))) {
    return '/';
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(criteria)) {
    if (GEOGRAPHY_KEYS.has(key) || value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      value.forEach(item => {
        if (item !== undefined && item !== null && item !== '') params.append(key, String(item));
      });
    } else {
      params.set(key, String(value));
    }
  }

  if (typeof canonicalPlaceId === 'string') params.set('canonicalPlaceId', canonicalPlaceId);

  const transaction = resolveExplicitTransactionType('/', params);
  if (transaction.invalid || !transaction.transactionType) return '/';
  const root = canonicalTransactionPath(transaction.transactionType);
  const intent = resolveSearchIntent(root, {}, params);
  if (intent.validation || !intent.transactionType) return '/';
  return generateIntentUrl(intent);
}

/** The navigation bar reads journey state only from the two live result roots. */
export function getListingTypeForPath(path: string): 'sale' | 'rent' | null {
  const pathname = path.split('?')[0];
  if (pathname === '/property-for-sale') return 'sale';
  if (pathname === '/property-to-rent') return 'rent';
  return null;
}
