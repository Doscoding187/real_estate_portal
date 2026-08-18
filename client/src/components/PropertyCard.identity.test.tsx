import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PropertyCard from './PropertyCard';

vi.mock('wouter', () => ({
  useLocation: () => ['/property-for-sale', vi.fn()],
}));

describe('PropertyCard canonical public identity', () => {
  it('renders an agency as an agency without reconstructing an agent or private seller', () => {
    render(
      <PropertyCard
        id="501"
        propertyId={501}
        href="/property/501"
        title="Agency-owned family home"
        price={4_250_000}
        location="Parkhurst, Johannesburg"
        image="/home.jpg"
        listingType="sale"
        listingSource="manual"
        listerType="agent"
        identity={{
          role: 'agency',
          provenance: 'agency',
          name: 'Northside Realty',
          agencyId: 72,
        }}
        contactButtonLabel="View details"
      />,
    );

    expect(screen.getByText('Northside Realty')).toBeInTheDocument();
    expect(screen.getByText('Listed by agency')).toBeInTheDocument();
    expect(screen.queryByText('Listed by agent')).not.toBeInTheDocument();
    expect(screen.queryByText('Private Seller')).not.toBeInTheDocument();
  });

  it('does not invent platform/private provenance or media counts when identity is absent', () => {
    render(
      <PropertyCard
        id="502"
        propertyId={502}
        href="/property/502"
        title="Unresolved legacy projection"
        price={2_100_000}
        location="Johannesburg, Gauteng"
        image="/home.jpg"
        listingType="sale"
        listingSource="manual"
        contactButtonLabel="View details"
      />,
    );

    expect(screen.getByText('Listing contact unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Property Listify')).not.toBeInTheDocument();
    expect(screen.queryByText('Private Seller')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Floor plan available')).not.toBeInTheDocument();
    expect(screen.queryByText('15')).not.toBeInTheDocument();
  });
});
