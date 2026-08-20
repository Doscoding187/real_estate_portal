import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));

vi.mock('../../db-connection', () => ({ getDb: mockGetDb }));

import { declareMarketingAuthority } from '../landWorkflowService';

function databaseForEvidence(evidence: unknown[]) {
  const selections = [
    [{ id: 9, ownerId: 77 }],
    [{ listingId: 9, landAssetId: 41, linkStatus: 'active' }],
    evidence,
    [],
  ];
  const values = vi.fn().mockResolvedValue([{ insertId: 1 }]);
  return {
    select: vi.fn(() => {
      const result = selections.shift() || [];
      const query: any = { from: vi.fn(() => query), where: vi.fn(() => query), limit: vi.fn(async () => result) };
      return query;
    }),
    insert: vi.fn(() => ({ values })),
    values,
  };
}

describe('Land Marketing Authority evidence scope', () => {
  beforeEach(() => vi.clearAllMocks());

  it('accepts supporting evidence owned by the same Land Asset', async () => {
    const db = databaseForEvidence([{ id: 101 }]);
    mockGetDb.mockResolvedValue(db);
    await expect(declareMarketingAuthority({ listingId: 9, userId: 77, actorType: 'agent', authorityType: 'sole_mandate', supportingEvidenceId: 101 })).resolves.toBeUndefined();
    expect(db.values).toHaveBeenCalledWith(expect.objectContaining({ landAssetId: 41, supportingEvidenceId: 101 }));
  });

  it('rejects foreign or guessed evidence before creating Marketing Authority', async () => {
    const db = databaseForEvidence([]);
    mockGetDb.mockResolvedValue(db);
    await expect(declareMarketingAuthority({ listingId: 9, userId: 77, actorType: 'agent', authorityType: 'sole_mandate', supportingEvidenceId: 202 })).rejects.toThrow('Supporting evidence must belong to this Land Asset.');
    expect(db.values).not.toHaveBeenCalled();
  });
});
