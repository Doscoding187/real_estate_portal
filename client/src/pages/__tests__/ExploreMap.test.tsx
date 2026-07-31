import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ExploreMap from '../ExploreMap';

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

vi.mock('@/components/explore-discovery/MapHybridView', () => ({
  MapHybridView: () => <div data-testid="explore-map-hybrid" />,
}));

vi.mock('@/components/explore-discovery/LifestyleCategorySelector', () => ({
  LifestyleCategorySelector: () => <div data-testid="explore-map-categories" />,
}));

vi.mock('@/components/explore-discovery/ResponsiveFilterPanel', () => ({
  ResponsiveFilterPanel: () => <div data-testid="explore-map-filters" />,
}));

vi.mock('@/hooks/useExploreCommonState', () => ({
  useExploreCommonState: () => ({
    selectedCategoryId: null,
    setSelectedCategoryId: vi.fn(),
    showFilters: false,
    setShowFilters: vi.fn(),
    toggleFilters: vi.fn(),
    filters: {},
    filterActions: { getFilterCount: () => 0 },
  }),
}));

describe('ExploreMap', () => {
  it('keeps deterministic parent and internal Explore navigation in the standard top bar', () => {
    render(<ExploreMap />);

    expect(screen.getByRole('link', { name: 'Back to Property Listify' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.getByRole('link', { name: 'Back to Explore' })).toHaveAttribute(
      'href',
      '/explore',
    );
    expect(screen.getByTestId('explore-map-hybrid')).toBeInTheDocument();
  });
});
