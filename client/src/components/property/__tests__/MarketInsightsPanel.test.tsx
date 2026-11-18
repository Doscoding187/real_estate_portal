import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MarketInsightsPanel, NOT_ENOUGH_DATA, type MarketInsightsGuide } from '../MarketInsightsPanel';

vi.mock('wouter', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const guide = (stats: Partial<MarketInsightsGuide['stats']>): MarketInsightsGuide =>
  ({
    place: { id: 'ABC123', name: 'Sandton', canonicalPath: '/gauteng/johannesburg/sandton' },
    stats: {
      saleCount: 12,
      rentCount: 3,
      saleMedian: 2_500_000,
      rentMedian: null,
      salePricePerM2Median: 31_000,
      salePricedSample: 12,
      rentPricedSample: 3,
      salePricePerM2Sample: 9,
      minimumSample: 5,
      typeMix: null,
      asOf: '2026-11-18',
      ...stats,
    },
    neighbourhoods: [],
    nearbyMarkets: [],
  }) as unknown as MarketInsightsGuide;

describe('MarketInsightsPanel', () => {
  it('shows server-provided medians, counts and price per m² with a guide link', () => {
    render(<MarketInsightsPanel placeName="Sandton" guide={guide({})} loading={false} />);
    expect(screen.getByText('Market insights — Sandton')).toBeInTheDocument();
    expect(screen.getByText('R2.5M')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('R31k')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /area guide/i })).toHaveAttribute(
      'href',
      '/gauteng/johannesburg/sandton',
    );
    expect(screen.queryByText(/trend/i)).not.toBeInTheDocument();
  });

  it('says "Not enough data yet" when the server suppresses medians below its threshold', () => {
    render(
      <MarketInsightsPanel
        placeName="Sandton"
        guide={guide({ saleCount: 3, saleMedian: null, salePricePerM2Median: null })}
        loading={false}
      />,
    );
    expect(screen.getAllByText(NOT_ENOUGH_DATA)).toHaveLength(2);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getAllByText('Shown once 5+ priced listings are available')).toHaveLength(2);
  });

  it('shows a loading state without inventing numbers', () => {
    render(<MarketInsightsPanel placeName="Sandton" guide={null} loading />);
    expect(screen.getAllByText('Loading…')).toHaveLength(3);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
