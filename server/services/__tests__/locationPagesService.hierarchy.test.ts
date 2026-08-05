import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDb } = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock('../../db', () => ({ getDb }));

import { locationPagesService } from '../locationPagesService';

function makeDb(results: unknown[]) {
  const select = vi.fn(() => {
    const result = results.shift();
    const query: Record<string, any> = {};

    for (const method of [
      'from',
      'innerJoin',
      'leftJoin',
      'where',
      'groupBy',
      'orderBy',
      'limit',
    ]) {
      query[method] = vi.fn(() => query);
    }

    query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject);

    return query;
  });

  return { select };
}

describe('locationPagesService canonical hierarchy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fails closed for an unknown province slug', async () => {
    const db = makeDb([[]]);
    getDb.mockResolvedValue(db);

    await expect(locationPagesService.getProvinceData('not-a-province')).resolves.toBeNull();
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it('fails closed when a city is not under the requested province', async () => {
    const db = makeDb([[]]);
    getDb.mockResolvedValue(db);

    await expect(
      locationPagesService.getCityData('western-cape', 'johannesburg'),
    ).resolves.toBeNull();
    expect(db.select).toHaveBeenCalledTimes(1);
    const cityLookup = db.select.mock.results[0].value;
    expect(cityLookup.innerJoin).toHaveBeenCalledTimes(1);
    expect(cityLookup.where).toHaveBeenCalledTimes(1);
  });

  it('fails closed when a suburb is not under the requested city and province', async () => {
    const db = makeDb([[]]);
    getDb.mockResolvedValue(db);

    await expect(
      locationPagesService.getSuburbData('western-cape', 'cape-town', 'sandton'),
    ).resolves.toBeNull();
    expect(db.select).toHaveBeenCalledTimes(1);
    const suburbLookup = db.select.mock.results[0].value;
    expect(suburbLookup.innerJoin).toHaveBeenCalledTimes(2);
    expect(suburbLookup.where).toHaveBeenCalledTimes(1);
  });

  it('does not fetch a city listing preview in neutral mode', async () => {
    const db = makeDb([
      [
        {
          id: 12,
          name: 'Johannesburg',
          slug: 'johannesburg',
          provinceId: 1,
          provinceName: 'Gauteng',
          provinceSlug: 'gauteng',
          isMetro: 1,
          latitude: null,
          longitude: null,
        },
      ],
      [],
      [],
      [{ totalListings: 0, avgPrice: 0 }],
      [],
    ]);
    getDb.mockResolvedValue(db);

    const result = await locationPagesService.getCityData('gauteng', 'johannesburg', {
      includeInventoryPreview: false,
    });

    expect(result?.city.slug).toBe('johannesburg');
    expect(result?.featuredProperties).toEqual([]);
    expect(db.select).toHaveBeenCalledTimes(5);
  });

  it('preserves unavailable locality aggregates instead of converting them to zero', async () => {
    const db = makeDb([
      [
        {
          id: 12,
          name: 'Johannesburg',
          slug: 'johannesburg',
          provinceId: 1,
          provinceName: 'Gauteng',
          provinceSlug: 'gauteng',
          isMetro: 1,
          latitude: null,
          longitude: null,
        },
      ],
      [
        {
          id: 1,
          name: 'Sandton',
          slug: 'sandton',
          listingCount: 0,
          avgPrice: null,
          avgSalePrice: null,
          avgRentalPrice: null,
          propertiesForSale: 0,
          propertiesForRent: 0,
        },
      ],
      [],
      [{ totalListings: 0, avgPrice: 0 }],
      [],
    ]);
    getDb.mockResolvedValue(db);

    const result = await locationPagesService.getCityData('gauteng', 'johannesburg', {
      includeInventoryPreview: false,
    });

    expect(result?.topLocalities[0]).toMatchObject({
      name: 'Sandton',
      avgSalePrice: null,
      avgRentalPrice: null,
      propertiesForSale: 0,
      propertiesForRent: 0,
    });
  });
});
