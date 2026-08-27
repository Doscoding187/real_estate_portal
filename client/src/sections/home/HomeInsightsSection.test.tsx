import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HomeInsightsSection } from './HomeInsightsSection';

describe('HomeInsightsSection', () => {
  it('links the homepage to the supported Insights surfaces', () => {
    render(<HomeInsightsSection />);

    expect(screen.getByRole('link', { name: /market trends/i })).toHaveAttribute(
      'href',
      '/insights/market-trends',
    );
    expect(screen.getByRole('link', { name: /property insights/i })).toHaveAttribute(
      'href',
      '/insights/property-insights',
    );
    expect(screen.getByRole('link', { name: /property listify blog/i })).toHaveAttribute(
      'href',
      '/insights/blog',
    );
  });
});
