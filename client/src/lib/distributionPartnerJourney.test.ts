import { describe, expect, it } from 'vitest';
import {
  formatPartnerDealGuidance,
  formatPartnerDealStatus,
  getPartnerPayoutRecordState,
} from './distributionPartnerJourney';

const scheduledViewing = {
  dealId: 42,
  status: 'scheduled',
  scheduledStartAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
};

describe('distribution partner journey', () => {
  it('labels referral_received truthfully before a viewing exists', () => {
    expect(formatPartnerDealStatus('referral_received', 42)).toBe('Referral received');
    expect(formatPartnerDealGuidance('referral_received', 42)).toBe(
      'Your referral has been received. The responsible team will confirm the next step here.',
    );
  });

  it('uses the real viewing booking when one exists', () => {
    expect(formatPartnerDealStatus('referral_received', 42, [scheduledViewing])).toBe(
      'Viewing booked',
    );
    expect(formatPartnerDealGuidance('referral_received', 42, [scheduledViewing])).toContain(
      'A viewing has been booked for',
    );
  });

  it('keeps referral_received in the potential payout state', () => {
    expect(getPartnerPayoutRecordState('pending', 'referral_received')).toBe('potential');
  });
});
