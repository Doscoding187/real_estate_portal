import { render, screen } from '@testing-library/react';
import { Router } from 'wouter';
import { describe, expect, it, vi } from 'vitest';

import { LocationTopLocalities, type Locality } from '../LocationTopLocalities';

vi.mock('embla-carousel-react', () => ({
  default: () => [vi.fn(), undefined],
}));

const baseLocality: Locality = {
  name: 'Sandton',
  avgSalePrice: null,
  avgRentalPrice: null,
  propertiesForSale: 0,
  propertiesForRent: 0,
};

function renderLocalities(localities: Locality[]) {
  return render(
    <Router>
      <LocationTopLocalities localities={localities} locationName="Johannesburg" />
    </Router>,
  );
}

describe('LocationTopLocalities', () => {
  it('renders when optional locality metrics are unavailable without treating them as zero', () => {
    expect(() => renderLocalities([baseLocality])).not.toThrow();

    expect(screen.getByRole('heading', { name: 'Sandton' })).toBeInTheDocument();
    expect(screen.getAllByText('Not enough data')).toHaveLength(2);
    expect(screen.getByText('0 Properties for Sale')).toBeInTheDocument();
    expect(screen.getByText('0 Properties for Rent')).toBeInTheDocument();
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
  });

  it('keeps genuine numeric values formatted, including zero counts', () => {
    renderLocalities([
      {
        ...baseLocality,
        avgSalePrice: 1234567,
        avgRentalPrice: 15000,
        propertiesForRent: 25,
        rating: 4.5,
        reviews: 12,
      },
    ]);

    expect(screen.getByText('R 1,234,567')).toBeInTheDocument();
    expect(screen.getByText('R 15,000')).toBeInTheDocument();
    expect(screen.getByText('0 Properties for Sale')).toBeInTheDocument();
    expect(screen.getByText('25 Properties for Rent')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('(12 Reviews)')).toBeInTheDocument();
  });
});
