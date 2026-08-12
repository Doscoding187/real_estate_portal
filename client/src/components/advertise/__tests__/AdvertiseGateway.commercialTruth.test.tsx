import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DashboardShowcaseSection } from '../DashboardShowcaseSection';
import { SegmentationLayer } from '../SegmentationLayer';

afterEach(() => {
  cleanup();
});

describe('Advertise product-led gateway', () => {
  it('keeps the commercial gateway focused on Agent, Agency and Developer', () => {
    render(<SegmentationLayer />);

    const cards = screen.getAllByTestId('audience-gateway-card');
    expect(cards).toHaveLength(3);
    expect(cards.map(card => card.getAttribute('data-audience'))).toEqual([
      'agent',
      'agency',
      'developer',
    ]);

    expect(screen.getByRole('link', { name: 'Explore Agent tools' })).toHaveAttribute(
      'href',
      '/advertise/sell/agents',
    );
    expect(screen.getByRole('link', { name: 'Explore Agency tools' })).toHaveAttribute(
      'href',
      '/advertise/sell/agencies',
    );
    expect(screen.getByRole('link', { name: 'Explore Developer tools' })).toHaveAttribute(
      'href',
      '/advertise/sell/developers',
    );

    expect(screen.queryByText(/Private Seller|Service Provider|Partner/)).not.toBeInTheDocument();
  });

  it('labels the dashboard preview as product illustration rather than live evidence', () => {
    render(<DashboardShowcaseSection />);

    expect(screen.getByTestId('dashboard-showcase-section')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Your property business dashboard' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Product preview').length).toBeGreaterThan(0);
    expect(
      screen.getByText(/not live market or customer-performance evidence/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Illustrative activity trend chart' }),
    ).toBeInTheDocument();
  });
});
