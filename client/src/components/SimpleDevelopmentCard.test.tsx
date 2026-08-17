import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('wouter', () => ({
  Link: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { SimpleDevelopmentCard } from './SimpleDevelopmentCard';

describe('SimpleDevelopmentCard public development facts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps rental missing price, missing bedrooms, publisher and sold-out copy truthful', () => {
    render(
      <SimpleDevelopmentCard
        id="rental-heights"
        title="Rental Heights"
        city="Johannesburg"
        priceRange={{ min: null, max: null }}
        image=""
        href="/development/rental-heights"
        listingType="rent"
        bedroomRange={{ min: null, max: null }}
        availabilityState="sold_out"
        status="selling"
        publisherName="Property Listify Catalogue"
      />,
    );

    expect(screen.getByText('Monthly rent on request')).toBeInTheDocument();
    expect(screen.queryByText('Price on request')).not.toBeInTheDocument();
    expect(screen.getByText('Sold out · Register interest')).toBeInTheDocument();
    expect(screen.getByText('Publisher: Property Listify Catalogue')).toBeInTheDocument();
    expect(screen.queryByText(/Bedroom/)).not.toBeInTheDocument();
  });

  it('keeps sale pricing separate from rental terminology', () => {
    render(
      <SimpleDevelopmentCard
        id="sale-heights"
        title="Sale Heights"
        city="Johannesburg"
        priceRange={{ min: 1299000, max: 1499000 }}
        image=""
        href="/development/sale-heights"
        listingType="sale"
        bedroomRange={{ min: 2, max: 3 }}
      />,
    );

    expect(screen.getByText('R1.3M to R1.5M')).toBeInTheDocument();
    expect(screen.queryByText(/month/i)).not.toBeInTheDocument();
    expect(screen.getByText('2 & 3 Bedrooms')).toBeInTheDocument();
  });
});
