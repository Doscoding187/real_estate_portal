import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  getDevelopmentSearchCardAvailabilityLabel,
  getDevelopmentSearchCardContactLabel,
  ListingResultCard,
} from '../ListingResultCard';

const setLocationMock = vi.fn();

vi.mock('wouter', () => ({
  useLocation: () => ['/search/for-sale/gauteng/catalogue-city', setLocationMock],
}));

vi.mock('@/components/property/PropertyContactModal', () => ({
  PropertyContactModal: () => null,
}));

describe('ListingResultCard development inventory identity', () => {
  it('keeps canonical unit identity on public development search cards and navigates to the unit route', () => {
    setLocationMock.mockClear();

    const { container } = render(
      <ListingResultCard
        data={{
          id: 'dev-42-unit-a',
          href: '/development/demo-development/unit/unit-a',
          title: '2 Bedroom Apartment for Sale',
          location: 'Berea, Johannesburg, Gauteng',
          price: 1_200_000,
          image: 'https://example.com/unit-a.jpg',
          development: {
            id: 42,
            name: 'Demo Development',
            slug: 'demo-development',
          },
          listingSource: 'development',
          contactRole: 'developer',
          developmentId: 42,
          unitTypeId: 'unit-a',
          unitDisplayOrder: 0,
          postedBy: 'Demo Builder',
          highlights: ['Off-plan'],
        }}
      />,
    );

    const card = container.querySelector('[data-listing-source="development"]');
    expect(card).toHaveAttribute('data-unit-type-id', 'unit-a');
    expect(card).toHaveAttribute('data-unit-display-order', '0');

    fireEvent.click(screen.getByText('2 Bedroom Apartment for Sale'));

    expect(setLocationMock).toHaveBeenCalledWith('/development/demo-development/unit/unit-a');
  });

  it('labels rental development search cards as rent instead of generic sale pricing', () => {
    render(
      <ListingResultCard
        data={{
          id: 'dev-43-rent-a',
          href: '/development/rental-development/unit/rent-a',
          title: 'Rental Studio',
          location: 'Rosebank, Johannesburg, Gauteng',
          price: 12_500,
          image: 'https://example.com/rent-a.jpg',
          development: {
            id: 43,
            name: 'Rental Development',
            slug: 'rental-development',
          },
          listingSource: 'development',
          listingType: 'rent',
          totalUnits: 6,
          availableUnits: 2,
          contactRole: 'developer',
          developmentId: 43,
          unitTypeId: 'rent-a',
          postedBy: 'Rental Builder',
        }}
      />,
    );

    expect(screen.getByText('Rent from R 12,500')).toBeInTheDocument();
    expect(screen.getByText('2 rentals available')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Contact Leasing Team/i })).toBeInTheDocument();
  });

  it('labels auction development search cards as bids instead of generic sale pricing', () => {
    render(
      <ListingResultCard
        data={{
          id: 'dev-44-auction-a',
          href: '/development/auction-development/unit/auction-a',
          title: 'Auction Lot',
          location: 'Menlyn, Pretoria, Gauteng',
          price: 850_000,
          image: 'https://example.com/auction-a.jpg',
          development: {
            id: 44,
            name: 'Auction Development',
            slug: 'auction-development',
          },
          listingSource: 'development',
          listingType: 'auction',
          totalUnits: 1,
          availableUnits: 1,
          auctionStatus: 'registration_open',
          contactRole: 'developer',
          developmentId: 44,
          unitTypeId: 'auction-a',
          postedBy: 'Auction Builder',
        }}
      />,
    );

    expect(screen.getByText('Bid from R 850,000')).toBeInTheDocument();
    expect(screen.getByText('Registration open')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Contact Auction Team/i })).toBeInTheDocument();
  });

  it('formats development search-card inventory by transaction lane', () => {
    expect(
      getDevelopmentSearchCardAvailabilityLabel({
        listingType: 'sale',
        totalUnits: 4,
        availableUnits: 0,
      }),
    ).toBe('Sold out');

    expect(
      getDevelopmentSearchCardAvailabilityLabel({
        listingType: 'rent',
        totalUnits: 4,
        availableUnits: 0,
      }),
    ).toBe('Fully let');

    expect(
      getDevelopmentSearchCardAvailabilityLabel({
        listingType: 'auction',
        totalUnits: 1,
        availableUnits: 1,
        auctionStatus: 'sold',
      }),
    ).toBe('Sold at auction');
  });

  it('formats contact labels by development transaction lane', () => {
    expect(getDevelopmentSearchCardContactLabel({ isDevelopmentListing: true })).toBe(
      'Contact Developer',
    );
    expect(
      getDevelopmentSearchCardContactLabel({
        listingType: 'rent',
        isDevelopmentListing: true,
      }),
    ).toBe('Contact Leasing Team');
    expect(
      getDevelopmentSearchCardContactLabel({
        listingType: 'auction',
        isDevelopmentListing: true,
      }),
    ).toBe('Contact Auction Team');
  });
});
