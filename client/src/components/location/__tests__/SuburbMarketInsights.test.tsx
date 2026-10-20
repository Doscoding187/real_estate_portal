import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('wouter', () => ({
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { SuburbMarketInsights } from '../SuburbMarketInsights';

const marketData = {
  asOf: '2026-10-15T12:00:00.000Z',
  minimumPriceSample: 10,
  sale: {
    listingCount: 12,
    pricedListingCount: 12,
    medianPrice: 2_800_000,
    propertyTypes: [
      { propertyType: 'house', listingCount: 4, pricedListingCount: 4, medianPrice: null },
      { propertyType: 'apartment', listingCount: 8, pricedListingCount: 8, medianPrice: null },
    ],
    bedrooms: [
      { bedroomBand: 2, listingCount: 3, pricedListingCount: 3, medianPrice: null },
      { bedroomBand: 3, listingCount: 9, pricedListingCount: 9, medianPrice: null },
    ],
  },
  rent: {
    listingCount: 10,
    pricedListingCount: 10,
    medianPrice: 18_000,
    propertyTypes: [
      { propertyType: 'apartment', listingCount: 10, pricedListingCount: 10, medianPrice: 18_000 },
    ],
    bedrooms: [{ bedroomBand: 2, listingCount: 10, pricedListingCount: 10, medianPrice: 18_000 }],
  },
  otherTransactionListingCount: 1,
};

describe('SuburbMarketInsights', () => {
  it('separates sale and rental facts and discloses the asking-price sample', () => {
    render(
      <SuburbMarketInsights
        suburbName="Sandton"
        data={marketData}
        buyHref="/buy-sandton"
        rentHref="/rent-sandton"
      />,
    );

    expect(screen.getByText('Median asking price')).toBeInTheDocument();
    expect(screen.getByText('R2.8M')).toBeInTheDocument();
    expect(screen.getByText('From 12 priced listings')).toBeInTheDocument();
    expect(screen.getByText(/Inventory snapshot as at/)).toBeInTheDocument();
    expect(screen.getByText('Median: Limited sample · 4/10')).toBeInTheDocument();
    expect(screen.getByText(/These are Property Listify asking prices/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse homes for sale/i })).toHaveAttribute(
      'href',
      '/buy-sandton',
    );

    fireEvent.click(screen.getByRole('button', { name: /to rent/i }));

    expect(screen.getByText('Median monthly rent')).toBeInTheDocument();
    expect(screen.getAllByText('R18k')).toHaveLength(2);
    expect(screen.getByRole('link', { name: /browse rentals/i })).toHaveAttribute(
      'href',
      '/rent-sandton',
    );
  });
});
