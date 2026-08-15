export const PROPERTY_SEARCH_RETURN_KEY = 'property-search-return';

const LEGACY_BUY_SEARCH_RETURN_KEY = 'buy-search-return';

type TransactionSearch = 'for-sale' | 'to-rent';

function searchRootFor(transactionType: TransactionSearch) {
  return transactionType === 'to-rent' ? '/property-to-rent' : '/property-for-sale';
}

export function isTransactionalSearchPath(path: string, transactionType: TransactionSearch) {
  const pathname = path.split('?')[0];
  return pathname === searchRootFor(transactionType);
}

export function rememberPropertySearchReturn(
  storage: Pick<Storage, 'setItem'> | undefined,
  path: string,
  transactionType: TransactionSearch,
) {
  if (!storage || !isTransactionalSearchPath(path, transactionType)) return;

  try {
    storage.setItem(PROPERTY_SEARCH_RETURN_KEY, path);
    // Keep the existing Buy key as a compatibility read path for older detail
    // tabs while both transactions converge on one canonical return authority.
    if (transactionType === 'for-sale') {
      storage.setItem(LEGACY_BUY_SEARCH_RETURN_KEY, path);
    }
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

    if (transactionType === 'for-sale') {
      const legacyBuy = storage.getItem(LEGACY_BUY_SEARCH_RETURN_KEY);
      if (legacyBuy && isTransactionalSearchPath(legacyBuy, transactionType)) return legacyBuy;
    }

    return null;
  } catch {
    return null;
  }
}
