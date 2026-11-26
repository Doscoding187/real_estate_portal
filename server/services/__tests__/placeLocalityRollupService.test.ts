import { beforeEach, describe, expect, it, vi } from 'vitest';

const RANDBURG = 'pl-place-01-7e92e438655b8d2b97c1a395';
const JOHANNESBURG = 'pl-place-01-21f154cd5d0954c29ec7525f';
const GAUTENG = 'pl-place-01-131e3e75ad70424e0f9c869a';
const NORTH_RIDING = 'pl-place-01-6a145c6d642ba208a2c12de7';
const SANDTON = 'pl-place-01-dee61758ef3bda7cd1a258ad';
const PRETORIA_SUBURB = 'pl-place-01-000000000000000000000009';
const EXTENT = 'pl-place-01-503de72cc29aa712c0e5a597';

const { loadProjection } = vi.hoisted(() => ({ loadProjection: vi.fn() }));
vi.mock('../canonicalPlaceSearchService', () => ({
  loadCanonicalPlaceSearchProjection: loadProjection,
}));

import {
  developmentSearchPlaceIds,
  resetDevelopmentSearchPlaceIdsCache,
} from '../placeLocalityRollupService';

const scopes: Record<string, string> = {
  [RANDBURG]: 'metro_city',
  [JOHANNESBURG]: 'metro_city',
  [GAUTENG]: 'province',
  [NORTH_RIDING]: 'locality',
  [SANDTON]: 'locality',
  [PRETORIA_SUBURB]: 'locality',
};

function projectionFor(placeIds: string[], includeProvinceMembers?: boolean) {
  const ids = includeProvinceMembers ? [GAUTENG, NORTH_RIDING, SANDTON, PRETORIA_SUBURB] : placeIds;
  const executions = new Map(
    ids.map(id => [
      id,
      { placeId: id, scope: scopes[id], provincePlaceId: GAUTENG, cityPlaceId: null },
    ]),
  );
  const labels = new Map(ids.map(id => [id, { canonicalPlaceId: id, label: id }]));
  return { executions, labels };
}

/** settlement_within children first (Randburg's), then the City of Johannesburg extent's. */
let relationshipResults: { placeId: string; parentId: string }[][] = [];
const database = {
  select: () => {
    const query: any = {
      from: () => query,
      innerJoin: () => query,
      where: async () => relationshipResults.shift() ?? [],
    };
    return query;
  },
} as any;

describe('developmentSearchPlaceIds (how a place search rolls up to its suburbs)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDevelopmentSearchPlaceIdsCache();
    loadProjection.mockImplementation(async (_db: unknown, options: any) =>
      projectionFor(options.placeIds, options.includeProvinceMembers),
    );
  });

  it('a suburb is an exact match only', async () => {
    expect(await developmentSearchPlaceIds(database, NORTH_RIDING)).toEqual([NORTH_RIDING]);
  });

  it('Randburg includes North Riding (a settlement_within child) and itself, and not unrelated suburbs', async () => {
    relationshipResults = [[{ placeId: NORTH_RIDING, parentId: RANDBURG }]];
    const ids = await developmentSearchPlaceIds(database, RANDBURG);
    expect(ids).toEqual(expect.arrayContaining([RANDBURG, NORTH_RIDING]));
    expect(ids).not.toContain(SANDTON);
    expect(ids).not.toContain(PRETORIA_SUBURB);
  });

  it('Johannesburg includes the localities of the City of Johannesburg extent as well', async () => {
    relationshipResults = [
      [],
      [
        { placeId: NORTH_RIDING, parentId: EXTENT },
        { placeId: SANDTON, parentId: EXTENT },
      ],
    ];
    const ids = await developmentSearchPlaceIds(database, JOHANNESBURG);
    expect(ids).toEqual(expect.arrayContaining([JOHANNESBURG, NORTH_RIDING, SANDTON]));
    expect(ids).not.toContain(PRETORIA_SUBURB);
  });

  it('a province includes every locality bounded by it', async () => {
    const ids = await developmentSearchPlaceIds(database, GAUTENG);
    expect(ids).toEqual(expect.arrayContaining([GAUTENG, NORTH_RIDING, SANDTON, PRETORIA_SUBURB]));
  });

  it('an unknown or unsearchable place resolves to itself only', async () => {
    loadProjection.mockResolvedValue({ executions: new Map(), labels: new Map() });
    expect(await developmentSearchPlaceIds(database, RANDBURG)).toEqual([RANDBURG]);
  });

  it('caches the rolled-up list for a few minutes, per place', async () => {
    await developmentSearchPlaceIds(database, GAUTENG);
    const calls = loadProjection.mock.calls.length;
    await developmentSearchPlaceIds(database, GAUTENG);
    expect(loadProjection.mock.calls.length).toBe(calls);
    await developmentSearchPlaceIds(database, NORTH_RIDING);
    expect(loadProjection.mock.calls.length).toBeGreaterThan(calls);
  });
});
