import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('wouter', () => ({ useLocation: () => ['/', vi.fn()] }));
vi.mock('embla-carousel-react', () => ({ default: () => [vi.fn(), undefined] }));
vi.mock('@/contexts/HomeSearchContext', () => ({ useHomeSearch: () => null }));
vi.mock('@/components/HomeAreaPicker', () => ({ HomeAreaPicker: () => null }));
vi.mock('@/components/location/CanonicalPlaceSelector', () => ({
  CanonicalPlaceSelector: () => null,
}));

import { DiscoverProperties } from './DiscoverProperties';

describe('DiscoverProperties', () => {
  it('shows icon tiles for sale types with no external image requests', () => {
    const { container } = render(<DiscoverProperties />);

    for (const label of ['Houses', 'Apartments', 'Townhouses', 'Villas', 'Cluster Homes', 'Farms']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect(container.querySelectorAll('a[href] svg').length).toBeGreaterThanOrEqual(6);
    expect(container.innerHTML).not.toContain('unsplash');
  });
});
