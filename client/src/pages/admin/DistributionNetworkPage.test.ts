import { describe, expect, it } from 'vitest';

import {
  getAdminDistributionReferralCopy,
  normalizeAdminDistributionTransactionLane,
} from './DistributionNetworkPage';

describe('admin distribution transaction lane copy', () => {
  it('normalizes sale, rental, and auction aliases', () => {
    expect(normalizeAdminDistributionTransactionLane('sale')).toBe('sale');
    expect(normalizeAdminDistributionTransactionLane('for_rent')).toBe('rent');
    expect(normalizeAdminDistributionTransactionLane('rental')).toBe('rent');
    expect(normalizeAdminDistributionTransactionLane('auction')).toBe('auction');
    expect(normalizeAdminDistributionTransactionLane('unexpected')).toBe('sale');
  });

  it('labels rental referrals with renter and reward language', () => {
    expect(getAdminDistributionReferralCopy('for_rent')).toMatchObject({
      laneLabel: 'Rental',
      referralLabel: 'Rental referral',
      participantLabel: 'Renter',
      unknownParticipant: 'Unknown Renter',
      rewardLabel: 'Rental reward',
      rewardStatusLabel: 'Reward status',
    });
  });

  it('labels auction referrals with bidder and auction reward language', () => {
    expect(getAdminDistributionReferralCopy('auction')).toMatchObject({
      laneLabel: 'Auction',
      referralLabel: 'Auction referral',
      participantLabel: 'Bidder',
      unknownParticipant: 'Unknown Bidder',
      rewardLabel: 'Auction reward',
      rewardStatusLabel: 'Reward status',
    });
  });

  it('keeps sale referrals on buyer and commission language', () => {
    expect(getAdminDistributionReferralCopy('sale')).toMatchObject({
      laneLabel: 'Sale',
      referralLabel: 'Sale referral',
      participantLabel: 'Buyer',
      unknownParticipant: 'Unknown Buyer',
      rewardLabel: 'Commission',
      rewardStatusLabel: 'Commission status',
    });
  });
});
