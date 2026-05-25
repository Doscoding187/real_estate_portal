import { describe, expect, it } from 'vitest';
import {
  buildCaptureInputFromImportRow,
  buildImportedFullName,
  buildQualificationInputFromImportRow,
  normalizeImportedBuyingMode,
  normalizeImportedContactMethod,
  normalizeImportedCreditReportStatus,
  normalizeImportedEmploymentType,
  parseImportedBoolean,
} from '../leadRoutingImportService';

describe('leadRoutingImportService', () => {
  it('normalizes imported booleans from common CSV values', () => {
    expect(parseImportedBoolean('Yes')).toBe(true);
    expect(parseImportedBoolean('opted in')).toBe(true);
    expect(parseImportedBoolean('No')).toBe(false);
    expect(parseImportedBoolean(undefined, true)).toBe(true);
  });

  it('builds full names from explicit or split import fields', () => {
    expect(buildImportedFullName({ fullName: '  Jane Buyer  ' })).toBe('Jane Buyer');
    expect(buildImportedFullName({ firstName: 'Jane', lastName: 'Buyer' })).toBe('Jane Buyer');
    expect(buildImportedFullName({ firstName: '', lastName: '' })).toBeNull();
  });

  it('maps loose imported answers into reusable qualification enums', () => {
    expect(normalizeImportedBuyingMode('Buying with my partner')).toBe('joint');
    expect(normalizeImportedBuyingMode('Buying alone')).toBe('solo');
    expect(normalizeImportedEmploymentType('Permanent employee')).toBe('permanently_employed');
    expect(normalizeImportedEmploymentType('I own a business')).toBe('business_owner');
    expect(normalizeImportedCreditReportStatus('Need help checking')).toBe('needs_help');
    expect(normalizeImportedContactMethod('WhatsApp me')).toBe('whatsapp');
  });

  it('builds consent-aware capture input without introducing a Meta-specific core path', () => {
    const captureInput = buildCaptureInputFromImportRow({
      sourceType: 'meta_ads',
      campaignId: 12,
      sessionToken: 'session_token_that_is_long_enough_123',
      privacyPolicyVersion: '2026-05-25',
      defaultContactPermission: false,
      defaultMarketingConsent: false,
      row: {
        externalLeadId: 'meta-123',
        firstName: 'Neo',
        lastName: 'Mokoena',
        phone: '082 123 4567',
        email: 'neo@example.com',
        preferredContactMethod: 'Phone call',
        contactPermission: 'yes',
        marketingConsent: 'no',
        metadata: { formId: 'instant-form-1' },
      },
    });

    expect(captureInput).toMatchObject({
      sourceType: 'meta_ads',
      campaignId: 12,
      sessionToken: 'session_token_that_is_long_enough_123',
      fullName: 'Neo Mokoena',
      preferredContactMethod: 'phone',
      contactPermission: true,
      marketingConsent: false,
      privacyPolicyVersion: '2026-05-25',
      metadata: {
        importAdapter: 'meta_csv',
        externalLeadId: 'meta-123',
      },
    });
  });

  it('skips rows that cannot identify or contact the buyer', () => {
    expect(
      buildCaptureInputFromImportRow({
        sourceType: 'manual',
        row: { fullName: 'No Contact' },
      }),
    ).toBeNull();

    expect(
      buildCaptureInputFromImportRow({
        sourceType: 'manual',
        row: { phone: '082 123 4567' },
      }),
    ).toBeNull();
  });

  it('builds qualification input only when imported qualification answers exist', () => {
    const qualificationInput = buildQualificationInputFromImportRow({
      buyerLeadId: 42,
      row: {
        preferredArea: 'Johannesburg South',
        grossMonthlyIncomeRange: 'R25,000 - R35,000',
        buyingMode: 'Joint application',
        employmentType: 'Self employed',
        creditReportStatus: 'No, not recently',
      },
    });

    expect(qualificationInput).toMatchObject({
      buyerLeadId: 42,
      targetArea: 'Johannesburg South',
      grossMonthlyIncomeRange: 'R25,000 - R35,000',
      buyingMode: 'joint',
      employmentType: 'self_employed',
      creditReportStatus: 'not_checked_recently',
    });

    expect(buildQualificationInputFromImportRow({ buyerLeadId: 42, row: {} })).toBeNull();
  });
});
