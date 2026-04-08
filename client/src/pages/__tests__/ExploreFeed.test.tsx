import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ExploreFeed from '../ExploreFeed';

vi.mock('@/domains/discovery/screens/DiscoveryFeedScreen', () => ({
  default: () => <div data-testid="discovery-feed">Discovery feed</div>,
}));

describe('ExploreFeed', () => {
  it('renders the discovery feed experience directly', () => {
    render(<ExploreFeed />);

    expect(screen.getByTestId('discovery-feed')).toBeInTheDocument();
  });
});
