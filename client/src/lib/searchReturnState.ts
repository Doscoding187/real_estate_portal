import { resolveSearchIntent } from './searchIntent';

export const PROPERTY_SEARCH_RETURN_KEY = 'property-search-return';

type TransactionSearch = 'for-sale' | 'to-rent';

function searchRootFor(transactionType: TransactionSearch) {
  return transactionType === 'to-rent' ? '/property-to-rent' : '/property-for-sale';
}

export function isTransactionalSearchPath(path: string, transactionType: TransactionSearch) {
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  try {
    const url = new URL(path, 'https://property-listify.local');
    if (url.origin !== 'https://property-listify.local' || url.hash) return false;
    if (url.pathname !== searchRootFor(transactionType)) return false;
    const intent = resolveSearchIntent(url.pathname, {}, url.searchParams);
    return intent.transactionType === transactionType && !intent.validation;
  } catch {
    return false;
  }
}

export function rememberPropertySearchReturn(
  storage: Pick<Storage, 'setItem'> | undefined,
  path: string,
  transactionType: TransactionSearch,
) {
  if (!storage || !isTransactionalSearchPath(path, transactionType)) return;

  try {
    storage.setItem(PROPERTY_SEARCH_RETURN_KEY, path);
  } catch {
    // A blocked session store must not prevent opening a listing.
  }
}

export function getPropertySearchReturn(
  storage: Pick<Storage, 'getItem'> | undefined,
  transactionType: TransactionSearch,
): string | null {
  if (!storage) return null;

  try {
    const shared = storage.getItem(PROPERTY_SEARCH_RETURN_KEY);
    if (shared && isTransactionalSearchPath(shared, transactionType)) return shared;

    return null;
  } catch {
    return null;
  }
}
