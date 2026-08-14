import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCapturePublicLead, mockCheckRateLimit, mockGetClientIp, mockGetDb } = vi.hoisted(() => ({
  mockCapturePublicLead: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockGetClientIp: vi.fn(),
  mockGetDb: vi.fn(),
}));

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
});
