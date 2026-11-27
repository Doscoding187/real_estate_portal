import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));
vi.mock('../../db-connection', () => ({ getDb: mockGetDb }));

import { agentLandListingState, closeLandListing } from '../landWorkflowService';
import { LAND_VERTICAL_LAUNCH_STATE } from '../../../shared/landLaunchPolicy';

function db(options: { caseState: string; listingStatus: string; ownerId?: number }) {
  const selections: unknown[][] = [
    [{ listingId: 9, landAssetId: 41, linkStatus: 'active' }],
    [{ id: 9, ownerId: options.ownerId ?? 77, status: options.listingStatus, askingPrice: '950000', title: 'Stand', description: 'Stand' }],
    [{ id: 41, classification: 'residential_stand' }],
    [], [], [{ id: 44, authorityStatus: 'active', expiresAt: null }], [], [],
    [{ id: 71, state: options.caseState, submissionSequence: 1 }],
    [], [], [],
  ];
  const updates: Array<{ table: string; values: Record<string, unknown> }> = [];
  const tx = {
    update: vi.fn((table: any) => ({
      set: vi.fn((values: Record<string, unknown>) => {
        updates.push({ table: table[Symbol.for('drizzle:Name')], values });
        return { where: vi.fn().mockResolvedValue({ affectedRows: 1 }) };
      }),
    })),
  };
  return {
    select: vi.fn(() => {
      const result = selections.shift() || [];
      const query: any = {
        from: vi.fn(() => query), innerJoin: vi.fn(() => query), where: vi.fn(() => query), orderBy: vi.fn(() => query),
        limit: vi.fn(async () => result),
        then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject),
      };
      return query;
    }),
    transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) => callback(tx)),
    updates,
  };
}

async function landOn<T>(run: () => Promise<T>): Promise<T> {
  const state = LAND_VERTICAL_LAUNCH_STATE as unknown as { enabled: boolean };
  const previous = state.enabled;
  state.enabled = true;
  try { return await run(); } finally { state.enabled = previous; }
}

describe('closeLandListing', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is unavailable while Land is off', async () => {
    await expect(closeLandListing({ listingId: 9, userId: 77, outcome: 'sold' })).rejects.toThrow(/unavailable while Land is deferred/);
    expect(mockGetDb).not.toHaveBeenCalled();
  });

  it('marks approved live land as sold, removing it from public eligibility', async () => {
    await landOn(async () => {
      const database = db({ caseState: 'approved', listingStatus: 'approved' });
      mockGetDb.mockResolvedValue(database);
      await closeLandListing({ listingId: 9, userId: 77, outcome: 'sold' });
      expect(database.updates).toEqual([expect.objectContaining({ values: expect.objectContaining({ status: 'sold' }) })]);
    });
  });

  it('withdraws approved live land and ends its marketing authority', async () => {
    await landOn(async () => {
      const database = db({ caseState: 'approved', listingStatus: 'published' });
      mockGetDb.mockResolvedValue(database);
      await closeLandListing({ listingId: 9, userId: 77, outcome: 'withdrawn' });
      expect(database.updates.map(update => update.values)).toEqual([
        expect.objectContaining({ status: 'archived' }),
        expect.objectContaining({ authorityStatus: 'withdrawn' }),
      ]);
    });
  });

  it.each([['pending', 'pending_review'], ['draft', 'draft'], ['approved', 'sold']])('refuses land that is %s / %s', async (caseState, listingStatus) => {
    await landOn(async () => {
      const database = db({ caseState, listingStatus });
      mockGetDb.mockResolvedValue(database);
      await expect(closeLandListing({ listingId: 9, userId: 77, outcome: 'sold' })).rejects.toThrow(/Only an approved, live Land listing/);
      expect(database.updates).toEqual([]);
    });
  });

  it("refuses another agent's listing", async () => {
    await landOn(async () => {
      mockGetDb.mockResolvedValue(db({ caseState: 'approved', listingStatus: 'approved', ownerId: 5 }));
      await expect(closeLandListing({ listingId: 9, userId: 77, outcome: 'sold' })).rejects.toThrow('Land listing not found.');
    });
  });

  it('shows sold and withdrawn in the agent list only for approved cases', () => {
    expect(agentLandListingState('approved', 'sold')).toBe('sold');
    expect(agentLandListingState('approved', 'archived')).toBe('withdrawn');
    expect(agentLandListingState('approved', 'approved')).toBe('approved');
    expect(agentLandListingState('pending', 'sold')).toBe('submitted');
  });
});
