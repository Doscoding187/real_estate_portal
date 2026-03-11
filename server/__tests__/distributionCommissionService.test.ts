import { describe, expect, it, vi } from 'vitest';
import { ensureCommissionEntryForDeal } from '../services/distributionCommissionService';

describe('distributionCommissionService', () => {
  it('uses stored deal pricing for percentage commissions when available', async () => {
    const insertEntry = vi.fn().mockResolvedValue(undefined);
    const setDealCommissionPending = vi.fn().mockResolvedValue(undefined);
    const insertCommissionCreatedEvent = vi.fn().mockResolvedValue(undefined);

    const result = await ensureCommissionEntryForDeal({
      deal: {
        id: 10,
        programId: 20,
        developmentId: 30,
        agentId: 40,
        commissionBaseAmount: 1_500_000,
        commissionTriggerStage: 'contract_signed',
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

  it('falls back to affordability purchase price when explicit commission base is missing', async () => {
    const insertEntry = vi.fn().mockResolvedValue(undefined);

    await ensureCommissionEntryForDeal({
      deal: {
        id: 10,
        programId: 20,
        developmentId: 30,
        agentId: 40,
        affordabilityPurchasePrice: 980_000,
        commissionTriggerStage: 'bond_approved',
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
});
