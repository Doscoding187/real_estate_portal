import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CityDiscoveryMenu } from '@/components/CityDiscoveryMenu';

const { popularCitiesQuery, cityDataQuery } = vi.hoisted(() => ({
  popularCitiesQuery: vi.fn(),
  cityDataQuery: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    locationPages: {
      getPopularCities: { useQuery: popularCitiesQuery },
      getCityData: { useQuery: cityDataQuery },
    },
  },
}));

vi.mock('wouter', () => ({
  Link: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('@/components/LocationAutosuggest', () => ({
  LocationAutosuggest: ({ placeholder }: { placeholder: string }) => (
    <input aria-label="Location search" placeholder={placeholder} />
  ),
}));

const cities = [
  { id: 1, name: 'Johannesburg', slug: 'johannesburg', provinceSlug: 'gauteng', listingCount: 1284 },
  { id: 2, name: 'Cape Town', slug: 'cape-town', provinceSlug: 'western-cape', listingCount: 980 },
];

const cityData = {
  johannesburg: {
    city: { name: 'Johannesburg', slug: 'johannesburg', provinceSlug: 'gauteng' },
    stats: { totalListings: 1284 },
    suburbs: [
      { name: 'Sandton', slug: 'sandton', listingCount: 420 },
      { name: 'Rosebank', slug: 'rosebank', listingCount: 130 },
    ],
  },
  'cape-town': {
    city: { name: 'Cape Town', slug: 'cape-town', provinceSlug: 'western-cape' },
    stats: { totalListings: 980 },
    suburbs: [{ name: 'Sea Point', slug: 'sea-point', listingCount: 88 }],
  },
};

function renderMenu() {
  return render(<CityDiscoveryMenu onNavigate={vi.fn()} />);
}

describe('CityDiscoveryMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    popularCitiesQuery.mockReturnValue({ data: cities, isLoading: false, isError: false });
    cityDataQuery.mockImplementation((input: { citySlug: keyof typeof cityData }) => ({
      data: cityData[input.citySlug],
      isLoading: false,
      isError: false,
    }));
  });

  it('renders backend-ranked city names and keeps the real count in the summary', () => {
    renderMenu();

    const johannesburg = screen.getByRole('link', { name: 'Johannesburg' });
    expect(johannesburg.textContent).toBe('Johannesburg');
    expect(johannesburg).toHaveAttribute(
      'href',
      '/property-for-sale/gauteng/johannesburg',
    );
    expect(johannesburg).toHaveAttribute('data-active', 'true');
    expect(screen.getByText('Areas in Johannesburg')).toBeInTheDocument();
    expect(document.querySelector('.public-navbar__city-count-summary')?.textContent).toMatch(/1\s+284 active listings/);
  });

  it('updates the active city and only renders that city’s areas on hover', async () => {
    renderMenu();
    await userEvent.setup().hover(screen.getByRole('link', { name: 'Cape Town' }));

    expect(screen.getByText('Areas in Cape Town')).toBeInTheDocument();
    const seaPoint = screen.getByRole('link', { name: 'Sea Point' });
    expect(seaPoint.textContent).toBe('Sea Point');
    expect(seaPoint).toHaveAttribute(
      'href',
      '/property-for-sale/western-cape/cape-town/sea-point',
    );
    expect(screen.queryByRole('link', { name: 'Sandton' })).not.toBeInTheDocument();
  });

  it('updates the summary from keyboard focus and links suburbs canonically', () => {
    renderMenu();
    const sandton = screen.getByRole('link', { name: 'Sandton' });
    fireEvent.focus(sandton);

    expect(document.querySelector('.public-navbar__city-parent')?.textContent).toBe('Johannesburg');
    expect(document.querySelector('.public-navbar__city-count-summary')?.textContent).toBe('420 active listings');
    expect(screen.getByRole('link', { name: /View all properties in Sandton/ })).toHaveAttribute(
      'href',
      '/property-for-sale/gauteng/johannesburg/sandton',
    );
  });

  it('keeps stable loading placeholders and honest failure fallbacks', () => {
    popularCitiesQuery.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    cityDataQuery.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    const { rerender } = renderMenu();
    expect(screen.getAllByRole('heading', { name: /Popular cities|Areas in/ })).toHaveLength(2);
    expect(document.querySelectorAll('.public-navbar__city-skeleton')).toHaveLength(11);

    popularCitiesQuery.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    cityDataQuery.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    rerender(<CityDiscoveryMenu onNavigate={vi.fn()} />);
    expect(screen.getByText('Showing browseable cities while inventory refreshes.')).toBeInTheDocument();
    expect(screen.getAllByText('Live listing count unavailable').length).toBeGreaterThan(0);
    expect(screen.queryByText('0 active listings')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Johannesburg' }).textContent).toBe('Johannesburg');
  });

  it('reports an honest empty area state while keeping the city browse action usable', () => {
    cityDataQuery.mockReturnValue({
      data: { city: cityData.johannesburg.city, stats: { totalListings: 0 }, suburbs: [] },
      isLoading: false,
      isError: false,
    });
    renderMenu();

    expect(screen.getByText('No active areas available yet.')).toBeInTheDocument();
    expect(screen.getByText('No active listings')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View all properties in Johannesburg/ })).toHaveAttribute(
      'href',
      '/property-for-sale/gauteng/johannesburg',
    );
  });

  it('keeps a successful empty popular-city response honest and search available', () => {
    popularCitiesQuery.mockReturnValue({ data: [], isLoading: false, isError: false });
    cityDataQuery.mockReturnValue({ data: undefined, isLoading: false, isError: false });
    renderMenu();

    expect(screen.getByText('No popular cities are available yet.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Location search' })).toBeInTheDocument();
    expect(screen.getByText('Choose a city to see live inventory')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse all locations' })).toHaveAttribute(
      'href',
      '/property-for-sale',
    );
  });
});
