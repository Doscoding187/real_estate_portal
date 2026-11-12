import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ExploreCities } from './ExploreCities';

describe('area discovery entry', () => {
  it('sends discovery to the national places page', () => {
    render(<ExploreCities />);

    expect(screen.getByRole('link', { name: /browse locations/i })).toHaveAttribute(
      'href',
      '/south-africa',
    );
    expect(screen.queryByRole('link', { name: /Johannesburg|Cape Town/ })).not.toBeInTheDocument();
  });

  it('uses the shared homepage rail without nesting another container', () => {
    render(<ExploreCities withinContentRail />);

    expect(
      screen.getByRole('heading', { name: 'Explore South Africa by area' }).closest('.home-section-content'),
    ).toBeInTheDocument();
  });
});
