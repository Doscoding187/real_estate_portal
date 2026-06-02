import { describe, expect, it } from 'vitest';
import {
  makeQualificationPdfLines,
  normalizeAffordabilityMatchTransactionType,
  resolveAffordabilityMatchPricing,
} from '../affordabilityAssessmentService';

describe('affordability match transaction pricing', () => {
  it('uses monthly rent fields and monthly repayment ceiling for rental developments', () => {
    const pricing = resolveAffordabilityMatchPricing({
      transactionType: 'for_rent',
      purchaseCeiling: 1_500_000,
      monthlyRepaymentCeiling: 14_000,
      unitPriceFrom: 1_200_000,
      unitMonthlyRentFrom: 12_500,
      unitMonthlyRentTo: 13_500,
      developmentPriceFrom: 1_100_000,
    });

    expect(pricing).toMatchObject({
      transactionType: 'rent',
      priceFrom: 12_500,
      priceTo: 13_500,
      ceiling: 14_000,
      isEligible: true,
    });
    expect(pricing.fitRatio).toBeCloseTo(12_500 / 14_000, 4);
  });

  it('uses starting bid fields and purchase ceiling for auction developments', () => {
    const pricing = resolveAffordabilityMatchPricing({
      transactionType: 'auction',
      purchaseCeiling: 900_000,
      monthlyRepaymentCeiling: 8_000,
      unitPriceFrom: 1_200_000,
      unitStartingBid: 750_000,
      unitReservePrice: 850_000,
    });

    expect(pricing).toMatchObject({
      transactionType: 'auction',
      priceFrom: 750_000,
      priceTo: 850_000,
      ceiling: 900_000,
      isEligible: true,
    });
    expect(pricing.fitRatio).toBeCloseTo(750_000 / 900_000, 4);
  });

  it('defaults unknown transaction types to sale pricing', () => {
    expect(normalizeAffordabilityMatchTransactionType('leasehold')).toBe('sale');
    expect(
      resolveAffordabilityMatchPricing({
        transactionType: 'leasehold',
        purchaseCeiling: 800_000,
        monthlyRepaymentCeiling: 12_000,
        unitPriceFrom: 950_000,
        unitMonthlyRentFrom: 9_500,
      }),
    ).toMatchObject({
      transactionType: 'sale',
      priceFrom: 950_000,
      isEligible: false,
    });
  });

  it('uses neutral affordability wording and transaction-aware match labels in qualification PDFs', () => {
    const lines = makeQualificationPdfLines({
      assessment: {
        id: 'assessment-1',
        actorUserId: 100,
        subjectName: null,
        subjectPhone: null,
        grossIncomeMonthly: 40_000,
        deductionsMonthly: 2_000,
        depositAmount: 0,
        assumptions: {
          interestRateAnnual: 11.75,
          termMonths: 240,
          maxRepaymentRatio: 0.35,
          calcVersion: 'test',
        },
        outputs: {
          maxMonthlyRepayment: 14_000,
          indicativeLoanAmount: 1_250_000,
          indicativePurchaseMin: 1_250_000,
          indicativePurchaseMax: 1_250_000,
          purchasePrice: 1_250_000,
          confidenceLabel: 'Indicative',
          confidenceLevel: 'standard',
        },
        locationFilter: null,
        creditCheckConsentGiven: false,
        creditCheckRequestedAt: null,
        lockedAt: null,
        lockedByDealId: null,
        lockedByUserId: null,
        createdAt: '2026-05-21T00:00:00.000Z',
        updatedAt: '2026-05-21T00:00:00.000Z',
      },
      snapshot: {
        assessmentId: 'assessment-1',
        generatedAt: '2026-05-21T00:00:00.000Z',
        purchasePrice: 1_250_000,
        matches: [
          {
            developmentId: 20,
            developmentName: 'Rentals Edge',
            area: 'Rosebank',
            city: 'Johannesburg',
            province: 'Gauteng',
            suburb: 'Rosebank',
            logoUrl: null,
            transactionType: 'rent',
            purchasePrice: 1_250_000,
            bestFitRatio: 0.9,
            developmentPriority: 0,
            unitOptions: [
              {
                unitTypeId: 'unit-1',
                unitName: 'Studio',
                bedrooms: 0,
                transactionType: 'rent',
                priceFrom: 12_500,
                priceTo: 13_500,
                fitRatio: 0.9,
              },
            ],
          },
          {
            developmentId: 21,
            developmentName: 'Bid Square',
            area: 'Sandton',
            city: 'Johannesburg',
            province: 'Gauteng',
            suburb: 'Sandton',
            logoUrl: null,
            transactionType: 'auction',
            purchasePrice: 1_250_000,
            bestFitRatio: 0.72,
            developmentPriority: 1,
            unitOptions: [
              {
                unitTypeId: 'unit-2',
                unitName: 'Lot 8',
                bedrooms: 2,
                transactionType: 'auction',
                priceFrom: 900_000,
                priceTo: 1_000_000,
                fitRatio: 0.72,
              },
            ],
          },
        ],
      },
    } as any);

    expect(lines).toContain('Indicative affordability ceiling: R1\u00a0250\u00a0000');
    expect(lines).not.toContain('Indicative purchase price: R1\u00a0250\u00a0000');
    expect(lines).toContain('   - Studio: Monthly rent R12\u00a0500 to R13\u00a0500 / month');
    expect(lines).toContain('   - Lot 8: Starting bid R900\u00a0000 to R1\u00a0000\u00a0000');
  });
});
