import { describe, expect, it } from 'vitest';

import {
  getManagerDevelopmentDealCopy,
  normalizeManagerDevelopmentDealLane,
} from './ManagerDevelopmentDealsPage';

describe('ManagerDevelopmentDealsPage transaction copy', () => {
  it('normalizes development deal rows into transaction lanes', () => {
    expect(normalizeManagerDevelopmentDealLane('for_sale')).toBe('sale');
    expect(normalizeManagerDevelopmentDealLane('for_rent')).toBe('rent');
    expect(normalizeManagerDevelopmentDealLane('to-rent')).toBe('rent');
    expect(normalizeManagerDevelopmentDealLane('on auction')).toBe('auction');
  });

  it('labels selected-development referral rows by participant lane', () => {
    expect(getManagerDevelopmentDealCopy('for_sale')).toMatchObject({
      laneLabel: 'Sale referral',
      participantLabel: 'Buyer',
      unknownParticipant: 'Buyer unknown',
    });
    expect(getManagerDevelopmentDealCopy('for_rent')).toMatchObject({
      laneLabel: 'Rental referral',
      participantLabel: 'Renter',
      unknownParticipant: 'Renter unknown',
    });
    expect(getManagerDevelopmentDealCopy('auction')).toMatchObject({
      laneLabel: 'Auction referral',
      participantLabel: 'Bidder',
      unknownParticipant: 'Bidder unknown',
    });
  });
});
