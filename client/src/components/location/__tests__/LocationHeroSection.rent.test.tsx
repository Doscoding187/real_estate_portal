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
  it('exposes truthful Rent controls through the canonical journey gate', () => {
    render(
      <LocationHeroSection
        locationName="Johannesburg"
        locationSlug="gauteng/johannesburg"
        locationType="city"
        locationId={12}
        backgroundImage="/johannesburg.jpg"
        listingCount={0}
        neutralMode
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Rental' }));
    expect(screen.getByRole('button', { name: 'Rental' })).toBeInTheDocument();
    expect(screen.getByText('Max monthly rent')).toBeInTheDocument();
    expect(screen.queryByText('Lease Term')).not.toBeInTheDocument();
    expect(screen.queryByText('Furnished Only')).not.toBeInTheDocument();
  });

  it('does not expose the deferred Land journey or Land filters', () => {
    render(
      <LocationHeroSection
        locationName="Johannesburg"
        locationSlug="gauteng/johannesburg"
        locationType="city"
        locationId={12}
        backgroundImage="/johannesburg.jpg"
        listingCount={0}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Plot & Land' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Buy' }));
    expect(screen.queryByText('Land & Plots')).not.toBeInTheDocument();
  });
});
