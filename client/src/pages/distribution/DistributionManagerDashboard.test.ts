import { describe, expect, it } from 'vitest';

import {
  getManagerDistributionDealCopy,
  getManagerDistributionStageActionLabel,
  normalizeManagerDistributionTransactionLane,
} from './DistributionManagerDashboard';

describe('DistributionManagerDashboard transaction copy', () => {
  it('normalizes manager pipeline rows into transaction lanes', () => {
    expect(normalizeManagerDistributionTransactionLane('for_sale')).toBe('sale');
    expect(normalizeManagerDistributionTransactionLane('for_rent')).toBe('rent');
    expect(normalizeManagerDistributionTransactionLane('to-rent')).toBe('rent');
    expect(normalizeManagerDistributionTransactionLane('on auction')).toBe('auction');
  });

  it('labels manager rows as buyer, renter, or bidder referrals', () => {
    expect(getManagerDistributionDealCopy('for_sale')).toMatchObject({
      laneLabel: 'Sale referral',
      participantLabel: 'Buyer',
      stageContext: 'Sale/referral stage',
    });
    expect(getManagerDistributionDealCopy('for_rent')).toMatchObject({
      laneLabel: 'Rental referral',
      participantLabel: 'Renter',
      stageContext: 'Lease/referral stage',
    });
    expect(getManagerDistributionDealCopy('auction')).toMatchObject({
      laneLabel: 'Auction referral',
      participantLabel: 'Bidder',
      stageContext: 'Auction/referral stage',
    });
  });

  it('labels stage actions by transaction lane without changing stage values', () => {
    expect(getManagerDistributionStageActionLabel('contract_signed', 'for_sale')).toBe(
      'Contract signed',
    );
    expect(getManagerDistributionStageActionLabel('contract_signed', 'for_rent')).toBe(
      'Lease signed',
    );
    expect(getManagerDistributionStageActionLabel('contract_signed', 'auction')).toBe(
      'Auction terms accepted',
    );
    expect(getManagerDistributionStageActionLabel('commission_pending', 'auction')).toBe(
      'Auction reward pending',
    );
  });
});
