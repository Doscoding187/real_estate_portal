import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetLeadRoutingConversionReport } = vi.hoisted(() => ({
  mockGetLeadRoutingConversionReport: vi.fn(),
}));

vi.mock('../services/leadRoutingConversionReportService', () => ({
  getLeadRoutingConversionReport: mockGetLeadRoutingConversionReport,
}));

import { appRouter } from '../routers';

describe('system.leadRoutingConversionReport contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLeadRoutingConversionReport.mockResolvedValue({
      generatedAt: '2026-03-25T10:00:00.000Z',
      days: 30,
      summary: {
        totalLeads: 20,
        correctedLeads: 3,
        convertedLeads: 5,
        correctedConvertedLeads: 2,
        qualifiedLeads: 8,
        viewingLeads: 6,
        offerLeads: 4,
        lostLeads: 5,
        conversionRate: 25,
        correctedConversionRate: 66.7,
      },
      sourceBreakdown: [{ source: 'property_detail', totalLeads: 10, convertedLeads: 3, conversionRate: 30 }],
      routeBreakdown: [
        {
          key: 'direct:agent',
          routeType: 'direct',
          recipientType: 'agent',
          totalLeads: 9,
          correctedLeads: 1,
          qualifiedLeads: 4,
          viewingLeads: 3,
          offerLeads: 2,
          convertedLeads: 2,
          lostLeads: 2,
          conversionRate: 22.2,
        },
      ],
    });
  });

  it('returns conversion reporting for admins', async () => {
    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: { id: 1, role: 'super_admin' },
    } as any);

    const result = await caller.system.leadRoutingConversionReport({ days: 30 });

    expect(mockGetLeadRoutingConversionReport).toHaveBeenCalledWith({ days: 30 });
    expect(result.summary).toMatchObject({
      totalLeads: 20,
      convertedLeads: 5,
      conversionRate: 25,
    });
    expect(result.routeBreakdown).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'direct:agent', convertedLeads: 2 })]),
    );
  });
});
