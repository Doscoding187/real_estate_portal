import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ExploreUpload from '../ExploreUpload';

const { authState, eligibilityMock, setLocationMock } = vi.hoisted(() => ({
  authState: { user: null as any, isAuthenticated: false, loading: false },
  eligibilityMock: vi.fn(),
  setLocationMock: vi.fn(),
}));

vi.mock('wouter', () => ({ useLocation: () => ['/explore/upload', setLocationMock] }));
vi.mock('@/_core/hooks/useAuth', () => ({ useAuth: () => authState }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    video: { getPresignedUrl: { useMutation: () => ({ mutateAsync: vi.fn() }) } },
    explore: {
      getPublishingEligibility: { useQuery: (...args: unknown[]) => eligibilityMock(...args) },
      uploadShort: { useMutation: () => ({ mutateAsync: vi.fn() }) },
    },
  },
}));

describe('ExploreUpload', () => {
  beforeEach(() => {
    authState.user = null;
    authState.isAuthenticated = false;
    authState.loading = false;
    eligibilityMock.mockReturnValue({ data: undefined, isLoading: false });
    setLocationMock.mockReset();
  });

  it('redirects signed-out visitors with a safe return path', async () => {
    render(<ExploreUpload />);

    await waitFor(() => expect(setLocationMock).toHaveBeenCalledWith('/login?mode=signin&next=%2Fexplore%2Fupload'));

    const loginHref = setLocationMock.mock.calls[0]?.[0] as string;
    const params = new URLSearchParams(loginHref.split('?')[1]);
    expect(params.get('next')).toBe('/explore/upload');
    expect(params.has('redirect')).toBe(false);
  });

  it('does not render the upload form for an authenticated but ineligible account', () => {
    authState.user = { id: 9, role: 'visitor' };
    authState.isAuthenticated = true;
    eligibilityMock.mockReturnValue({ data: { allowed: false }, isLoading: false });

    render(<ExploreUpload />);

    expect(screen.getByRole('heading', { name: 'Explore publishing access required' })).toBeInTheDocument();
    expect(screen.queryByText('Upload Media')).not.toBeInTheDocument();
  });

  it('truthfully explains that external publisher submissions are not yet open', () => {
    authState.user = { id: 9, role: 'agent' };
    authState.isAuthenticated = true;
    eligibilityMock.mockReturnValue({
      data: { allowed: false, reason: 'publisher_submissions_not_open' },
      isLoading: false,
    });

    render(<ExploreUpload />);

    expect(screen.getByText('Publisher submissions are not yet open.')).toBeInTheDocument();
    expect(screen.queryByText('Upload Media')).not.toBeInTheDocument();
  });

  it('renders the upload form only after server-confirmed eligibility', () => {
    authState.user = { id: 9, role: 'super_admin' };
    authState.isAuthenticated = true;
    eligibilityMock.mockReturnValue({ data: { allowed: true }, isLoading: false });

    render(<ExploreUpload />);

    expect(screen.getByRole('heading', { name: 'Upload to Explore' })).toBeInTheDocument();
    expect(screen.getByText('Save private editorial content')).toBeInTheDocument();
  });
});
