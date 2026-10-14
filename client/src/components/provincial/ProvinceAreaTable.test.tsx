import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProvinceAreaTable } from './ProvinceAreaTable';

const market = {
  slug: 'pretoria',
  name: 'Pretoria',
  description: 'Explore the city and its neighbourhoods.',
  areaSlugs: ['hatfield'],
  city: { slug: 'pretoria', canonicalLocationId: 'city:18' },
  state: 'empty',
  inventory: { total: 0 },
};
describe('Province area guide table', () => {
  it('uses a compact table and keeps a real guide available with zero stock', () => {
    render(<ProvinceAreaTable provinceSlug="gauteng" markets={[market]} />);
    const table = screen.getByRole('table', { name: 'Explore province areas' });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(screen.getByText('No sale listings yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore Pretoria' })).toHaveAttribute(
      'href',
      '/gauteng/pretoria',
    );
  });
  it('distinguishes unavailable inventory from an empty count', () => {
    render(
      <ProvinceAreaTable
        provinceSlug="gauteng"
        markets={[{ ...market, inventory: null, state: 'unavailable' }]}
      />,
    );
    expect(screen.getByText('Inventory unavailable')).toBeInTheDocument();
    expect(screen.queryByText('No sale listings yet')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore Pretoria' })).toBeInTheDocument();
  });
  it('shows supplied sale counts without inventing popularity or prices', () => {
    render(
      <ProvinceAreaTable
        provinceSlug="gauteng"
        markets={[{ ...market, state: 'ready', inventory: { total: 13 } }]}
      />,
    );
    expect(screen.getByText('13 for sale')).toBeInTheDocument();
    expect(screen.queryByText(/trending|median|typical price/i)).not.toBeInTheDocument();
  });
  it('offers no fabricated guide for an unresolved area', () => {
    render(
      <ProvinceAreaTable
        provinceSlug="gauteng"
        markets={[{ ...market, city: null }]}
        guidesLoading
      />,
    );
    expect(screen.getByText('Loading guide…')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
