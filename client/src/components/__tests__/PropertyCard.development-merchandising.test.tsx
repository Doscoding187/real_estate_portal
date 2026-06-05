import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import PropertyCard from '../PropertyCard';

vi.mock('wouter', () => ({
  useLocation: () => ['/search/for-sale/gauteng/catalogue-city', vi.fn()],
}));

describe('PropertyCard development merchandising', () => {
  it('uses rental inventory and leasing-team copy for development grid cards', () => {
    render(
      <PropertyCard
        id="dev-43-rent-a"
        href="/development/rental-development/unit/rent-a"
        title="Rental Studio"
        price={12500}
        location="Rosebank, Johannesburg"
        image="/rental.jpg"
        propertyType="Apartment"
        listingType="rent"
        listingSource="development"
        totalUnits={6}
        availableUnits={2}
        development={{
          id: 43,
          name: 'Rental Development',
          slug: 'rental-development',
        }}
        suppressBadges
      />,
    );

    expect(screen.getByText(/Rent from/i)).toBeInTheDocument();
    expect(screen.getByText('2 rentals available')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Contact Leasing Team/i })).toBeInTheDocument();
  });

  it('uses auction outcome and auction-team copy for development grid cards', () => {
    render(
      <PropertyCard
        id="dev-44-auction-a"
        href="/development/auction-development/unit/auction-a"
        title="Auction Lot"
        price={850000}
        location="Menlyn, Pretoria"
        image="/auction.jpg"
        propertyType="House"
        listingType="auction"
        listingSource="development"
        totalUnits={1}
        availableUnits={1}
        auctionStatus="registration_open"
        development={{
          id: 44,
          name: 'Auction Development',
          slug: 'auction-development',
        }}
        suppressBadges
      />,
    );

    expect(screen.getByText(/Bid from/i)).toBeInTheDocument();
    expect(screen.getByText('Registration open')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Contact Auction Team/i })).toBeInTheDocument();
  });
});
