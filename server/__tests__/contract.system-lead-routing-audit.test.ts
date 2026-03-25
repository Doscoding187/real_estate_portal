import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetLeadRoutingAudit } = vi.hoisted(() => ({
  mockGetLeadRoutingAudit: vi.fn(),
}));

vi.mock('../services/leadRoutingAuditService', () => ({
  getLeadRoutingAudit: mockGetLeadRoutingAudit,
}));

import { appRouter } from '../routers';

describe('system.leadRoutingAudit contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLeadRoutingAudit.mockResolvedValue({
      generatedAt: '2026-03-25T08:30:00.000Z',
      days: 30,
      summary: {
        totalLeads: 12,
        brandRoute: 5,
        directRoute: 7,
        brandDeliveredEmail: 2,
        brandDeliveredSubscriber: 2,
        brandCapturedOnly: 1,
        brandWithAgentContext: 1,
        directToAgent: 4,
        directToAgency: 1,
        directToPrivate: 1,
        directContextOnly: 1,
        unknownRoute: 0,
      },
      topSources: [
        { source: 'property_detail', count: 5 },
        { source: 'development_detail', count: 4 },
      ],
      attentionLeads: [
        {
          id: 88,
          createdAt: '2026-03-25T08:00:00.000Z',
          name: 'Sam Lead',
          email: 'sam@example.com',
          routeType: 'brand',
          recipientType: 'brand',
          issue: 'brand_capture_only',
          leadSource: 'development_detail',
          propertyId: null,
          developmentId: 12,
        },
      ],
    });
  });

  it('returns lead-routing audit for admins', async () => {
    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: { id: 1, role: 'super_admin' },
    } as any);

    const result = await caller.system.leadRoutingAudit({ days: 30, attentionLimit: 8 });

    expect(mockGetLeadRoutingAudit).toHaveBeenCalledWith({ days: 30, attentionLimit: 8 });
    expect(result.days).toBe(30);
    expect(result.summary).toMatchObject({
      totalLeads: 12,
      brandRoute: 5,
      directRoute: 7,
    });
    expect(result.topSources).toEqual(
      expect.arrayContaining([expect.objectContaining({ source: 'property_detail', count: 5 })]),
    );
    expect(result.attentionLeads).toEqual(
      expect.arrayContaining([expect.objectContaining({ issue: 'brand_capture_only' })]),
    );
  });
});
