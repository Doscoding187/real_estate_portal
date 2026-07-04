import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockInsert, mockValues, mockGetBrandProfileById, mockIncrementLeadCountAsync } =
  vi.hoisted(() => ({
    mockInsert: vi.fn(),
    mockValues: vi.fn(),
    mockGetBrandProfileById: vi.fn(),
    mockIncrementLeadCountAsync: vi.fn(),
  }));

vi.mock('../../db', () => ({
  db: {
    insert: mockInsert,
  },
}));

vi.mock('../developerBrandProfileService', () => ({
  developerBrandProfileService: {
    getBrandProfileById: mockGetBrandProfileById,
    incrementLeadCountAsync: mockIncrementLeadCountAsync,
  },
}));

import { brandLeadService } from '../brandLeadService';

describe('brandLeadService capture contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('setImmediate', vi.fn());

    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockResolvedValue([{ insertId: 987 }]);
    mockGetBrandProfileById.mockResolvedValue({
      id: 13,
      brandName: 'Demo Developer',
      isSubscriber: 0,
      publicContactEmail: null,
      isContactVerified: 0,
    });
  });

  it('stores source surface, lead source, unit, UTM, and affordability data on brand leads', async () => {
    const affordabilityData = {
      monthlyIncome: 65000,
      monthlyExpenses: 12000,
      monthlyDebts: 3000,
      availableDeposit: 150000,
      maxAffordable: 1400000,
      calculatedAt: '2026-07-04T10:00:00.000Z',
    };

    const result = await brandLeadService.captureBrandLead({
      developerBrandProfileId: 13,
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
      leadId: 987,
      delivered: false,
      deliveryMethod: 'none',
      brandLeadStatus: 'captured',
    });
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        developerBrandProfileId: 13,
        developmentId: 77,
        unitId: 'unit-1',
        unitName: 'Type A',
        unitPriceFrom: 1299000,
        unitBedrooms: 3,
        unitBathrooms: 2,
        source: 'development_qualification_page',
        leadSource: 'development_full_qualification',
        referrerUrl: 'https://property-listify.test/development/cosmopolitan',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'launch',
        affordabilityData,
        funnelStage: 'affordability',
        qualificationStatus: 'pending',
      }),
    );
  });
});
