import { TRPCError } from '@trpc/server';
import { describe, expect, it } from 'vitest';

import { assertPublishable } from '../developerRouter';

function buildDevelopment(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Auction Gardens',
    address: '1 Auction Road',
    city: 'Johannesburg',
    province: 'Gauteng',
    developmentType: 'residential',
    transactionType: 'auction',
    status: 'planning',
    nature: 'new',
    description:
      'A publish-ready development description with enough detail for validation coverage.',
    highlights: ['Secure estate', 'Close to transport', 'Flexible unit mix'],
    ownershipTypes: ['sectional-title'],
    classification: { type: 'residential' },
    images: [{ url: 'https://example.com/hero.jpg' }],
    unitTypes: [
      {
        name: '2 Bedroom Apartment',
        bedrooms: 2,
        bathrooms: 1,
        parkingType: 'none',
        parkingBays: 0,
        totalUnits: 10,
        availableUnits: 8,
        reservedUnits: 1,
        startingBid: 850000,
        reservePrice: 900000,
      },
    ],
    ...overrides,
  };
}

function expectValidationFields(error: unknown) {
  expect(error).toBeInstanceOf(TRPCError);
  return ((error as TRPCError).cause as any)?.validationErrors?.map((item: any) => item.field);
}

describe('developerRouter assertPublishable transaction validation', () => {
  it('allows auction unit payloads without sale base price', () => {
    expect(() => assertPublishable(buildDevelopment())).not.toThrow();
  });

  it('bridges classification validation through shared publish readiness', () => {
    expect.assertions(3);

    try {
      assertPublishable(buildDevelopment({ classification: undefined }));
    } catch (error) {
      expect((error as Error).message).toContain('Classification Type is required');
      expect(expectValidationFields(error)).toContain('classification.type');
    }
  });

  it('requires auction units to include a starting bid', () => {
    expect.assertions(3);

    try {
      assertPublishable(
        buildDevelopment({
          unitTypes: [
            {
              name: '2 Bedroom Apartment',
              bedrooms: 2,
              bathrooms: 1,
              parkingType: 'none',
              parkingBays: 0,
              totalUnits: 10,
              availableUnits: 8,
              reservedUnits: 1,
            },
          ],
        }),
      );
    } catch (error) {
      expect((error as Error).message).toContain('starting bid');
      expect(expectValidationFields(error)).toContain('unitTypes[0].startingBid');
    }
  });

  it('normalizes rent aliases before validating unit pricing', () => {
    expect(() =>
      assertPublishable(
        buildDevelopment({
          transactionType: 'to-rent',
          unitTypes: [
            {
              name: 'Rental Apartment',
              bedrooms: 1,
              bathrooms: 1,
              parkingType: 'none',
              parkingBays: 0,
              totalUnits: 5,
              availableUnits: 5,
              reservedUnits: 0,
              monthlyRentFrom: 12000,
            },
          ],
        }),
      ),
    ).not.toThrow();
  });

  it('rejects rental unit ranges where monthly rent upper bound is below the starting rent', () => {
    expect.assertions(3);

    try {
      assertPublishable(
        buildDevelopment({
          transactionType: 'for_rent',
          unitTypes: [
            {
              name: 'Rental Apartment',
              bedrooms: 1,
              bathrooms: 1,
              parkingType: 'none',
              parkingBays: 0,
              totalUnits: 5,
              availableUnits: 5,
              reservedUnits: 0,
              monthlyRentFrom: 15000,
              monthlyRentTo: 12000,
            },
          ],
        }),
      );
    } catch (error) {
      expect((error as Error).message).toContain('monthly rent upper range');
      expect(expectValidationFields(error)).toContain('unitTypes[0].monthlyRentTo');
    }
  });

  it('rejects sale unit ranges where price upper bound is below the base price', () => {
    expect.assertions(3);

    try {
      assertPublishable(
        buildDevelopment({
          transactionType: 'for_sale',
          unitTypes: [
            {
              name: 'Sale Apartment',
              bedrooms: 1,
              bathrooms: 1,
              parkingType: 'none',
              parkingBays: 0,
              totalUnits: 5,
              availableUnits: 5,
              reservedUnits: 0,
              basePriceFrom: 1_500_000,
              basePriceTo: 1_200_000,
            },
          ],
        }),
      );
    } catch (error) {
      expect((error as Error).message).toContain('price upper range');
      expect(expectValidationFields(error)).toContain('unitTypes[0].basePriceTo');
    }
  });

  it('bridges sale missing-price validation through shared commercial readiness', () => {
    expect.assertions(3);

    try {
      assertPublishable(
        buildDevelopment({
          transactionType: 'for_sale',
          unitTypes: [
            {
              name: 'Sale Apartment',
              bedrooms: 1,
              bathrooms: 1,
              parkingType: 'none',
              parkingBays: 0,
              totalUnits: 5,
              availableUnits: 5,
              reservedUnits: 0,
            },
          ],
        }),
      );
    } catch (error) {
      expect((error as Error).message).toContain('base price');
      expect(expectValidationFields(error)).toContain('unitTypes[0].basePriceFrom');
    }
  });

  it('bridges auction reserve validation through shared commercial readiness', () => {
    expect.assertions(3);

    try {
      assertPublishable(
        buildDevelopment({
          unitTypes: [
            {
              name: 'Auction Apartment',
              bedrooms: 2,
              bathrooms: 1,
              parkingType: 'none',
              parkingBays: 0,
              totalUnits: 10,
              availableUnits: 8,
              reservedUnits: 1,
              startingBid: 850000,
              reservePrice: 800000,
            },
          ],
        }),
      );
    } catch (error) {
      expect((error as Error).message).toContain('reserve price');
      expect(expectValidationFields(error)).toContain('unitTypes[0].reservePrice');
    }
  });

  it('bridges optional auction date-order validation through shared timing readiness', () => {
    expect.assertions(3);

    try {
      assertPublishable(
        buildDevelopment({
          unitTypes: [
            {
              name: 'Auction Apartment',
              bedrooms: 2,
              bathrooms: 1,
              parkingType: 'none',
              parkingBays: 0,
              totalUnits: 10,
              availableUnits: 8,
              reservedUnits: 1,
              startingBid: 850000,
              reservePrice: 900000,
              auctionStartDate: '2099-05-01T10:00:00.000Z',
              auctionEndDate: '2099-05-01T09:00:00.000Z',
            },
          ],
        }),
      );
    } catch (error) {
      expect((error as Error).message).toContain('auction end date');
      expect(expectValidationFields(error)).toContain('unitTypes[0].auctionEndDate');
    }
  });

  it('bridges inventory validation through shared publish readiness', () => {
    expect.assertions(3);

    try {
      assertPublishable(
        buildDevelopment({
          unitTypes: [
            {
              name: 'Auction Apartment',
              bedrooms: 2,
              bathrooms: 1,
              parkingType: 'none',
              parkingBays: 0,
              totalUnits: 10,
              availableUnits: 8,
              reservedUnits: 3,
              startingBid: 850000,
              reservePrice: 900000,
            },
          ],
        }),
      );
    } catch (error) {
      expect((error as Error).message).toContain('available + reserved');
      expect(expectValidationFields(error)).toContain('unitTypes[0].reservedUnits');
    }
  });
});
