import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { recommendedAgentsMock, refetchMock } = vi.hoisted(() => ({
  recommendedAgentsMock: vi.fn(),
  refetchMock: vi.fn(),
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

vi.mock('@/components/ui/carousel', () => ({
  Carousel: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CarouselContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CarouselItem: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CarouselNext: () => <button type="button" aria-label="Next agents" />,
  CarouselPrevious: () => <button type="button" aria-label="Previous agents" />,
}));

import { SuburbLocalProfessionals } from '../SuburbLocalProfessionals';

describe('SuburbLocalProfessionals', () => {
  beforeEach(() => {
    recommendedAgentsMock.mockReset();
    refetchMock.mockReset();
  });

  it('shows a distinct loading state', () => {
    recommendedAgentsMock.mockReturnValue({ isLoading: true, data: undefined });

    render(<SuburbLocalProfessionals suburbId={41} suburbName="Sandton" />);

    expect(screen.getByRole('status', { name: 'Loading local agents' })).toBeInTheDocument();
  });

  it('shows an explicit empty state when no eligible agent serves this suburb', () => {
    recommendedAgentsMock.mockReturnValue({ isLoading: false, isError: false, data: [] });

    render(<SuburbLocalProfessionals suburbId={41} suburbName="Sandton" />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'No public agent profiles currently list Sandton as an area they serve.',
    );
  });

  it('shows a retry action when the public profile lookup fails', () => {
    recommendedAgentsMock.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
      refetch: refetchMock,
    });

    render(<SuburbLocalProfessionals suburbId={41} suburbName="Sandton" />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Agent profiles for Sandton could not be loaded.',
    );
    expect(refetchMock).toHaveBeenCalledOnce();
  });

  it('links eligible profiles and shows the current agency when supplied', () => {
    recommendedAgentsMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          id: 11,
          slug: 'thandi-mokoena',
          firstName: 'Thandi',
          lastName: 'Mokoena',
          profileImage: null,
          agencyName: 'Northside Realty',
          agencyLogoUrl: null,
          isVerified: true,
        },
      ],
    });

    render(<SuburbLocalProfessionals suburbId={41} suburbName="Sandton" />);

    expect(screen.getByText('Northside Realty')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Thandi Mokoena.*Northside Realty.*View profile/i }),
    ).toHaveAttribute('href', '/agents/thandi-mokoena');
    expect(recommendedAgentsMock).toHaveBeenCalledWith(
      { locationType: 'suburb', locationId: 41 },
      { retry: false, staleTime: 300_000 },
    );
  });
});
