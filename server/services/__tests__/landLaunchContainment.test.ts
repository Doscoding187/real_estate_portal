import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MySqlDialect } from 'drizzle-orm/mysql-core';

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));

vi.mock('../../db-connection', () => ({ getDb: mockGetDb }));

import {
  assertNotDedicatedLandWorkflowListing,
  getFeaturedListings,
  getUserListings,
  searchListings,
} from '../../db';
import { landPublicRouter } from '../../landPublicRouter';
import { requireLandRoute } from '../../landRouter';
import {
  publicLandDetail,
  resolvePublicLandLeadCustody,
  searchPublicLand,
} from '../landPublicService';
import { submitLandForReview, transitionLandReview } from '../landWorkflowService';

const exactLandGeography = { city: 'Johannesburg', province: 'Gauteng' };

function activeLandLinkDatabase() {
  const query = {
    from: vi.fn(() => query),
    where: vi.fn(() => query),
    limit: vi.fn().mockResolvedValue([{ id: 1 }]),
  };
  return { select: vi.fn(() => query) };
}

function noActiveLandLinkDatabase() {
  const query = {
    from: vi.fn(() => query),
    where: vi.fn(() => query),
    limit: vi.fn().mockResolvedValue([]),
  };
  return { select: vi.fn(() => query) };
}

function emptyGenericListingQueryDatabase() {
  const wherePredicates: unknown[] = [];
  const chain = {
    from: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
    where: vi.fn((predicate: unknown) => {
      wherePredicates.push(predicate);
      return chain;
    }),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    offset: vi.fn(() => chain),
    then: (resolve: (value: unknown[]) => unknown) => resolve([]),
  };
  return { database: { select: vi.fn(() => chain) }, wherePredicates };
}

function renderedPredicate(predicate: unknown): string {
  return new MySqlDialect().sqlToQuery(predicate as any).sql;
}

describe('Land first-cohort containment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns no public records or lead custody before opening a database connection', async () => {
    mockGetDb.mockResolvedValue({ unexpected: true });

    await expect(searchPublicLand(exactLandGeography)).resolves.toEqual([]);
    await expect(publicLandDetail('north-ridge')).resolves.toBeNull();
    await expect(resolvePublicLandLeadCustody(17)).resolves.toBeNull();

    const caller = landPublicRouter.createCaller({} as any);
    await expect(caller.search(exactLandGeography)).resolves.toEqual([]);
    await expect(caller.detail({ slug: 'north-ridge' })).resolves.toBeNull();

    expect(mockGetDb).not.toHaveBeenCalled();
  });

  it('blocks direct review and route access before a Land state transition can occur', async () => {
    mockGetDb.mockResolvedValue({ unexpected: true });

    await expect(submitLandForReview({ listingId: 17, userId: 4 })).rejects.toThrow(
      /Land review submission is unavailable while Land is deferred/,
    );
    await expect(
      transitionLandReview({ listingId: 17, reviewerUserId: 1, action: 'approve' }),
    ).rejects.toThrow(/Land review transition is unavailable while Land is deferred/);

    try {
      requireLandRoute();
      throw new Error('Expected the deferred Land route to reject');
    } catch (error) {
      expect(error).toMatchObject({ code: 'PRECONDITION_FAILED' });
    }
    expect(mockGetDb).not.toHaveBeenCalled();
  });

  it('uses the canonical Land link before a listing-type label when containing the generic lifecycle', async () => {
    const markerSelect = vi.fn();
    await expect(
      assertNotDedicatedLandWorkflowListing(
        { select: markerSelect },
        17,
        { propertyType: 'plot', propertyDetails: { landEngine: true } },
      ),
    ).rejects.toThrow(/dedicated Land workflow/);
    expect(markerSelect).not.toHaveBeenCalled();

    const linkedDatabase = activeLandLinkDatabase();
    await expect(
      assertNotDedicatedLandWorkflowListing(linkedDatabase, 18, { propertyType: 'plot' }),
    ).rejects.toThrow(/dedicated Land workflow/);
    expect(linkedDatabase.select).toHaveBeenCalledTimes(1);

    const linkedHouseDatabase = activeLandLinkDatabase();
    await expect(
      assertNotDedicatedLandWorkflowListing(linkedHouseDatabase, 181, { propertyType: 'house' }),
    ).rejects.toThrow(/dedicated Land workflow/);
    expect(linkedHouseDatabase.select).toHaveBeenCalledTimes(1);

    const unlinkedPlotDatabase = noActiveLandLinkDatabase();
    await expect(
      assertNotDedicatedLandWorkflowListing(unlinkedPlotDatabase, 19, { propertyType: 'plot' }),
    ).rejects.toThrow(/deferred from the first launch cohort/);
    expect(unlinkedPlotDatabase.select).toHaveBeenCalledTimes(1);

    const ordinaryHouseDatabase = noActiveLandLinkDatabase();
    await expect(
      assertNotDedicatedLandWorkflowListing(ordinaryHouseDatabase, 20, { propertyType: 'house' }),
    ).resolves.toBeUndefined();
    expect(ordinaryHouseDatabase.select).toHaveBeenCalledTimes(1);

    const lookupFailure = new Error('Land link lookup failed');
    const unavailableLookupDatabase = {
      select: vi.fn(() => {
        throw lookupFailure;
      }),
    };
    await expect(
      assertNotDedicatedLandWorkflowListing(unavailableLookupDatabase, 21, { propertyType: 'house' }),
    ).rejects.toBe(lookupFailure);

  });

  it('keeps legacy generic listing reads and discovery helpers behind the same Land predicate', async () => {
    const userListings = emptyGenericListingQueryDatabase();
    mockGetDb.mockResolvedValue(userListings.database);
    await expect(getUserListings(7, 'draft', 10, 0)).resolves.toEqual([]);

    const legacySearch = emptyGenericListingQueryDatabase();
    mockGetDb.mockResolvedValue(legacySearch.database);
    await expect(searchListings({ limit: 1 })).resolves.toEqual([]);

    const featured = emptyGenericListingQueryDatabase();
    mockGetDb.mockResolvedValue(featured.database);
    await expect(getFeaturedListings(1)).resolves.toEqual([]);

    for (const predicate of [
      ...userListings.wherePredicates,
      ...legacySearch.wherePredicates,
      ...featured.wherePredicates,
    ]) {
      const rendered = renderedPredicate(predicate);
      expect(rendered).toContain("`listings`.`propertyType` NOT IN ('plot', 'land')");
      expect(rendered).toContain('`land_listing_links`');
    }
  });
});
