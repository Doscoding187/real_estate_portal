import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MySqlDialect } from 'drizzle-orm/mysql-core';
import type { SQL } from 'drizzle-orm';

const { getDatabase, mockDevelopmentIdsForPlace } = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  mockDevelopmentIdsForPlace: vi.fn(),
}));

vi.mock('../../db-connection', () => ({ getDb: getDatabase }));
vi.mock('../developmentPlaceAssignmentService', () => ({
  listDevelopmentIdsForCanonicalPlace: mockDevelopmentIdsForPlace,
}));

import { listPublicCataloguePublishers } from '../developerIdentityService';

const PLACE_ID = 'pl-place-01-dee61758ef3bda7cd1a258ad';
const developmentIds = [901];
const queryResults: unknown[][] = [];
const queryObservations: Array<{ where: unknown[]; limits: number[]; offsets: number[] }> = [];

type MockQuery = PromiseLike<unknown[]> & {
  from(...args: unknown[]): MockQuery;
  leftJoin(...args: unknown[]): MockQuery;
  where(...args: unknown[]): MockQuery;
  orderBy(...args: unknown[]): MockQuery;
  limit(value: number): MockQuery;
  offset(value: number): MockQuery;
  groupBy(...args: unknown[]): MockQuery;
};

function makeQuery(result: unknown[]) {
  const observation = { where: [] as unknown[], limits: [] as number[], offsets: [] as number[] };
  queryObservations.push(observation);
  const resultPromise = Promise.resolve(result);
  let query: MockQuery;
  query = {
    from: () => query,
    leftJoin: () => query,
    where: (...args: unknown[]) => {
      observation.where.push(args[0]);
      return query;
    },
    orderBy: () => query,
    limit: value => {
      observation.limits.push(value);
      return query;
    },
    offset: value => {
      observation.offsets.push(value);
      return query;
    },
    groupBy: () => query,
    then: resultPromise.then.bind(resultPromise),
  };
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
  queryResults.length = 0;
  queryObservations.length = 0;
  mockDevelopmentIdsForPlace.mockResolvedValue(developmentIds);
  getDatabase.mockResolvedValue({
    select: vi.fn(() => {
      const query = makeQuery(queryResults.shift() ?? []);
      return query;
    }),
  });
});

describe('canonical Place developer directory filter', () => {
  it('filters public developers through exact assigned Development IDs', async () => {
    queryResults.push(
      [{ publisherId: 17 }],
      [
        {
          publisher: {
            id: 17,
            name: 'Sandton Homes',
            publisherType: 'developer',
            authorityKind: 'developer_first_party',
          },
        },
      ],
      [{ publisherId: 17, count: 1 }],
    );

    const result = await listPublicCataloguePublishers({
      canonicalPlaceId: PLACE_ID,
      search: 'Homes',
      limit: 25,
      offset: 24,
    });

    expect(mockDevelopmentIdsForPlace).toHaveBeenCalledWith(PLACE_ID);
    const developmentQuery = new MySqlDialect().sqlToQuery(queryObservations[0].where[0] as SQL);
    expect(developmentQuery.sql).toContain('`developments`.`id`');
    expect(developmentQuery.sql).toContain('`developments`.`isPublished`');
    expect(developmentQuery.sql).toContain('`developments`.`approval_status`');
    expect(developmentQuery.sql).not.toContain('`developments`.`province`');
    expect(developmentQuery.params).toContain(901);
    expect(queryObservations[1].limits).toEqual([25]);
    expect(queryObservations[1].offsets).toEqual([24]);
    expect(result).toEqual([
      expect.objectContaining({
        id: 17,
        name: 'Sandton Homes',
        developmentCount: 1,
      }),
    ]);
  });

  it('keeps the public directory unfiltered when no Place was selected', async () => {
    await listPublicCataloguePublishers({ limit: 25, offset: 0 });

    const query = new MySqlDialect().sqlToQuery(queryObservations[0].where[0] as SQL);
    expect(mockDevelopmentIdsForPlace).not.toHaveBeenCalled();
    expect(query.sql).not.toContain('`developments`.`province`');
    expect(query.sql).toContain('`catalogue_publishers`.`is_visible`');
  });
});
