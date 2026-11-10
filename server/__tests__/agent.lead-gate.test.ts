import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockEntitlements, mockGetDb } = vi.hoisted(() => ({
  mockEntitlements: vi.fn(),
  mockGetDb: vi.fn(),
}));

vi.mock('../db', () => ({ getDb: mockGetDb }));
vi.mock('../services/agentEntitlementService', () => ({
  getAgentEntitlementsForUserId: mockEntitlements,
}));

import { MySqlDialect } from 'drizzle-orm/mysql-core';
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

  const LIST_ENDPOINTS = [
    'getLeadsPipeline',
    'getMyLeads',
    'getMyFollowUps',
    'getMyShowings',
    'getMyCommissions',
  ] as const;
  const REFUSING = GATED.filter(name => !(LIST_ENDPOINTS as readonly string[]).includes(name));

  it.each(REFUSING)('%s refuses an unpaid agent', async name => {
    mockEntitlements.mockResolvedValue({ hasCommercialAccess: false, canAccessExistingLeads: true });
    await expect(caller('agent')[name]({})).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: AGENT_LEADS_LOCKED_MESSAGE,
    });
  });

  it.each(LIST_ENDPOINTS)('%s returns an empty result (no error, no DB read) for an unpaid agent', async name => {
    mockEntitlements.mockResolvedValue({ hasCommercialAccess: false, canAccessExistingLeads: true });
    mockGetDb.mockRejectedValue(new Error('must not reach the database'));
    const result = await caller('agent')[name]({});
    if (name === 'getLeadsPipeline') {
      expect(Object.values(result).every(column => (column as unknown[]).length === 0)).toBe(true);
      expect(Object.keys(result)).toContain('new');
    } else {
      expect(result).toEqual([]);
    }
  });

  // Valid inputs, so input validation passes and the handler body runs. The mocked
  // downstream database rejects with a sentinel: seeing exactly that sentinel proves
  // the gate OPENED and the handler reached its first database call.
  const SENTINEL = 'SENTINEL_HANDLER_REACHED_DB';
  const VALID_INPUT: Record<string, unknown> = {
    getLeadsPipeline: {},
    moveLeadToStage: { leadId: 1, targetStage: 'contacted' },
    getMyLeads: {},
    getMyFollowUps: {},
    setLeadFollowUp: { leadId: 1, nextFollowUp: '2026-12-01' },
    completeLeadFollowUp: { leadId: 1, note: 'done' },
    recordLeadContactAttempt: {
      leadId: 1,
      channel: 'call',
      outcome: 'reached',
      summary: 'spoke',
      nextAction: 'send info',
    },
    updateLeadStatus: { leadId: 1, status: 'contacted' },
    getLeadOfferReadiness: { leadId: 1 },
    setLeadOfferReadiness: {
      leadId: 1,
      readiness: { viewingCompleted: true, feedbackLogged: true, affordabilityConfirmed: true },
    },
    addLeadActivity: { leadId: 1, activityType: 'note', description: 'x' },
    getLeadActivities: { leadId: 1 },
    getLeadResponseSummary: undefined,
    getMyShowings: {},
    bookShowing: { listingId: 1, scheduledAt: '2026-12-01T10:00:00Z', visitorName: 'Visitor' },
    updateShowingStatus: { showingId: 1, status: 'completed' },
    getMyCommissions: {},
    exportCommissionsCSV: {},
    getPerformanceAnalytics: {},
  };

  async function reachesHandler(role: string, name: string) {
    mockGetDb.mockRejectedValue(new Error(SENTINEL));
    await expect(caller(role)[name](VALID_INPUT[name])).rejects.toThrow(SENTINEL);
  }

  it.each(GATED)('%s opens for a paid agent and reaches the handler', async name => {
    mockEntitlements.mockResolvedValue({ hasCommercialAccess: true, canAccessExistingLeads: true });
    await reachesHandler('agent', name);
    expect(mockEntitlements).toHaveBeenCalledTimes(1);
  });

  it.each(['agency_admin', 'super_admin'])('%s opens without an entitlement lookup', async role => {
    for (const name of GATED) {
      await reachesHandler(role, name);
    }
    expect(mockEntitlements).not.toHaveBeenCalled();
  });

  it('a paid agent actually receives a returned value from getLeadResponseSummary', async () => {
    mockEntitlements.mockResolvedValue({ hasCommercialAccess: true, canAccessExistingLeads: true });
    const chain: any = {
      from: () => chain,
      where: () => chain,
      limit: async () => [],
      then: (resolve: any) => resolve([]),
    };
    mockGetDb.mockResolvedValue({ select: () => chain });
    await expect(caller('agent').getLeadResponseSummary()).resolves.toMatchObject({
      windowDays: 30,
      totalLeads: 0,
    });
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

  it.each([
    [false, true],
    [true, false],
  ])(
    'getUnreadNotificationCount (unlocked=%s) excludes gated types: %s',
    async (unlocked, excludes) => {
      mockEntitlements.mockResolvedValue({
        hasCommercialAccess: unlocked,
        canAccessExistingLeads: true,
      });
      let predicate: any = null;
      mockGetDb.mockResolvedValue({
        select: () => {
          const chain: any = {
            from: () => chain,
            where: async (p: any) => {
              predicate = p;
              return [{ count: 2 }];
            },
          };
          return chain;
        },
      });
      await expect(caller('agent').getUnreadNotificationCount()).resolves.toEqual({ count: 2 });
      const compiled = new MySqlDialect().sqlToQuery(predicate);
      expect(compiled.sql.includes('not in')).toBe(excludes);
      for (const type of ['lead_assigned', 'showing_scheduled', 'offer_received']) {
        expect(compiled.params.includes(type)).toBe(excludes);
      }
    },
  );
});
