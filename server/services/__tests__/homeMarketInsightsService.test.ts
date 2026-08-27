import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDb, resolvePublicPropertyEligibilities } = vi.hoisted(() => ({
  getDb: vi.fn(),
  resolvePublicPropertyEligibilities: vi.fn(),
}));

vi.mock('../../db', () => ({ getDb }));
vi.mock('../publicPropertyEligibilityService', () => ({ resolvePublicPropertyEligibilities }));

import { homeMarketInsightsService } from '../homeMarketInsightsService';

function makeDb(results: unknown[]) {
  const select = vi.fn(() => {
    const result = results.shift();
    const query: Record<string, any> = {};
    for (const method of ['from', 'innerJoin', 'where', 'orderBy']) {
      query[method] = vi.fn(() => query);
    }
    query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject);
    return query;
  });
  return { select };
}

function resolution(property: Record<string, unknown>) {
  return { property } as any;
}

describe('homeMarketInsightsService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('derives city insight only from canonically eligible sale inventory', async () => {
    getDb.mockResolvedValue(
      makeDb([
        [
          {
            id: 12,
            name: 'Johannesburg',
            slug: 'johannesburg',
            provinceName: 'Gauteng',
            provinceSlug: 'gauteng',
          },
        ],
        [{ id: 501 }, { id: 502 }, { id: 503 }, { id: 504 }],
        [
          { id: 21, name: 'Sandton', slug: 'sandton' },
          { id: 22, name: 'Rosebank', slug: 'rosebank' },
        ],
      ]),
    );
    resolvePublicPropertyEligibilities.mockResolvedValue(
      new Map([
        [
          501,
          resolution({
            id: 501,
            cityId: 12,
            suburbId: 21,
            listingType: 'sale',
            price: 1_000_000,
            internalAreaM2: 100,
          }),
        ],
        [
          502,
          resolution({
            id: 502,
            cityId: 12,
            suburbId: 21,
            listingType: 'sale',
            price: 2_000_000,
            internalAreaM2: 100,
          }),
        ],
        [
          503,
          resolution({
            id: 503,
            cityId: 12,
            suburbId: 22,
            listingType: 'sale',
            price: 5_000_000,
            internalAreaM2: 100,
          }),
        ],
      ]),
    );

    await expect(homeMarketInsightsService.getHomepageCityInsights()).resolves.toEqual([
      expect.objectContaining({
        city: expect.objectContaining({ name: 'Johannesburg' }),
        activeListingCount: 3,
        medianAskingPrice: 2_000_000,
        typicalAskingPricePerM2: 20_000,
        priceDistribution: [
          { label: 'R1m – R2m', count: 1 },
          { label: 'R2m – R5m', count: 1 },
          { label: 'R5m – R10m', count: 1 },
        ],
        leadingLocalities: [
          { name: 'Sandton', slug: 'sandton', listingCount: 2 },
          { name: 'Rosebank', slug: 'rosebank', listingCount: 1 },
        ],
      }),
    ]);
    expect(resolvePublicPropertyEligibilities).toHaveBeenCalledWith([501, 502, 503, 504]);
  });

  it('does not report price metrics from a thin sample', async () => {
    getDb.mockResolvedValue(
      makeDb([
        [
          {
            id: 12,
            name: 'Johannesburg',
            slug: 'johannesburg',
            provinceName: 'Gauteng',
            provinceSlug: 'gauteng',
          },
        ],
        [{ id: 501 }, { id: 502 }, { id: 503 }],
        [],
      ]),
    );
    resolvePublicPropertyEligibilities.mockResolvedValue(
      new Map([
        [
          501,
          resolution({ cityId: 12, listingType: 'sale', price: 1_000_000, internalAreaM2: 100 }),
        ],
        [502, resolution({ cityId: 12, listingType: 'sale', price: null, internalAreaM2: null })],
        [503, resolution({ cityId: 12, listingType: 'sale', price: null, internalAreaM2: null })],
      ]),
    );

    await expect(homeMarketInsightsService.getHomepageCityInsights()).resolves.toEqual([
      expect.objectContaining({ medianAskingPrice: null, typicalAskingPricePerM2: null }),
    ]);
  });

  it('excludes eligible non-sale listings instead of mixing rental inventory into the snapshot', async () => {
    getDb.mockResolvedValue(
      makeDb([
        [
          {
            id: 12,
            name: 'Johannesburg',
            slug: 'johannesburg',
            provinceName: 'Gauteng',
            provinceSlug: 'gauteng',
          },
        ],
        [{ id: 501 }, { id: 502 }, { id: 503 }],
        [],
      ]),
    );
    resolvePublicPropertyEligibilities.mockResolvedValue(
      new Map([
        [501, resolution({ cityId: 12, listingType: 'rent', price: 10_000 })],
        [502, resolution({ cityId: 12, listingType: 'sale', price: 1_000_000 })],
        [503, resolution({ cityId: 12, listingType: 'sale', price: 2_000_000 })],
      ]),
    );

    await expect(homeMarketInsightsService.getHomepageCityInsights()).resolves.toEqual([]);
  });
});
