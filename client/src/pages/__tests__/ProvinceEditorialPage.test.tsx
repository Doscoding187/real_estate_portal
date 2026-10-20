import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const { places, pulse, cities } = vi.hoisted(() => ({
  places: vi.fn(),
  pulse: vi.fn(),
  cities: vi.fn(),
}));
vi.mock('@/components/ListingNavbar', () => ({ ListingNavbar: () => null }));
vi.mock('@/components/Footer', () => ({ Footer: () => null }));
vi.mock('@/components/seo/MetaControl', () => ({ MetaControl: () => null }));
vi.mock('@/components/provincial/ProvincialComposer', () => ({
  ProvincialComposer: () => <div data-testid="composer" />,
}));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    locationPages: {
      getHeroCampaign: { useQuery: () => ({ data: null }) },
      getProvinceGuidePlaces: { useQuery: places },
      getProvinceGuideInventory: { useQuery: pulse },
      getCityGuides: { useQuery: cities },
    },
  },
}));
import ProvinceEditorialPage from '../ProvinceEditorialPage';
import { getProvinceGuideContent } from '@shared/provinceGuideContent';
const guide = getProvinceGuideContent('gauteng')!;
const retry = vi.fn();
beforeEach(() => {
  places.mockReturnValue({
    data: {
      province: { id: 3, name: 'Gauteng', slug: 'gauteng', canonicalLocationId: 'province:3' },
      places: [
        {
          name: 'Pretoria',
          slug: 'pretoria',
          canonicalLocationId: 'city:18',
          level: 'city',
        },
      ],
    },
    refetch: retry,
  });
  pulse.mockReturnValue({
    data: {
      sale: { state: 'ready', total: 3 },
      rent: { state: 'ready', total: 0 },
      observedAt: '2026-10-15T10:00:00Z',
    },
    refetch: retry,
  });
  cities.mockReturnValue({
    data: [{ name: 'Pretoria', slug: 'pretoria', canonicalLocationId: 'city:18' }],
    refetch: retry,
  });
});
describe('Guide-first province experience', () => {
  it('keeps all five sourced chapters and practical guidance readable during data failure', () => {
    places.mockReturnValue({ isError: true, refetch: retry });
    pulse.mockReturnValue({ isError: true, refetch: retry });
    cities.mockReturnValue({ isError: true, refetch: retry });
    render(<ProvinceEditorialPage guide={guide} />);
    expect(
      screen
        .getAllByRole('heading', { level: 3, hidden: true })
        .filter(h => guide.regions.some(r => r.name === h.textContent)),
    ).toHaveLength(5);
    expect(
      screen.getByRole('heading', { name: 'Everyday life: what to weigh up' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Listing counts are temporarily unavailable/)).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry counts' }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.queryByTestId('composer')).not.toBeInTheDocument();
  });
  it('links only resolved cities and describes unresolved places without invented links', () => {
    render(<ProvinceEditorialPage guide={guide} />);
    expect(screen.getAllByRole('link', { name: 'Explore Pretoria guide' })[0]).toHaveAttribute(
      'href',
      '/gauteng/pretoria',
    );
    expect(screen.queryByRole('link', { name: 'Krugersdorp' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'West Rand', exact: true }));
    expect(screen.getByRole('article', { name: 'West Rand' })).toHaveTextContent('Krugersdorp');
    expect(screen.getByRole('article', { name: 'West Rand' })).toHaveTextContent('Merafong');
    const directory = screen.getByRole('list', { name: 'City guides' });
    expect(
      directory.compareDocumentPosition(screen.getByLabelText('Search cities in Gauteng')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByTestId('composer')).toBeInTheDocument();
  });
  it('keeps a known empty count distinct from an unavailable count', () => {
    pulse.mockReturnValue({
      data: {
        sale: { state: 'unavailable', total: null },
        rent: { state: 'ready', total: 0 },
        observedAt: '2026-10-15T10:00:00Z',
      },
      refetch: retry,
    });
    render(<ProvinceEditorialPage guide={guide} />);
    expect(screen.getByText('Count unavailable')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Check availability' }).getAttribute('href')).toContain(
      'locationId=province',
    );
  });
  it('separates loading from empty directory data', () => {
    cities.mockReturnValue({ isLoading: true });
    const view = render(<ProvinceEditorialPage guide={guide} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading city guides');
    cities.mockReturnValue({ data: [] });
    view.rerender(<ProvinceEditorialPage guide={guide} />);
    expect(screen.getByText(/City guides for Gauteng are not available yet/)).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

it('places the existing journey composer before the regional overview and renders a real-count chart', () => {
  render(<ProvinceEditorialPage guide={guide} />);
  const composer = screen.getByTestId('composer');
  const regions = screen.getByRole('heading', { name: 'Get to know Gauteng’s regions' });
  expect(composer.compareDocumentPosition(regions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const bars = document.querySelectorAll('.guide-bar-track > span');
  expect(bars).toHaveLength(2);
  expect(bars[0]).toHaveStyle({ width: '100%' });
  expect(bars[1]).toHaveStyle({ width: '0%' });
  expect(screen.getByRole('article', { name: 'Johannesburg' })).toHaveTextContent(
    guide.regions[0].paragraphs[1],
  );
});
