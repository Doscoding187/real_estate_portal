import { describe, expect, it } from 'vitest';

import {
  getPartnerCommissionCopy,
  normalizePartnerCommissionTransactionType,
} from './PartnerCommissionsPage';

describe('PartnerCommissionsPage transaction copy', () => {
  it('normalizes sale, rental, and auction transaction aliases', () => {
    expect(normalizePartnerCommissionTransactionType('for_sale')).toBe('sale');
    expect(normalizePartnerCommissionTransactionType('for_rent')).toBe('rent');
    expect(normalizePartnerCommissionTransactionType('to-rent')).toBe('rent');
    expect(normalizePartnerCommissionTransactionType('on auction')).toBe('auction');
  });

  it('labels reward entries by transaction lane without changing payout semantics', () => {
    expect(getPartnerCommissionCopy('for_sale')).toMatchObject({
      laneLabel: 'Sale reward',
      participantLabel: 'Buyer',
      stageContext: 'Sale/referral stage',
    });
    expect(getPartnerCommissionCopy('for_rent')).toMatchObject({
      laneLabel: 'Rental reward',
      participantLabel: 'Renter',
      stageContext: 'Lease/referral stage',
    });
    expect(getPartnerCommissionCopy('on_auction')).toMatchObject({
      laneLabel: 'Auction reward',
      participantLabel: 'Bidder',
      stageContext: 'Auction/referral stage',
    });
  });
});
