import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetLeadRoutingConversionReport } = vi.hoisted(() => ({
  mockGetLeadRoutingConversionReport: vi.fn(),
}));

vi.mock('../services/leadRoutingConversionReportService', () => ({
  getLeadRoutingConversionReport: mockGetLeadRoutingConversionReport,
}));

import { appRouter } from '../routers';

const callerFor = (role?: string) =>
  appRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: role ? { id: 1, role } : null,
  } as any);

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

  it('rejects anonymous callers before reading global lead conversion data', async () => {
    await expect(
      callerFor().system.leadRoutingConversionReport({ days: 30 }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });

    expect(mockGetLeadRoutingConversionReport).not.toHaveBeenCalled();
  });

  it.each(['visitor', 'agent', 'agency_admin', 'property_developer', 'service_provider'])(
    'rejects %s before reading global lead conversion data',
    async role => {
      await expect(
        callerFor(role).system.leadRoutingConversionReport({ days: 30 }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });

      expect(mockGetLeadRoutingConversionReport).not.toHaveBeenCalled();
    },
  );

  it('returns conversion reporting for super admins', async () => {
    const caller = callerFor('super_admin');

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
