import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ExploreCities } from './ExploreCities';
import { CITY_GUIDES } from '@/lib/cityGuides';

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

  it('shows eight photo cards first and reveals the rest on request', () => {
    render(<ExploreCities />);
    const grid = screen.getByTestId('city-guide-grid');

    expect(within(grid).getAllByRole('link')).toHaveLength(8);
    fireEvent.click(screen.getByRole('button', { name: /show more cities/i }));
    expect(within(grid).getAllByRole('link')).toHaveLength(CITY_GUIDES.length);
    expect(screen.queryByRole('button', { name: /show more cities/i })).not.toBeInTheDocument();
  });

  it('links every card to its published page with a described, sized, lazy image', () => {
    render(<ExploreCities initialLimit={CITY_GUIDES.length} />);

    for (const city of CITY_GUIDES) {
      const link = screen.getByRole('link', { name: new RegExp(`^${city.name}`) });
      expect(link).toHaveAttribute('href', city.href);
      const image = within(link).getByAltText(`${city.name}, ${city.province}`);
      expect(image).toHaveAttribute('loading', 'lazy');
      expect(image).toHaveAttribute('width', '480');
      expect(image).toHaveAttribute('srcset', expect.stringContaining('-960.webp 960w'));
    }
    expect(screen.getByRole('link', { name: /^Johannesburg/ })).toHaveAttribute(
      'href',
      '/gauteng/johannesburg',
    );
  });

  it('does not list cities without a published page', () => {
    render(<ExploreCities initialLimit={CITY_GUIDES.length} />);

    expect(screen.queryByRole('link', { name: /Mahikeng|Umhlanga/ })).not.toBeInTheDocument();
  });
});
