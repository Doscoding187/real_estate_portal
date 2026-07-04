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
    mockLimit
      .mockResolvedValueOnce([
        { id: 77, developerBrandProfileId: 13, isPublished: 1, approvalStatus: 'approved' },
      ])
      .mockResolvedValueOnce([{ id: 'unit-1', developmentId: 77, isActive: 1 }]);

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
    mockLimit
      .mockResolvedValueOnce([
        { id: 77, developerBrandProfileId: null, isPublished: 1, approvalStatus: 'approved' },
      ])
      .mockResolvedValueOnce([{ id: 'unit-basic', developmentId: 77, isActive: 1 }]);

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

  it('uses the canonical development brand when the client submits a spoofed brand id', async () => {
    mockLimit.mockResolvedValueOnce([
      { id: 77, developerBrandProfileId: 13, isPublished: 1, approvalStatus: 'approved' },
    ]);

    const result = await capturePublicLead({
      developmentId: 77,
      developerBrandProfileId: 999,
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '0820000000',
      leadSource: 'development_detail_info',
      sourceSurface: 'unit_floor_plan_dialog_unit-a_info',
    });

    expect(result).toMatchObject({
      success: true,
      leadId: 321,
      route: 'brand',
    });
    expect(mockCaptureBrandLead).toHaveBeenCalledWith(
      expect.objectContaining({
        developmentId: 77,
        developerBrandProfileId: 13,
        leadSource: 'development_detail_info',
        sourceSurface: 'unit_floor_plan_dialog_unit-a_info',
      }),
    );
    expect(mockCaptureBrandLead).not.toHaveBeenCalledWith(
      expect.objectContaining({ developerBrandProfileId: 999 }),
    );
  });

  it('rejects public development leads for inventory that is not approved and published', async () => {
    mockLimit.mockResolvedValueOnce([
      { id: 77, developerBrandProfileId: 13, isPublished: 1, approvalStatus: 'pending' },
    ]);

    await expect(
      capturePublicLead({
        developmentId: 77,
        developerBrandProfileId: 13,
        name: 'Jane Doe',
        email: 'jane@example.com',
      }),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Development not available for public enquiries.',
    });

    expect(mockCaptureBrandLead).not.toHaveBeenCalled();
    expect(mockValues).not.toHaveBeenCalled();
  });

  it('rejects unit context that does not belong to the canonical development', async () => {
    mockLimit
      .mockResolvedValueOnce([
        { id: 77, developerBrandProfileId: 13, isPublished: 1, approvalStatus: 'approved' },
      ])
      .mockResolvedValueOnce([{ id: 'unit-from-other-dev', developmentId: 88, isActive: 1 }]);

    await expect(
      capturePublicLead({
        developmentId: 77,
        developerBrandProfileId: 13,
        unitId: 'unit-from-other-dev',
        unitName: 'Wrong Unit',
        name: 'Jane Doe',
        email: 'jane@example.com',
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Unit does not belong to this public development.',
    });

    expect(mockCaptureBrandLead).not.toHaveBeenCalled();
    expect(mockValues).not.toHaveBeenCalled();
  });

  it('rejects inactive unit context for a public development lead', async () => {
    mockLimit
      .mockResolvedValueOnce([
        { id: 77, developerBrandProfileId: 13, isPublished: 1, approvalStatus: 'approved' },
      ])
      .mockResolvedValueOnce([{ id: 'unit-inactive', developmentId: 77, isActive: 0 }]);

    await expect(
      capturePublicLead({
        developmentId: 77,
        unitId: 'unit-inactive',
        unitName: 'Inactive Unit',
        name: 'Jane Doe',
        email: 'jane@example.com',
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Unit does not belong to this public development.',
    });

    expect(mockCaptureBrandLead).not.toHaveBeenCalled();
    expect(mockValues).not.toHaveBeenCalled();
  });

  it('preserves brand-only public lead capture when no development id is present', async () => {
    const result = await capturePublicLead({
      developerBrandProfileId: 55,
      name: 'Brand Lead',
      email: 'brand@example.com',
      leadSource: 'brand_profile',
      sourceSurface: 'brand_profile_page',
    });

    expect(result).toMatchObject({
      success: true,
      leadId: 321,
      route: 'brand',
    });
    expect(mockCaptureBrandLead).toHaveBeenCalledWith(
      expect.objectContaining({
        developerBrandProfileId: 55,
        developmentId: undefined,
        leadSource: 'brand_profile',
        sourceSurface: 'brand_profile_page',
      }),
    );
  });

  it('preserves agent lead capture when no development id is present', async () => {
    mockLimit.mockResolvedValueOnce([{ id: 33, agencyId: 44 }]);

    const result = await capturePublicLead({
      agentId: 33,
      name: 'Agent Lead',
      email: 'agent@example.com',
      leadSource: 'agent_profile',
      sourceSurface: 'agent_profile_form',
    });

    expect(result).toMatchObject({
      success: true,
      leadId: 456,
      route: 'direct',
    });
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyId: null,
        developmentId: null,
        developerBrandProfileId: null,
        agentId: 33,
        agencyId: 44,
        source: 'agent_profile_form',
        leadSource: 'agent_profile',
      }),
    );
  });
});
