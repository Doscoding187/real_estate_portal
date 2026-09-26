import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockSetLocation = vi.fn();
const mockMutate = vi.fn();

vi.mock('@/lib/trpc', () => ({
  trpc: {
    servicesEngine: {
      getProviderPublicProfile: {
        useQuery: () => ({ data: null, isLoading: false, error: null }),
      },
      createLeadFromJourney: {
        useMutation: ({ onSuccess }: { onSuccess: (data: any) => void }) => ({
          mutate: (input: any) => {
            mockMutate(input);
            onSuccess({
              leadId: 99,
              leadIds: [99],
              providerId: 1,
              providerIds: [1],
              unmatched: false,
            });
          },
          isPending: false,
          error: null,
        }),
      },
    },
  },
}));

vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return {
    ...actual,
    useRoute: () => {
      const category = window.location.pathname.split('/')[3] || 'home-improvement';
      return [true, { category }];
    },
    useLocation: () => ['/services/request/home_improvement', mockSetLocation],
    Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
      <a href={href}>{children}</a>
    ),
  };
});

vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true, loading: false, user: { id: 1, role: 'buyer' } }),
}));

vi.mock('@/lib/seo', () => ({ applySeo: vi.fn() }));

import ServicesRequestPage from '../ServicesRequestPage';

describe('ServicesRequestPage', () => {
  beforeEach(() => {
    mockSetLocation.mockReset();
    mockMutate.mockReset();
    sessionStorage.clear();
    window.history.pushState(
      {},
      '',
      '/services/request/home_improvement?providerId=42&serviceCode=plumbing',
    );
  });

  it('submits the selected service and opens the persisted request result', async () => {
    render(<ServicesRequestPage />);

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Cape Town' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.change(screen.getByPlaceholderText(/describe what you need/i), {
      target: { value: 'Need a plumbing inspection.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'home_improvement',

          intentStage: 'general',
          sourceSurface: 'directory',
          providerId: 42,
        }),
      );
    });

    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith(expect.stringContaining('/services/results/99'));
    });
  });

  it('keeps the request usable when session storage is unavailable', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'SecurityError');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'SecurityError');
    });
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'SecurityError');
    });

    render(<ServicesRequestPage />);

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Cape Town' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.change(screen.getByPlaceholderText(/describe what you need/i), {
      target: { value: 'Need a plumbing inspection.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith('/services/results/99');
    });

    getItem.mockRestore();
    setItem.mockRestore();
    removeItem.mockRestore();
  });

  it('carries the submitted location and project notes into the request context', async () => {
    render(<ServicesRequestPage />);

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.change(screen.getByLabelText(/suburb/i), { target: { value: 'Rondebosch' } });
    fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Cape Town' } });
    fireEvent.change(screen.getByLabelText(/province/i), { target: { value: 'Western Cape' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.change(screen.getByPlaceholderText(/describe what you need/i), {
      target: { value: 'Need a full plumbing inspection before transfer.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          city: 'Cape Town',
          province: 'Western Cape',
          suburb: 'Rondebosch',
          notes: 'Need a full plumbing inspection before transfer.',
        }),
      );
    });
    expect(mockSetLocation).toHaveBeenCalledWith('/services/results/99');
  });

  it('forwards a selected provider id and service context', async () => {
    window.history.pushState(
      {},
      '',
      '/services/request/home_improvement?providerId=42&serviceCode=plumbing',
    );
    render(<ServicesRequestPage />);

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Cape Town' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.change(screen.getByPlaceholderText(/describe what you need/i), {
      target: { value: 'Need a plumbing inspection.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId: 42,

          serviceCode: 'plumbing',
        }),
      );
    });
  });

  it('forwards the complete contextual journey into the request mutation', async () => {
    window.history.pushState(
      {},
      '',
      '/services/request/moving?providerId=42&serviceCode=removals&propertyId=7&listingId=8&developmentId=9&intentStage=buyer_move_ready&sourceSurface=journey_injection&sourceDetail=saved_property&reasonKey=move_ready&propertyLinked=true&suburb=Rondebosch&city=Cape%20Town&province=Western%20Cape',
    );
    render(<ServicesRequestPage />);

    const requestKeyStorageKey = 'services-request-key:42:removals:moving';
    expect(sessionStorage.getItem(requestKeyStorageKey)).toBeTruthy();
    expect(requestKeyStorageKey).not.toContain('property');

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.change(screen.getByPlaceholderText(/describe what you need/i), {
      target: { value: 'Please quote for a move.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyId: 7,
          listingId: 8,
          developmentId: 9,
          intentStage: 'buyer_move_ready',
          sourceSurface: 'journey_injection',
          context: {
            sourceDetail: 'saved_property',
            reasonKey: 'move_ready',
            propertyLinked: true,
            serviceCode: 'removals',
          },
        }),
      );
    });
  });

  it('rejects unsupported journey attribution instead of rewriting it', () => {
    window.history.pushState(
      {},
      '',
      '/services/request/home_improvement?providerId=42&serviceCode=plumbing&propertyId=-12&intentStage=invalid&sourceSurface=invalid&reasonKey=',
    );
    render(<ServicesRequestPage />);

    expect(
      screen.getByRole('heading', { name: /journey context unavailable/i }),
    ).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('requires a provider before opening the request flow', () => {
    window.history.pushState({}, '', '/services/request/home_improvement');
    render(<ServicesRequestPage />);

    expect(
      screen.getByRole('heading', { name: /choose a provider and service/i }),
    ).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('renders the request flow with an explicit service choice', () => {
    render(<ServicesRequestPage />);
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });
});
