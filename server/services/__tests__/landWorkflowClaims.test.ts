import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));

vi.mock('../../db-connection', () => ({ getDb: mockGetDb }));

import { recordLandClaims } from '../landWorkflowService';

function databaseForClaims() {
  const selections = [
    [{ id: 9, ownerId: 77 }],
    [{ listingId: 9, landAssetId: 41, linkStatus: 'active' }],
    [{ id: 14, state: 'changes_requested' }],
  ];
  const updates: Array<Record<string, unknown>> = [];
  const inserts: Array<Record<string, unknown>> = [];

  const tx = {
    update: vi.fn(() => ({
      set: vi.fn((values: Record<string, unknown>) => {
        updates.push(values);
        return { where: vi.fn().mockResolvedValue({ affectedRows: 1 }) };
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((values: Record<string, unknown>) => {
        inserts.push(values);
        return Promise.resolve([{ insertId: 61 }]);
      }),
    })),
  };

  return {
    select: vi.fn(() => {
      const result = selections.shift() || [];
      const query: any = {
        from: vi.fn(() => query),
        where: vi.fn(() => query),
        limit: vi.fn(async () => result),
      };
      return query;
    }),
    transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) => callback(tx)),
    updates,
    inserts,
  };
}

describe('Land disclosure corrections', () => {
  beforeEach(() => vi.clearAllMocks());

  it('withdraws the current asset-level disclosure before recording its replacement', async () => {
    const db = databaseForClaims();
    mockGetDb.mockResolvedValue(db);

    await expect(
      recordLandClaims({
        listingId: 9,
        userId: 77,
        claims: [
          {
            code: 'water',
            valueState: 'asserted',
            value: 'Municipal connection confirmed by seller.',
          },
        ],
      }),
    ).resolves.toBeUndefined();

    expect(db.updates).toEqual([
      expect.objectContaining({
        withdrawnAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
    ]);
    expect(db.inserts).toEqual([
      expect.objectContaining({
        landAssetId: 41,
        claimCode: 'water',
        valueState: 'asserted',
        claimedValue: 'Municipal connection confirmed by seller.',
        declaredByUserId: 77,
      }),
    ]);
  });
});
