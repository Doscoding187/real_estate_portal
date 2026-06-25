import { describe, expect, it } from 'vitest';
import { getLocationPhaseGuidance } from './LocationPhase';

describe('LocationPhase transaction guidance', () => {
  it('frames location story by transaction lane', () => {
    expect(getLocationPhaseGuidance('for_sale')).toMatchObject({
      title: 'Buyer location story',
      items: expect.arrayContaining(['Suburb signal', 'Buyer confidence']),
    });

    expect(getLocationPhaseGuidance('for_rent')).toMatchObject({
      title: 'Rental location story',
      summary: expect.stringContaining('renter convenience'),
      items: expect.arrayContaining(['Commute access', 'Leasing handoff']),
    });

    expect(getLocationPhaseGuidance('auction')).toMatchObject({
      title: 'Auction inspection story',
      summary: expect.stringContaining('bidder confidence'),
      items: expect.arrayContaining(['Inspection access', 'Legal-pack context']),
    });
  });
});
