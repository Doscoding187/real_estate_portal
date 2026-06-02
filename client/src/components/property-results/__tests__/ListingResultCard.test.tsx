import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ListingResultCard } from '../ListingResultCard';

const setLocationMock = vi.fn();

vi.mock('wouter', () => ({
  useLocation: () => ['/search/for-sale/gauteng/catalogue-city', setLocationMock],
}));

vi.mock('@/components/property/PropertyContactModal', () => ({
  PropertyContactModal: () => null,
}));

describe('ListingResultCard development inventory identity', () => {
  it('keeps canonical unit identity on public development search cards and navigates to the unit route', () => {
    setLocationMock.mockClear();

    const { container } = render(
      <ListingResultCard
        data={{
          id: 'dev-42-unit-a',
          href: '/development/demo-development/unit/unit-a',
          title: '2 Bedroom Apartment for Sale',
          location: 'Berea, Johannesburg, Gauteng',
          price: 1_200_000,
          image: 'https://example.com/unit-a.jpg',
          development: {
            id: 42,
            name: 'Demo Development',
            slug: 'demo-development',
          },
          listingSource: 'development',
          contactRole: 'developer',
          developmentId: 42,
          unitTypeId: 'unit-a',
          unitDisplayOrder: 0,
          postedBy: 'Demo Builder',
          highlights: ['Off-plan'],
        }}
      />,
    );

    const card = container.querySelector('[data-listing-source="development"]');
    expect(card).toHaveAttribute('data-unit-type-id', 'unit-a');
    expect(card).toHaveAttribute('data-unit-display-order', '0');

    fireEvent.click(screen.getByText('2 Bedroom Apartment for Sale'));

    expect(setLocationMock).toHaveBeenCalledWith('/development/demo-development/unit/unit-a');
  });
});
