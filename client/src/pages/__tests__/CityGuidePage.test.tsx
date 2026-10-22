import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const { cityQuery } = vi.hoisted(() => ({ cityQuery: vi.fn() }));
vi.mock('@/components/ListingNavbar', () => ({ ListingNavbar: () => null }));
vi.mock('@/components/Footer', () => ({ Footer: () => null }));
vi.mock('@/components/seo/MetaControl', () => ({ MetaControl: () => null }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    locationPages: {
      getCityData: { useQuery: cityQuery },
      getHeroCampaign: { useQuery: () => ({ data: null }) },
    },
    location: {
      searchDiscoverySuggestions: { useQuery: () => ({ data: [] }) },
      placeSuggestions: { useQuery: () => ({ data: [] }) },
    },
  },
}));
import CityGuidePage from '../CityGuidePage';
import { getCityGuideContent } from '@shared/cityGuideContent';
const guide = getCityGuideContent('gauteng', 'johannesburg')!;
const retry = vi.fn();
const data = {
  city: { id: 1, name: 'Johannesburg', slug: 'johannesburg', provinceSlug: 'gauteng' },
  stats: { totalListings: 1, avgPrice: 1850000 },
  propertyTypes: [{ type: 'apartment', count: 1, avgPrice: 1850000 }],
  suburbs: Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    name: `Place ${i + 1}`,
    slug: `place-${i + 1}`,
  })),
};
beforeEach(() => cityQuery.mockReturnValue({ data, refetch: retry }));
describe('City guide independent content and live data', () => {
  it('keeps all seven regional chapters and twelve suburb previews', () => {
    const { container } = render(<CityGuidePage guide={guide} />);
    expect(container.querySelectorAll('.city-region-detail')).toHaveLength(7);
    expect(container.querySelectorAll('#city-suburbs [role=listitem]')).toHaveLength(12);
    for (const region of guide.regions) expect(container.textContent).toContain(region.text);
    expect(screen.queryByText(/1,850,000/)).not.toBeInTheDocument();
  });
  it('keeps guide content readable while live data is unavailable, with a retry', () => {
    cityQuery.mockReturnValue({ isError: true, refetch: retry });
    render(<CityGuidePage guide={guide} />);
    expect(
      screen.getByRole('heading', { name: 'One metro. Different local lives.' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Inventory insights are unavailable/)).toBeInTheDocument();
    expect(screen.getByText(/Suburb previews could not be loaded/)).toBeInTheDocument();
    expect(screen.getByLabelText('Choose an area to explore')).toBeDisabled();
    fireEvent.click(screen.getAllByRole('button', { name: 'Try again' })[0]);
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
  it('distinguishes loading from genuine zero inventory', () => {
    cityQuery.mockReturnValue({ isLoading: true });
    const view = render(<CityGuidePage guide={guide} />);
    expect(screen.getByText('Loading current inventory…')).toBeInTheDocument();
    cityQuery.mockReturnValue({
      data: { ...data, stats: { totalListings: 0 }, propertyTypes: [] },
    });
    view.rerender(<CityGuidePage guide={guide} />);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText(/No eligible listings/)).toBeInTheDocument();
    expect(screen.queryByText('Loading current inventory…')).not.toBeInTheDocument();
  });
  it('does not draw an inconsistent property-type breakdown', () => {
    cityQuery.mockReturnValue({ data: { ...data, propertyTypes: [{ type: 'house', count: 2 }] } });
    render(<CityGuidePage guide={guide} />);
    expect(screen.getByText('The property-type breakdown is unavailable.')).toBeInTheDocument();
    expect(
      screen.queryByRole('list', { name: 'Available listings by property type' }),
    ).not.toBeInTheDocument();
  });
});
