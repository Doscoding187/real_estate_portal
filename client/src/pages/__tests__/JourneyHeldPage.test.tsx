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

vi.mock('@/components/seo/MetaControl', () => ({ MetaControl: () => null }));

describe('HeldJourneyGate (guards /shared-living/*, /commercial/*)', () => {
  it.each([
    ['shared_living', 'Shared living rooms', 'No shared living rooms are listed yet.'],
    ['commercial', 'Commercial property to let', 'No commercial space is listed yet.'],
    ['plot_land', 'Plots and land for sale', 'No land is listed yet.'],
  ])(
    'renders the empty-state page for %s even when the release manifest lists it',
    (journey, heading, line) => {
      render(
        <HeldJourneyGate journey={journey} releaseContext={hosted}>
          <p>real page</p>
        </HeldJourneyGate>,
      );
      expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
      expect(screen.getByText(line)).toBeInTheDocument();
      expect(screen.getByTestId('section-empty-state')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Contact us/ })).toHaveAttribute('href', '/contact');
      expect(screen.getByRole('link', { name: /Search homes for sale/ })).toHaveAttribute(
        'href',
        '/property-for-sale',
      );
      expect(screen.queryByText('This section is not available yet')).not.toBeInTheDocument();
      expect(screen.queryByText('real page')).not.toBeInTheDocument();
    },
  );

  it('renders a plain not-found state with a link back for detail routes', () => {
    render(
      <HeldJourneyGate journey="shared_living" releaseContext={hosted} detail>
        <p>real page</p>
      </HeldJourneyGate>,
    );
    expect(screen.getByText('We could not find that room')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to shared living rooms/ })).toHaveAttribute(
      'href',
      '/shared-living',
    );
    expect(screen.queryByTestId('section-empty-state')).not.toBeInTheDocument();
  });

  it('renders the real page for developments, which is public', () => {
    render(
      <HeldJourneyGate journey="developments" releaseContext={hosted}>
        <p>real page</p>
      </HeldJourneyGate>,
    );
    expect(screen.getByText('real page')).toBeInTheDocument();
  });

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
      <HeldJourneyGate journey="commercial" releaseContext={local}>
        <p>real page</p>
      </HeldJourneyGate>,
    );
    expect(screen.getByText('real page')).toBeInTheDocument();
  });
});
