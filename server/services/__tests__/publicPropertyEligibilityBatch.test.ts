import { MySqlDialect } from 'drizzle-orm/mysql-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb } = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
}));

vi.mock('../../db', () => ({
  getDb: mockGetDb,
}));

import {
  PUBLIC_PROPERTY_QUERY_BATCH_SIZE,
  type ApprovedPublicPropertyResolution,
} from '../approvedPublicPropertyService';
import { resolvePublicPropertyEligibilities } from '../publicPropertyEligibilityService';

describe('public property eligibility bounded database loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bounds every supply-evidence IN query for a large approval batch', async () => {
    const renderedParameterCounts: number[] = [];
    const dialect = new MySqlDialect();
    const database = {
      select: vi.fn(() => {
        const query: any = {};
        query.from = vi.fn(() => query);
        query.where = vi.fn(async (condition: any) => {
          renderedParameterCounts.push(dialect.sqlToQuery(condition).params.length);
          return [];
        });
        return query;
      }),
    };
    mockGetDb.mockResolvedValue(database);

    const candidateCount = PUBLIC_PROPERTY_QUERY_BATCH_SIZE * 2 + 1;
    const propertyIds = Array.from({ length: candidateCount }, (_, index) => index + 1);
    const approvedByPropertyId = new Map<number, ApprovedPublicPropertyResolution>(
      propertyIds.map(propertyId => [
        propertyId,
        {
          authority: 'approved_listing',
          sourceListingId: 9_000 + propertyId,
          property: {
            id: propertyId,
            ownerId: 10_000 + propertyId,
            agentId: 20_000 + propertyId,
            developmentId: null,
            cataloguePublisherId: 30_000 + propertyId,
          },
          images: [],
          media: [],
        },
      ]),
    );
    const resolveApprovedProperties = vi.fn().mockResolvedValue(approvedByPropertyId);

    const result = await resolvePublicPropertyEligibilities(propertyIds, {
      resolveApprovedProperties,
    });

    expect(result).toEqual(new Map());
    expect(resolveApprovedProperties).toHaveBeenCalledTimes(1);
    expect(database.select).toHaveBeenCalledTimes(12);
    expect(renderedParameterCounts).toHaveLength(12);
    expect(Math.max(...renderedParameterCounts)).toBe(PUBLIC_PROPERTY_QUERY_BATCH_SIZE);
    expect(renderedParameterCounts.every(count => count > 0)).toBe(true);
    expect(
      renderedParameterCounts.every(count => count <= PUBLIC_PROPERTY_QUERY_BATCH_SIZE),
    ).toBe(true);
  });
});
