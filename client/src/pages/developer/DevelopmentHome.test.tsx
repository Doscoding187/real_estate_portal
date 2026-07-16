import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { homeQueryMock, refetchMock, setLocationMock, routeParamsMock } = vi.hoisted(() => ({
  homeQueryMock: vi.fn(),
  refetchMock: vi.fn(),
  setLocationMock: vi.fn(),
  routeParamsMock: { developmentId: '42' },
}));

vi.mock('wouter', () => ({
  Link: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
  useLocation: () => ['/developer/developments/42', setLocationMock],
  useRoute: () => [true, routeParamsMock],
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    developer: {
      getDevelopmentHome: {
        useQuery: homeQueryMock,
      },
    },
  },
}));

import DevelopmentHome from './DevelopmentHome';

function homeData(overrides: Record<string, unknown> = {}) {
  return {
    development: {
      id: 42,
      name: 'Harbour Heights',
      slug: 'harbour-heights',
      location: { address: null, suburb: 'Sea Point', city: 'Cape Town', province: 'Western Cape' },
      transactionType: 'for_sale',
      approvalStatus: 'approved',
      isPublished: true,
      publishedAt: new Date('2026-01-01'),
      publicEligible: true,
      lifecycleState: 'live',
      ...overrides,
    },
    range: '30d',
  };
}

describe('DevelopmentHome Slice 1 shell', () => {
  beforeEach(() => {
    routeParamsMock.developmentId = '42';
    homeQueryMock.mockReturnValue({
      data: homeData(),
      error: null,
      isLoading: false,
      refetch: refetchMock,
    });
  });

  it('renders owned development identity and only supported actions', () => {
    render(<DevelopmentHome />);

    expect(screen.getByRole('heading', { name: 'Development Home' })).toBeInTheDocument();
    expect(screen.getByText('Harbour Heights')).toBeInTheDocument();
    expect(screen.getByText('Sea Point, Cape Town, Western Cape')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit development' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open leads' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View public page' })).toBeInTheDocument();
    expect(screen.queryByText(/market readiness/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/aggregate inventory/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit development' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open leads' }));
    fireEvent.click(screen.getByRole('button', { name: 'View public page' }));

    expect(setLocationMock).toHaveBeenNthCalledWith(1, '/developer/create-development?id=42');
    expect(setLocationMock).toHaveBeenNthCalledWith(
      2,
      '/developer/leads?developmentId=42&range=30d',
    );
    expect(setLocationMock).toHaveBeenNthCalledWith(3, '/development/harbour-heights');
  });

  it('does not offer a public link unless the development is publicly eligible', () => {
    homeQueryMock.mockReturnValue({
      data: homeData({
        isPublished: false,
        publicEligible: false,
        lifecycleState: 'approved_private',
      }),
      error: null,
      isLoading: false,
      refetch: refetchMock,
    });

    render(<DevelopmentHome />);

    expect(screen.getByText('Approved — private')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View public page' })).not.toBeInTheDocument();
  });

  it('shows the current pending lifecycle state', () => {
    homeQueryMock.mockReturnValue({
      data: homeData({
        approvalStatus: 'pending',
        isPublished: false,
        publicEligible: false,
        lifecycleState: 'in_review',
      }),
      error: null,
      isLoading: false,
      refetch: refetchMock,
    });

    render(<DevelopmentHome />);

    expect(screen.getByText('In review')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit|resubmit/i })).not.toBeInTheDocument();
  });

  it('renders distinct loading, private not-found, and operational-error states', () => {
    homeQueryMock.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
      refetch: refetchMock,
    });
    const { rerender } = render(<DevelopmentHome />);
    expect(screen.getByLabelText('Loading Development Home')).toBeInTheDocument();

    homeQueryMock.mockReturnValue({
      data: undefined,
      error: { data: { code: 'NOT_FOUND' } },
      isLoading: false,
      refetch: refetchMock,
    });
    rerender(<DevelopmentHome />);
    expect(screen.getByRole('heading', { name: 'Development not found' })).toBeInTheDocument();
    expect(screen.queryByText('Harbour Heights')).not.toBeInTheDocument();

    homeQueryMock.mockReturnValue({
      data: undefined,
      error: new Error('Database unavailable'),
      isLoading: false,
      refetch: refetchMock,
    });
    rerender(<DevelopmentHome />);
    expect(
      screen.getByRole('heading', { name: 'Unable to load Development Home' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetchMock).toHaveBeenCalledOnce();
  });
});
