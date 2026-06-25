import { describe, expect, it } from 'vitest';
import { getAmenitiesPhaseGuidance } from './AmenitiesPhase';

describe('AmenitiesPhase transaction guidance', () => {
  it('prioritizes amenities by transaction lane', () => {
    expect(getAmenitiesPhaseGuidance('for_sale')).toMatchObject({
      title: 'Buyer lifestyle signals',
      items: expect.arrayContaining(['Security', 'Lifestyle']),
    });

    expect(getAmenitiesPhaseGuidance('for_rent')).toMatchObject({
      title: 'Rental fit signals',
      summary: expect.stringContaining('renters decide quickly'),
      items: expect.arrayContaining(['Daily convenience', 'Pet or family fit']),
    });

    expect(getAmenitiesPhaseGuidance('auction')).toMatchObject({
      title: 'Auction confidence signals',
      summary: expect.stringContaining('bidder confidence'),
      items: expect.arrayContaining(['Inspection confidence', 'Utility resilience']),
    });
  });
});
