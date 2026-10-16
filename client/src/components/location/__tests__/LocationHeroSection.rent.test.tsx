import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LocationHeroSection } from '../LocationHeroSection';

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock('wouter', () => ({
  useLocation: () => ['/gauteng/johannesburg', navigate],
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

  it('opens specialist Land search without exposing residential Land filters', () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'Plot & Land' }));
    expect(navigate).toHaveBeenCalledWith('/plots-and-land?locationId=city%3A12');
    fireEvent.click(screen.getByRole('button', { name: 'Buy' }));
    expect(screen.queryByText('Land & Plots')).not.toBeInTheDocument();
  });
});
