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

const PLACE_ID = 'pl-place-01-000000000000000000000001';

describe('canonical property search return state', () => {
  it('stores and restores an exact canonical Place Rent URL', () => {
    const storage = createStorage();
    const path = `/property-to-rent?canonicalPlaceId=${PLACE_ID}&propertyType=apartment&minPrice=5000&page=2`;

    rememberPropertySearchReturn(storage, path, 'to-rent');

    expect(storage.getItem(PROPERTY_SEARCH_RETURN_KEY)).toBe(path);
    expect(getPropertySearchReturn(storage, 'to-rent')).toBe(path);
  });

  it('does not restore another transaction or an invalid legacy geography URL', () => {
    const storage = createStorage();
    rememberPropertySearchReturn(storage, `/property-for-sale?canonicalPlaceId=${PLACE_ID}`, 'for-sale');

    expect(getPropertySearchReturn(storage, 'to-rent')).toBeNull();
    expect(isTransactionalSearchPath('/favorites', 'to-rent')).toBe(false);
    expect(isTransactionalSearchPath('/property-to-rent?city=cape-town', 'to-rent')).toBe(false);
    expect(
      isTransactionalSearchPath('/property-to-rent?locationId=city%3A12', 'to-rent'),
    ).toBe(false);
  });

  it('does not read or write the retired Buy-specific key', () => {
    const storage = createStorage();
    rememberPropertySearchReturn(storage, '/property-for-sale?city=durban&page=3', 'for-sale');

    expect(storage.getItem(PROPERTY_SEARCH_RETURN_KEY)).toBeNull();
    expect(storage.getItem('buy-search-return')).toBeNull();
    storage.setItem('buy-search-return', '/property-for-sale?city=durban&page=3');
    expect(getPropertySearchReturn(storage, 'for-sale')).toBeNull();
  });
});
