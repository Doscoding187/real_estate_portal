import { describe, expect, it } from 'vitest';
import {
  getLeadNextActionDisplayLabel,
  getLeadStageDisplayLabel,
} from './leadOperatingStageDisplay';

describe('lead operating stage display', () => {
  it('keeps sale lead operations buyer and sale oriented', () => {
    expect(getLeadStageDisplayLabel('qualified', 'sale')).toBe('Buyer qualified');
    expect(getLeadStageDisplayLabel('deal_in_progress', 'sale')).toBe('Sale in progress');
    expect(getLeadNextActionDisplayLabel('send_brochure', 'sale')).toBe('Send brochure');
  });

  it('shows rental lead stages as lease/renter operations', () => {
    expect(getLeadStageDisplayLabel('qualified', 'rent')).toBe('Rental fit checked');
    expect(getLeadStageDisplayLabel('offer_made', 'rent')).toBe('Application received');
    expect(getLeadStageDisplayLabel('deal_in_progress', 'rent')).toBe('Lease review');
    expect(getLeadNextActionDisplayLabel('send_brochure', 'rent')).toBe('Send rental pack');
  });

  it('shows auction lead stages as bidder operations', () => {
    expect(getLeadStageDisplayLabel('qualified', 'auction')).toBe('Bidder readiness checked');
    expect(getLeadStageDisplayLabel('viewing_scheduled', 'auction')).toBe('Pack review scheduled');
    expect(getLeadStageDisplayLabel('offer_made', 'auction')).toBe('Bid intent captured');
    expect(getLeadStageDisplayLabel('deal_in_progress', 'auction')).toBe('Auction follow-up');
    expect(getLeadNextActionDisplayLabel('schedule_viewing', 'auction')).toBe('Schedule pack review');
  });

  it('prettifies unknown canonical values without hiding them', () => {
    expect(getLeadStageDisplayLabel('custom_review_stage', 'rent')).toBe('Custom Review Stage');
    expect(getLeadNextActionDisplayLabel('', 'auction')).toBe('Follow up');
  });
});
