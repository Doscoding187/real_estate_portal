import { describe, expect, it } from 'vitest';

import {
  getPropertySearchReturn,
  isTransactionalSearchPath,
  PROPERTY_SEARCH_RETURN_KEY,
  rememberPropertySearchReturn,
} from '@/lib/searchReturnState';

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe('transaction-neutral property search return state', () => {
  it('stores and restores the exact canonical Rent URL', () => {
    const storage = createStorage();
    const path =
      '/property-to-rent?province=gauteng&locationId=province%3A1&propertyType=apartment&minPrice=5000&maxPrice=12000&page=2';

    rememberPropertySearchReturn(storage, path, 'to-rent');

    expect(storage.getItem(PROPERTY_SEARCH_RETURN_KEY)).toBe(path);
    expect(getPropertySearchReturn(storage, 'to-rent')).toBe(path);
  });

  it('does not let a Rent detail recover a Buy search or arbitrary route', () => {
    const storage = createStorage();
    rememberPropertySearchReturn(storage, '/property-for-sale?city=cape-town', 'for-sale');

    expect(getPropertySearchReturn(storage, 'to-rent')).toBeNull();
    expect(isTransactionalSearchPath('/favorites', 'to-rent')).toBe(false);
    expect(isTransactionalSearchPath('/property-to-rent?propertyType=house', 'to-rent')).toBe(true);
  });

  it('keeps the legacy Buy key as a compatibility read path without changing Rent state', () => {
    const storage = createStorage();
    rememberPropertySearchReturn(storage, '/property-for-sale?city=durban&page=3', 'for-sale');
    rememberPropertySearchReturn(storage, '/property-to-rent?city=cape-town&page=2', 'to-rent');

    expect(storage.getItem('buy-search-return')).toBe('/property-for-sale?city=durban&page=3');
    expect(getPropertySearchReturn(storage, 'for-sale')).toBe(
      '/property-for-sale?city=durban&page=3',
    );
  });
});
