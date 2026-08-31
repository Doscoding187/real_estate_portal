import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));

vi.mock('../../db-connection', () => ({ getDb: mockGetDb }));

import { transitionLandReview } from '../landWorkflowService';

function databaseForApproval() {
  const selections = [
    [{ listingId: 9, landAssetId: 41, linkStatus: 'active' }],
    [
      {
        id: 9,
        ownerId: 77,
        askingPrice: '950000',
        city: 'Pretoria',
        province: 'Gauteng',
        title: 'Corner residential stand',
        description: 'A serviced residential stand with clear seller-provided information.',
      },
    ],
    [{ id: 41, classification: 'residential_stand' }],
    [{ id: 21, extentM2: '600', provinceId: 1, cityId: 2 }],
    [],
    [
      {
        id: 44,
        actorType: 'agent',
        supportingEvidenceId: 55,
        authorityStatus: 'pending',
        expiresAt: null,
      },
    ],
    [],
    [],
    [{ id: 71, state: 'reviewing', submissionSequence: 1 }],
    [],
    [],
    [
      {
        id: 81,
        mediaType: 'image',
        originalUrl: 'properties/9/site.jpg',
        processedUrl: 'properties/9/site.jpg',
        processingStatus: 'completed',
        displayOrder: 0,
        isPrimary: 1,
      },
    ],
  ];
  const updates: Array<{ table: string; values: Record<string, unknown> }> = [];

  const tx = {
    update: vi.fn((table: any) => ({
      set: vi.fn((values: Record<string, unknown>) => {
        updates.push({ table: table[Symbol.for('drizzle:Name')], values });
        return { where: vi.fn().mockResolvedValue({ affectedRows: 1 }) };
      }),
    })),
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue([{ insertId: 1 }]) })),
  };

  return {
    select: vi.fn(() => {
      const result = selections.shift() || [];
      const query: any = {
        from: vi.fn(() => query),
        innerJoin: vi.fn(() => query),
        where: vi.fn(() => query),
        orderBy: vi.fn(() => query),
        limit: vi.fn(async () => result),
        then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve(result).then(resolve, reject),
      };
      return query;
    }),
    transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) => callback(tx)),
    updates,
  };
}

describe('Land review approval transition', () => {
  beforeEach(() => vi.clearAllMocks());

  it('activates only the approved Land lifecycle after every publication gate is met', async () => {
    const db = databaseForApproval();
    mockGetDb.mockResolvedValue(db);

    await expect(
      transitionLandReview({ listingId: 9, reviewerUserId: 1, action: 'approve' }),
    ).resolves.toBeUndefined();

    expect(db.updates).toContainEqual(
      expect.objectContaining({ table: 'land_assets', values: expect.objectContaining({ lifecycleStatus: 'active' }) }),
    );
    expect(db.updates).toContainEqual(
      expect.objectContaining({ table: 'land_marketing_authorities', values: expect.objectContaining({ authorityStatus: 'active' }) }),
    );
    expect(db.updates).toContainEqual(
      expect.objectContaining({ table: 'listings', values: expect.objectContaining({ status: 'approved', approvalStatus: 'approved' }) }),
    );
  });
});
