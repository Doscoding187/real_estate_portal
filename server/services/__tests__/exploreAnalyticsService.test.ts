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
          interactionType: 'view',
          metadata: { watchTime: 30 },
          userId: 11,
          sessionId: 'session-a',
          contentId: 101,
        },
        {
          interactionType: 'view',
          metadata: { duration: 20 },
          userId: null,
          sessionId: 'session-b',
          contentId: 102,
        },
        {
          interactionType: 'complete',
          metadata: {},
          userId: 11,
          sessionId: 'session-a',
          contentId: 101,
        },
        {
          interactionType: 'save',
          metadata: {},
          userId: 11,
          sessionId: 'session-a',
          contentId: 101,
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
