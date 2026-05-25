import { describe, expect, it } from 'vitest';
import {
  buildQualificationProfilePayload,
  normalizeQualificationProfileAnswers,
  type QualificationProfileContext,
} from '../leadRoutingQualificationService';

const context: QualificationProfileContext = {
  sessionId: 42,
  buyerLeadId: null,
  campaignId: 7,
  sourceType: 'google_ads',
};

describe('leadRoutingQualificationService', () => {
  it('normalizes lightweight qualification answers for matching', () => {
    const normalized = normalizeQualificationProfileAnswers({
      grossMonthlyIncome: 25_500,
      grossMonthlyIncomeRange: '  R25,000 - R35,000  ',
      coApplicantIncome: null,
      employmentType: 'permanently_employed',
      buyingMode: 'joint',
      preferredProvince: '  Gauteng  ',
      preferredCity: ' Johannesburg South ',
      preferredSuburb: '',
      targetPriceMin: 900_000,
      targetPriceMax: 650_000,
      creditReportStatus: 'not_checked_recently',
      buyingTimeline: '  3 months  ',
      estimatedBondAmount: 700_000,
      metadata: { step: 'qualification_widget' },
    });

    expect(normalized).toMatchObject({
      grossMonthlyIncome: 25_500,
      grossMonthlyIncomeRange: 'R25,000 - R35,000',
      coApplicantIncome: null,
      employmentType: 'permanently_employed',
      buyingMode: 'joint',
      preferredProvince: 'Gauteng',
      preferredCity: 'Johannesburg South',
      preferredSuburb: null,
      targetPriceMin: 650_000,
      targetPriceMax: 900_000,
      creditReportStatus: 'not_checked_recently',
      buyingTimeline: '3 months',
      estimatedBondAmount: 700_000,
    });
  });

  it('defaults missing buying mode to unsure', () => {
    const parsed = normalizeQualificationProfileAnswers({});

    expect(parsed.buyingMode).toBe('unsure');
    expect(parsed.grossMonthlyIncome).toBeNull();
    expect(parsed.preferredCity).toBeNull();
  });

  it('builds an insert payload without requiring a captured buyer lead', () => {
    const payload = buildQualificationProfilePayload({
      context,
      answers: {
        grossMonthlyIncomeRange: 'R35,000 - R50,000',
        employmentType: 'self_employed',
        preferredCity: 'Pretoria',
        creditReportStatus: 'needs_help',
      },
    });

    expect(payload).toMatchObject({
      sessionId: 42,
      buyerLeadId: null,
      grossMonthlyIncomeRange: 'R35,000 - R50,000',
      employmentType: 'self_employed',
      buyingMode: 'unsure',
      preferredCity: 'Pretoria',
      creditReportStatus: 'needs_help',
    });
  });
});
