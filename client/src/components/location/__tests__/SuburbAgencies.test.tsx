import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  Link: ({ children, href, ...props }: React.PropsWithChildren<{ href?: string }>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { SuburbAgencies } from '../SuburbAgencies';

const agents = [
  {
    id: 1,
    slug: 'agent-one-1',
    firstName: 'Naledi',
    lastName: 'Mokoena',
    profileImage: null,
    agencyName: 'Urban Realty',
    agencyLogoUrl: null,
    isVerified: true,
  },
  {
    id: 2,
    slug: 'agent-two-2',
    firstName: 'Peter',
    lastName: 'Naidoo',
    profileImage: null,
    agencyName: 'Urban Realty',
    agencyLogoUrl: null,
    isVerified: true,
  },
  {
    id: 3,
    slug: 'agent-three-3',
    firstName: 'Lerato',
    lastName: 'Dlamini',
    profileImage: null,
    agencyName: 'Sandton Homes Collective',
    agencyLogoUrl: null,
    isVerified: true,
  },
  {
    id: 4,
    slug: 'agent-four-4',
    firstName: 'Sipho',
    lastName: 'Khumalo',
    profileImage: null,
    agencyName: null,
    agencyLogoUrl: null,
    isVerified: false,
  },
];

describe('SuburbAgencies', () => {
  beforeEach(() => {
    recommendedAgentsMock.mockReset();
    recommendedAgentsMock.mockReturnValue({ isLoading: false, isError: false, data: agents });
  });

  it('shows a distinct loading state', () => {
    recommendedAgentsMock.mockReturnValue({ isLoading: true, data: undefined });

    render(<SuburbAgencies suburbId={81} suburbName="Sandton" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading agency affiliations…');
  });

  it('deduplicates current agency affiliations and keeps independent agents out of agency claims', () => {
    render(<SuburbAgencies suburbId={81} suburbName="Sandton" />);

    expect(screen.getByRole('heading', { name: 'Agencies serving Sandton' })).toBeInTheDocument();
    expect(screen.getByText(/current verified affiliation/)).toBeInTheDocument();

    const agencyList = screen.getByText('Urban Realty').closest('ul') as HTMLElement;
    expect(within(agencyList).getAllByRole('listitem')).toHaveLength(2);
    expect(within(agencyList).getByText('2 listed agents serving this suburb')).toBeInTheDocument();
    expect(
      within(agencyList).getByText('Sandton Homes Collective'),
    ).toBeInTheDocument();
    expect(within(agencyList).queryByText('Sipho Khumalo')).toBeNull();

    expect(screen.getByRole('link', { name: /Browse agents in Sandton/ })).toHaveAttribute(
      'href',
      '/agents',
    );
    expect(screen.getByRole('link', { name: /Feature your agency/ })).toHaveAttribute(
      'href',
      '/advertise/sell/agencies',
    );
  });

  it('explains when no verified agency affiliation is listed for the suburb', () => {
    recommendedAgentsMock.mockReturnValue({ isLoading: false, isError: false, data: [] });

    render(<SuburbAgencies suburbId={81} suburbName="Sandton" />);

    expect(
      screen.getByText(/No verified agency affiliations are listed for Sandton right now/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Feature your agency/ })).toHaveAttribute(
      'href',
      '/advertise/sell/agencies',
    );
  });
});
