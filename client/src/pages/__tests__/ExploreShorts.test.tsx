import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ExploreShorts from '../ExploreShorts';

vi.mock('@/domains/discovery/screens/DiscoveryShortsScreen', () => ({
  default: () => <div data-testid="discovery-shorts">Discovery shorts</div>,
}));

describe('ExploreShorts', () => {
  it('renders the discovery shorts experience directly', () => {
    render(<ExploreShorts />);

    expect(screen.getByTestId('discovery-shorts')).toBeInTheDocument();
  });
});
