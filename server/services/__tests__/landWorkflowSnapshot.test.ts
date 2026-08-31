import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));

vi.mock('../../db-connection', () => ({ getDb: mockGetDb }));

import { landWorkflowSnapshot } from '../landWorkflowService';

function databaseForSnapshot() {
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
    [
      {
        id: 31,
        claimCode: 'water',
        valueState: 'asserted',
        claimedValue: 'Municipal connection is seller declared.',
        parcelId: null,
        declaredAt: '2026-08-01 00:00:00',
      },
    ],
    [
      {
        id: 44,
        actorType: 'agent',
        supportingEvidenceId: 55,
        authorityStatus: 'pending',
        expiresAt: null,
      },
    ],
    [
      {
        id: 55,
        evidenceType: 'mandate',
        privateStorageKey: 'private/land/41/mandate.pdf',
        originalFileName: 'mandate.pdf',
      },
    ],
    [
      {
        id: 61,
        claimCode: 'water',
        status: 'verified',
        publicConclusion: 'Connection record reviewed.',
        limitations: 'Capacity has not been assessed.',
        sourceProvider: 'Municipality',
        verifierType: 'authoritative_source',
        verifierName: null,
        checkedAt: '2026-08-02 00:00:00',
        expiresAt: null,
        recheckDueAt: null,
      },
    ],
    [{ id: 71, state: 'draft', submissionSequence: 0 }],
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
  };
}

describe('Land workflow snapshot', () => {
  beforeEach(() => vi.clearAllMocks());

  it('gives the private workspace seller disclosures and assertions without leaking storage keys', async () => {
    mockGetDb.mockResolvedValue(databaseForSnapshot());

    const snapshot = await landWorkflowSnapshot(9, 77);

    expect(snapshot.claims).toEqual([
      expect.objectContaining({
        claimCode: 'water',
        claimedValue: 'Municipal connection is seller declared.',
      }),
    ]);
    expect(snapshot.assertions).toEqual([
      expect.objectContaining({
        claimCode: 'water',
        publicConclusion: 'Connection record reviewed.',
      }),
    ]);
    expect(snapshot.evidence[0]).not.toHaveProperty('privateStorageKey');
    expect(snapshot.marketingImageCount).toBe(1);
  });
});
