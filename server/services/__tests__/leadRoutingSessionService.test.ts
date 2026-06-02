import { describe, expect, it } from 'vitest';
import {
  buildLeadFunnelSessionInsert,
  generateLeadFunnelSessionToken,
  inferLeadSourceType,
  normalizeAttribution,
} from '../leadRoutingSessionService';

describe('leadRoutingSessionService', () => {
  it('generates URL-safe session tokens', () => {
    const token = generateLeadFunnelSessionToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(40);
  });

  it('honors explicit channel-agnostic source types', () => {
    expect(inferLeadSourceType({ sourceType: 'internal_explore', utmSource: 'google' })).toBe(
      'internal_explore',
    );
  });

  it('infers paid and assisted sources from attribution fields', () => {
    expect(inferLeadSourceType({ gclid: 'abc' })).toBe('google_ads');
    expect(inferLeadSourceType({ fbclid: 'abc' })).toBe('meta_ads');
    expect(inferLeadSourceType({ utmSource: 'LinkedIn Ads' })).toBe('linkedin_ads');
    expect(inferLeadSourceType({ referrerUrl: 'https://wa.me/27123456789' })).toBe('whatsapp');
    expect(inferLeadSourceType({ utmMedium: 'organic' })).toBe('organic');
  });

  it('normalizes attribution without leaking oversized values', () => {
    const attribution = normalizeAttribution({
      sourceType: 'google_ads',
      utmCampaign: 'x'.repeat(200),
      landingPageUrl: ' https://propertylistify.example/campaign/jhb ',
    });

    expect(attribution.sourceType).toBe('google_ads');
    expect(attribution.utmCampaign).toHaveLength(150);
    expect(attribution.landingPageUrl).toBe('https://propertylistify.example/campaign/jhb');
  });

  it('builds a session insert payload with attribution and expiry', () => {
    const expiresAt = new Date('2026-05-25T10:00:00.000Z');
    const payload = buildLeadFunnelSessionInsert({
      attribution: normalizeAttribution({
        sourceType: 'meta_ads',
        utmSource: 'facebook',
        fbclid: 'fb123',
      }),
      sessionToken: 'token_123',
      campaignId: 17,
      metadata: { entryMode: 'discovery' },
      expiresAt,
    });

    expect(payload).toMatchObject({
      campaignId: 17,
      sessionToken: 'token_123',
      sourceType: 'meta_ads',
      status: 'active',
      utmSource: 'facebook',
      fbclid: 'fb123',
      metadata: { entryMode: 'discovery' },
      expiresAt: '2026-05-25 10:00:00',
    });
  });
});
