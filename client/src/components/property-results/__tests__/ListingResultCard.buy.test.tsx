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
}));

describe('ListingResultCard Buy identity', () => {
  it('uses canonical agency identity and routes discovery action to the property', () => {
    const onOpen = vi.fn();
    render(
      <ListingResultCard
        data={{
          id: '501',
          propertyId: 501,
          title: 'Agency-owned family home',
          location: 'Parkhurst, Johannesburg',
          price: 4_250_000,
          image: '/home.jpg',
          area: 150,
          yardSize: 300,
          bedrooms: 3,
          bathrooms: 2,
          highlights: [
            {
              key: 'study_office',
              label: 'Study / office',
              iconKey: 'study',
              source: 'space',
            },
          ],
          onOpen,
          listingType: 'sale',
          listingSource: 'manual',
          // Deliberately contradictory legacy hints: canonical identity must win.
          listerType: 'agent',
          contactRole: 'agent',
          identity: {
            role: 'agency',
            provenance: 'agency',
            name: 'Northside Realty',
            agencyId: 72,
            organizationLogoUrl: '/northside.svg',
          },
        }}
      />,
    );

    expect(screen.getByText('Northside Realty')).toBeInTheDocument();
    expect(screen.getByText('Listing agency')).toBeInTheDocument();
    expect(screen.queryByText('Private Seller')).not.toBeInTheDocument();
    const propertyLink = screen.getByRole('link', { name: 'View Agency-owned family home' });
    expect(propertyLink).toHaveAttribute('href', '/property/501');
    propertyLink.focus();
    expect(propertyLink).toHaveFocus();

    const viewPropertyLink = screen.getByRole('link', {
      name: 'View property: Agency-owned family home',
    });
    expect(viewPropertyLink).toHaveAttribute('href', '/property/501');
    expect(screen.getByLabelText('Internal area 150 square metres')).toHaveTextContent('150m²');
    expect(screen.getByText('3 beds')).toBeInTheDocument();
    expect(screen.getByText('2 baths')).toBeInTheDocument();
    expect(screen.getByLabelText('Erf or yard area 300 square metres')).toHaveTextContent('300m²');
    expect(screen.getByText('Study / office')).toBeInTheDocument();
    expect(screen.getByLabelText('Property highlights').querySelector('svg')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Contact|WhatsApp/i })).not.toBeInTheDocument();
  });

  it('fails closed to property detail instead of inventing a seller for missing identity', () => {
    render(
      <ListingResultCard
        data={{
          id: '502',
          propertyId: 502,
          href: '/property/502',
          title: 'Unresolved legacy projection',
          location: 'Johannesburg, Gauteng',
          price: 2_100_000,
          image: '/home.jpg',
          listingType: 'sale',
          listingSource: 'manual',
        }}
      />,
    );

    expect(screen.getByText('Listing contact unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Private Seller')).not.toBeInTheDocument();
    expect(screen.queryByText('Property Listify')).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'View Unresolved legacy projection' })).toHaveAttribute(
      'href',
      '/property/502',
    );
    expect(
      screen.getByRole('link', { name: 'View property: Unresolved legacy projection' }),
    ).toHaveAttribute('href', '/property/502');
  });
});
