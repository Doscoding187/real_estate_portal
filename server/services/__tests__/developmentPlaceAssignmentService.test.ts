import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDb } = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock('../../db', () => ({ getDb }));

import {
  hasExactDevelopmentPlaceMatch,
  listDevelopmentPlaceGeography,
} from '../developmentPlaceAssignmentService';

const JOHANNESBURG_PLACE_ID = 'pl-place-01-000000000000000000000001';
const PRETORIA_PLACE_ID = 'pl-place-01-000000000000000000000002';

function makeQuery(rows: unknown[]) {
  const query: Record<string, any> = {};
  for (const method of ['from', 'innerJoin', 'leftJoin', 'where']) {
    query[method] = vi.fn(() => query);
  }
  query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(rows).then(resolve, reject);
  return query;
}

function acceptedAssignment(
  placeId: string,
  name: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    developmentId: 42,
    placeId,
    evidenceReference: 'review:case-42',
    reviewedByUserId: 9,
    reviewedAt: '2026-10-27 10:00:00',
    matchedPlaceId: placeId,
    lifecycleStatus: 'active',
    searchEligible: 1,
    searchScope: 'locality',
    name,
    ...overrides,
  };
}

function useRows(rows: unknown[]) {
  const query = makeQuery(rows);
  getDb.mockResolvedValue({ select: vi.fn(() => query) });
  return query;
}

describe('reviewed Development Place geography projection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a Place ID only for a single active, reviewed, searchable site Place', async () => {
    const query = useRows([acceptedAssignment(JOHANNESBURG_PLACE_ID, 'Johannesburg')]);

    const result = await listDevelopmentPlaceGeography([42]);

    expect(result.get(42)).toEqual({
      canonicalPlaceId: JOHANNESBURG_PLACE_ID,
      locationLabels: ['Johannesburg'],
    });
    expect(query.leftJoin).toHaveBeenCalledTimes(2);
  });

  it('fails closed when one Development aggregate has assignments to multiple Places', async () => {
    useRows([
      acceptedAssignment(JOHANNESBURG_PLACE_ID, 'Johannesburg'),
      acceptedAssignment(PRETORIA_PLACE_ID, 'Pretoria'),
    ]);

    const result = await listDevelopmentPlaceGeography([42]);

    expect(result.get(42)).toEqual({ canonicalPlaceId: null, locationLabels: ['Johannesburg', 'Pretoria'] });
  });

  it('fails closed when any accepted assignment is malformed or no longer executable', async () => {
    useRows([
      acceptedAssignment(JOHANNESBURG_PLACE_ID, 'Johannesburg'),
      acceptedAssignment(PRETORIA_PLACE_ID, 'Pretoria', { lifecycleStatus: 'retired' }),
    ]);

    const result = await listDevelopmentPlaceGeography([42]);

    expect(result.get(42)).toEqual({ canonicalPlaceId: null, locationLabels: ['Johannesburg'] });
  });

  it('returns an empty, unassigned result when no accepted site assignment exists', async () => {
    useRows([]);

    const result = await listDevelopmentPlaceGeography([42]);

    expect(result.get(42)).toEqual({ canonicalPlaceId: null, locationLabels: [] });
  });

  it('matches only exact valid Place IDs and fails closed for null or malformed assignments', () => {
    expect(hasExactDevelopmentPlaceMatch(JOHANNESBURG_PLACE_ID, JOHANNESBURG_PLACE_ID)).toBe(true);
    expect(hasExactDevelopmentPlaceMatch(PRETORIA_PLACE_ID, JOHANNESBURG_PLACE_ID)).toBe(false);
    expect(hasExactDevelopmentPlaceMatch(null, JOHANNESBURG_PLACE_ID)).toBe(false);
    expect(hasExactDevelopmentPlaceMatch('malformed', JOHANNESBURG_PLACE_ID)).toBe(false);
    expect(hasExactDevelopmentPlaceMatch(JOHANNESBURG_PLACE_ID, 'malformed')).toBe(false);
  });
});
