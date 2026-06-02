import { TRPCError } from '@trpc/server';
import { describe, expect, it } from 'vitest';

import { validateForPublish } from '../developmentService';

const baseWizardState = {
  name: 'Publishable Development',
  status: 'planning',
  location: { address: '1 Main Road' },
  highlights: ['One', 'Two', 'Three'],
  ownershipTypes: ['sectional-title'],
  classification: { type: 'residential' },
  images: [{ url: 'https://example.com/hero.jpg' }],
  description: 'A publishable development description for validation coverage.',
  developmentData: {
    name: 'Publishable Development',
    status: 'planning',
    location: { address: '1 Main Road' },
    highlights: ['One', 'Two', 'Three'],
    ownershipTypes: ['sectional-title'],
    description: 'A publishable development description for validation coverage.',
    media: {
      heroImage: { url: 'https://example.com/hero.jpg' },
    },
  },
  unitTypes: [
    {
      id: 'unit-1',
      name: 'Type A',
      priceFrom: 1_500_000,
      priceTo: 1_650_000,
      totalUnits: 10,
      availableUnits: 8,
      reservedUnits: 1,
    },
  ],
};

function getValidationFields(error: unknown) {
  expect(error).toBeInstanceOf(TRPCError);
  return ((error as TRPCError).cause as any)?.fields ?? {};
}

describe('developmentService validateForPublish commercial unit readiness', () => {
  it('uses shared full publish readiness for classification ownership', () => {
    expect.assertions(2);

    try {
      validateForPublish({
        ...baseWizardState,
        classification: undefined,
      } as any);
    } catch (error) {
      const fields = getValidationFields(error);
      expect(fields['classification.type']).toBe('Classification Type is required');
    }
  });

  it('requires every sale unit type to include a base price', () => {
    expect.assertions(2);

    try {
      validateForPublish({
        ...baseWizardState,
        transactionType: 'for_sale',
        unitTypes: [
          baseWizardState.unitTypes[0],
          {
            id: 'unit-2',
            name: 'Type B',
            totalUnits: 5,
            availableUnits: 5,
            reservedUnits: 0,
          },
        ],
      } as any);
    } catch (error) {
      const fields = getValidationFields(error);
      expect(fields['unitTypes.priceFrom']).toBe('All unit types must include a base price');
    }
  });

  it('uses the shared rent range rule during strict publish validation', () => {
    expect.assertions(2);

    try {
      validateForPublish({
        ...baseWizardState,
        transactionType: 'for_rent',
        unitTypes: [
          {
            id: 'unit-1',
            name: 'Rental Type',
            monthlyRentFrom: 15_000,
            monthlyRentTo: 12_500,
            totalUnits: 10,
            availableUnits: 8,
            reservedUnits: 1,
          },
        ],
      } as any);
    } catch (error) {
      const fields = getValidationFields(error);
      expect(fields['unitTypes.monthlyRentTo']).toBe(
        'Monthly rent upper range must be greater than or equal to monthly rent from',
      );
    }
  });

  it('uses shared auction timing readiness during strict publish validation', () => {
    expect.assertions(2);

    try {
      validateForPublish({
        ...baseWizardState,
        transactionType: 'auction',
        unitTypes: [
          {
            id: 'auction-unit-1',
            name: 'Auction Type',
            startingBid: 900_000,
            reservePrice: 950_000,
            auctionStartDate: '2099-05-01T10:00:00.000Z',
            auctionEndDate: '2099-05-01T09:00:00.000Z',
            totalUnits: 10,
            availableUnits: 8,
            reservedUnits: 1,
          },
        ],
      } as any);
    } catch (error) {
      const fields = getValidationFields(error);
      expect(fields['unitTypes.auctionEndDate']).toBe(
        'Auction end date must be after the start date',
      );
    }
  });

  it('uses shared inventory readiness during strict publish validation', () => {
    expect.assertions(2);

    try {
      validateForPublish({
        ...baseWizardState,
        transactionType: 'for_sale',
        unitTypes: [
          {
            ...baseWizardState.unitTypes[0],
            totalUnits: 10,
            availableUnits: 8,
            reservedUnits: 3,
          },
        ],
      } as any);
    } catch (error) {
      const fields = getValidationFields(error);
      expect(fields['unitTypes.reservedUnits']).toBe(
        'Each unit type must satisfy available + reserved <= total units',
      );
    }
  });

  it('uses shared basic readiness during strict publish validation', () => {
    expect.assertions(2);

    try {
      validateForPublish({
        ...baseWizardState,
        description: 'Too short',
        developmentData: {
          ...baseWizardState.developmentData,
          description: 'Too short',
        },
      } as any);
    } catch (error) {
      const fields = getValidationFields(error);
      expect(fields['description']).toBe('Description must be at least 50 characters');
    }
  });
});
