import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSelect = vi.fn();

vi.mock('../../db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

const { exploreAnalyticsService } = await import('../exploreAnalyticsService');

function makeQuery(rowsOrError: unknown[] | Error) {
  return {
    from: () => ({
      innerJoin: () => ({
        where: async () => {
          if (rowsOrError instanceof Error) throw rowsOrError;
          return rowsOrError;
        },
      }),
    }),
  };
}

describe('ExploreAnalyticsService.getAggregatedMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fails closed when explore analytics tables are not available', async () => {
    const missingSchemaError = new Error('Failed query');
    (missingSchemaError as any).cause = {
      code: 'ER_NO_SUCH_TABLE',
      message: "Table 'listify_local.explore_engagements' doesn't exist",
    };
    mockSelect.mockReturnValue(makeQuery(missingSchemaError));

    await expect(exploreAnalyticsService.getAggregatedMetrics('month')).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: 'Explore analytics is unavailable until its canonical schema is established',
    });
  });

  it('aggregates engagement rows into a complete dashboard metrics contract', async () => {
    mockSelect.mockReturnValue(
      makeQuery([
        {
          totalViews: 2,
          totalUniqueViewers: 2,
          totalCompletions: 1,
          totalSaves: 1,
          totalShares: 0,
          totalClicks: 0,
          totalSessions: 2,
          totalWatchTime: 50,
        },
      ]),
    );

    await expect(exploreAnalyticsService.getAggregatedMetrics('month')).resolves.toEqual({
      totalViews: 2,
      totalUniqueViewers: 2,
      totalWatchTime: 50,
      totalSessions: 2,
      averageSessionDuration: 25,
      averageCompletionRate: 50,
      engagementRate: 50,
    });
  });
});
