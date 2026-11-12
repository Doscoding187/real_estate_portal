import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HomeMarketInsightsSection } from './HomeMarketInsightsSection';

describe('HomeMarketInsightsSection', () => {
  it('keeps its heading and shows an honest empty state with no numbers', () => {
    const { container } = render(<HomeMarketInsightsSection />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Property market insights' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Market insights will appear here as more homes are listed.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /explore areas/i })).toHaveAttribute(
      'href',
      '/south-africa',
    );
    expect(container.textContent).not.toMatch(/\d/);
  });
});
