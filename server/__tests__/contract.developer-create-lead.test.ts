import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCapturePublicLead } = vi.hoisted(() => ({
  mockCapturePublicLead: vi.fn(),
}));

vi.mock('../services/publicLeadCaptureService', () => ({
  capturePublicLead: mockCapturePublicLead,
}));

import { appRouter } from '../routers';

describe('developer.createLead contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCapturePublicLead.mockResolvedValue({
      success: true,
      leadId: 101,
      route: 'brand',
      delivered: true,
      brandLeadStatus: 'delivered_subscriber',
      message: 'Lead captured',
    });
  });

  it('accepts development unit, source, UTM, and affordability context', async () => {
    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);

    const affordabilityData = {
      monthlyIncome: 65000,
      monthlyExpenses: 12000,
      monthlyDebts: 3000,
      availableDeposit: 150000,
      maxAffordable: 1400000,
      calculatedAt: '2026-07-04T10:00:00.000Z',
    };

    const result = await caller.developer.createLead({
      developmentId: 77,
      developerBrandProfileId: 13,
      unitId: 'unit-1',
      unitName: 'Type A',
      unitPriceFrom: 1299000,
      unitBedrooms: 3,
      unitBathrooms: 2,
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '0820000000',
      message: 'Please send details.',
      leadSource: 'development_detail_info',
      sourceSurface: 'unit_floor_plan_dialog_unit-1_info',
      referrerUrl: 'https://property-listify.test/development/cosmopolitan?utm_source=google',
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'launch',
      affordabilityData,
    });

    expect(result).toMatchObject({
      success: true,
      leadId: 101,
      route: 'brand',
    });
    expect(mockCapturePublicLead).toHaveBeenCalledWith({
      developmentId: 77,
      developerBrandProfileId: 13,
      unitId: 'unit-1',
      unitName: 'Type A',
      unitPriceFrom: 1299000,
      unitBedrooms: 3,
      unitBathrooms: 2,
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '0820000000',
      message: 'Please send details.',
      leadType: 'inquiry',
      source: 'unit_floor_plan_dialog_unit-1_info',
      sourceSurface: 'unit_floor_plan_dialog_unit-1_info',
      leadSource: 'development_detail_info',
      referrerUrl: 'https://property-listify.test/development/cosmopolitan?utm_source=google',
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'launch',
      affordabilityData,
    });
  });
});
