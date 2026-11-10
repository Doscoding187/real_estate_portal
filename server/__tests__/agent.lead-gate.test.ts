import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockEntitlements, mockGetDb } = vi.hoisted(() => ({
  mockEntitlements: vi.fn(),
  mockGetDb: vi.fn(),
}));

vi.mock('../db', () => ({ getDb: mockGetDb }));
vi.mock('../services/agentEntitlementService', () => ({
  getAgentEntitlementsForUserId: mockEntitlements,
}));

import { agentRouter } from '../agentRouter';
import { AGENT_LEADS_LOCKED_MESSAGE } from '../services/agentLeadAccessGate';

const GATED = [
  'getLeadsPipeline',
  'moveLeadToStage',
  'getMyLeads',
  'getMyFollowUps',
  'setLeadFollowUp',
  'completeLeadFollowUp',
  'recordLeadContactAttempt',
  'updateLeadStatus',
  'getLeadOfferReadiness',
  'setLeadOfferReadiness',
  'addLeadActivity',
  'getLeadActivities',
  'getLeadResponseSummary',
  'getMyShowings',
  'bookShowing',
  'updateShowingStatus',
  'getMyCommissions',
  'exportCommissionsCSV',
  'getPerformanceAnalytics',
] as const;

function caller(role: string) {
  return agentRouter.createCaller({
    user: { id: 55, role, email: 'a@example.com' } as any,
    req: {} as any,
    res: {} as any,
    requestId: 'test',
  } as any) as any;
}

describe('agent lead and showing procedures are gated server-side (D2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDb.mockResolvedValue(null);
  });

  it.each(GATED)('%s refuses an unpaid agent', async name => {
    mockEntitlements.mockResolvedValue({ hasCommercialAccess: false, canAccessExistingLeads: true });
    await expect(caller('agent')[name]({})).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: AGENT_LEADS_LOCKED_MESSAGE,
    });
  });

  // A sentinel DB failure proves the gate OPENED: the handler ran far enough to call getDb
  // (or input validation ran), so the error is never the lock message and is never FORBIDDEN-locked.
  async function run(role: string, name: string) {
    return caller(role)[name]({}).then(
      () => ({ ok: true as const }),
      (error: any) => ({ ok: false as const, error }),
    );
  }

  it.each(GATED)('%s opens for a paid agent (handler or input validation is reached)', async name => {
    mockEntitlements.mockResolvedValue({ hasCommercialAccess: true, canAccessExistingLeads: true });
    const result = await run('agent', name);
    expect(mockEntitlements).toHaveBeenCalledTimes(1);
    if (!result.ok) {
      expect(result.error.message).not.toBe(AGENT_LEADS_LOCKED_MESSAGE);
      // Reached input validation (BAD_REQUEST) or the handler (DB sentinel / profile lookup).
      expect(
        result.error.code === 'BAD_REQUEST' || /Database|Cannot read|not found|undefined|null/i.test(result.error.message),
      ).toBe(true);
    }
  });

  it.each(['agency_admin', 'super_admin'])('%s opens without an entitlement lookup', async role => {
    for (const name of GATED) {
      const result = await run(role, name);
      if (!result.ok) {
        expect(result.error.message).not.toBe(AGENT_LEADS_LOCKED_MESSAGE);
        expect(
          result.error.code === 'BAD_REQUEST' || /Database|Cannot read|not found|undefined|null/i.test(result.error.message),
        ).toBe(true);
      }
    }
    expect(mockEntitlements).not.toHaveBeenCalled();
  });

  it('getDashboardStats stays open and zeroes lead figures for a locked agent with an approved profile', async () => {
    const expected = { newLeadsThisWeek: 0, showingsToday: 0, commissionsPending: 0 };
    mockEntitlements.mockResolvedValue({
      hasCommercialAccess: false,
      canAccessExistingLeads: true,
    });
    const tableOf = (table: any) => {
      const sym = Object.getOwnPropertySymbols(table).find(x => String(x).includes('BaseName'));
      return String((sym && table[sym]) || '');
    };
    mockGetDb.mockResolvedValue({
      select: () => {
        let name = '';
        const rows = () =>
          name === 'agents' ? [{ id: 7, userId: 55, status: 'approved', agencyId: null }] : [{ count: 3, total: 9 }];
        const chain: any = {
          from: (t: any) => {
            name = tableOf(t);
            return chain;
          },
          where: () => chain,
          limit: async () => rows(),
          then: (resolve: any) => resolve(rows()),
        };
        return chain;
      },
    });
    const stats = await caller('agent').getDashboardStats();
    expect(stats).toMatchObject(expected);
    expect(stats.activeListings).toBe(3);
  });
});
