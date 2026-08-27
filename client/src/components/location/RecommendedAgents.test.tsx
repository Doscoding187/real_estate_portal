import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { recommendedAgentsMock } = vi.hoisted(() => ({
  recommendedAgentsMock: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    monetization: {
      getRecommendedAgents: {
        useQuery: (...args: unknown[]) => recommendedAgentsMock(...args),
      },
    },
  },
}));

vi.mock('wouter', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href?: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { RecommendedAgents } from './RecommendedAgents';

describe('RecommendedAgents', () => {
  it('renders nothing while loading', () => {
    recommendedAgentsMock.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(
      <RecommendedAgents locationType="province" locationId={3} areaLabel="Gauteng" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when no agent matches the fail-closed resolver', () => {
    recommendedAgentsMock.mockReturnValue({ data: [], isLoading: false });
    const { container } = render(
      <RecommendedAgents locationType="province" locationId={3} areaLabel="Gauteng" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('labels the module with the served area and links each microsite', () => {
    recommendedAgentsMock.mockReturnValue({
      isLoading: false,
      data: [
        {
          id: 11,
          slug: 'thandi-mokoena',
          firstName: 'Thandi',
          lastName: 'Mokoena',
          profileImage: null,
          agencyName: null,
          agencyLogoUrl: null,
          isVerified: true,
        },
      ],
    });

    render(
      <RecommendedAgents locationType="province" locationId={3} areaLabel="Gauteng" />,
    );

    expect(
      screen.getByText('Property professionals serving Gauteng'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/approved practitioners with public property listify profiles/i),
    ).toBeInTheDocument();
    const profileLink = screen.getByRole('link', { name: /Thandi Mokoena/i });
    expect(profileLink.getAttribute('href')).toBe('/agents/thandi-mokoena');
  });
});
