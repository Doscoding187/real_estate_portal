import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LocationHeroSection } from '../LocationHeroSection';

vi.mock('wouter', () => ({
  useLocation: () => ['/gauteng/johannesburg', vi.fn()],
}));

vi.mock('@/components/LocationAutosuggest', () => ({
  LocationAutosuggest: () => <input aria-label="Location search" />,
}));

vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

describe('LocationHeroSection Rent controls', () => {
  it('does not expose unsupported lease-term or furnished controls', () => {
    render(
      <LocationHeroSection
        locationName="Johannesburg"
        locationSlug="gauteng/johannesburg"
        locationType="city"
        locationId={12}
        backgroundImage="/johannesburg.jpg"
        listingCount={0}
        activeTab="rental"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Rental' }));

    expect(screen.getByText('Max Budget')).toBeInTheDocument();
    expect(screen.queryByText('Lease Term')).not.toBeInTheDocument();
    expect(screen.queryByText('Furnished Only')).not.toBeInTheDocument();
  });
});
