import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));
vi.mock('../../db-connection', () => ({ getDb: mockGetDb }));

import {
  agentLandListingState,
  countLandReviewQueue,
  landReviewInbox,
  landReviewQueue,
  listAgentLandListings,
} from '../landWorkflowService';
import { LAND_VERTICAL_LAUNCH_STATE } from '../../../shared/landLaunchPolicy';

function dbReturning(rows: unknown[], whereSpy = vi.fn()) {
  return {
    select: vi.fn(() => {
      const query: any = {
        from: vi.fn(() => query),
        innerJoin: vi.fn(() => query),
        leftJoin: vi.fn(() => query),
        where: vi.fn((condition: unknown) => {
          whereSpy(condition);
          return query;
        }),
        orderBy: vi.fn(() => query),
        then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve(rows).then(resolve, reject),
      };
      return query;
    }),
  };
}

async function withLand<T>(run: () => Promise<T>): Promise<T> {
  const state = LAND_VERTICAL_LAUNCH_STATE as unknown as { enabled: boolean };
  const previous = state.enabled;
  state.enabled = true;
  try {
    return await run();
  } finally {
    state.enabled = previous;
  }
}

describe('Land admin queue and agent listing gaps', () => {
  beforeEach(() => vi.clearAllMocks());

  it('counts exactly the rows the reviewer queue returns', async () => {
    const rows = [
      { listingId: 1, state: 'pending', submittedAt: '2026-11-02 10:00:00', title: 'A' },
      { listingId: 2, state: 'reviewing', submittedAt: '2026-11-01 10:00:00', title: 'B' },
      { listingId: 3, state: 'changes_requested', submittedAt: '2026-11-03 10:00:00', title: 'C' },
    ];
    mockGetDb.mockResolvedValue(dbReturning(rows));
    expect(await countLandReviewQueue()).toBe((await landReviewQueue()).length);
    expect(await countLandReviewQueue()).toBe(3);
  });

  it('puts only reviewer-awaiting Land in the inbox, oldest first', async () => {
    const rows = [
      { listingId: 1, state: 'pending', submittedAt: '2026-11-02 10:00:00', title: 'A' },
      { listingId: 2, state: 'reviewing', submittedAt: '2026-11-01 10:00:00', title: 'B' },
      { listingId: 3, state: 'changes_requested', submittedAt: '2026-11-03 10:00:00', title: 'C' },
    ];
    mockGetDb.mockResolvedValue(dbReturning(rows));
    expect((await landReviewInbox(10)).map(item => item.listingId)).toEqual([2, 1]);
  });

  it('maps review case states to the agent-facing states', () => {
    expect(agentLandListingState(null)).toBe('draft');
    expect(agentLandListingState('draft')).toBe('draft');
    expect(agentLandListingState('pending')).toBe('submitted');
    expect(agentLandListingState('reviewing')).toBe('submitted');
    expect(agentLandListingState('changes_requested')).toBe('changes_requested');
    expect(agentLandListingState('approved')).toBe('approved');
    expect(agentLandListingState('rejected')).toBe('rejected');
  });

  it('lists the caller own Land listings with agent states, filtered in the query', async () => {
    const whereSpy = vi.fn();
    mockGetDb.mockResolvedValue(
      dbReturning([{ listingId: 9, title: 'Mine', caseState: 'pending', askingPrice: '1200000' }], whereSpy),
    );
    const result = await withLand(() => listAgentLandListings(7));
    expect(result).toEqual([{ listingId: 9, title: 'Mine', askingPrice: '1200000', state: 'submitted' }]);
    expect(whereSpy).toHaveBeenCalledTimes(1);
  });

  it('refuses to list Land listings while Land is off', async () => {
    await expect(listAgentLandListings(7)).rejects.toThrow(/Land/);
    expect(mockGetDb).not.toHaveBeenCalled();
  });
});
