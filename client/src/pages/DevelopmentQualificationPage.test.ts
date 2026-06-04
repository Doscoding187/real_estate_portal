import { describe, expect, it } from 'vitest';

import {
  getDevelopmentQualificationExperienceCopy,
  getDevelopmentQualificationLeadUnitContext,
  getDevelopmentQualificationPricingContext,
  normalizeQualificationTransactionType,
} from './DevelopmentQualificationPage';

describe('DevelopmentQualificationPage pricing context', () => {
  it('normalizes qualification transaction aliases', () => {
    expect(normalizeQualificationTransactionType('for_rent')).toBe('rent');
    expect(normalizeQualificationTransactionType('to-rent')).toBe('rent');
    expect(normalizeQualificationTransactionType('auctions')).toBe('auction');
    expect(normalizeQualificationTransactionType('for_sale')).toBe('sale');
  });

  it('uses rent ranges instead of stale sale prices for rental developments', () => {
    const context = getDevelopmentQualificationPricingContext({
      transactionType: 'for_rent',
      priceFrom: 1200000,
      unitTypes: [
        { priceFrom: 1200000, monthlyRentFrom: 12500, monthlyRentTo: 15000 },
        { priceFrom: 1500000, monthlyRentFrom: 10000 },
      ],
    });

    expect(context).toMatchObject({
      transactionType: 'rent',
      minPrice: 10000,
      maxPrice: 15000,
      targetLabel: 'monthly rent',
      rangePrefix: 'Rent',
    });
  });

  it('uses selected auction unit starting bid instead of development sale prices', () => {
    const context = getDevelopmentQualificationPricingContext(
      {
        transactionType: 'auction',
        priceFrom: 1200000,
        startingBidFrom: 800000,
        unitTypes: [{ id: 'a', startingBid: 800000 }],
      },
      { id: 'b', priceFrom: 1500000, startingBid: 950000, reservePrice: 1000000 },
    );

    expect(context).toMatchObject({
      transactionType: 'auction',
      minPrice: 950000,
      maxPrice: 1000000,
      targetLabel: 'starting bid',
      rangePrefix: 'Starting bid',
    });
  });

  it('builds transaction-native qualification experience copy', () => {
    expect(getDevelopmentQualificationExperienceCopy('for_sale')).toMatchObject({
      flowBadge: 'Full Qualification',
      submitLabel: 'Submit Qualification',
      teamHandoff: 'Direct handoff to the sales team',
      assumptionTitle: 'Affordability assumptions',
      assumptionItems: expect.arrayContaining([
        'Deposit improves the estimated buying power but does not guarantee finance approval.',
      ]),
    });

    expect(getDevelopmentQualificationExperienceCopy('for_rent')).toMatchObject({
      flowBadge: 'Rental Fit',
      resultCardTitle: 'Rental Fit Result',
      submitLabel: 'Submit Rental Fit',
      teamHandoff: 'Direct handoff to the leasing team',
      includedEstimate: 'Development-specific rental fit estimate',
      assumptionTitle: 'Rental fit assumptions',
      assumptionItems: expect.arrayContaining([
        'Does not replace developer or landlord lease approval.',
      ]),
    });

    expect(getDevelopmentQualificationExperienceCopy('auction')).toMatchObject({
      flowBadge: 'Bidder Readiness',
      resultCardTitle: 'Bidder Readiness Result',
      submitLabel: 'Submit Bidder Readiness',
      teamHandoff: 'Direct handoff to the auction team',
      includedEstimate: 'Development-specific bidder readiness estimate',
      assumptionTitle: 'Bidder readiness assumptions',
      assumptionItems: expect.arrayContaining([
        'Does not register you for the auction or approve proof of funds.',
      ]),
    });
  });

  it('builds qualification lead context with canonical unit identity and commercial values', () => {
    expect(
      getDevelopmentQualificationLeadUnitContext(
        { transactionType: 'for_rent' },
        {
          unitTypeId: 'unit-type-rent',
          name: 'Rental Type',
          monthlyRentFrom: 12500,
          priceFrom: 1800000,
          bedrooms: 2,
          bathrooms: 1.5,
        },
      ),
    ).toEqual({
      unitId: 'unit-type-rent',
      unitName: 'Rental Type',
      unitPriceFrom: 12500,
      unitPriceLabel: 'monthly rent',
      transactionType: 'rent',
      unitBedrooms: 2,
      unitBathrooms: 1.5,
    });
  });
});
