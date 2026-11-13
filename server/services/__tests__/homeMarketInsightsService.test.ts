import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MySqlDialect } from 'drizzle-orm/mysql-core';

const { mockGetDb, mockLoadProjection, mockResolveEligibilities, mockPlaceUrl } = vi.hoisted(
  () => ({
    mockGetDb: vi.fn(),
    mockLoadProjection: vi.fn(),
    mockResolveEligibilities: vi.fn(),
    mockPlaceUrl: vi.fn(),
  }),
);

vi.mock('../../db', () => ({ getDb: mockGetDb }));
vi.mock('../canonicalPlaceSearchService', () => ({
  loadCanonicalPlaceSearchProjection: mockLoadProjection,
}));
vi.mock('../publicPropertyEligibilityService', () => ({
  resolvePublicPropertyEligibilities: mockResolveEligibilities,
}));
vi.mock('../canonicalPlaceUrlService', () => ({ canonicalPlaceUrlByPlaceId: mockPlaceUrl }));

import {
  HOME_MARKET_INSIGHTS_TTL_MS,
  homeMarketInsightsService,
  resetHomeMarketInsightsCache,
} from '../homeMarketInsightsService';
import { appRouter } from '../../routers';

type Row = { id: number; price: number; sizeM2?: number | string | null; place: string };

const CITY_A = 'city-a';
const CITY_B = 'city-b';
const SUB_X = 'sub-x';
const SUB_Y = 'sub-y';

function installProjection() {
  const places: Record<string, any> = {
    [CITY_A]: { scope: 'metro_city', city: 'Alpha', locality: '' },
    [CITY_B]: { scope: 'metro_city', city: 'Beta', locality: '' },
    [SUB_X]: { scope: 'locality', city: 'Alpha', locality: 'Xenon', cityId: CITY_A },
    [SUB_Y]: { scope: 'locality', city: 'Alpha', locality: 'Argon', cityId: CITY_A },
  };
  const executions = new Map();
  const labels = new Map();
  for (const [id, p] of Object.entries(places)) {
    executions.set(id, {
      placeId: id,
      scope: p.scope,
      provincePlaceId: 'prov',
      cityPlaceId: p.scope === 'metro_city' ? id : p.cityId,
    });
    labels.set(id, { province: 'Gauteng', city: p.city, locality: p.locality });
  }
  mockLoadProjection.mockResolvedValue({ executions, labels });
}

let selectWhere: ReturnType<typeof vi.fn>;

function install(rows: Row[], eligibleIds?: number[]) {
  selectWhere = vi.fn().mockResolvedValue(
    rows.map(row => ({
      id: row.id,
      price: row.price,
      sizeM2: row.sizeM2 ?? null,
      canonicalPlaceId: row.place,
    })),
  );
  mockGetDb.mockResolvedValue({ select: () => ({ from: () => ({ where: selectWhere }) }) });
  const ids = eligibleIds ?? rows.map(row => row.id);
  mockResolveEligibilities.mockResolvedValue(new Map(ids.map(id => [id, { property: { id } }])));
  installProjection();
}

function rowsFor(place: string, prices: number[], startId = 1, size?: number): Row[] {
  return prices.map((price, index) => ({
    id: startId + index,
    price,
    place,
    sizeM2: size ?? null,
  }));
}

describe('homeMarketInsightsService.getHomepageCityInsights', () => {
  beforeEach(() => {
    resetHomeMarketInsightsCache();
    mockGetDb.mockReset();
    mockLoadProjection.mockReset();
    mockResolveEligibilities.mockReset();
    mockPlaceUrl.mockReset();
    mockPlaceUrl.mockImplementation((placeId: string) => ({
      path: `/gauteng/${placeId}`,
      publication_eligible: true,
      lifecycle_status: 'active',
    }));
  });
  afterEach(() => vi.useRealTimers());

  it('excludes a city with 2 listings and includes one with 3', async () => {
    install([
      ...rowsFor(CITY_A, [1, 2, 3].map(n => n * 1_000_000), 1),
      ...rowsFor(CITY_B, [1_000_000, 2_000_000], 10),
    ]);
    const result = await homeMarketInsightsService.getHomepageCityInsights();
    expect(result.map(city => city.name)).toEqual(['Alpha']);
    expect(result[0]).toMatchObject({
      placeId: CITY_A,
      provinceName: 'Gauteng',
      href: '/gauteng/city-a',
      activeSaleListings: 3,
      sampleSize: 3,
    });
    expect(Number.isNaN(Date.parse(result[0].computedAt))).toBe(false);
  });

  it('computes the median for odd and even counts', async () => {
    install([
      ...rowsFor(CITY_A, [3_000_000, 1_000_000, 2_000_000], 1),
      ...rowsFor(CITY_B, [1_000_000, 2_000_000, 3_000_000, 4_000_000], 10),
    ]);
    const result = await homeMarketInsightsService.getHomepageCityInsights();
    expect(result.find(city => city.name === 'Alpha')!.medianAskingPrice).toBe(2_000_000);
    expect(result.find(city => city.name === 'Beta')!.medianAskingPrice).toBe(2_500_000);
  });

  it('orders by listing count desc then name asc and applies the limit', async () => {
    install([
      ...rowsFor(CITY_B, [1, 1, 1].map(n => n * 1_000_000), 10),
      ...rowsFor(CITY_A, [1, 1, 1].map(n => n * 1_000_000), 1),
      ...rowsFor(CITY_A, [1_000_000], 30),
    ]);
    expect((await homeMarketInsightsService.getHomepageCityInsights()).map(c => c.name)).toEqual([
      'Alpha',
      'Beta',
    ]);
    resetHomeMarketInsightsCache();
    expect(
      (await homeMarketInsightsService.getHomepageCityInsights({ limit: 1 })).map(c => c.name),
    ).toEqual(['Alpha']);
  });

  it('returns null price per m2 below 3 sized listings and a median at 3', async () => {
    install([
      { id: 1, price: 2_000_000, sizeM2: 100, place: CITY_A },
      { id: 2, price: 3_000_000, sizeM2: '100.00', place: CITY_A },
      { id: 3, price: 4_000_000, sizeM2: 0, place: CITY_A },
      { id: 4, price: 1_000_000, sizeM2: 100, place: CITY_B },
      { id: 5, price: 3_000_000, sizeM2: 100, place: CITY_B },
      { id: 6, price: 2_000_000, sizeM2: 100, place: CITY_B },
    ]);
    const result = await homeMarketInsightsService.getHomepageCityInsights();
    expect(result.find(city => city.name === 'Alpha')!.typicalPricePerM2).toBeNull();
    expect(result.find(city => city.name === 'Beta')!.typicalPricePerM2).toBe(20_000);
  });

  it('places exact R1m, R2m, R5m and R10m boundaries in the upper band', async () => {
    install(
      rowsFor(CITY_A, [999_999, 1_000_000, 2_000_000, 5_000_000, 10_000_000, 4_999_999], 1),
    );
    const [city] = await homeMarketInsightsService.getHomepageCityInsights();
    expect(city.askingPriceBands.map(band => [band.label, band.count])).toEqual([
      ['Under R1m', 1],
      ['R1m – R2m', 1],
      ['R2m – R5m', 2],
      ['R5m – R10m', 1],
      ['Over R10m', 1],
    ]);
  });

  it('keeps zero-count bands in a qualifying city', async () => {
    install(rowsFor(CITY_A, [500_000, 600_000, 700_000], 1));
    const [city] = await homeMarketInsightsService.getHomepageCityInsights();
    expect(city.askingPriceBands).toHaveLength(5);
    expect(city.askingPriceBands.map(band => band.count)).toEqual([3, 0, 0, 0, 0]);
  });

  it('picks the leading locality by count and breaks ties by name ascending', async () => {
    install([
      ...rowsFor(SUB_X, [1_000_000, 1_000_000], 1),
      ...rowsFor(SUB_Y, [1_000_000, 1_000_000], 10),
      ...rowsFor(CITY_A, [1_000_000], 20),
    ]);
    const [city] = await homeMarketInsightsService.getHomepageCityInsights();
    expect(city.activeSaleListings).toBe(5);
    expect(city.leadingLocality).toEqual({
      name: 'Argon',
      listingCount: 2,
      href: '/gauteng/sub-y',
    });
  });

  it('returns a null locality href when the place has no published URL and null locality when none', async () => {
    install(rowsFor(SUB_X, [1_000_000, 1_000_000, 1_000_000], 1));
    mockPlaceUrl.mockImplementation((placeId: string) =>
      placeId === SUB_X ? null : { path: '/c', publication_eligible: true, lifecycle_status: 'active' },
    );
    const [city] = await homeMarketInsightsService.getHomepageCityInsights();
    expect(city.leadingLocality).toEqual({ name: 'Xenon', listingCount: 3, href: null });
    resetHomeMarketInsightsCache();
    install(rowsFor(CITY_A, [1_000_000, 1_000_000, 1_000_000], 1));
    const [flat] = await homeMarketInsightsService.getHomepageCityInsights();
    expect(flat.leadingLocality).toBeNull();
  });

  it('ignores ineligible listings and zero or invalid prices', async () => {
    install(
      [
        ...rowsFor(CITY_A, [1_000_000, 1_000_000, 1_000_000], 1),
        { id: 4, price: 5_000_000, place: CITY_A },
        { id: 5, price: 0, place: CITY_A },
        { id: 6, price: Number.NaN, place: CITY_A },
        { id: 7, price: 1_000_000, place: 'unlabelled-place' },
      ],
      [1, 2, 3, 5, 6, 7],
    );
    const [city] = await homeMarketInsightsService.getHomepageCityInsights();
    expect(city.activeSaleListings).toBe(3);
    expect(city.medianAskingPrice).toBe(1_000_000);
  });

  it('restricts the candidate query to published sale listings with a price', async () => {
    install(rowsFor(CITY_A, [1_000_000, 1_000_000, 1_000_000], 1));
    await homeMarketInsightsService.getHomepageCityInsights();
    const { sql: text } = new MySqlDialect().sqlToQuery(selectWhere.mock.calls[0][0]);
    expect(text).toContain('`properties`.`listingType` = ?');
    expect(text).toContain('`properties`.`price` > ?');
    expect(text).toContain('`properties`.`status` = ?');
    expect(text).toContain('`properties`.`sourceListingId` IS NOT NULL');
    expect(text).toContain("<> 'commercial'");
  });

  it('serves the cached object within the TTL and recomputes after it', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-12T08:00:00Z'));
    install(rowsFor(CITY_A, [1_000_000, 1_000_000, 1_000_000], 1));
    const first = await homeMarketInsightsService.getHomepageCityInsights();
    vi.setSystemTime(Date.now() + HOME_MARKET_INSIGHTS_TTL_MS - 1000);
    expect(await homeMarketInsightsService.getHomepageCityInsights()).toBe(first);
    expect(selectWhere).toHaveBeenCalledTimes(1);
    vi.setSystemTime(Date.now() + 2000);
    const third = await homeMarketInsightsService.getHomepageCityInsights();
    expect(third).not.toBe(first);
    expect(selectWhere).toHaveBeenCalledTimes(2);
  });
});

describe('homeMarketInsights router input', () => {
  const caller = () =>
    appRouter.createCaller({ req: { headers: {} }, res: {}, user: null } as any);

  beforeEach(() => {
    resetHomeMarketInsightsCache();
    mockGetDb.mockReset();
    install([]);
  });

  it('accepts no input, an empty object and a valid limit', async () => {
    await expect(caller().homeMarketInsights.getHomepageCityInsights()).resolves.toEqual([]);
    await expect(caller().homeMarketInsights.getHomepageCityInsights({})).resolves.toEqual([]);
    await expect(
      caller().homeMarketInsights.getHomepageCityInsights({ limit: 12 }),
    ).resolves.toEqual([]);
  });

  it('rejects out-of-range, non-integer and unknown input', async () => {
    for (const bad of [{ limit: 0 }, { limit: 13 }, { limit: 1.5 }, { limit: 3, extra: 1 }]) {
      await expect(
        caller().homeMarketInsights.getHomepageCityInsights(bad as any),
      ).rejects.toThrow();
    }
  });
});
