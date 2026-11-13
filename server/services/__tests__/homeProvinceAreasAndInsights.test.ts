import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

import { HOME_MARKET_INSIGHTS_TTL_MS, homeMarketInsightsService, resetHomeMarketInsightsCache } from '../homeMarketInsightsService';
import { homeAreasService, resetHomeAreasCache } from '../homeAreasService';
import { appRouter } from '../../routers';

const PROV = 'prov';
const OTHER_PROV = 'prov-other';
const JHB = 'jhb';
const PTA = 'pta';
const CEN = 'cen';
const BEN = 'ben';
const SUB_JHB = 'sub-jhb';
const HIDDEN = 'hidden-city';

type Place = {
  scope: 'province' | 'metro_city' | 'locality';
  label: string;
  placeType?: string;
  province?: string;
  city?: string;
  cityId?: string;
};

const PLACES: Record<string, Place> = {
  [PROV]: { scope: 'province', label: 'Gauteng', placeType: 'province' },
  [OTHER_PROV]: { scope: 'province', label: 'Western Cape', placeType: 'province' },
  [JHB]: { scope: 'metro_city', label: 'Johannesburg', placeType: 'city' },
  [PTA]: { scope: 'metro_city', label: 'Pretoria', placeType: 'city' },
  [CEN]: { scope: 'metro_city', label: 'Centurion', placeType: 'town' },
  [BEN]: { scope: 'metro_city', label: 'Benoni', placeType: 'town' },
  [HIDDEN]: { scope: 'metro_city', label: 'Hidden', placeType: 'town' },
  [SUB_JHB]: { scope: 'locality', label: 'Rosebank', placeType: 'suburb', cityId: JHB },
  'other-city': { scope: 'metro_city', label: 'Cape Town', placeType: 'city', province: OTHER_PROV },
};

function installProjection() {
  const executions = new Map();
  const labels = new Map();
  for (const [id, p] of Object.entries(PLACES)) {
    const provId = p.scope === 'province' ? id : (p.province ?? PROV);
    const cityId = p.scope === 'metro_city' ? id : (p.cityId ?? null);
    executions.set(id, { placeId: id, scope: p.scope, provincePlaceId: provId, cityPlaceId: cityId });
    labels.set(id, {
      label: p.label,
      placeType: p.placeType,
      province: PLACES[provId].label,
      city: cityId ? PLACES[cityId].label : '',
      locality: p.scope === 'locality' ? p.label : '',
    });
  }
  // Mirror loadCanonicalPlaceSearchProjection: it only returns what was asked for
  // (the province and its members), so asking for another province gives that one.
  mockLoadProjection.mockImplementation(async (_db: unknown, options: { placeIds: string[] }) => {
    const wanted = options.placeIds[0];
    if (!PLACES[wanted]) return { executions: new Map(), labels: new Map() };
    const keep = (id: string) =>
      id === wanted || executions.get(id).provincePlaceId === wanted;
    return {
      executions: new Map([...executions].filter(([id]) => keep(id))),
      labels: new Map([...labels].filter(([id]) => keep(id))),
    };
  });
}

type Row = { id: number; type?: 'sale' | 'rent'; price?: number; place: string; size?: number | null };
let selectWhere: ReturnType<typeof vi.fn>;

function install(rows: Row[], eligibleIds?: number[]) {
  selectWhere = vi.fn().mockResolvedValue(
    rows.map(row => ({
      id: row.id,
      listingType: row.type ?? 'sale',
      price: row.price ?? 1_000_000,
      sizeM2: row.size ?? null,
      canonicalPlaceId: row.place,
    })),
  );
  mockGetDb.mockResolvedValue({ select: () => ({ from: () => ({ where: selectWhere }) }) });
  const ids = eligibleIds ?? rows.map(row => row.id);
  mockResolveEligibilities.mockResolvedValue(new Map(ids.map(id => [id, { property: { id } }])));
}

function rows(place: string, count: number, start: number, type: 'sale' | 'rent' = 'sale', price = 1_000_000): Row[] {
  return Array.from({ length: count }, (_, i) => ({ id: start + i, place, type, price }));
}

function reset() {
  resetHomeMarketInsightsCache();
  resetHomeAreasCache();
  mockGetDb.mockReset();
  mockResolveEligibilities.mockReset();
  mockPlaceUrl.mockReset();
  mockPlaceUrl.mockImplementation((placeId: string) =>
    placeId === HIDDEN
      ? { path: '/x', publication_eligible: false, lifecycle_status: 'active' }
      : { path: `/gauteng/${placeId}`, publication_eligible: true, lifecycle_status: 'active' },
  );
  installProjection();
}

describe('homeAreasService.getPopularAreasByProvince', () => {
  beforeEach(reset);
  afterEach(() => vi.useRealTimers());

  it('sums sale and rent per city, rolls localities up and orders by count then name', async () => {
    install([
      ...rows(JHB, 2, 1, 'sale'),
      ...rows(JHB, 1, 10, 'rent'),
      ...rows(SUB_JHB, 1, 20, 'rent'),
      ...rows(PTA, 4, 30, 'sale'),
      ...rows(CEN, 4, 40, 'rent'),
    ]);
    const result = await homeAreasService.getPopularAreasByProvince({ provincePlaceId: PROV, limit: 3 });
    expect(result.province).toEqual({ placeId: PROV, name: 'Gauteng', href: '/gauteng/prov' });
    expect(result.totalListings).toBe(12);
    expect(result.areas.map(a => [a.name, a.listingCount, a.saleCount, a.rentCount, a.kind])).toEqual([
      ['Centurion', 4, 0, 4, 'city'],
      ['Johannesburg', 4, 2, 2, 'city'],
      ['Pretoria', 4, 4, 0, 'city'],
    ]);
    expect(result.areas[1].href).toBe('/gauteng/jhb');
    expect(Number.isNaN(Date.parse(result.computedAt))).toBe(false);
  });

  it('ignores ineligible listings and excludes cities without a published URL', async () => {
    install(
      [...rows(JHB, 3, 1), ...rows(HIDDEN, 5, 10), ...rows(PTA, 2, 20)],
      [1, 2, 20],
    );
    const result = await homeAreasService.getPopularAreasByProvince({ provincePlaceId: PROV, limit: 12 });
    const counted = result.areas.filter(a => a.listingCount > 0).map(a => [a.name, a.listingCount]);
    expect(counted).toEqual([
      ['Johannesburg', 2],
      ['Pretoria', 1],
    ]);
    expect(result.areas.some(a => a.placeId === HIDDEN)).toBe(false);
  });

  it('fills with zero-count published cities in priority order without duplicates', async () => {
    install(rows(BEN, 2, 1));
    const result = await homeAreasService.getPopularAreasByProvince({ provincePlaceId: PROV, limit: 4 });
    expect(result.areas.map(a => [a.name, a.listingCount])).toEqual([
      ['Benoni', 2],
      ['Johannesburg', 0],
      ['Pretoria', 0],
      ['Centurion', 0],
    ]);
    expect(new Set(result.areas.map(a => a.placeId)).size).toBe(result.areas.length);
    expect(result.areas.every(a => a.href.startsWith('/'))).toBe(true);
  });

  it('returns only zero-count fallback cities when the province has no listings, never the unpublished or other-province ones', async () => {
    install([]);
    const result = await homeAreasService.getPopularAreasByProvince({ provincePlaceId: PROV });
    expect(result.totalListings).toBe(0);
    expect(result.areas.map(a => a.name)).toEqual(['Johannesburg', 'Pretoria', 'Centurion', 'Benoni']);
    expect(result.areas.every(a => a.listingCount === 0)).toBe(true);
  });

  it('queries only the province places and sale or rent listings', async () => {
    install([]);
    await homeAreasService.getPopularAreasByProvince({ provincePlaceId: PROV });
    const { MySqlDialect } = await import('drizzle-orm/mysql-core');
    const { sql: text, params } = new MySqlDialect().sqlToQuery(selectWhere.mock.calls[0][0]);
    expect(text).toContain('`properties`.`listingType` in (?, ?)');
    expect(text).toContain('`properties`.`canonical_place_id` in');
    expect(params).toEqual(expect.arrayContaining(['sale', 'rent', JHB, SUB_JHB]));
    expect(params).not.toContain('other-city');
  });

  it('rejects an unknown, city or locality id as BAD_REQUEST', async () => {
    install([]);
    for (const id of ['nope', JHB, SUB_JHB]) {
      await expect(
        homeAreasService.getPopularAreasByProvince({ provincePlaceId: id }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    }
  });

  it('serves the cache within the TTL, keyed by input, and recomputes after it', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-12T08:00:00Z'));
    install(rows(JHB, 1, 1));
    const first = await homeAreasService.getPopularAreasByProvince({ provincePlaceId: PROV });
    vi.setSystemTime(Date.now() + HOME_MARKET_INSIGHTS_TTL_MS - 1000);
    expect(await homeAreasService.getPopularAreasByProvince({ provincePlaceId: PROV })).toBe(first);
    expect(selectWhere).toHaveBeenCalledTimes(1);
    await homeAreasService.getPopularAreasByProvince({ provincePlaceId: PROV, limit: 2 });
    expect(selectWhere).toHaveBeenCalledTimes(2);
    vi.setSystemTime(Date.now() + 2000);
    expect(await homeAreasService.getPopularAreasByProvince({ provincePlaceId: PROV })).not.toBe(first);
    expect(selectWhere).toHaveBeenCalledTimes(3);
  });
});

describe('homeMarketInsightsService.getProvinceInsights', () => {
  beforeEach(reset);
  afterEach(() => vi.useRealTimers());

  it('summarises the whole province, names the leading city and builds bands', async () => {
    install([
      ...rows(JHB, 2, 1, 'sale', 500_000),
      ...rows(SUB_JHB, 1, 10, 'sale', 1_500_000),
      ...rows(PTA, 2, 20, 'sale', 3_000_000),
      ...rows(CEN, 1, 30, 'sale', 12_000_000),
    ]);
    const result = await homeMarketInsightsService.getProvinceInsights({ provincePlaceId: PROV });
    expect(result.province).toMatchObject({
      placeId: PROV,
      name: 'Gauteng',
      provinceName: 'Gauteng',
      href: '/gauteng/prov',
      activeSaleListings: 6,
      sampleSize: 6,
      medianAskingPrice: 2_250_000,
      typicalPricePerM2: null,
      leadingLocality: { name: 'Johannesburg', listingCount: 3, href: '/gauteng/jhb' },
    });
    expect(result.province!.askingPriceBands.map(b => b.count)).toEqual([2, 1, 2, 0, 1]);
    // Only Johannesburg (2 + 1 via Rosebank) reaches 3; Pretoria has 2, Centurion 1.
    expect(result.cities.map(c => [c.name, c.activeSaleListings])).toEqual([['Johannesburg', 3]]);
  });

  it('returns a null province below 3 listings, even when a city would qualify elsewhere', async () => {
    install(rows(JHB, 2, 1));
    const result = await homeMarketInsightsService.getProvinceInsights({ provincePlaceId: PROV });
    expect(result).toEqual({ province: null, cities: [] });
  });

  it('keeps only cities with at least 3 listings, by count then name, capped at 8', async () => {
    install([...rows(PTA, 3, 1), ...rows(JHB, 5, 10), ...rows(CEN, 3, 30), ...rows(BEN, 2, 40)]);
    const result = await homeMarketInsightsService.getProvinceInsights({ provincePlaceId: PROV });
    expect(result.cities.map(c => [c.name, c.activeSaleListings])).toEqual([
      ['Johannesburg', 5],
      ['Centurion', 3],
      ['Pretoria', 3],
    ]);
    expect(result.province!.activeSaleListings).toBe(13);
  });

  it('ignores ineligible listings and does not read other provinces', async () => {
    install([...rows(JHB, 4, 1), ...rows('other-city', 3, 10)], [1, 2, 3, 10, 11, 12]);
    const result = await homeMarketInsightsService.getProvinceInsights({ provincePlaceId: PROV });
    // The query only carries this province's places; the mock still returns other-city rows,
    // which are excluded because they are not labelled members of the province projection.
    expect(result.province!.activeSaleListings).toBe(3);
    expect(result.cities.map(c => c.name)).toEqual(['Johannesburg']);
  });

  it('rejects non-province ids and caches per province', async () => {
    install(rows(JHB, 3, 1));
    await expect(
      homeMarketInsightsService.getProvinceInsights({ provincePlaceId: JHB }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    const first = await homeMarketInsightsService.getProvinceInsights({ provincePlaceId: PROV });
    expect(await homeMarketInsightsService.getProvinceInsights({ provincePlaceId: PROV })).toBe(first);
    expect(selectWhere).toHaveBeenCalledTimes(1);
  });
});

describe('router inputs', () => {
  const caller = () => appRouter.createCaller({ req: { headers: {} }, res: {}, user: null } as any);
  beforeEach(() => {
    reset();
    install([]);
  });

  it('accepts valid homeAreas input and rejects bad input', async () => {
    await expect(
      caller().homeAreas.getPopularAreasByProvince({ provincePlaceId: PROV, limit: 12 }),
    ).resolves.toMatchObject({ totalListings: 0 });
    for (const bad of [
      {},
      { provincePlaceId: PROV, limit: 0 },
      { provincePlaceId: PROV, limit: 13 },
      { provincePlaceId: PROV, extra: 1 },
    ]) {
      await expect(caller().homeAreas.getPopularAreasByProvince(bad as any)).rejects.toThrow();
    }
    await expect(
      caller().homeAreas.getPopularAreasByProvince({ provincePlaceId: JHB }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('validates getProvinceInsights input strictly', async () => {
    await expect(
      caller().homeMarketInsights.getProvinceInsights({ provincePlaceId: PROV }),
    ).resolves.toEqual({ province: null, cities: [] });
    for (const bad of [{}, { provincePlaceId: PROV, extra: 1 }]) {
      await expect(caller().homeMarketInsights.getProvinceInsights(bad as any)).rejects.toThrow();
    }
  });
});
