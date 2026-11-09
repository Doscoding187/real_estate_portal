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

  it.each(GATED)('%s passes the gate for a paid agent', async name => {
    mockEntitlements.mockResolvedValue({ hasCommercialAccess: true, canAccessExistingLeads: true });
    const result = await caller('agent')[name]({}).then(
      () => null,
      (error: any) => error,
    );
    expect(result?.message).not.toBe(AGENT_LEADS_LOCKED_MESSAGE);
    expect(mockEntitlements).toHaveBeenCalled();
  });

  it.each(['agency_admin', 'super_admin'])('exempts %s from the gate', async role => {
    for (const name of GATED) {
      const result = await caller(role)[name]({}).then(
        () => null,
        (error: any) => error,
      );
      expect(result?.message).not.toBe(AGENT_LEADS_LOCKED_MESSAGE);
    }
    expect(mockEntitlements).not.toHaveBeenCalled();
  });
});
