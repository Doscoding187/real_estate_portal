import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  getAcceleratorMatchTransactionCopy,
  getAcceleratorMatchPriceText,
  MatchesGrid,
  normalizeAcceleratorMatchTransactionType,
} from './MatchesGrid';
import type { AcceleratorMatchSnapshot } from './acceleratorTypes';

describe('MatchesGrid pricing helpers', () => {
  it('normalizes listing transaction types', () => {
    expect(normalizeAcceleratorMatchTransactionType('for_rent')).toBe('rent');
    expect(normalizeAcceleratorMatchTransactionType('auction')).toBe('auction');
    expect(normalizeAcceleratorMatchTransactionType('on_auction')).toBe('auction');
    expect(normalizeAcceleratorMatchTransactionType('leasehold')).toBe('sale');
  });

  it('labels participant actions by transaction type', () => {
    expect(getAcceleratorMatchTransactionCopy('for_rent')).toMatchObject({
      participantLabel: 'Renter',
      submitLabel: 'Submit renter with this match',
      ceilingLabel: 'Rental affordability ceiling',
    });
    expect(getAcceleratorMatchTransactionCopy('auction')).toMatchObject({
      participantLabel: 'Bidder',
      submitLabel: 'Submit bidder with this match',
      ceilingLabel: 'Bidder affordability ceiling',
    });
  });

  it('labels rent and auction unit options without purchase-price copy', () => {
    const rent = getAcceleratorMatchPriceText({
      transactionType: 'rent',
      priceFrom: 12_500,
      priceTo: 14_000,
    });
    expect(rent.label).toBe('Monthly rent');
    expect(rent.text.replace(/\s/g, ' ')).toBe('R12 500 - R14 000 / month');

    const auction = getAcceleratorMatchPriceText({
      transactionType: 'auction',
      priceFrom: 850_000,
      priceTo: 900_000,
    });
    expect(auction.label).toBe('Starting bid');
    expect(auction.text.replace(/\s/g, ' ')).toBe('Bid from R850 000');
  });
});

describe('MatchesGrid', () => {
  it('renders Sale, Rental, and Auction match actions with transaction-native language', () => {
    const onSubmitReferral = vi.fn();
    const snapshot: AcceleratorMatchSnapshot = {
      assessmentId: 'assessment-1',
      matchSnapshotId: 'snapshot-1',
      createdAt: '2026-06-08T00:00:00.000Z',
      purchasePrice: 1_500_000,
      createdNewSnapshot: true,
      matches: [
        {
          developmentId: 10,
          developmentName: 'Sales Estate',
          area: 'Midrand',
          city: 'Midrand',
          province: 'Gauteng',
          suburb: null,
          logoUrl: null,
          transactionType: 'sale',
          purchasePrice: 950_000,
          bestFitRatio: 0.91,
          developmentPriority: 1,
          unitOptions: [
            {
              unitTypeId: 'sale-1',
              unitName: '2 Bed',
              bedrooms: 2,
              transactionType: 'sale',
              priceFrom: 950_000,
              priceTo: 1_100_000,
              fitRatio: 0.91,
            },
          ],
        },
        {
          developmentId: 20,
          developmentName: 'Harbour Rentals',
          area: 'Cape Town',
          city: 'Cape Town',
          province: 'Western Cape',
          suburb: null,
          logoUrl: null,
          transactionType: 'for_rent',
          purchasePrice: 15_000,
          bestFitRatio: 0.86,
          developmentPriority: 2,
          unitOptions: [
            {
              unitTypeId: 'rent-1',
              unitName: 'Rental Loft',
              bedrooms: 1,
              transactionType: 'for_rent',
              priceFrom: 12_500,
              priceTo: 15_000,
              fitRatio: 0.86,
            },
          ],
        },
        {
          developmentId: 30,
          developmentName: 'Auction Yard',
          area: 'Durban',
          city: 'Durban',
          province: 'KwaZulu-Natal',
          suburb: null,
          logoUrl: null,
          transactionType: 'auction',
          purchasePrice: 850_000,
          bestFitRatio: 0.78,
          developmentPriority: 3,
          unitOptions: [
            {
              unitTypeId: 'auction-1',
              unitName: 'Auction Unit',
              bedrooms: 2,
              transactionType: 'auction',
              priceFrom: 850_000,
              priceTo: 900_000,
              fitRatio: 0.78,
            },
          ],
        },
      ],
    };

    render(
      <MatchesGrid
        snapshot={snapshot}
        assessmentId="assessment-1"
        onSubmitReferral={onSubmitReferral}
      />,
    );

    expect(screen.getByText('Affordability ceiling R950 000')).toBeInTheDocument();
    expect(screen.getByText('Rental affordability ceiling R15 000')).toBeInTheDocument();
    expect(screen.getByText('Bidder affordability ceiling R850 000')).toBeInTheDocument();
    expect(screen.getByText('R12 500 - R15 000 / month')).toBeInTheDocument();
    expect(screen.getByText('Bid from R850 000')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Submit renter with this match' }));
    expect(onSubmitReferral).toHaveBeenCalledWith(20);
  });
});
