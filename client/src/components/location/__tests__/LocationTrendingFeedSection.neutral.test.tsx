import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useQuery } = vi.hoisted(() => ({
  useQuery: vi.fn(() => ({ data: { items: [] } })),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    developer: {
      getHomeTrendingFeed: { useQuery },
    },
  },
}));

import { LocationTrendingFeedSection } from '../LocationTrendingFeedSection';

describe('LocationTrendingFeedSection neutral mode', () => {
  beforeEach(() => {
    useQuery.mockClear();
  });

  it('does not initialise a journey or query live feed data before Buy is chosen', () => {
    render(<LocationTrendingFeedSection locationName="Pretoria" neutralMode />);

    expect(screen.getByRole('heading', { name: 'Explore Pretoria' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buy' })).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByText(/Choose a supported journey to view published opportunities/),
    ).toBeInTheDocument();

    screen
      .getAllByRole('button')
      .filter(button => button.textContent !== 'Buy')
      .forEach(button => expect(button).toBeDisabled());
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ tab: 'buy' }),
      expect.objectContaining({ enabled: false }),
    );
  });
});
