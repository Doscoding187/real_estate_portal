import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ExploreCities } from './ExploreCities';

describe('canonical Place catalogue entry', () => {
  it('sends discovery to the national Place catalogue', () => {
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
      screen.getByRole('heading', { name: 'Explore canonical places' }).closest('.home-section-content'),
    ).toBeInTheDocument();
  });
});
