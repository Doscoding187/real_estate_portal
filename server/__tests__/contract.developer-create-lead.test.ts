import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCapturePublicLead, mockCheckRateLimit, mockGetClientIp } = vi.hoisted(() => ({
  mockCapturePublicLead: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockGetClientIp: vi.fn(),
}));

vi.mock('../services/publicLeadCaptureService', () => ({
  capturePublicLead: mockCapturePublicLead,
}));

vi.mock('../services/publicLeadRateLimitService', () => ({
  checkPublicLeadRateLimit: mockCheckRateLimit,
  getPublicLeadClientIp: mockGetClientIp,
}));

import { appRouter } from '../routers';

const callerForAnonymous = () =>
  appRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: null,
  } as any);

const validLeadInput = () => ({
  developmentId: 77,
  name: 'Jane Doe',
  email: 'jane@example.com',
  captureRequestId: 'lead-request-developer-contract',
  consent: {
    accepted: true as const,
    version: '2026-08-02',
    source: 'developer_contract_test',
  },
});

describe('developer.createLead contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
    mockGetClientIp.mockReturnValue('198.51.100.20');
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
    const caller = callerForAnonymous();

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
      cataloguePublisherId: 13,
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
      captureRequestId: 'lead-request-developer-contract',
      consent: {
        accepted: true,
        version: '2026-08-02',
        source: 'developer_contract_test',
      },
    });

    expect(result).toMatchObject({
      success: true,
      leadId: 101,
      route: 'brand',
    });
    expect(mockGetClientIp).toHaveBeenCalledOnce();
    expect(mockCheckRateLimit).toHaveBeenCalledWith('198.51.100.20');
    expect(mockCapturePublicLead).toHaveBeenCalledWith({
      developmentId: 77,
      cataloguePublisherId: 13,
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
      captureRequestId: 'lead-request-developer-contract',
      consent: {
        accepted: true,
        version: '2026-08-02',
        source: 'developer_contract_test',
      },
    });
  });

  it('silently ignores a honeypot submission before rate limiting or capture', async () => {
    const result = await callerForAnonymous().developer.createLead({
      ...validLeadInput(),
      website: 'https://bot.example.test',
    });

    expect(result).toMatchObject({
      success: true,
      ignored: true,
      leadId: 0,
      route: 'brand',
      message: 'Request received',
    });
    expect(mockGetClientIp).not.toHaveBeenCalled();
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
    expect(mockCapturePublicLead).not.toHaveBeenCalled();
  });

  it('rejects a rate-limited development enquiry before capture', async () => {
    mockCheckRateLimit.mockReturnValue(false);

    await expect(callerForAnonymous().developer.createLead(validLeadInput())).rejects.toMatchObject(
      { code: 'TOO_MANY_REQUESTS' },
    );

    expect(mockGetClientIp).toHaveBeenCalledOnce();
    expect(mockCheckRateLimit).toHaveBeenCalledWith('198.51.100.20');
    expect(mockCapturePublicLead).not.toHaveBeenCalled();
  });

  it.each([
    ['name', { name: 'n'.repeat(201) }],
    ['email', { email: 'e'.repeat(321) }],
    ['phone', { phone: '1'.repeat(51) }],
    ['message', { message: 'm'.repeat(5001) }],
    ['honeypot', { website: 'w'.repeat(201) }],
    ['unit ID', { unitId: 'u'.repeat(37) }],
    ['unit name', { unitName: 'u'.repeat(256) }],
    ['referrer URL', { referrerUrl: 'r'.repeat(2049) }],
    ['UTM source', { utmSource: 'u'.repeat(101) }],
    ['UTM medium', { utmMedium: 'u'.repeat(101) }],
    ['UTM campaign', { utmCampaign: 'u'.repeat(101) }],
    ['source surface', { sourceSurface: 's'.repeat(101) }],
    ['lead source', { leadSource: 's'.repeat(101) }],
    ['affordability timestamp', { affordabilityData: { calculatedAt: 't'.repeat(65) } }],
  ])('rejects an oversized %s before rate limiting or capture', async (_field, override) => {
    await expect(
      callerForAnonymous().developer.createLead({
        ...validLeadInput(),
        ...override,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    expect(mockGetClientIp).not.toHaveBeenCalled();
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
    expect(mockCapturePublicLead).not.toHaveBeenCalled();
  });

  it('rejects a development enquiry without consent and an idempotency key', async () => {
    const caller = callerForAnonymous();

    await expect(
      caller.developer.createLead({
        developmentId: 77,
        name: 'Jane Doe',
        email: 'jane@example.com',
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(mockCapturePublicLead).not.toHaveBeenCalled();
  });

  it('passes a rental viewing request through the existing lead custody path', async () => {
    const caller = callerForAnonymous();

    await caller.developer.createLead({
      developmentId: 88,
      cataloguePublisherId: 21,
      unitId: 'rent-unit-2',
      unitName: 'Two Bedroom Garden Apartment',
      unitPriceFrom: 12000,
      unitBedrooms: 2,
      unitBathrooms: 1,
      name: 'Ava Renter',
      email: 'ava@example.com',
      phone: '0821111111',
      message: 'I would like to request a viewing.',
      leadType: 'viewing_request',
      leadSource: 'development_detail_viewing',
      sourceSurface: 'development_rent_detail_viewing',
      captureRequestId: 'rent-viewing-contract',
      consent: {
        accepted: true,
        version: '2026-08-02',
        source: 'developer_contract_test',
      },
    });

    expect(mockCapturePublicLead).toHaveBeenCalledWith(
      expect.objectContaining({
        developmentId: 88,
        unitId: 'rent-unit-2',
        leadType: 'viewing_request',
        leadSource: 'development_detail_viewing',
      }),
    );
  });
});
