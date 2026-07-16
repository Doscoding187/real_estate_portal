import { render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExploreOptionAPilot from '../ExploreOptionAPilot';

const {
  useAuthMock,
  accessQueryMock,
  accessRefetchMock,
  feedQueryMock,
  engagementMutationMock,
  uploadMutationMock,
} = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  accessQueryMock: vi.fn(),
  accessRefetchMock: vi.fn(),
  feedQueryMock: vi.fn(),
  engagementMutationMock: vi.fn(),
  uploadMutationMock: vi.fn(),
}));

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: (...args: unknown[]) => useAuthMock(...args),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    discovery: {
      getOptionAPilotAccess: {
        useQuery: (...args: unknown[]) => accessQueryMock(...args),
      },
      getFeed: {
        useQuery: (...args: unknown[]) => feedQueryMock(...args),
      },
      engage: {
        useMutation: (...args: unknown[]) => engagementMutationMock(...args),
      },
    },
    explore: {
      uploadShort: {
        useMutation: (...args: unknown[]) => uploadMutationMock(...args),
      },
    },
  },
}));

vi.mock('@/pages/NotFound', () => ({
  default: () => <div data-testid="not-found">Not found</div>,
}));

describe('ExploreOptionAPilot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({ isAuthenticated: true, loading: false, user: { id: 42 } });
    accessRefetchMock.mockResolvedValue({ data: { accessible: true } });
    accessQueryMock.mockReturnValue({ refetch: accessRefetchMock });
  });

  const renderPilot = () => render(<ExploreOptionAPilot />, { wrapper: HelmetProvider });

  it('uses a neutral loading treatment while authentication is unresolved', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, loading: true });

    renderPilot();

    expect(screen.getByTestId('explore-option-a-pilot-loading')).toBeInTheDocument();
    expect(accessQueryMock).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ enabled: false, retry: false }),
    );
    expect(accessRefetchMock).not.toHaveBeenCalled();
  });

  it('uses a neutral loading treatment while the access query is unresolved', () => {
    accessRefetchMock.mockReturnValue(new Promise(() => undefined));

    renderPilot();

    expect(screen.getByTestId('explore-option-a-pilot-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('explore-option-a-pilot-boundary')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/allowlist|pilot disabled|EXPLORE_OPTION_A/i),
    ).not.toBeInTheDocument();
    expect(accessRefetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses the established unauthenticated redirect convention without enabling access', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, loading: false, user: null });

    renderPilot();

    expect(useAuthMock).toHaveBeenCalledWith({ redirectOnUnauthenticated: true });
    expect(screen.getByTestId('not-found')).toBeInTheDocument();
    expect(screen.queryByTestId('explore-option-a-pilot-boundary')).not.toBeInTheDocument();
    expect(accessRefetchMock).not.toHaveBeenCalled();
  });

  it('does not disclose configuration when access is denied', async () => {
    accessRefetchMock.mockResolvedValue({ data: { accessible: false } });

    renderPilot();

    await waitFor(() => expect(screen.getByTestId('not-found')).toBeInTheDocument());
    expect(screen.queryByTestId('explore-option-a-pilot-boundary')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/pilot disabled|allowlist|authorised|unauthorised|EXPLORE_OPTION_A/i),
    ).not.toBeInTheDocument();
  });

  it('renders only the isolated shell when access is allowed and does not invoke feed or actions', async () => {
    renderPilot();

    await waitFor(() =>
      expect(screen.getByTestId('explore-option-a-pilot-boundary')).toBeInTheDocument(),
    );
    expect(
      screen.queryByText(/upload|contact|whatsapp|viewing|save|follow|share/i),
    ).not.toBeInTheDocument();
    expect(accessQueryMock).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ enabled: false, retry: false }),
    );
    expect(accessRefetchMock).toHaveBeenCalledTimes(1);
    expect(feedQueryMock).not.toHaveBeenCalled();
    expect(engagementMutationMock).not.toHaveBeenCalled();
    expect(uploadMutationMock).not.toHaveBeenCalled();
  });

  it('does not trust an allowed result after the authenticated user changes', async () => {
    let resolveSecondAccess: ((value: { data: { accessible: boolean } }) => void) | undefined;
    const secondAccess = new Promise<{ data: { accessible: boolean } }>(resolve => {
      resolveSecondAccess = resolve;
    });
    accessRefetchMock
      .mockResolvedValueOnce({ data: { accessible: true } })
      .mockReturnValueOnce(secondAccess);

    const rendered = renderPilot();

    await waitFor(() =>
      expect(screen.getByTestId('explore-option-a-pilot-boundary')).toBeInTheDocument(),
    );

    useAuthMock.mockReturnValue({ isAuthenticated: true, loading: false, user: { id: 7 } });
    rendered.rerender(
      <HelmetProvider>
        <ExploreOptionAPilot />
      </HelmetProvider>,
    );

    expect(screen.queryByTestId('explore-option-a-pilot-boundary')).not.toBeInTheDocument();
    expect(screen.getByTestId('explore-option-a-pilot-loading')).toBeInTheDocument();
    expect(accessRefetchMock).toHaveBeenCalledTimes(2);

    resolveSecondAccess?.({ data: { accessible: false } });

    await waitFor(() => expect(screen.getByTestId('not-found')).toBeInTheDocument());
    expect(screen.queryByTestId('explore-option-a-pilot-boundary')).not.toBeInTheDocument();
  });
});
