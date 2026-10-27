import { fireEvent, render, screen, within } from '@testing-library/react';
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
  canonicalPlaceId: 'pl-place-01-e6f8febdb59e5f93586f58c0',
  parentCanonicalPlaceId: 'pl-place-01-21f154cd5d0954c29ec7525f',
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
    expect(
      within(screen.getByTestId('listing-navbar-mobile-location-search')).getByRole('button', {
        name: 'Remove Parkhurst',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update property search' })).toBeEnabled();
  });

  it('does not add the mobile search row to unrelated ListingNavbar consumers by default', () => {
    render(<ListingNavbar />);

    expect(screen.queryByTestId('listing-navbar-mobile-location-search')).not.toBeInTheDocument();
  });

  it('exposes the Buy/Rent chooser as a keyboard-operable menu', () => {
    render(<ListingNavbar />);

    const journeyTrigger = screen.getByRole('button', { name: 'Buy', exact: true });
    expect(journeyTrigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(journeyTrigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(journeyTrigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rent' }));

    expect(screen.getByRole('button', { name: 'Rent', exact: true })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
