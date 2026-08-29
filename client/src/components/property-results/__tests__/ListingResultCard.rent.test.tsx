import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ListingResultCard } from '../ListingResultCard';

vi.mock('wouter', () => ({
  Link: ({ href, children, ...props }: ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ['/property-for-sale', vi.fn()],
}));

describe('ListingResultCard rental semantics', () => {
  it('uses monthly rent language and neutral private-advertiser identity for Rent inventory', () => {
    render(
      <ListingResultCard
        data={{
          id: 'rent-1',
          title: 'Two bedroom apartment',
          location: 'Rosebank, Johannesburg',
          price: 12000,
          image: '/rent.jpg',
          listingType: 'rent',
          listerType: 'private',
          contactRole: 'private',
        }}
      />,
    );

    expect(screen.getByText('R 12,000 / month')).toBeInTheDocument();
    expect(screen.getByText('Private Advertiser')).toBeInTheDocument();
    expect(screen.getByText('Parking to confirm')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'View property: Two bedroom apartment' }),
    ).toHaveAttribute('href', '/property/rent-1');
    expect(screen.queryByRole('button', { name: /Contact|WhatsApp/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Private Seller')).not.toBeInTheDocument();
    expect(screen.queryByText(/landlord/i)).not.toBeInTheDocument();
  });

  it('uses public parking and tenancy facts to make a rental card decision-ready', () => {
    render(
      <ListingResultCard
        data={{
          id: 'rent-facts-1',
          title: 'Furnished apartment',
          location: 'Sandton, Johannesburg',
          price: 25_000,
          image: '/rent-facts.jpg',
          listingType: 'rent',
          area: 88,
          bedrooms: 2,
          bathrooms: 2,
          parking: {
            key: 'parking',
            label: 'Parking',
            value: '1 parking bay',
            icon: 'parking',
            status: 'known',
          },
          rentalSnapshot: [
            {
              key: 'availability',
              label: 'Availability',
              value: 'Available now',
              icon: 'calendar',
              status: 'known',
            },
            {
              key: 'lease',
              label: 'Lease',
              value: '12-month minimum',
              icon: 'lease',
              status: 'known',
            },
            {
              key: 'furnishing',
              label: 'Furnishing',
              value: 'Furnished',
              icon: 'furnishing',
              status: 'known',
            },
          ],
        }}
      />,
    );

    expect(screen.getByLabelText('Parking: 1 parking bay')).toHaveTextContent('1 parking bay');
    const snapshot = screen.getByLabelText('Rental snapshot');
    expect(snapshot).toHaveTextContent('Available now');
    expect(snapshot).toHaveTextContent('12-month minimum');
    expect(snapshot).toHaveTextContent('Furnished');
  });

  it('does not infer rental presentation from an unsupported journey-like value', () => {
    render(
      <ListingResultCard
        data={{
          id: 'other-1',
          title: 'Property',
          location: 'Johannesburg, Gauteng',
          price: 12000,
          image: '/property.jpg',
          listingType: 'shared_living',
          listerType: 'private',
          contactRole: 'private',
        }}
      />,
    );

    expect(screen.getByText('R 12,000')).toBeInTheDocument();
    expect(screen.queryByText('R 12,000 / month')).not.toBeInTheDocument();
    expect(screen.getByText('Private Seller')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View property: Property' })).toBeInTheDocument();
  });

  it('does not expose Compare even when a caller supplies a comparison handler', () => {
    render(
      <ListingResultCard
        data={{
          id: 'rent-compare-1',
          propertyId: 41,
          title: 'Rental home',
          location: 'Rosebank, Johannesburg',
          price: 15000,
          image: '/rent-compare.jpg',
          listingType: 'rent',
          onCompare: vi.fn(),
        }}
      />,
    );

    expect(screen.queryByRole('button', { name: /Compare property/i })).not.toBeInTheDocument();
  });
});
