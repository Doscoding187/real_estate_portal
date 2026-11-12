import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ExploreCities } from './ExploreCities';
import { CityGlyph, hasCityGlyph } from '@/components/home/CityGlyphs';
import { CITY_GUIDES, POPULAR_CITY_SLUGS, PROVINCE_TILES } from '@/lib/cityGuides';

const POPULAR = [
  ['Johannesburg', '/gauteng/johannesburg'],
  ['Cape Town', '/western-cape/cape-town'],
  ['Durban', '/kwazulu-natal/durban'],
  ['Pretoria', '/gauteng/pretoria'],
  ['Sandton', '/gauteng/city-of-johannesburg/sandton'],
  ['Gqeberha', '/eastern-cape/gqeberha'],
  ['Bloemfontein', '/free-state/bloemfontein'],
  ['Centurion', '/gauteng/centurion'],
  ['Stellenbosch', '/western-cape/stellenbosch'],
  ['Mbombela', '/mpumalanga/mbombela'],
  ['Polokwane', '/limpopo/polokwane'],
  ['Kimberley', '/noord-kaap/kimberley'],
] as const;

describe('area discovery entry', () => {
  it('keeps the national places page button in the header', () => {
    render(<ExploreCities />);

    expect(screen.getByRole('link', { name: /browse locations/i })).toHaveAttribute(
      'href',
      '/south-africa',
    );
  });

  it('uses the shared homepage rail without nesting another container', () => {
    render(<ExploreCities withinContentRail />);

    expect(
      screen
        .getByRole('heading', { name: 'Explore South Africa by area' })
        .closest('.home-section-content'),
    ).toBeInTheDocument();
  });

  it('shows 12 popular city tiles in the curated order with their published links', () => {
    render(<ExploreCities />);
    const grid = screen.getByTestId('area-tile-grid');
    const links = within(grid).getAllByRole('link');

    expect(links).toHaveLength(12);
    expect(links.map(link => [link.getAttribute('aria-label'), link.getAttribute('href')])).toEqual(
      POPULAR.map(([name, href]) => [name, href]),
    );
    expect(within(links[0]).getByText('Gauteng')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view all areas/i })).toHaveAttribute(
      'href',
      '/south-africa',
    );
  });

  it('has no photos in the section', () => {
    const { container } = render(<ExploreCities />);
    expect(container.querySelector('img')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Provinces' }));
    expect(container.querySelector('img')).toBeNull();
  });

  it('switches between the tabs and lists the nine provinces with monograms', () => {
    render(<ExploreCities />);
    const cities = screen.getByRole('tab', { name: 'Popular cities' });
    const provinces = screen.getByRole('tab', { name: 'Provinces' });
    expect(cities).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(provinces);
    expect(provinces).toHaveAttribute('aria-selected', 'true');
    expect(cities).toHaveAttribute('aria-selected', 'false');
    const links = within(screen.getByTestId('area-tile-grid')).getAllByRole('link');
    expect(links).toHaveLength(9);
    expect(links.map(link => link.getAttribute('href'))).toEqual(PROVINCE_TILES.map(p => p.href));
    expect(screen.getByRole('link', { name: 'Northern Cape' })).toHaveAttribute(
      'href',
      '/noord-kaap',
    );
    expect(
      within(screen.getByRole('link', { name: 'KwaZulu-Natal' })).getByText('KZN'),
    ).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Johannesburg' })).not.toBeInTheDocument();
  });

  it('moves between tabs with the arrow keys', () => {
    render(<ExploreCities />);
    const cities = screen.getByRole('tab', { name: 'Popular cities' });
    fireEvent.keyDown(cities, { key: 'ArrowRight' });
    const provinces = screen.getByRole('tab', { name: 'Provinces' });
    expect(provinces).toHaveAttribute('aria-selected', 'true');
    expect(provinces).toHaveFocus();
    fireEvent.keyDown(provinces, { key: 'Home' });
    expect(cities).toHaveAttribute('aria-selected', 'true');
  });

  it('draws every popular city and falls back to a generic glyph for an unmapped city', () => {
    for (const slug of POPULAR_CITY_SLUGS) expect(hasCityGlyph(slug)).toBe(true);
    const { container } = render(<CityGlyph slug="midrand" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('data-glyph', 'fallback');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('only uses cities with a published page', () => {
    const slugs = new Set(CITY_GUIDES.map(city => city.slug));
    for (const slug of POPULAR_CITY_SLUGS) expect(slugs.has(slug)).toBe(true);
    render(<ExploreCities />);
    expect(screen.queryByRole('link', { name: /Mahikeng|Umhlanga/ })).not.toBeInTheDocument();
  });
});
