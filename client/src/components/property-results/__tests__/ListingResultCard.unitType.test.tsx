import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ListingResultCard, type ListingResultCardData } from '../ListingResultCard';

vi.mock('wouter', () => ({
  Link: ({ href, children, ...props }: ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const unitTypeCard = (over: Partial<ListingResultCardData> = {}): ListingResultCardData => ({
  id: '7:u1',
  href: '/development/oak-gardens/unit/u1',
  title: '2-bed Apartment',
  location: 'Sandton',
  price: 1_250_000,
  image: '/unit.jpg',
  bedrooms: 2,
  bathrooms: 1,
  listingType: 'sale',
  listingSource: 'development',
  contactRole: 'developer',
  identity: { role: 'developer', provenance: 'developer', name: 'Acme Dev' },
  development: { id: 7, name: 'Oak Gardens', slug: 'oak-gardens' },
  unitTypeId: 'u1',
  availableUnits: 4,
  ...over,
});

describe('ListingResultCard development unit type', () => {
  it('says From, the new-development label with the publisher, and how many are available', () => {
    render(<ListingResultCard data={unitTypeCard()} />);
    expect(screen.getByText(/^From R\s*1\D?250\D?000$/)).toBeInTheDocument();
    expect(screen.getByText(/New development · Acme Dev · 4 available/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View 2-bed Apartment' })).toHaveAttribute(
      'href',
      '/development/oak-gardens/unit/u1',
    );
  });

  it('shows no availability when the count is unknown', () => {
    render(<ListingResultCard data={unitTypeCard({ availableUnits: undefined })} />);
    expect(screen.getByText('New development · Acme Dev')).toBeInTheDocument();
    expect(screen.queryByText(/available/)).not.toBeInTheDocument();
  });

  it('adds no new-development label to an ordinary listing', () => {
    render(
      <ListingResultCard
        data={unitTypeCard({
          id: '501',
          href: undefined,
          unitTypeId: undefined,
          availableUnits: undefined,
          development: undefined,
          listingSource: 'manual',
          contactRole: 'agent',
          identity: { role: 'agent', provenance: 'agent', name: 'Jo Agent' },
        })}
      />,
    );
    expect(screen.queryByText(/New development/)).not.toBeInTheDocument();
    expect(screen.getByText(/^R\s*1\D?250\D?000$/)).toBeInTheDocument();
  });
});
