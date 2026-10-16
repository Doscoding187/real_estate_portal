import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCapturePublicLead, mockCheckRateLimit, mockGetClientIp, mockGetDb } = vi.hoisted(
  () => ({
    mockCapturePublicLead: vi.fn(),
    mockCheckRateLimit: vi.fn(),
    mockGetClientIp: vi.fn(),
    mockGetDb: vi.fn(),
  }),
);

vi.mock('../services/publicLeadCaptureService', () => ({
  capturePublicLead: mockCapturePublicLead,
}));

vi.mock('../services/publicLeadRateLimitService', () => ({
  checkPublicLeadRateLimit: mockCheckRateLimit,
  getPublicLeadClientIp: mockGetClientIp,
}));

vi.mock('../db', () => ({
  getDb: mockGetDb,
}));

vi.mock('../services/publisherLeadService', () => ({
  publisherLeadService: {
    retryPublisherLeadDelivery: vi.fn(),
  },
}));

import { leadsRouter } from '../leadsRouter';

describe('public lead honeypot contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
    mockGetClientIp.mockReturnValue('198.51.100.20');
  });

  it('silently ignores a honeypot submission without creating a commercial lead or attempt', async () => {
    const caller = leadsRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
      requestId: 'honeypot-contract-request',
    } as any);

    const result = await caller.create({
      name: 'Bot Prospect',
      email: 'bot@example.test',
      phone: '0821234567',
      website: 'https://bot.example.test',
      propertyId: 501,
      captureRequestId: 'honeypot-request-001',
      consent: { accepted: true, version: '2026-08-02', source: 'honeypot-contract' },
    });

    expect(result).toMatchObject({
      success: true,
      ignored: true,
      leadId: 0,
      message: 'Request received',
    });
    expect(mockCapturePublicLead).not.toHaveBeenCalled();
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
    expect(mockGetDb).not.toHaveBeenCalled();
  });

  it.each([
    ['name', { name: 'n'.repeat(201) }],
    ['email', { email: `${'e'.repeat(309)}@example.test` }],
    ['phone', { phone: '1'.repeat(51) }],
    ['message', { message: 'm'.repeat(5001) }],
    ['source', { source: 's'.repeat(101) }],
    ['lead source', { leadSource: 's'.repeat(101) }],
    ['source surface', { sourceSurface: 's'.repeat(101) }],
    ['referrer URL', { referrerUrl: 'r'.repeat(2049) }],
    ['UTM source', { utmSource: 'u'.repeat(101) }],
    ['UTM medium', { utmMedium: 'u'.repeat(101) }],
    ['UTM campaign', { utmCampaign: 'u'.repeat(101) }],
    ['honeypot', { website: 'w'.repeat(201) }],
    ['affordability timestamp', { affordabilityData: { calculatedAt: 't'.repeat(65) } }],
  ])('rejects an oversized %s before rate limiting or capture', async (_field, override) => {
    const caller = leadsRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
      requestId: 'lead-boundary-contract-request',
    } as any);

    await expect(
      caller.create({
        name: 'Buyer Prospect',
        email: 'buyer@example.test',
        phone: '0821234567',
        propertyId: 501,
        captureRequestId: 'lead-boundary-request-001',
        consent: { accepted: true, version: '2026-08-02', source: 'lead-boundary-test' },
        ...override,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    expect(mockGetClientIp).not.toHaveBeenCalled();
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
    expect(mockCapturePublicLead).not.toHaveBeenCalled();
    expect(mockGetDb).not.toHaveBeenCalled();
  });

  it('rejects a Commercial availability identifier unless it is paired with its marketing listing', async () => {
    const caller = leadsRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
      requestId: 'commercial-lead-pair-contract-request',
    } as any);

    await expect(
      caller.create({
        name: 'Commercial Prospect',
        email: 'prospect@example.test',
        phone: '0821234567',
        commercialAvailabilityId: 901,
      }),
    ).rejects.toThrow('Commercial enquiries require the matching marketing listing.');

    expect(mockGetClientIp).not.toHaveBeenCalled();
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
    expect(mockCapturePublicLead).not.toHaveBeenCalled();
  });

  it.each([undefined, '', '   ', 'abc', '123', '1234567890123456'])(
    'rejects an unusable direct-agent phone %j before capture',
    async phone => {
      const caller = leadsRouter.createCaller({ req: { headers: {} }, res: {}, user: null } as any);
      await expect(
        caller.create({
          name: 'Profile Visitor',
          email: 'visitor@example.test',
          agentId: 42,
          phone,
          captureRequestId: 'profile-phone-test-001',
          consent: { accepted: true, version: '2026-08-02' },
        }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
      expect(mockCapturePublicLead).not.toHaveBeenCalled();
      expect(mockCheckRateLimit).not.toHaveBeenCalled();
    },
  );

  it.each(['082 123 4567', '+27 (82) 123-4567', '+44 20 7946 0958'])(
    'accepts a formatted profile phone %s without changing its routing',
    async phone => {
      mockCapturePublicLead.mockResolvedValue({ success: true, leadId: 1 });
      const caller = leadsRouter.createCaller({ req: { headers: {} }, res: {}, user: null } as any);
      await caller.create({
        name: 'Profile Visitor',
        email: 'visitor@example.test',
        agentId: 42,
        phone,
        captureRequestId: 'profile-phone-test-001',
        consent: { accepted: true, version: '2026-08-02' },
      });
      expect(mockCapturePublicLead).toHaveBeenCalledWith(
        expect.objectContaining({ agentId: 42, phone }),
      );
    },
  );

  it('requires a usable phone number on property enquiries', async () => {
    const caller = leadsRouter.createCaller({ req: { headers: {} }, res: {}, user: null } as any);
    await expect(
      caller.create({
        name: 'Property Visitor',
        email: 'visitor@example.test',
        propertyId: 501,
        captureRequestId: 'property-phone-test-001',
        consent: { accepted: true, version: '2026-08-02' },
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(mockCapturePublicLead).not.toHaveBeenCalled();

    mockCapturePublicLead.mockResolvedValue({ success: true, leadId: 1 });
    await caller.create({
      name: 'Property Visitor',
      email: 'visitor@example.test',
      propertyId: 501,
      phone: '082 123 4567',
      captureRequestId: 'property-phone-test-001',
      consent: { accepted: true, version: '2026-08-02' },
    });
    expect(mockCapturePublicLead).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyId: 501,
        phone: '082 123 4567',
      }),
    );
  });
});
