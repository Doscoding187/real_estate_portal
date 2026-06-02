import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SimplePropertyListingCard } from '../SimplePropertyListingCard';

describe('SimplePropertyListingCard', () => {
  it('renders auction listings with auction labels and starting-bid pricing', () => {
    render(
      <SimplePropertyListingCard
        id="auction-12"
        title="Auction Apartment"
        city="Pretoria"
        suburb="Hatfield"
        price={850000}
        listingType="auction"
      />,
    );

    expect(screen.getByText('Auction')).toBeDefined();
    expect(screen.getByText('Auction listing')).toBeDefined();
    expect(screen.getByText(content => content.includes('Starting bid'))).toBeDefined();
  });
});
