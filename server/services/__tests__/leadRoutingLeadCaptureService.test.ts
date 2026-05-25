import { describe, expect, it } from 'vitest';
import {
  buildBuyerLeadPayload,
  findDuplicateLeadCandidate,
  normalizeLeadEmail,
  normalizeLeadPhone,
  type LeadCaptureContext,
} from '../leadRoutingLeadCaptureService';

const context: LeadCaptureContext = {
  sessionId: 10,
  campaignId: 20,
  sourceType: 'google_ads',
};

describe('leadRoutingLeadCaptureService', () => {
  it('normalizes phone numbers and emails for duplicate detection', () => {
    expect(normalizeLeadPhone('082 123 4567')).toBe('27821234567');
    expect(normalizeLeadPhone('+27 82 123 4567')).toBe('27821234567');
    expect(normalizeLeadEmail(' Buyer@Example.COM ')).toBe('buyer@example.com');
  });

  it('finds duplicates by normalized phone or email without deleting anything', () => {
    const duplicate = findDuplicateLeadCandidate({
      normalizedPhone: '27821234567',
      normalizedEmail: 'new@example.com',
      candidates: [
        { id: 1, normalizedPhone: '27821234567', normalizedEmail: null, campaignId: 20 },
        { id: 2, normalizedPhone: null, normalizedEmail: 'buyer@example.com', campaignId: null },
      ],
    });

    expect(duplicate?.id).toBe(1);
  });

  it('builds a consent-aware buyer lead payload', () => {
    const payload = buildBuyerLeadPayload({
      context,
      lead: {
        fullName: '  Test Buyer  ',
        phone: '082 123 4567',
        email: ' Buyer@Example.COM ',
        preferredContactMethod: 'whatsapp',
        contactPermission: true,
        marketingConsent: false,
        privacyPolicyVersion: '2026-05-25',
      },
    });

    expect(payload).toMatchObject({
      sessionId: 10,
      campaignId: 20,
      sourceType: 'google_ads',
      status: 'new',
      fullName: 'Test Buyer',
      normalizedPhone: '27821234567',
      normalizedEmail: 'buyer@example.com',
      preferredContactMethod: 'whatsapp',
      contactPermission: 1,
      marketingConsent: 0,
      privacyPolicyVersion: '2026-05-25',
      duplicateOfLeadId: null,
    });
    expect(payload.consentTimestamp).toEqual(expect.any(String));
  });

  it('marks duplicate payloads instead of replacing the existing lead', () => {
    const payload = buildBuyerLeadPayload({
      context,
      duplicateOfLeadId: 99,
      lead: {
        fullName: 'Repeat Buyer',
        phone: '0821234567',
        preferredContactMethod: 'any',
        contactPermission: true,
        marketingConsent: true,
      },
    });

    expect(payload.status).toBe('duplicate');
    expect(payload.duplicateOfLeadId).toBe(99);
    expect(payload.duplicateReason).toBe('normalized_phone_or_email_match');
  });
});
