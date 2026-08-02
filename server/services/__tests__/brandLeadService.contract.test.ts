import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCapturePublicLead, mockDb } = vi.hoisted(() => ({
  mockCapturePublicLead: vi.fn(),
  mockDb: {
    select: vi.fn(),
  },
}));

vi.mock('../../db', () => ({ db: mockDb }));

vi.mock('../publicLeadCaptureService', () => ({
  capturePublicLead: mockCapturePublicLead,
}));

import { brandLeadService } from '../brandLeadService';

const consent = { accepted: true as const, version: '2026-08-02', source: 'brand-contract' };

describe('brandLeadService compatibility contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCapturePublicLead.mockResolvedValue({
      success: true,
      leadId: 987,
      route: 'brand',
      delivered: false,
      deliveryStatus: 'attention_required',
      deliveryMethod: 'manual',
      deliveryAttemptId: 'attempt-987',
      supplyOrigin: 'platform_curated',
      leadCustody: 'platform_managed',
      recipientType: 'manual',
      recipientId: null,
      brandLeadStatus: 'captured',
      message: 'Your enquiry has been recorded.',
    });
  });

  it('adapts legacy brand callers to the canonical public lead authority', async () => {
    const result = await brandLeadService.captureBrandLead({
      developerBrandProfileId: 13,
      developmentId: 77,
      unitId: 'unit-1',
      unitName: 'Type A',
      name: 'Jane Doe',
      email: 'jane@example.com',
      message: 'Please send details.',
      sourceSurface: 'development_qualification_page',
      leadSource: 'development_full_qualification',
      captureRequestId: 'brand-capture-001',
      consent,
    });

    expect(result).toMatchObject({
      leadId: 987,
      delivered: false,
      deliveryMethod: 'manual',
      deliveryStatus: 'attention_required',
      brandLeadStatus: 'captured',
    });
    expect(mockCapturePublicLead).toHaveBeenCalledWith(
      expect.objectContaining({
        developerBrandProfileId: 13,
        developmentId: 77,
        captureRequestId: 'brand-capture-001',
        consent,
        source: 'development_qualification_page',
        sourceSurface: 'development_qualification_page',
        leadSource: 'development_full_qualification',
        leadType: 'inquiry',
      }),
    );
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it('does not reinterpret platform custody as external delivery', async () => {
    mockCapturePublicLead.mockResolvedValueOnce({
      success: true,
      leadId: 988,
      route: 'brand',
      delivered: false,
      deliveryStatus: 'attention_required',
      deliveryMethod: 'manual',
      supplyOrigin: 'platform_curated',
      leadCustody: 'platform_managed',
      recipientType: 'manual',
      recipientId: null,
      brandLeadStatus: 'captured',
      message: 'Property Listify will review the request.',
    });

    const result = await brandLeadService.captureBrandLead({
      developerBrandProfileId: 13,
      name: 'Sam Buyer',
      email: 'sam@example.com',
      captureRequestId: 'brand-capture-002',
      consent,
    });

    expect(result).toMatchObject({
      leadId: 988,
      delivered: false,
      deliveryMethod: 'manual',
      brandLeadStatus: 'captured',
    });
  });
});
