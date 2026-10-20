import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { ensureCommissionEntryForDeal } from '../services/distributionCommissionService';

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map(key => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function createTermsSnapshot(program: {
  referrerCommissionType: 'flat' | 'percentage';
  referrerCommissionValue: number;
  referrerCommissionBasis: 'sale_price' | 'base_price' | null;
  currencyCode: string;
}) {
  const terms = {
    version: 2,
    marketMode: 'sale',
    program,
  };
  const snapshotDigest = createHash('sha256')
    .update(canonicalJson(terms), 'utf8')
    .digest('hex');
  return {
    snapshot: { ...terms, digest: snapshotDigest },
    digest: snapshotDigest,
  };
}

describe('distributionCommissionService', () => {
  it('uses stored deal pricing for percentage commissions when available', async () => {
    const insertEntry = vi.fn().mockResolvedValue(undefined);
    const setDealCommissionPending = vi.fn().mockResolvedValue(undefined);
    const insertCommissionCreatedEvent = vi.fn().mockResolvedValue(undefined);

    const terms = createTermsSnapshot({
      referrerCommissionType: 'percentage',
      referrerCommissionValue: 2.5,
      referrerCommissionBasis: 'sale_price',
      currencyCode: 'USD',
    });

    const result = await ensureCommissionEntryForDeal({
      deal: {
        id: 10,
        programId: 20,
        developmentId: 30,
        agentId: 40,
        commissionBaseAmount: 1_500_000,
        dealAmount: 1_500_000,
        commissionTriggerStage: 'contract_signed',
        referralTermsSnapshotJson: terms.snapshot,
        referralTermsSnapshotDigest: terms.digest,
      },
      transitionToStage: 'contract_signed',
      actorUserId: 99,
      source: 'test',
      deps: {
        findExistingEntry: async () => null,
        getProgramDefaults: async () => ({
          commissionModel: 'flat_percentage',
          defaultCommissionPercent: 2.5,
          defaultCommissionAmount: null,
          currencyCode: 'USD',
        }),
        insertEntry,
        setDealCommissionPending,
        insertCommissionCreatedEvent,
      },
    });

    expect(result).toEqual({ created: true });
    expect(insertEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        calculationBaseAmount: 1_500_000,
        commissionPercent: 2.5,
        commissionAmount: 37_500,
        currency: 'USD',
      }),
    );
    expect(setDealCommissionPending).toHaveBeenCalledWith(10);
    expect(insertCommissionCreatedEvent).toHaveBeenCalled();
  });

  it('uses the frozen base price when explicit commission base is present', async () => {
    const insertEntry = vi.fn().mockResolvedValue(undefined);
    const terms = createTermsSnapshot({
      referrerCommissionType: 'percentage',
      referrerCommissionValue: 1.25,
      referrerCommissionBasis: 'base_price',
      currencyCode: 'ZAR',
    });

    await ensureCommissionEntryForDeal({
      deal: {
        id: 10,
        programId: 20,
        developmentId: 30,
        agentId: 40,
        commissionBaseAmount: 980_000,
        commissionTriggerStage: 'bond_approved',
        referralTermsSnapshotJson: terms.snapshot,
        referralTermsSnapshotDigest: terms.digest,
      },
      transitionToStage: 'bond_approved',
      actorUserId: 99,
      source: 'test',
      deps: {
        findExistingEntry: async () => null,
        getProgramDefaults: async () => ({
          commissionModel: 'flat_percentage',
          defaultCommissionPercent: 1.25,
          defaultCommissionAmount: null,
        }),
        insertEntry,
        setDealCommissionPending: async () => undefined,
        insertCommissionCreatedEvent: async () => undefined,
      },
    });

    expect(insertEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        calculationBaseAmount: 980_000,
        commissionAmount: 12_250,
        currency: 'ZAR',
      }),
    );
  });

  it('fails the deal transition when commission schema is unavailable', async () => {
    const missingTableError = Object.assign(new Error('missing table'), {
      code: 'ER_NO_SUCH_TABLE',
      errno: 1146,
    });

    await expect(ensureCommissionEntryForDeal({
      deal: {
        id: 10,
        programId: 20,
        developmentId: 30,
        agentId: 40,
        commissionBaseAmount: 1_500_000,
        commissionTriggerStage: 'bond_approved',
      },
      transitionToStage: 'commission_pending',
      actorUserId: 99,
      source: 'test',
      deps: {
        findExistingEntry: async () => {
          throw missingTableError;
        },
        getProgramDefaults: async () => ({
          commissionModel: 'flat_percentage',
          defaultCommissionPercent: 2.5,
          defaultCommissionAmount: null,
          currencyCode: 'ZAR',
        }),
        insertEntry: async () => undefined,
        setDealCommissionPending: async () => undefined,
        insertCommissionCreatedEvent: async () => undefined,
      },
    })).rejects.toThrow(
      'Referral payout record could not be persisted; deal transition rolled back.',
    );
  });
});
