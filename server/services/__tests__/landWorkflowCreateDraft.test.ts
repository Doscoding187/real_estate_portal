import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));

vi.mock('../../db-connection', () => ({ getDb: mockGetDb }));

import { createLandDraft, hashLandParcelIdentifier } from '../landWorkflowService';

function databaseForDraft(canonicalLocation: unknown[] = [
  { cityId: 12, cityName: 'Pretoria', provinceId: 4, provinceName: 'Gauteng' },
]) {
  const selections = [canonicalLocation, []];
  const inserted: unknown[] = [];
  let nextInsertId = 100;

  const tx: any = {
    select: vi.fn(() => {
      const result = selections.shift() || [];
      const query: any = {
        from: vi.fn(() => query),
        innerJoin: vi.fn(() => query),
        where: vi.fn(() => query),
        limit: vi.fn(async () => result),
      };
      return query;
    }),
    insert: vi.fn(() => ({
      values: vi.fn((value: unknown) => {
        inserted.push(value);
        return [{ insertId: nextInsertId++ }];
      }),
    })),
  };

  return {
    transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) => callback(tx)),
    inserted,
  };
}

const draftInput = {
  userId: 77,
  classification: 'residential_stand' as const,
  title: 'Corner residential stand',
  description: 'A serviced residential stand with clear seller-provided information.',
  askingPrice: 950000,
  parcel: {
    kind: 'erf' as const,
    identifier: '  ERF   123  ',
    extentM2: 720,
    provinceId: 4,
    cityId: 12,
    geometryConfidence: 'approximate' as const,
  },
};

describe('Land draft creation authority', () => {
  beforeEach(() => vi.clearAllMocks());

  it('derives display geography and the private parcel hash from canonical server data', async () => {
    const db = databaseForDraft();
    mockGetDb.mockResolvedValue(db);

    await expect(createLandDraft(draftInput)).resolves.toEqual({
      listingId: 100,
      landAssetId: 101,
      parcelId: 102,
    });

    expect(db.inserted[0]).toMatchObject({ city: 'Pretoria', province: 'Gauteng' });
    expect(db.inserted[2]).toMatchObject({
      provinceId: 4,
      cityId: 12,
      privateIdentifier: 'ERF   123',
      privateIdentifierHash: hashLandParcelIdentifier('ERF 123'),
    });
  });

  it('refuses a city and province that are not one active canonical pair', async () => {
    const db = databaseForDraft([]);
    mockGetDb.mockResolvedValue(db);

    await expect(createLandDraft(draftInput)).rejects.toThrow(
      'The Land city and province must be one active canonical location pair.',
    );
    expect(db.inserted).toEqual([]);
  });
});
