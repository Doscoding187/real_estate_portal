import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MySqlDialect } from 'drizzle-orm/mysql-core';
import type { SQL } from 'drizzle-orm';

const { getDatabase, mockIdsForPlace, mockIdsForPlaces, mockLoadProjection } = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  mockIdsForPlace: vi.fn(),
  mockIdsForPlaces: vi.fn(),
  mockLoadProjection: vi.fn(),
}));

vi.mock('../../db-connection', () => ({ getDb: getDatabase }));
vi.mock('../developmentPlaceAssignmentService', () => ({
  listDevelopmentIdsForCanonicalPlace: mockIdsForPlace,
  listDevelopmentIdsForCanonicalPlaces: mockIdsForPlaces,
}));
vi.mock('../canonicalPlaceSearchService', async importOriginal => ({
  ...(await importOriginal<typeof import('../canonicalPlaceSearchService')>()),
  loadCanonicalPlaceSearchProjection: mockLoadProjection,
}));

import { listPublicCataloguePublishers } from '../developerIdentityService';

const placeId = (n: number) => `pl-place-01-${String(n).padStart(24, '0')}`;
const GAUTENG = placeId(1);
const JOHANNESBURG = placeId(2);
const SANDTON = placeId(3);
const WESTERN_CAPE = placeId(4);
const CAPE_TOWN = placeId(5);

const execution = (id: string, scope: string, province: string) => ({
  placeId: id,
  scope,
  provincePlaceId: province,
  cityPlaceId: null,
  localityPlaceId: null,
  contextPlaceIds: [],
});

function projection() {
  const executions = new Map<string, any>([
    [GAUTENG, execution(GAUTENG, 'province', GAUTENG)],
    [JOHANNESBURG, execution(JOHANNESBURG, 'metro_city', GAUTENG)],
    [SANDTON, execution(SANDTON, 'locality', GAUTENG)],
    [WESTERN_CAPE, execution(WESTERN_CAPE, 'province', WESTERN_CAPE)],
    [CAPE_TOWN, execution(CAPE_TOWN, 'metro_city', WESTERN_CAPE)],
  ]);
  return { executions, labels: new Map([...executions.keys()].map(id => [id, { label: id }])) };
}

const queryResults: unknown[][] = [];
const queryObservations: Array<{ where: unknown[]; limits: number[]; offsets: number[] }> = [];

function makeQuery(result: unknown[]) {
  const observation = { where: [] as unknown[], limits: [] as number[], offsets: [] as number[] };
  queryObservations.push(observation);
  const resultPromise = Promise.resolve(result);
  const query: any = {
    from: () => query,
    leftJoin: () => query,
    where: (...args: unknown[]) => {
      observation.where.push(args[0]);
      return query;
    },
    orderBy: () => query,
    limit: (value: number) => {
      observation.limits.push(value);
      return query;
    },
    offset: (value: number) => {
      observation.offsets.push(value);
      return query;
    },
    groupBy: () => query,
    then: resultPromise.then.bind(resultPromise),
  };
  return query;
}

const publisher = (id: number, name: string) => ({
  publisher: { id, name, publisherType: 'developer', authorityKind: 'platform_reference' },
});

beforeEach(() => {
  vi.clearAllMocks();
  queryResults.length = 0;
  queryObservations.length = 0;
  mockLoadProjection.mockResolvedValue(projection());
  mockIdsForPlaces.mockResolvedValue([901, 902]);
  mockIdsForPlace.mockResolvedValue([901]);
  getDatabase.mockResolvedValue({
    select: vi.fn(() => makeQuery(queryResults.shift() ?? [])),
  });
});

describe('province scope for the public publisher list', () => {
  it('matches developments assigned to the province, its cities and suburbs, and not another province', async () => {
    await listPublicCataloguePublishers({ provincePlaceId: GAUTENG });

    expect(mockIdsForPlace).not.toHaveBeenCalled();
    expect(mockLoadProjection).toHaveBeenCalledWith(undefined, {
      placeIds: [GAUTENG],
      includeProvinceMembers: true,
    });
    const members = mockIdsForPlaces.mock.calls[0][0] as string[];
    expect([...members].sort()).toEqual([GAUTENG, JOHANNESBURG, SANDTON].sort());
    expect(members).not.toContain(WESTERN_CAPE);
    expect(members).not.toContain(CAPE_TOWN);
  });

  it('rejects a place that is not a province', async () => {
    await expect(listPublicCataloguePublishers({ provincePlaceId: JOHANNESBURG })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    await expect(listPublicCataloguePublishers({ provincePlaceId: placeId(99) })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    expect(mockIdsForPlaces).not.toHaveBeenCalled();
  });

  it('rejects a province together with an exact place', async () => {
    await expect(
      listPublicCataloguePublishers({ provincePlaceId: GAUTENG, canonicalPlaceId: SANDTON }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(mockLoadProjection).not.toHaveBeenCalled();
  });

  it('returns nothing when no development is assigned inside the province', async () => {
    mockIdsForPlaces.mockResolvedValue([]);
    await expect(listPublicCataloguePublishers({ provincePlaceId: GAUTENG })).resolves.toEqual([]);
  });

  it('counts per label, orders by selling then active then name, and omits zero-development publishers', async () => {
    queryResults.push(
      [{ publisherId: 1 }, { publisherId: 2 }, { publisherId: 3 }, { publisherId: 4 }],
      [publisher(1, 'Zed'), publisher(2, 'Alpha'), publisher(3, 'Beta'), publisher(4, 'Empty')],
      [
        { publisherId: 1, count: 3, sellingNow: 2, launchingSoon: 1 },
        { publisherId: 2, count: 2, sellingNow: 2, launchingSoon: 0 },
        { publisherId: 3, count: 5, sellingNow: 1, launchingSoon: 4 },
      ],
    );

    const result = await listPublicCataloguePublishers({ provincePlaceId: GAUTENG });

    expect(result.map(row => row.name)).toEqual(['Zed', 'Alpha', 'Beta']);
    expect(result[0]).toMatchObject({ activeDevelopments: 3, sellingNow: 2, launchingSoon: 1 });
    expect(result[2]).toMatchObject({ activeDevelopments: 5, sellingNow: 1, launchingSoon: 4 });
    expect(result.find(row => row.name === 'Empty')).toBeUndefined();
  });

  it('orders equal counts by name and applies paging after ordering', async () => {
    queryResults.push(
      [{ publisherId: 1 }, { publisherId: 2 }],
      [publisher(1, 'Zed'), publisher(2, 'Alpha')],
      [
        { publisherId: 1, count: 1, sellingNow: 1, launchingSoon: 0 },
        { publisherId: 2, count: 1, sellingNow: 1, launchingSoon: 0 },
      ],
    );

    const result = await listPublicCataloguePublishers({
      provincePlaceId: GAUTENG,
      limit: 1,
      offset: 1,
    });

    expect(result.map(row => row.name)).toEqual(['Zed']);
    expect(queryObservations[1].limits).toEqual([]);
  });

  it('counts only publicly visible developments in the given province', async () => {
    queryResults.push(
      [{ publisherId: 1 }],
      [publisher(1, 'Alpha')],
      [{ publisherId: 1, count: 1, sellingNow: 1, launchingSoon: 0 }],
    );

    await listPublicCataloguePublishers({ provincePlaceId: GAUTENG });

    for (const index of [0, 2]) {
      const query = new MySqlDialect().sqlToQuery(queryObservations[index].where[0] as SQL);
      expect(query.sql).toContain('`developments`.`isPublished`');
      expect(query.sql).toContain('`developments`.`approval_status`');
    }
    const counts = new MySqlDialect().sqlToQuery(queryObservations[2].where[0] as SQL);
    expect(counts.params).toEqual(expect.arrayContaining([901, 902]));
  });
});

describe('exact place scope is unchanged', () => {
  it('still resolves through the exact-place lookup and adds no province fields', async () => {
    queryResults.push(
      [{ publisherId: 17 }],
      [publisher(17, 'Sandton Homes')],
      [{ publisherId: 17, count: 1, sellingNow: 1, launchingSoon: 0 }],
    );

    const result = await listPublicCataloguePublishers({
      canonicalPlaceId: SANDTON,
      limit: 25,
      offset: 24,
    });

    expect(mockIdsForPlace).toHaveBeenCalledWith(SANDTON);
    expect(mockLoadProjection).not.toHaveBeenCalled();
    expect(queryObservations[1].limits).toEqual([25]);
    expect(queryObservations[1].offsets).toEqual([24]);
    expect(result[0]).toMatchObject({ id: 17, developmentCount: 1 });
    expect(result[0]).not.toHaveProperty('sellingNow');
  });
});
