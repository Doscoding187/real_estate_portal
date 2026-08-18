import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCapturePublicLead, mockCheckRateLimit, mockGetClientIp } = vi.hoisted(() => ({
  mockCapturePublicLead: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockGetClientIp: vi.fn(),
}));

vi.mock('../services/publicLeadCaptureService', () => {
  return {
    capturePublicLead: mockCapturePublicLead,
  };
});

vi.mock('../services/publicLeadRateLimitService', () => ({
  checkPublicLeadRateLimit: mockCheckRateLimit,
  getPublicLeadClientIp: mockGetClientIp,
}));

vi.mock('../services/cataloguePublisherService', () => ({
  cataloguePublisherService: {},
}));

vi.mock('../services/publisherLeadService', () => ({
  publisherLeadService: {},
}));

vi.mock('../services/developmentService', () => ({
  developmentService: {},
}));

import { cataloguePublisherRouter } from '../cataloguePublisherRouter';

const validInput = () => ({
  cataloguePublisherId: 13,
  developmentId: 77,
  name: 'Jane Buyer',
  email: 'jane@example.test',
  captureRequestId: 'catalogue-lead-request-001',
  consent: {
    accepted: true as const,
    version: '2026-08-02',
    source: 'catalogue-boundary-test',
  },
});

const callerForAnonymous = () =>
  cataloguePublisherRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: null,
  } as any);

describe('catalogue publisher public lead boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClientIp.mockReturnValue('198.51.100.42');
    mockCheckRateLimit.mockReturnValue(true);
    mockCapturePublicLead.mockResolvedValue({
      success: true,
      leadId: 901,
      route: 'brand',
    });
  });

  it('silently ignores a honeypot submission before rate limiting or persistence', async () => {
    const result = await callerForAnonymous().captureLead({
      ...validInput(),
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

  it.each([
    ['name', { name: 'n'.repeat(201) }],
    ['email', { email: `${'e'.repeat(309)}@example.test` }],
    ['phone', { phone: '1'.repeat(51) }],
    ['message', { message: 'm'.repeat(5001) }],
    ['honeypot', { website: 'w'.repeat(201) }],
    ['source surface', { sourceSurface: 's'.repeat(101) }],
    ['lead source', { leadSource: 's'.repeat(101) }],
    ['referrer URL', { referrerUrl: 'r'.repeat(2049) }],
    ['UTM source', { utmSource: 'u'.repeat(101) }],
    ['UTM medium', { utmMedium: 'u'.repeat(101) }],
    ['UTM campaign', { utmCampaign: 'u'.repeat(101) }],
    ['affordability timestamp', { affordabilityData: { calculatedAt: 't'.repeat(65) } }],
  ])('rejects an oversized %s before rate limiting or persistence', async (_field, override) => {
    await expect(
      callerForAnonymous().captureLead({ ...validInput(), ...override }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    expect(mockGetClientIp).not.toHaveBeenCalled();
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
    expect(mockCapturePublicLead).not.toHaveBeenCalled();
  });
});
