import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SimpleHomeListingCard } from './SimpleHomeListingCard';

const cardProps = {
  id: '994001',
  title: 'Contemporary Sandton Townhouse',
  city: 'Johannesburg',
  suburb: 'Sandton',
  href: '/property/994001',
  price: 4_600_000,
  bedrooms: 3,
  bathrooms: 2,
  area: 150,
  yardSize: 300,
  parkingCount: 2,
  propertyType: 'house',
};

describe('SimpleHomeListingCard', () => {
  it('prioritises the four useful house facts in a single compact row', () => {
    render(<SimpleHomeListingCard {...cardProps} />);

    expect(screen.getByText('150 m²')).toBeInTheDocument();
    expect(screen.getByText('3 Bed')).toBeInTheDocument();
    expect(screen.getByText('2 Bath')).toBeInTheDocument();
    expect(screen.getByText('300 m²')).toBeInTheDocument();
    expect(screen.queryByText('2 Parking')).not.toBeInTheDocument();
  });

  it('exposes a separate, accessible saved-home action above the card link', () => {
    const onFavoriteClick = vi.fn();
    render(
      <SimpleHomeListingCard {...cardProps} isSaved={false} onFavoriteClick={onFavoriteClick} />,
    );

    const control = screen.getByRole('button', { name: 'Save property' });
    fireEvent.click(control);

    expect(onFavoriteClick).toHaveBeenCalledTimes(1);
    expect(control).toHaveAttribute('aria-pressed', 'false');
  });
});
