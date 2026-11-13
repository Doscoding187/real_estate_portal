import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useQuery, refetch } = vi.hoisted(() => ({ useQuery: vi.fn(), refetch: vi.fn() }));

vi.mock('@/lib/trpc', () => ({
  trpc: { homeMarketInsights: { getProvinceInsights: { useQuery } } },
}));

import { HomeMarketInsightsSection, leadingBand } from './HomeMarketInsightsSection';

const GAUTENG_CITY = 'pl-place-01-131e3e75ad70424e0f9c869a';

function bands(counts: number[]) {
  const defs = [
    ['under_1m', 'Under R1m', 0, 1_000_000],
    ['1m_2m', 'R1m – R2m', 1_000_000, 2_000_000],
    ['2m_5m', 'R2m – R5m', 2_000_000, 5_000_000],
    ['5m_10m', 'R5m – R10m', 5_000_000, 10_000_000],
    ['over_10m', 'Over R10m', 10_000_000, null],
  ] as const;
  return defs.map(([key, label, minPrice, maxPrice], index) => ({
    key,
    label,
    minPrice,
    maxPrice,
    count: counts[index] ?? 0,
  }));
}

const johannesburg = {
  placeId: GAUTENG_CITY,
  name: 'Johannesburg',
  provinceName: 'Gauteng',
  href: '/gauteng/johannesburg',
  activeSaleListings: 13,
  medianAskingPrice: 3_000_000,
  typicalPricePerM2: 19_556,
  askingPriceBands: bands([0, 3, 8, 2, 0]),
  leadingLocality: { name: 'Sandton', listingCount: 7, href: '/gauteng/johannesburg/sandton' },
  sampleSize: 13,
  computedAt: '2026-11-12T08:00:00.000Z',
};

const capeTown = {
  ...johannesburg,
  placeId: 'pl-place-01-aaaaaaaaaaaaaaaaaaaaaaaa',
  name: 'Cape Town',
  provinceName: 'Western Cape',
  href: null,
  activeSaleListings: 6,
  medianAskingPrice: 850_000,
  typicalPricePerM2: null,
  askingPriceBands: bands([2, 2, 1, 1, 0]),
  leadingLocality: { name: 'Sea Point', listingCount: 4, href: null },
};

function mockData(cities: unknown[], province: unknown = null) {
  useQuery.mockReturnValue({
    data: { province, cities },
    isLoading: false,
    isError: false,
    error: null,
    refetch,
  });
}

const gautengProvince = {
  ...johannesburg,
  placeId: GAUTENG_CITY,
  name: 'Gauteng',
  href: '/gauteng',
  activeSaleListings: 27,
  medianAskingPrice: 2_450_000,
  typicalPricePerM2: null,
  askingPriceBands: bands([1, 2, 20, 3, 1]),
  leadingLocality: { name: 'Johannesburg', listingCount: 13, href: '/gauteng/johannesburg' },
};

describe('HomeMarketInsightsSection', () => {
  beforeEach(() => {
    useQuery.mockReset();
    refetch.mockReset();
    window.sessionStorage.clear();
  });

  it('asks for the province, caches for 10 minutes and never retries a missing procedure', () => {
    mockData([johannesburg]);
    render(<HomeMarketInsightsSection />);
    const [input, options] = useQuery.mock.calls[0];
    expect(input).toEqual({ provincePlaceId: GAUTENG_CITY });
    expect(options.staleTime).toBe(10 * 60 * 1000);
    expect(options.retry(0, { data: { code: 'NOT_FOUND' } })).toBe(false);
    expect(options.retry(0, { data: { code: 'INTERNAL_SERVER_ERROR' } })).toBe(true);
  });

  it('shows three cards for the first city and switches city with the pills', () => {
    mockData([johannesburg, capeTown]);
    render(<HomeMarketInsightsSection />);

    expect(screen.getByRole('button', { name: 'Johannesburg' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Local supply' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Asking price' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Market activity' })).toBeInTheDocument();
    expect(screen.getByText('Most homes for sale in Johannesburg are in Sandton.')).toBeVisible();
    expect(screen.getByText('R3.0m')).toBeInTheDocument();
    expect(screen.getByText(/19.556\/m²/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cape Town' }));

    expect(screen.getByRole('button', { name: 'Cape Town' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Johannesburg' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByText('Most homes for sale in Cape Town are in Sea Point.')).toBeVisible();
    expect(screen.getByText(/^R850/)).toBeInTheDocument();
  });

  it('lists the five bands with counts and states the leading band', () => {
    mockData([johannesburg]);
    render(<HomeMarketInsightsSection />);
    const list = screen.getByRole('list', { name: /by asking price/i });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(5);
    expect(items[0]).toHaveAttribute('aria-label', 'Under R1m: 0 homes');
    expect(items[1]).toHaveAttribute('aria-label', 'R1m – R2m: 3 homes');
    expect(items[2]).toHaveAttribute('aria-label', 'R2m – R5m: 8 homes');
    expect(screen.getByText('Most homes are asking R2m – R5m.')).toBeInTheDocument();
  });

  it('a tie goes to the lower band, and no leader is named when every band is empty', () => {
    expect(leadingBand(bands([0, 4, 4, 1, 0]))?.key).toBe('1m_2m');
    expect(leadingBand(bands([0, 0, 0, 0, 0]))).toBeNull();
    mockData([{ ...johannesburg, askingPriceBands: bands([0, 4, 4, 1, 0]) }]);
    render(<HomeMarketInsightsSection />);
    expect(screen.getByText('Most homes are asking R1m – R2m.')).toBeInTheDocument();
  });

  it('omits the per-m² row when the server sent null, and shows it when sent', () => {
    mockData([johannesburg, capeTown]);
    render(<HomeMarketInsightsSection />);
    expect(screen.getByText('Typical asking price / m²')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cape Town' }));
    expect(screen.queryByText('Typical asking price / m²')).not.toBeInTheDocument();
  });

  it('links to the city and its homes for sale, and omits links whose href is null', () => {
    mockData([johannesburg, capeTown]);
    render(<HomeMarketInsightsSection />);
    expect(screen.getByRole('link', { name: /Explore Johannesburg/ })).toHaveAttribute(
      'href',
      '/gauteng/johannesburg',
    );
    expect(screen.getByRole('link', { name: /Sandton/ })).toHaveAttribute(
      'href',
      '/gauteng/johannesburg/sandton',
    );
    const homes = screen.getByRole('link', { name: /View Johannesburg homes for sale/ });
    expect(homes.getAttribute('href')).toContain('for-sale');
    expect(homes.getAttribute('href')).toContain(GAUTENG_CITY);

    fireEvent.click(screen.getByRole('button', { name: 'Cape Town' }));
    expect(screen.queryByRole('link', { name: /Explore Cape Town/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Sea Point/ })).not.toBeInTheDocument();
    expect(screen.getByText('Sea Point')).toBeInTheDocument();
  });

  it('omits the supply takeaway and tile when there is no leading locality', () => {
    mockData([{ ...johannesburg, leadingLocality: null }]);
    render(<HomeMarketInsightsSection />);
    expect(screen.queryByText(/Most homes for sale in/)).not.toBeInTheDocument();
    expect(screen.queryByText('Leading locality')).not.toBeInTheDocument();
  });

  it('shows the exact footnote and an updated time', () => {
    mockData([johannesburg]);
    const { container } = render(<HomeMarketInsightsSection />);
    expect(container.textContent).toContain(
      'Based on at least three qualifying published homes for sale. These are current asking inventory signals, not completed sales or a valuation.',
    );
    expect(container.textContent).toMatch(/Updated .+ ago\./);
  });

  it('renders no figure the server did not send', () => {
    mockData([capeTown]);
    const { container } = render(<HomeMarketInsightsSection />);
    const leafTexts = [...container.querySelectorAll('*')]
      .filter(element => element.children.length === 0)
      .map(element => element.textContent ?? '')
      .filter(text => /\d/.test(text) && !/^Updated|^Based on/.test(text));
    // Cape Town: 6 active, R850 000 median, bands 2/2/1/1/0, 4 listings in Sea Point, band labels.
    const allowed = [
      /^Most homes are asking .+\.$/,
      /^6$/,
      /^R850.000$/,
      /^[0-2]$/,
      /^4 listings$/,
      /^(Under|Over) R\d+m$/,
      /^R\d+m – R\d+m$/,
    ];
    for (const text of leafTexts) {
      expect(
        allowed.some(pattern => pattern.test(text.trim())),
        text,
      ).toBe(true);
    }
    expect(container.textContent).not.toMatch(/19.556/);
  });

  it('starts on "All of {province}" with province figures and the leading city', () => {
    mockData([johannesburg, capeTown], gautengProvince);
    render(<HomeMarketInsightsSection />);
    expect(screen.getByRole('button', { name: 'All of Gauteng' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const chips = within(screen.getByRole('group', { name: 'City' })).getAllByRole('button');
    expect(chips.map(chip => chip.textContent)).toEqual([
      'All of Gauteng',
      'Johannesburg',
      'Cape Town',
    ]);
    expect(screen.getByText('Leading city')).toBeInTheDocument();
    expect(screen.queryByText('Leading locality')).not.toBeInTheDocument();
    expect(screen.getByText('Most homes for sale in Gauteng are in Johannesburg.')).toBeVisible();
    expect(screen.getByText('27')).toBeInTheDocument();
    const homes = screen.getByRole('link', { name: /View Gauteng homes for sale/ });
    expect(homes.getAttribute('href')).toContain('for-sale');
  });

  it('shows one city when its chip is chosen, and goes back with "All of"', () => {
    mockData([johannesburg, capeTown], gautengProvince);
    render(<HomeMarketInsightsSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Cape Town' }));
    expect(screen.getByText('Leading locality')).toBeInTheDocument();
    expect(screen.getByText('Most homes for sale in Cape Town are in Sea Point.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'All of Gauteng' }));
    expect(screen.getByText('Leading city')).toBeInTheDocument();
  });

  it('returns to "All of {province}" when the province changes', () => {
    mockData([johannesburg, capeTown], gautengProvince);
    render(<HomeMarketInsightsSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Cape Town' }));
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Province for price insights' })).getByRole(
        'button',
        { name: 'Western Cape' },
      ),
    );
    expect(useQuery.mock.calls.at(-1)?.[0]).toEqual({
      provincePlaceId: 'pl-place-01-203f5f71cb3565521db4718f',
    });
    expect(screen.getByRole('button', { name: 'All of Western Cape' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('follows the shared province and tells the page when its own pills change it', () => {
    mockData([johannesburg], gautengProvince);
    const onProvinceChange = vi.fn();
    render(
      <HomeMarketInsightsSection selectedProvince="Limpopo" onProvinceChange={onProvinceChange} />,
    );
    expect(useQuery.mock.calls[0][0]).toEqual({
      provincePlaceId: 'pl-place-01-191d11b42d5b13319fa7fca2',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Free State' }));
    expect(onProvinceChange).toHaveBeenCalledWith('Free State');
  });

  it('selects the first city and omits "All of" when the province has no figures', () => {
    mockData([johannesburg, capeTown], null);
    render(<HomeMarketInsightsSection />);
    expect(screen.queryByRole('button', { name: /^All of/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Johannesburg' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('Leading locality')).toBeInTheDocument();
  });

  it('shows the empty state naming the province when both are empty', () => {
    mockData([], null);
    render(<HomeMarketInsightsSection />);
    expect(
      screen.getByText('Market insights for Gauteng will appear here as more homes are listed.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Province for price insights' })).toBeVisible();
  });

  it.each([
    ['an empty result', { data: { province: null, cities: [] }, isError: false, error: null }],
    [
      'a missing procedure',
      { data: undefined, isError: true, error: { data: { code: 'NOT_FOUND' } } },
    ],
    [
      'an older API rejecting the input',
      { data: undefined, isError: true, error: { data: { code: 'BAD_REQUEST' } } },
    ],
  ])('shows the existing empty state for %s', (_name, state) => {
    useQuery.mockReturnValue({ isLoading: false, refetch, ...state });
    render(<HomeMarketInsightsSection />);
    expect(
      screen.getByText('Market insights for Gauteng will appear here as more homes are listed.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /explore areas/i })).toHaveAttribute(
      'href',
      '/south-africa',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a plain error with Try again for any other error', () => {
    useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { data: { code: 'INTERNAL_SERVER_ERROR' } },
      refetch,
    });
    render(<HomeMarketInsightsSection />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Property price insights could not be loaded.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('shows skeletons while loading', () => {
    useQuery.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch });
    render(<HomeMarketInsightsSection />);
    expect(screen.getByRole('status', { name: /loading property price insights/i })).toBeVisible();
  });
});
