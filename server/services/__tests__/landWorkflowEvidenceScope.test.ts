import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));

vi.mock('../../db-connection', () => ({ getDb: mockGetDb }));

import { addPrivateEvidence, declareMarketingAuthority } from '../landWorkflowService';

function databaseForEvidence(evidence: unknown[]) {
  const selections = [
    [{ id: 9, ownerId: 77 }],
    [{ listingId: 9, landAssetId: 41, linkStatus: 'active' }],
    [{ id: 14, state: 'draft' }],
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

function databaseForParcelEvidence(parcelLinks: unknown[]) {
  const selections = [
    [{ id: 9, ownerId: 77 }],
    [{ listingId: 9, landAssetId: 41, linkStatus: 'active' }],
    [{ id: 14, state: 'draft' }],
    parcelLinks,
  ];
  const values = vi.fn().mockResolvedValue([{ insertId: 1 }]);
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
    insert: vi.fn(() => ({ values })),
    values,
  };
}

describe('Land Marketing Authority evidence scope', () => {
  beforeEach(() => vi.clearAllMocks());

  it('accepts mandate evidence owned by the same editable Land Asset', async () => {
    const db = databaseForEvidence([{ id: 101, evidenceType: 'mandate' }]);
    mockGetDb.mockResolvedValue(db);
    await expect(declareMarketingAuthority({ listingId: 9, userId: 77, actorType: 'agent', authorityType: 'sole_mandate', supportingEvidenceId: 101 })).resolves.toBeUndefined();
    expect(db.values).toHaveBeenCalledWith(expect.objectContaining({ landAssetId: 41, supportingEvidenceId: 101 }));
  });

  it('rejects foreign or guessed evidence before creating Marketing Authority', async () => {
    const db = databaseForEvidence([]);
    mockGetDb.mockResolvedValue(db);
    await expect(declareMarketingAuthority({ listingId: 9, userId: 77, actorType: 'agent', authorityType: 'sole_mandate', supportingEvidenceId: 202 })).rejects.toThrow('Supporting evidence must be private mandate evidence for this Land Asset.');
    expect(db.values).not.toHaveBeenCalled();
  });

  it('does not treat another private document as a mandate', async () => {
    const db = databaseForEvidence([{ id: 101, evidenceType: 'title_registry' }]);
    mockGetDb.mockResolvedValue(db);
    await expect(declareMarketingAuthority({ listingId: 9, userId: 77, actorType: 'agent', authorityType: 'sole_mandate', supportingEvidenceId: 101 })).rejects.toThrow('Supporting evidence must be private mandate evidence for this Land Asset.');
    expect(db.values).not.toHaveBeenCalled();
  });

  it('rejects evidence that attempts to attach a parcel from another Land Asset', async () => {
    const db = databaseForParcelEvidence([]);
    mockGetDb.mockResolvedValue(db);

    await expect(
      addPrivateEvidence({
        listingId: 9,
        userId: 77,
        evidenceType: 'parcel_survey',
        uploadToken: 'untrusted-token',
        parcelId: 999,
      }),
    ).rejects.toThrow('Private Land evidence must target a parcel in this Land Asset.');
    expect(db.values).not.toHaveBeenCalled();
  });
});
