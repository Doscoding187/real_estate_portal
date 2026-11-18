import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb, mockLoadProjection, mockResolveEligibilities, mockPlaceUrl } = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockLoadProjection: vi.fn(),
  mockResolveEligibilities: vi.fn(),
  mockPlaceUrl: vi.fn(),
}));

vi.mock('../../db', () => ({ getDb: mockGetDb }));
vi.mock('../canonicalPlaceSearchService', () => ({
  loadCanonicalPlaceSearchProjection: mockLoadProjection,
}));
vi.mock('../publicPropertyEligibilityService', () => ({
  resolvePublicPropertyEligibilities: mockResolveEligibilities,
}));
vi.mock('../canonicalPlaceUrlService', () => ({ canonicalPlaceUrlByPlaceId: mockPlaceUrl }));
vi.mock('../publicPropertyDto', () => ({
  getPublicPropertyMarketFact: (resolution: { fact: unknown }) => resolution.fact,
}));

import { appRouter } from '../../routers';
import {
  buildPlaceCentroidIndex,
  haversineKm,
  type PlaceCentroidEntry,
} from '../placeCentroidService';
import {
  orderNeighbourhoods,
  percentDelta,
  placeGuideService,
  selectPlaceGuideCandidates,
} from '../placeGuideService';

const CITY = 'city-c';
const OTHER_CITY = 'city-o';
const SELF = 'sub-self';
const STEP = 0.01; // about 1.11 km of latitude

const entry = (
  id: string,
  lat: number | null,
  lng: number | null,
  parent: string | null,
  level: 'city' | 'suburb' = 'suburb',
): PlaceCentroidEntry => ({
  canonicalPlaceId: id,
  naturalKey: `gauteng/${id}`,
  level,
  parentCityPlaceId: parent,
  lat,
  lng,
  matchMethod: 'tier1_exact_path',
});

/** Same-city N1..N7 north of SELF; other-city X1..X3 interleaved, X4 far. */
const LAYOUT: Array<[string, number, string]> = [
  ['N1', 1 * STEP, CITY],
  ['N2', 2 * STEP, CITY],
  ['N3', 3 * STEP, CITY],
  ['N4', 4 * STEP, CITY],
  ['N5', 5 * STEP, CITY],
  ['N6', 6 * STEP, CITY],
  ['N7', 7 * STEP, CITY],
  ['X1', 0.005, OTHER_CITY],
  ['X2', -0.025, OTHER_CITY],
  ['X3', -0.045, OTHER_CITY],
  ['X4', -0.2, OTHER_CITY],
];

function centroidIndex(selfCentre: { lat: number; lng: number } | null = { lat: 0, lng: 0 }) {
  return buildPlaceCentroidIndex([
    entry(SELF, selfCentre?.lat ?? null, selfCentre?.lng ?? null, CITY),
    ...LAYOUT.map(([id, lat, parent]) => entry(id, lat, 0, parent)),
    entry(CITY, 1, 1, null, 'city'),
  ]);
}

type FactRow = { place: string; type?: 'sale' | 'rent'; price: number; area?: number | null };

function install(rows: FactRow[], opts: { ineligible?: number[] } = {}) {
  const ids = [SELF, CITY, OTHER_CITY, ...LAYOUT.map(([id]) => id)];
  mockPlaceUrl.mockImplementation((id: string) =>
    ids.includes(id)
      ? {
          place_id: id,
          preferred_public_name: `Name ${id}`,
          place_type: id === CITY || id === OTHER_CITY ? 'town' : 'suburb',
          search_scope: id === CITY || id === OTHER_CITY ? 'metro_city' : 'locality',
          province_place_id: 'prov',
          path: `/gauteng/${id}`,
          publication_eligible: true,
          lifecycle_status: 'active',
        }
      : id === 'prov'
        ? {
            place_id: 'prov',
            preferred_public_name: 'Gauteng',
            place_type: 'province',
            search_scope: 'province',
            province_place_id: 'prov',
            path: '/gauteng',
            publication_eligible: true,
            lifecycle_status: 'active',
          }
        : null,
  );
  mockLoadProjection.mockImplementation(async (_db: unknown, options: { placeIds: string[] }) => {
    const executions = new Map();
    const labels = new Map();
    for (const id of options.placeIds) {
      const parent = id === SELF || id.startsWith('N') ? CITY : OTHER_CITY;
      executions.set(id, {
        placeId: id,
        scope: id === CITY || id === OTHER_CITY ? 'metro_city' : 'locality',
        provincePlaceId: 'prov',
        cityPlaceId: parent,
      });
      labels.set(id, { label: id });
    }
    return { executions, labels };
  });
  const selectWhere = vi.fn().mockResolvedValue(
    rows.map((row, index) => ({
      id: index + 1,
      listingType: row.type ?? 'sale',
      canonicalPlaceId: row.place,
      internalAreaM2: row.area ?? null,
    })),
  );
  mockGetDb.mockResolvedValue({ select: () => ({ from: () => ({ where: selectWhere }) }) });
  const ineligible = new Set(opts.ineligible ?? []);
  mockResolveEligibilities.mockResolvedValue(
    new Map(
      rows.flatMap((row, index) =>
        ineligible.has(index + 1)
          ? []
          : [
              [
                index + 1,
                {
                  fact: {
                    transactionType: row.type ?? 'sale',
                    propertyType: 'house',
                    bedrooms: 3,
                    price: row.price,
                  },
                },
              ],
            ],
      ),
    ),
  );
  return selectWhere;
}

const many = (place: string, count: number, price = 1_000_000, area: number | null = null): FactRow[] =>
  Array.from({ length: count }, () => ({ place, price, area }));

beforeEach(() => {
  mockGetDb.mockReset();
  mockLoadProjection.mockReset();
  mockResolveEligibilities.mockReset();
  mockPlaceUrl.mockReset();
});

describe('haversineKm', () => {
  it('Sandton to Rosebank is about 4-6 km using the real source centroids', () => {
    const source = JSON.parse(
      readFileSync(
        resolve(
          process.cwd(),
          'data/geography-coverage-v0.1/output/gauteng_runtime_reference_projection_v0.2.json',
        ),
        'utf8',
      ),
    ) as { rows: Array<{ runtime_natural_key: string; latitude?: number; longitude?: number }> };
    const find = (key: string) => {
      const row = source.rows.find(candidate => candidate.runtime_natural_key === key)!;
      return { lat: row.latitude as number, lng: row.longitude as number };
    };
    const km = haversineKm(find('gauteng/johannesburg/sandton'), find('gauteng/rosebank'));
    expect(km).toBeGreaterThan(4);
    expect(km).toBeLessThan(6);
  });

  it('is zero for identical points and symmetric', () => {
    const a = { lat: -26.1, lng: 28.05 };
    const b = { lat: -26.15, lng: 28.04 };
    expect(haversineKm(a, a)).toBe(0);
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 9);
  });
});

describe('percentDelta', () => {
  it('is null unless both sides are medians and rounds to whole percent with sign', () => {
    expect(percentDelta(null, 100)).toBeNull();
    expect(percentDelta(100, null)).toBeNull();
    expect(percentDelta(100, 112)).toBe(12);
    expect(percentDelta(100, 88)).toBe(-12);
    expect(percentDelta(3, 4)).toBe(33);
    expect(percentDelta(3, 2)).toBe(-33);
  });
});

describe('selectPlaceGuideCandidates and orderNeighbourhoods', () => {
  it('takes the 15 nearest same-city places and 9 nearest same-level places', () => {
    const { neighbourhoodPool, marketPool } = selectPlaceGuideCandidates(
      centroidIndex(),
      SELF,
      CITY,
      'suburb',
    );
    expect(neighbourhoodPool.map(item => item.entry.canonicalPlaceId)).toEqual([
      'N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7',
    ]);
    expect(marketPool.map(item => item.entry.canonicalPlaceId)).toEqual([
      'X1', 'N1', 'N2', 'X2', 'N3', 'N4', 'X3', 'N5', 'N6',
    ]);
  });

  it('orders by listing count desc, then distance, then name, capped at 5', () => {
    const ordered = orderNeighbourhoods([
      { name: 'b', listingCount: 1, distanceKm: 2 },
      { name: 'a', listingCount: 1, distanceKm: 2 },
      { name: 'c', listingCount: 1, distanceKm: 1 },
      { name: 'd', listingCount: 3, distanceKm: 9 },
      { name: 'e', listingCount: 1, distanceKm: null },
      { name: 'f', listingCount: 0, distanceKm: 0.1 },
    ]);
    expect(ordered.map(item => item.name)).toEqual(['d', 'c', 'a', 'b', 'e']);
  });
});

describe('placeGuideService.getPlaceGuide', () => {
  const rowsFixture = (): FactRow[] => [
    // Self: 6 sale rows (median 3.5M), 5 sized at 100 m2 -> 10k..60k per m2 minus one unsized.
    { place: SELF, price: 1_000_000, area: 100 },
    { place: SELF, price: 2_000_000, area: 100 },
    { place: SELF, price: 3_000_000, area: 100 },
    { place: SELF, price: 4_000_000, area: 100 },
    { place: SELF, price: 5_000_000, area: 100 },
    { place: SELF, price: 6_000_000, area: null },
    // Self ineligible listing (row index 7): must not be counted.
    { place: SELF, price: 99_000_000, area: 100 },
    ...many('N3', 3),
    ...many('N5', 2),
    ...many('N1', 1),
    ...many('N2', 1),
    ...many('N4', 1),
    // X1: five sized rows at 100 m2 -> deltas computed; X2: four rows -> no deltas.
    ...many('X1', 5, 4_200_000, 100),
    ...many('X2', 4, 9_000_000, 100),
  ];

  it('uses one properties query and ignores ineligible listings', async () => {
    const selectWhere = install(rowsFixture(), { ineligible: [7] });
    const guide = await placeGuideService.getPlaceGuide(SELF, centroidIndex());
    expect(selectWhere).toHaveBeenCalledTimes(1);
    expect(guide).not.toBeNull();
    expect(guide!.stats.saleCount).toBe(6);
    expect(guide!.stats.saleMedian).toBe(3_500_000);
    expect(guide!.stats.salePricePerM2Median).toBe(30_000);
    expect(guide!.stats.salePricePerM2Sample).toBe(5);
    expect(guide!.stats.minimumSample).toBe(5);
    expect(guide!.stats.rentCount).toBe(0);
    expect(guide!.stats.rentMedian).toBeNull();
    expect(guide!.place).toMatchObject({
      id: SELF,
      level: 'locality',
      canonicalPath: `/gauteng/${SELF}`,
      centre: { lat: 0, lng: 0 },
      city: { placeId: CITY, canonicalPath: `/gauteng/${CITY}` },
      province: { placeId: 'prov', name: 'Gauteng' },
    });
    expect(guide!.stats.typeMix).toEqual([{ propertyType: 'house', listingCount: 6, sharePct: 100 }]);
  });

  it('chooses neighbourhoods by listing count then distance, and markets by distance excluding them', async () => {
    install(rowsFixture(), { ineligible: [7] });
    const guide = (await placeGuideService.getPlaceGuide(SELF, centroidIndex()))!;
    expect(guide.neighbourhoods.map(item => item.placeId)).toEqual(['N3', 'N5', 'N1', 'N2', 'N4']);
    expect(guide.neighbourhoods.map(item => item.listingCount)).toEqual([3, 2, 1, 1, 1]);
    expect(guide.neighbourhoods.every(item => item.coverImageUrl === null)).toBe(true);
    expect(guide.neighbourhoods[0]).toMatchObject({ typeLabel: 'Suburb', distanceKm: 3.3 });
    const marketIds = guide.nearbyMarkets.map(item => item.placeId);
    expect(marketIds).toEqual(['X1', 'X2', 'X3', 'N6']);
    expect(marketIds).not.toContain(SELF);
    for (const id of guide.neighbourhoods.map(item => item.placeId)) expect(marketIds).not.toContain(id);
    expect(guide.nearbyMarkets.map(item => item.distanceKm)).toEqual([0.6, 2.8, 5, 6.7]);
  });

  it('computes deltas only when both sides meet the threshold, with sign and rounding', async () => {
    install(rowsFixture(), { ineligible: [7] });
    const guide = (await placeGuideService.getPlaceGuide(SELF, centroidIndex()))!;
    const x1 = guide.nearbyMarkets.find(item => item.placeId === 'X1')!;
    expect(x1.saleCount).toBe(5);
    expect(x1.saleMedian).toBe(4_200_000);
    expect(x1.salePricePerM2Median).toBe(42_000);
    expect(x1.deltas).toEqual({ saleMedianPct: 20, pricePerM2Pct: 40 });
    const x2 = guide.nearbyMarkets.find(item => item.placeId === 'X2')!;
    expect(x2.saleMedian).toBeNull();
    expect(x2.deltas).toEqual({ saleMedianPct: null, pricePerM2Pct: null });
    expect(x2.typeMix).toBeNull();
    expect(x1.typeMix).toEqual([{ propertyType: 'house', listingCount: 5, sharePct: 100 }]);
  });

  it('suppresses deltas when this place is under the threshold', async () => {
    install([...many(SELF, 4, 1_000_000, 100), ...many('X1', 5, 2_000_000, 100)]);
    const guide = (await placeGuideService.getPlaceGuide(SELF, centroidIndex()))!;
    const x1 = guide.nearbyMarkets.find(item => item.placeId === 'X1')!;
    expect(guide.stats.saleMedian).toBeNull();
    expect(guide.stats.typeMix).toBeNull();
    expect(x1.deltas).toEqual({ saleMedianPct: null, pricePerM2Pct: null });
  });

  it('without a centre lists same-city places by listing count and has no nearby markets', async () => {
    install([...many('N6', 3), ...many('N2', 2), ...many('N7', 1)]);
    const guide = (await placeGuideService.getPlaceGuide(SELF, centroidIndex(null)))!;
    expect(guide.place.centre).toBeNull();
    expect(guide.nearbyMarkets).toEqual([]);
    expect(guide.neighbourhoods.map(item => [item.placeId, item.listingCount, item.distanceKm])).toEqual([
      ['N6', 3, null],
      ['N2', 2, null],
      ['N7', 1, null],
      ['N1', 0, null],
      ['N3', 0, null],
    ]);
  });

  it('returns null for an unknown or unpublished place', async () => {
    install([]);
    expect(await placeGuideService.getPlaceGuide('unknown', centroidIndex())).toBeNull();
  });
});

describe('placeAuthority.getPlaceGuide input', () => {
  const caller = () => appRouter.createCaller({ req: { headers: {} }, res: {}, user: null } as any);

  it('rejects malformed ids and unknown keys', async () => {
    await expect(caller().placeAuthority.getPlaceGuide({ canonicalPlaceId: 'nope' })).rejects.toThrow();
    await expect(
      caller().placeAuthority.getPlaceGuide({ canonicalPlaceId: 'pl-place-01-XYZ' } as any),
    ).rejects.toThrow();
    await expect(
      caller().placeAuthority.getPlaceGuide({
        canonicalPlaceId: 'pl-place-01-dee61758ef3bda7cd1a258ad',
        extra: 1,
      } as any),
    ).rejects.toThrow();
  });

  it('accepts a well-formed id', async () => {
    install([]);
    await expect(
      caller().placeAuthority.getPlaceGuide({ canonicalPlaceId: 'pl-place-01-dee61758ef3bda7cd1a258ad' }),
    ).resolves.toBeNull();
  });
});
