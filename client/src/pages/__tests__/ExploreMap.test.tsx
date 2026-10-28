import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ExploreMap from '../ExploreMap';

const { searchInventory } = vi.hoisted(() => ({
  searchInventory: vi.fn(() => ({
    data: { cards: [], total: 0 },
    isLoading: false,
    error: null,
  })),
}));

vi.mock('wouter', () => ({
  Link: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/location/CanonicalPlaceSelector', () => ({
  CanonicalPlaceSelector: () => <div data-testid="canonical-place-selector" />,
}));

vi.mock('@/components/maps/GooglePropertyMap', () => ({
  GooglePropertyMap: () => <div data-testid="canonical-property-map" />,
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    placeAuthority: {
      discoverSearchAreas: { useQuery: () => ({ data: { results: [] }, isError: false }) },
    },
    properties: { searchPublicInventory: { useQuery: searchInventory } },
  },
}));

describe('ExploreMap', () => {
  it('keeps map navigation and loads only canonical public inventory', () => {
    render(<ExploreMap />);

    expect(screen.getByRole('link', { name: 'Back to Property Listify' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.getByRole('link', { name: 'Back to Explore' })).toHaveAttribute(
      'href',
      '/explore',
    );
    expect(screen.getByTestId('canonical-place-selector')).toBeInTheDocument();
    expect(screen.getByTestId('canonical-property-map')).toBeInTheDocument();
    expect(searchInventory).toHaveBeenCalledWith(
      expect.objectContaining({ listingType: 'sale', listingSource: 'manual', pageSize: 50 }),
      expect.objectContaining({ retry: false }),
    );
  });
});
