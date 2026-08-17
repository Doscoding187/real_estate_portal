import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  ListingNavbar,
  LISTING_NAVBAR_LOCATION_INPUT_IDS,
  type ListingNavbarLocation,
} from '../ListingNavbar';

const testState = vi.hoisted(() => ({
  setLocation: vi.fn(),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/property-for-sale', testState.setLocation],
  useSearch: () => '',
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

vi.mock('@/components/LocationAutosuggest', () => ({
  LocationAutosuggest: ({ inputId, placeholder }: { inputId: string; placeholder: string }) => (
    <input id={inputId} aria-label="Search by city, suburb, or area" placeholder={placeholder} />
  ),
}));

const parkhurst: ListingNavbarLocation = {
  id: 'suburb:501',
  canonicalLocationId: 'suburb:501',
  parentCanonicalLocationId: 'city:50',
  name: 'Parkhurst',
  slug: 'parkhurst',
  type: 'suburb',
  provinceSlug: 'gauteng',
  citySlug: 'johannesburg',
  fullAddress: 'Parkhurst, Johannesburg',
};

describe('ListingNavbar mobile location refinement', () => {
  it('renders a visible mobile canonical location control with removable current scope', () => {
    render(<ListingNavbar defaultLocations={[parkhurst]} showMobileLocationSearch />);

    expect(screen.getByTestId('listing-navbar-mobile-location-search')).toBeInTheDocument();
    expect(document.getElementById(LISTING_NAVBAR_LOCATION_INPUT_IDS.mobile)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Parkhurst' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update property search' })).toBeEnabled();
  });

  it('does not add the mobile search row to unrelated ListingNavbar consumers by default', () => {
    render(<ListingNavbar />);

    expect(screen.queryByTestId('listing-navbar-mobile-location-search')).not.toBeInTheDocument();
  });
});
