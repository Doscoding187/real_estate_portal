import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useQuery } = vi.hoisted(() => ({ useQuery: vi.fn() }));

vi.mock('@/lib/trpc', () => ({
  trpc: { homeAreas: { getPopularAreasByProvince: { useQuery } } },
}));

import { ExploreCities, areaCaption, resetAreasApiDetection } from './ExploreCities';
import { CityGlyph, hasCityGlyph } from '@/components/home/CityGlyphs';
import { CITY_GUIDES, POPULAR_CITY_SLUGS } from '@/lib/cityGuides';
import { HOME_PROVINCE_STORAGE_KEY } from '@/lib/useHomeProvince';

const GAUTENG = 'pl-place-01-131e3e75ad70424e0f9c869a';
const WESTERN_CAPE = 'pl-place-01-203f5f71cb3565521db4718f';

function area(name: string, href: string, listingCount: number) {
  return {
    placeId: `pl-place-01-${name}`,
    name,
    kind: 'city' as const,
    href,
    listingCount,
    saleCount: listingCount,
    rentCount: 0,
  };
}

function mockAreas(
  areas: ReturnType<typeof area>[],
  province = { placeId: GAUTENG, name: 'Gauteng', href: '/gauteng' as string | null },
) {
  useQuery.mockReturnValue({
    data: { province, areas, totalListings: 0, computedAt: '2026-11-12T08:00:00.000Z' },
    isLoading: false,
    isError: false,
    error: null,
  });
}

describe('area discovery entry', () => {
  beforeEach(() => {
    useQuery.mockReset();
    resetAreasApiDetection();
    window.sessionStorage.clear();
  });

  it('keeps the national places page button in the header', () => {
    mockAreas([area('Johannesburg', '/gauteng/johannesburg', 5)]);
    render(<ExploreCities />);
    expect(screen.getByRole('link', { name: /browse locations/i })).toHaveAttribute(
      'href',
      '/south-africa',
    );
  });

  it('uses the shared homepage rail without nesting another container', () => {
    mockAreas([area('Johannesburg', '/gauteng/johannesburg', 5)]);
    render(<ExploreCities withinContentRail />);
    expect(
      screen
        .getByRole('heading', { name: 'Explore South Africa by area' })
        .closest('.home-section-content'),
    ).toBeInTheDocument();
  });

  it('asks the server for 12 areas of the selected province', () => {
    mockAreas([area('Johannesburg', '/gauteng/johannesburg', 5)]);
    render(<ExploreCities />);
    expect(useQuery.mock.calls[0][0]).toEqual({ provincePlaceId: GAUTENG, limit: 12 });
    expect(
      screen.getByText('Popular areas in Gauteng, with the number of properties listed in each.'),
    ).toBeInTheDocument();
  });

  it('shows counts, singular for one, and the province name instead of zero, with the area links', () => {
    mockAreas([
      area('Johannesburg', '/gauteng/johannesburg', 86),
      area('Soweto', '/gauteng/soweto', 1),
      area('Benoni', '/gauteng/benoni', 0),
    ]);
    render(<ExploreCities />);
    const links = within(screen.getByTestId('area-tile-grid')).getAllByRole('link');

    expect(links.map(link => [link.getAttribute('aria-label'), link.getAttribute('href')])).toEqual(
      [
        ['Johannesburg', '/gauteng/johannesburg'],
        ['Soweto', '/gauteng/soweto'],
        ['Benoni', '/gauteng/benoni'],
      ],
    );
    expect(within(links[0]).getByText('86 properties')).toBeInTheDocument();
    expect(within(links[1]).getByText('1 property')).toBeInTheDocument();
    expect(within(links[2]).getByText('Gauteng')).toBeInTheDocument();
    expect(screen.queryByText(/^0 propert/)).not.toBeInTheDocument();
    expect(areaCaption(0, 'Gauteng')).toBe('Gauteng');
    expect(areaCaption(1, 'Gauteng')).toBe('1 property');
  });

  it('uses the city glyph when one exists and the fallback glyph otherwise', () => {
    mockAreas([
      area('Johannesburg', '/gauteng/johannesburg', 5),
      area('Paarl', '/western-cape/paarl', 2),
    ]);
    const { container } = render(<ExploreCities />);
    const glyphs = [...container.querySelectorAll('svg[data-glyph]')].map(svg =>
      svg.getAttribute('data-glyph'),
    );
    expect(glyphs).toEqual(['johannesburg', 'fallback']);
  });

  it('links "View all areas" to the province page, or /south-africa when it has none', () => {
    mockAreas([area('Johannesburg', '/gauteng/johannesburg', 5)]);
    const { unmount } = render(<ExploreCities />);
    expect(screen.getByRole('link', { name: /view all areas in gauteng/i })).toHaveAttribute(
      'href',
      '/gauteng',
    );
    unmount();

    mockAreas([area('Johannesburg', '/gauteng/johannesburg', 5)], {
      placeId: GAUTENG,
      name: 'Gauteng',
      href: null,
    });
    render(<ExploreCities />);
    expect(screen.getByRole('link', { name: /view all areas in gauteng/i })).toHaveAttribute(
      'href',
      '/south-africa',
    );
  });

  it('shows skeleton tiles while loading', () => {
    useQuery.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null });
    render(<ExploreCities />);
    expect(within(screen.getByTestId('area-tile-skeletons')).getAllByRole('listitem')).toHaveLength(
      12,
    );
    expect(screen.queryByTestId('area-tile-grid')).not.toBeInTheDocument();
  });

  it('uses the grid columns 2, 3 and 4', () => {
    mockAreas([area('Johannesburg', '/gauteng/johannesburg', 5)]);
    render(<ExploreCities />);
    expect(screen.getByTestId('area-tile-grid').className).toMatch(
      /grid-cols-2.*md:grid-cols-3.*lg:grid-cols-4/,
    );
  });

  it('falls back to the static list, with no counts and no error panel, when the API lacks the procedure', () => {
    useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { data: { code: 'NOT_FOUND' } },
    });
    render(<ExploreCities />);
    const links = within(screen.getByTestId('area-tile-grid')).getAllByRole('link');
    expect(links.map(link => link.getAttribute('aria-label'))).toEqual([
      'Johannesburg',
      'Pretoria',
      'Sandton',
      'Centurion',
      'Midrand',
      'Randburg',
      'Soweto',
      'Roodepoort',
      'Benoni',
      'Boksburg',
      'Kempton Park',
      'Alberton',
    ]);
    expect(within(links[0]).getByText('Gauteng')).toBeInTheDocument();
    expect(screen.queryByText(/propert(y|ies)$/)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view all areas in gauteng/i })).toHaveAttribute(
      'href',
      '/south-africa',
    );
    // Remembered: the next render no longer asks.
    expect(useQuery.mock.calls.at(-1)?.[1].enabled).toBe(false);
  });

  it('falls back to the static list on any other failure and on an empty list', () => {
    useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { data: { code: 'INTERNAL_SERVER_ERROR' } },
    });
    const { unmount } = render(<ExploreCities />);
    expect(screen.getByRole('link', { name: 'Johannesburg' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    unmount();

    mockAreas([]);
    render(<ExploreCities />);
    expect(screen.getByRole('link', { name: 'Johannesburg' })).toBeInTheDocument();
  });

  it('shows a plain note when the fallback has no city for the province', () => {
    mockAreas([], { placeId: 'x', name: 'North West', href: null });
    render(<ExploreCities selectedProvince="North West" />);
    expect(screen.queryByTestId('area-tile-grid')).not.toBeInTheDocument();
    expect(
      screen.getByText('Areas in North West will appear here as more homes are listed.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /explore north west/i })).toHaveAttribute(
      'href',
      '/north-west',
    );
  });

  it('shows nine province pills that change the province, tell the page and are remembered', () => {
    mockAreas([area('Johannesburg', '/gauteng/johannesburg', 5)]);
    const onProvinceChange = vi.fn();
    render(<ExploreCities selectedProvince="Gauteng" onProvinceChange={onProvinceChange} />);
    const pills = within(screen.getByRole('group', { name: 'Province for areas' })).getAllByRole(
      'button',
    );
    expect(pills).toHaveLength(9);
    expect(screen.getByRole('button', { name: 'Gauteng' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Western Cape' }));
    expect(onProvinceChange).toHaveBeenCalledWith('Western Cape');
    expect(window.sessionStorage.getItem(HOME_PROVINCE_STORAGE_KEY)).toBe('Western Cape');
  });

  it('keeps its own province when used alone, and asks for the new province', () => {
    mockAreas([area('Cape Town', '/western-cape/cape-town', 5)]);
    render(<ExploreCities />);
    fireEvent.click(screen.getByRole('button', { name: 'Western Cape' }));
    expect(screen.getByRole('button', { name: 'Western Cape' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(useQuery.mock.calls.at(-1)?.[0]).toEqual({ provincePlaceId: WESTERN_CAPE, limit: 12 });
  });

  it('has no photos in the section', () => {
    mockAreas([area('Johannesburg', '/gauteng/johannesburg', 5)]);
    const { container } = render(<ExploreCities />);
    expect(container.querySelector('img')).toBeNull();
  });

  it('draws every popular city and falls back to a generic glyph for an unmapped city', () => {
    for (const slug of POPULAR_CITY_SLUGS) expect(hasCityGlyph(slug)).toBe(true);
    const { container } = render(<CityGlyph slug="midrand" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('data-glyph', 'fallback');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('only uses cities with a published page in the static list', () => {
    const slugs = new Set(CITY_GUIDES.map(city => city.slug));
    for (const slug of POPULAR_CITY_SLUGS) expect(slugs.has(slug)).toBe(true);
  });
});
