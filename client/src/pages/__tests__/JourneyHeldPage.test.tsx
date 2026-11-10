import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('wouter', () => ({
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { HeldJourneyGate } from '../JourneyHeldPage';

const hosted = {
  hostedReleaseControlled: true,
  supplementalReleasedJourneys: ['developments', 'shared_living', 'plot_land', 'commercial'],
};
const local = { hostedReleaseControlled: false, supplementalReleasedJourneys: [] };

describe('HeldJourneyGate (guards /new-developments, /development/*, /shared-living/*, /commercial/*)', () => {
  it.each(['developments', 'shared_living', 'commercial'])(
    'renders the held page for %s even when the release manifest lists it',
    journey => {
      render(
        <HeldJourneyGate journey={journey} releaseContext={hosted}>
          <p>real page</p>
        </HeldJourneyGate>,
      );
      expect(screen.getByText('This section is not available yet')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Browse properties' })).toHaveAttribute(
        'href',
        '/property-for-sale',
      );
      expect(screen.queryByText('real page')).not.toBeInTheDocument();
    },
  );

  it('renders the real page for a journey that is not held', () => {
    render(
      <HeldJourneyGate journey="buy" releaseContext={hosted}>
        <p>real page</p>
      </HeldJourneyGate>,
    );
    expect(screen.getByText('real page')).toBeInTheDocument();
  });

  it('lets local development preview a held journey', () => {
    render(
      <HeldJourneyGate journey="developments" releaseContext={local}>
        <p>real page</p>
      </HeldJourneyGate>,
    );
    expect(screen.getByText('real page')).toBeInTheDocument();
  });
});
