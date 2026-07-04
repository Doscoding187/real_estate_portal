import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetDb,
  mockSelect,
  mockFrom,
  mockWhere,
  mockLimit,
  mockUpdate,
  mockSet,
  mockUpdateWhere,
  mockInsert,
  mockValues,
  mockCaptureBrandLead,
  mockRecordAgentOsEventForAgentId,
} = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockWhere: vi.fn(),
  mockLimit: vi.fn(),
  mockUpdate: vi.fn(),
  mockSet: vi.fn(),
  mockUpdateWhere: vi.fn(),
  mockInsert: vi.fn(),
  mockValues: vi.fn(),
  mockCaptureBrandLead: vi.fn(),
  mockRecordAgentOsEventForAgentId: vi.fn(),
}));

vi.mock('../../db', () => ({
  getDb: mockGetDb,
}));

vi.mock('../brandLeadService', () => ({
  brandLeadService: {
    captureBrandLead: mockCaptureBrandLead,
  },
}));

vi.mock('../agentOsEventService', () => ({
  recordAgentOsEventForAgentId: mockRecordAgentOsEventForAgentId,
}));

import { capturePublicLead } from '../publicLeadCaptureService';

describe('publicLeadCaptureService contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdateWhere.mockResolvedValue(undefined);
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockResolvedValue([{ insertId: 456 }]);
    mockCaptureBrandLead.mockResolvedValue({
      leadId: 321,
      delivered: true,
      deliveryMethod: 'crm_export',
      brandLeadStatus: 'delivered_subscriber',
      message: 'Lead captured',
    });
    mockRecordAgentOsEventForAgentId.mockResolvedValue(undefined);
    mockGetDb.mockResolvedValue({
      select: mockSelect,
      update: mockUpdate,
      insert: mockInsert,
    });
  });

  it('routes development leads to the resolved brand with full public context', async () => {
    const affordabilityData = {
      monthlyIncome: 65000,
      monthlyExpenses: 12000,
      monthlyDebts: 3000,
      availableDeposit: 150000,
      maxAffordable: 1400000,
      calculatedAt: '2026-07-04T10:00:00.000Z',
    };
    mockLimit.mockResolvedValueOnce([{ id: 77, developerBrandProfileId: 13 }]);

    const result = await capturePublicLead({
      developmentId: 77,
      unitId: 'unit-1',
      unitName: 'Type A',
      unitPriceFrom: 1299000,
      unitBedrooms: 3,
      unitBathrooms: 2,
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '0820000000',
      message: 'Please send details.',
      leadSource: 'development_full_qualification',
      sourceSurface: 'development_qualification_page',
      referrerUrl: 'https://property-listify.test/development/cosmopolitan',
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'launch',
      affordabilityData,
    });

    expect(result).toMatchObject({
      success: true,
      leadId: 321,
      route: 'brand',
      delivered: true,
    });
    expect(mockCaptureBrandLead).toHaveBeenCalledWith(
      expect.objectContaining({
        developerBrandProfileId: 13,
        developmentId: 77,
        unitId: 'unit-1',
        unitName: 'Type A',
        unitPriceFrom: 1299000,
        unitBedrooms: 3,
        unitBathrooms: 2,
        leadSource: 'development_full_qualification',
        sourceSurface: 'development_qualification_page',
        referrerUrl: 'https://property-listify.test/development/cosmopolitan',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'launch',
        affordabilityData,
      }),
    );
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'development_qualification_page',
        affordabilityData,
        funnelStage: 'affordability',
      }),
    );
  });

  it('keeps direct development leads contract-complete when no brand can be resolved', async () => {
    const affordabilityData = {
      monthlyIncome: 42000,
      availableDeposit: 90000,
      maxAffordable: 980000,
      calculatedAt: '2026-07-04T10:00:00.000Z',
    };
    mockLimit.mockResolvedValueOnce([{ id: 77, developerBrandProfileId: null }]);

    const result = await capturePublicLead({
      developmentId: 77,
      unitId: 'unit-basic',
      unitName: 'Starter Unit',
      unitPriceFrom: 899000,
      unitBedrooms: 2,
      unitBathrooms: 1,
      name: 'Sam Buyer',
      email: 'sam@example.com',
      phone: '0830000000',
      leadSource: 'development_detail_info',
      sourceSurface: 'unit_floor_plan_dialog_unit-basic_info',
      referrerUrl: 'https://property-listify.test/development/cosmopolitan/unit/unit-basic',
      utmSource: 'newsletter',
      utmMedium: 'email',
      utmCampaign: 'winter',
      affordabilityData,
    });

    expect(result).toMatchObject({
      success: true,
      leadId: 456,
      route: 'direct',
    });
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        developmentId: 77,
        developerBrandProfileId: null,
        unitId: 'unit-basic',
        unitName: 'Starter Unit',
        unitPriceFrom: 899000,
        unitBedrooms: 2,
        unitBathrooms: 1,
        source: 'unit_floor_plan_dialog_unit-basic_info',
        leadSource: 'development_detail_info',
        referrerUrl: 'https://property-listify.test/development/cosmopolitan/unit/unit-basic',
        utmSource: 'newsletter',
        utmMedium: 'email',
        utmCampaign: 'winter',
        affordabilityData,
        funnelStage: 'affordability',
        qualificationStatus: 'pending',
      }),
    );
  });

  it('preserves legacy single-property source semantics when sourceSurface is omitted', async () => {
    mockLimit.mockResolvedValueOnce([
      { developmentId: null, developerBrandProfileId: null, agentId: null },
    ]);

    const result = await capturePublicLead({
      propertyId: 501,
      name: 'Pat Buyer',
      email: 'pat@example.com',
      phone: '0840000000',
      leadSource: 'property_detail',
      source: 'property_detail',
    });

    expect(result).toMatchObject({
      success: true,
      leadId: 456,
      route: 'direct',
    });
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyId: 501,
        developmentId: null,
        developerBrandProfileId: null,
        agentId: null,
        source: 'property_detail',
        leadSource: 'property_detail',
        affordabilityData: null,
        funnelStage: 'interest',
      }),
    );
  });
});
