import { describe, expect, it } from 'vitest';

import {
  buildDevelopmentTransactionAggregates,
  resolvePublicDevelopmentConfiguration,
  shouldRecomputeDevelopmentTransactionAggregates,
} from '../developmentService';
import { normalizeForPublish } from '../publishNormalizer';

describe('development transaction aggregate normalization', () => {
  it('clears inactive aggregate fields for sale developments', () => {
    expect(
      buildDevelopmentTransactionAggregates('for_sale', {
        priceFrom: 1200000,
        priceTo: 1600000,
        monthlyRentFrom: 9000,
        monthlyRentTo: 12000,
        auctionStartDate: '2026-08-01T10:00',
        startingBidFrom: 800000,
      }),
    ).toMatchObject({
      priceFrom: 1200000,
      priceTo: 1600000,
      monthlyRentFrom: null,
      monthlyRentTo: null,
      auctionStartDate: null,
      auctionEndDate: null,
      startingBidFrom: null,
      reservePriceFrom: null,
    });
  });

  it('uses unit sale ranges when canonical edit payload omits development-level prices', () => {
    expect(
      buildDevelopmentTransactionAggregates('for_sale', { monthlyRentFrom: 9000 }, [
        { priceFrom: 1_625_000, priceTo: 1_800_000 },
        { basePriceFrom: 1_450_000, basePriceTo: 1_600_000 },
      ]),
    ).toMatchObject({
      priceFrom: 1_450_000,
      priceTo: 1_800_000,
      monthlyRentFrom: null,
      monthlyRentTo: null,
      auctionStartDate: null,
      auctionEndDate: null,
      startingBidFrom: null,
      reservePriceFrom: null,
    });
  });

  it('uses canonical unit sale ranges ahead of stale development-level prices', () => {
    expect(
      buildDevelopmentTransactionAggregates(
        'for_sale',
        {
          priceFrom: 1_450_000,
          priceTo: 1_650_000,
        },
        [{ priceFrom: 1_500_000, priceTo: 1_700_000 }],
      ),
    ).toMatchObject({
      priceFrom: 1_500_000,
      priceTo: 1_700_000,
      monthlyRentFrom: null,
      monthlyRentTo: null,
      auctionStartDate: null,
      auctionEndDate: null,
      startingBidFrom: null,
      reservePriceFrom: null,
    });
  });

  it('uses canonical sale prices ahead of stored base-price fallbacks during edit aggregation', () => {
    expect(
      buildDevelopmentTransactionAggregates('for_sale', {}, [
        {
          id: 'type-a',
          basePriceFrom: 1_500_000,
          basePriceTo: 1_650_000,
          priceFrom: 1_575_000,
          priceTo: 1_725_000,
        },
        {
          id: 'type-b',
          basePriceFrom: 2_100_000,
          basePriceTo: 2_350_000,
        },
      ]),
    ).toMatchObject({
      priceFrom: 1_575_000,
      priceTo: 2_350_000,
      monthlyRentFrom: null,
      monthlyRentTo: null,
      auctionStartDate: null,
      auctionEndDate: null,
      startingBidFrom: null,
      reservePriceFrom: null,
    });
  });

  it('uses unit rent ranges and clears sale/auction aggregates for rental developments', () => {
    expect(
      buildDevelopmentTransactionAggregates(
        'for_rent',
        { priceFrom: 1000000, startingBidFrom: 750000 },
        [
          { monthlyRentFrom: 12500, monthlyRentTo: 15000 },
          { monthlyRentFrom: 9500, monthlyRentTo: 18000 },
        ],
      ),
    ).toMatchObject({
      priceFrom: null,
      priceTo: null,
      monthlyRentFrom: 9500,
      monthlyRentTo: 18000,
      auctionStartDate: null,
      auctionEndDate: null,
      startingBidFrom: null,
      reservePriceFrom: null,
    });
  });

  it('uses unit auction ranges and clears sale/rent aggregates for auction developments', () => {
    expect(
      buildDevelopmentTransactionAggregates(
        'auction',
        { priceFrom: 1000000, monthlyRentFrom: 9000 },
        [
          {
            startingBid: 950000,
            reservePrice: 1100000,
            auctionStartDate: '2026-09-10T10:00',
            auctionEndDate: '2026-09-10T14:00',
          },
          {
            startingBid: 850000,
            reservePrice: 1050000,
            auctionStartDate: '2026-09-08T10:00',
            auctionEndDate: '2026-09-11T14:00',
          },
        ],
      ),
    ).toMatchObject({
      priceFrom: null,
      priceTo: null,
      monthlyRentFrom: null,
      monthlyRentTo: null,
      auctionStartDate: '2026-09-08T10:00',
      auctionEndDate: '2026-09-11T14:00',
      startingBidFrom: 850000,
      reservePriceFrom: 1050000,
    });
  });

  it('recomputes update aggregates only when the update owns aggregate inputs', () => {
    expect(
      shouldRecomputeDevelopmentTransactionAggregates(
        {
          name: 'Metadata-only update',
          transactionType: 'for_sale',
          description: 'This canonical snapshot should not own price ranges.',
        },
        undefined,
      ),
    ).toBe(false);

    expect(
      shouldRecomputeDevelopmentTransactionAggregates(
        {
          name: 'Transaction mode switch',
          transactionType: 'for_rent',
        },
        undefined,
        { transactionTypeChanged: true },
      ),
    ).toBe(true);

    expect(
      shouldRecomputeDevelopmentTransactionAggregates(
        {
          transactionType: 'for_sale',
          priceFrom: 1_250_000,
        },
        undefined,
      ),
    ).toBe(true);

    expect(
      shouldRecomputeDevelopmentTransactionAggregates(
        {
          transactionType: 'for_rent',
        },
        [{ id: 'unit-a', monthlyRentFrom: 12_500 }],
      ),
    ).toBe(true);

    expect(
      shouldRecomputeDevelopmentTransactionAggregates(
        {
          transactionType: 'for_sale',
        },
        [],
      ),
    ).toBe(true);
  });

  it('normalizes publish payloads without leaking inactive transaction fields', () => {
    const salePayload = normalizeForPublish({
      name: 'Sale Development',
      city: 'Cape Town',
      province: 'Western Cape',
      developmentType: 'residential',
      transactionType: 'for_sale',
      priceFrom: 1200000,
      monthlyRentFrom: 9500,
      startingBidFrom: 700000,
    });

    expect(salePayload).toMatchObject({
      transactionType: 'for_sale',
      priceFrom: 1200000,
      monthlyRentFrom: null,
      auctionStartDate: null,
      startingBidFrom: null,
    });

    const auctionPayload = normalizeForPublish({
      name: 'Auction Development',
      city: 'Johannesburg',
      province: 'Gauteng',
      developmentType: 'residential',
      transactionType: 'auction',
      priceFrom: 1200000,
      monthlyRentFrom: 9500,
      unitTypes: [
        {
          startingBid: 875000,
          reservePrice: 950000,
          auctionStartDate: '2026-10-01T09:00',
          auctionEndDate: '2026-10-01T12:00',
        },
      ],
    });

    expect(auctionPayload).toMatchObject({
      transactionType: 'auction',
      priceFrom: null,
      monthlyRentFrom: null,
      auctionStartDate: '2026-10-01 09:00',
      auctionEndDate: '2026-10-01 12:00',
      startingBidFrom: 875000,
      reservePriceFrom: 950000,
    });
  });

  it('normalizes canonical draft snapshots for publish', () => {
    const payload = normalizeForPublish({
      workflowId: 'residential_sale',
      currentStepId: 'review_publish',
      completedSteps: ['identity_market', 'configuration', 'unit_types'],
      developmentType: 'residential',
      developmentData: {
        name: 'Canonical Publish Draft',
        description: 'A canonical draft snapshot ready for publication.',
        transactionType: 'for_sale',
        status: 'selling',
        location: {
          address: '1 Publish Road',
          city: 'Cape Town',
          province: 'Western Cape',
        },
        media: {
          heroImage: { id: 'hero', url: 'https://example.com/hero.jpg' },
          photos: [],
        },
      },
      stepData: {
        unit_types: {
          unitTypes: [
            {
              id: 'draft-unit-1',
              name: 'Type A',
              bedrooms: 2,
              bathrooms: 2,
              priceFrom: 1_500_000,
              priceTo: 1_650_000,
            },
          ],
        },
      },
      unitTypes: [
        {
          id: 'stale-root-unit',
          name: 'Stale Root Type',
          bedrooms: 2,
          bathrooms: 2,
          priceFrom: 999_000,
          priceTo: 999_000,
        },
      ],
    } as any);

    expect(payload).toMatchObject({
      name: 'Canonical Publish Draft',
      city: 'Cape Town',
      province: 'Western Cape',
      address: '1 Publish Road',
      transactionType: 'for_sale',
      status: 'selling',
      priceFrom: 1_500_000,
      priceTo: 1_650_000,
    });
    expect(payload.images).toContain('https://example.com/hero.jpg');
  });

  it('resolves public unit configuration prices by development transaction type', () => {
    expect(
      resolvePublicDevelopmentConfiguration({
        id: 'rental-unit-1',
        label: 'Rental Apartment',
        transactionType: 'for_rent',
        basePriceFrom: 1200000,
        monthlyRentFrom: 12500,
        monthlyRentTo: 15000,
      }),
    ).toEqual({
      unitTypeId: 'rental-unit-1',
      label: 'Rental Apartment',
      listingType: 'rent',
      priceFrom: 12500,
      priceTo: 15000,
    });

    expect(
      resolvePublicDevelopmentConfiguration({
        label: 'Auction Apartment',
        transactionType: 'auction',
        basePriceFrom: 1200000,
        startingBid: 850000,
        reservePrice: 900000,
      }),
    ).toEqual({
      label: 'Auction Apartment',
      listingType: 'auction',
      priceFrom: 850000,
      priceTo: 900000,
    });
  });
});
