import { describe, expect, it } from 'vitest';
import {
  formatPreferredLocation,
  normalizeLeadReviewSummaryRow,
} from '../leadRoutingReviewService';

describe('leadRoutingReviewService', () => {
  it('formats preferred location from most specific to broadest', () => {
    expect(
      formatPreferredLocation({
        suburb: 'Alberton',
        city: 'Johannesburg South',
        province: 'Gauteng',
      }),
    ).toBe('Alberton, Johannesburg South, Gauteng');

    expect(formatPreferredLocation({ city: 'Pretoria', province: 'Gauteng' })).toBe(
      'Pretoria, Gauteng',
    );

    expect(formatPreferredLocation({})).toBeNull();
  });

  it('normalizes list rows for the internal review surface', () => {
    const row = normalizeLeadReviewSummaryRow({
      id: 12,
      fullName: 'Test Buyer',
      phone: '0821234567',
      email: 'buyer@example.com',
      status: 'new',
      sourceType: 'google_ads',
      campaignId: 3,
      campaignTitle: 'JHB South Campaign',
      preferredContactMethod: 'whatsapp',
      contactPermission: 1,
      marketingConsent: 0,
      duplicateOfLeadId: null,
      createdAt: '2026-05-25 11:00:00',
      latestRoutingOutcome: 'route_to_general_review',
      latestRoutingOwnerType: 'general_review',
      latestRoutingReason: 'Needs manual review',
      preferredProvince: 'Gauteng',
      preferredCity: 'Johannesburg South',
      preferredSuburb: null,
      grossMonthlyIncomeRange: 'R25,000 - R35,000',
    });

    expect(row).toMatchObject({
      id: 12,
      fullName: 'Test Buyer',
      status: 'new',
      sourceType: 'google_ads',
      campaignTitle: 'JHB South Campaign',
      contactPermission: true,
      marketingConsent: false,
      latestRoutingOutcome: 'route_to_general_review',
      preferredLocation: 'Johannesburg South, Gauteng',
      grossMonthlyIncomeRange: 'R25,000 - R35,000',
    });
  });
});
