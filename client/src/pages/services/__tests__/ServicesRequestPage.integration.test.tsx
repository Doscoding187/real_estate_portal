import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockSetLocation = vi.fn();
const mockMutate = vi.fn();
const PLACE_ID = 'pl-place-01-000000000000000000000000';
const selectedPlace = {
  canonicalPlaceId: PLACE_ID,
  label: 'Melville, City of Johannesburg, Gauteng',
  placeType: 'suburb',
  scope: 'locality' as const,
  administrativeContext: 'City of Johannesburg, Gauteng',
  canonicalPath: '/gauteng/melville',
  parentPlaceId: 'pl-place-01-111111111111111111111111',
};

vi.mock('@/components/location/CanonicalPlaceSelector', () => ({
  CanonicalPlaceSelector: ({ onChange, label }: { onChange: (value: typeof selectedPlace) => void; label: string }) => (
    <div>
      <span>{label}</span>
      <button type="button" onClick={() => onChange(selectedPlace)}>
        Select approved test Place
      </button>
    </div>
  ),
}));

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
            onSuccess({ leadId: 99, leadIds: [99], unmatched: false });
          },
          isPending: false,
          error: null,
        }),
      },
    },
    placeAuthority: {
      resolveSearchPlace: {
        useQuery: () => ({ data: null, isLoading: false, error: null }),
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

function moveToDescription() {
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  fireEvent.click(screen.getByRole('button', { name: /select approved test place/i }));
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
}

function submitRequest(notes = 'Need a plumbing inspection.') {
  fireEvent.change(screen.getByPlaceholderText(/describe what you need/i), {
    target: { value: notes },
  });
  fireEvent.click(screen.getByRole('button', { name: /submit request/i }));
}

describe('ServicesRequestPage canonical Place handoff', () => {
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

  it('submits one exact selected Place and opens the persisted request result', async () => {
    render(<ServicesRequestPage />);
    moveToDescription();
    submitRequest();

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'home_improvement',
          canonicalPlaceId: PLACE_ID,
          intentStage: 'general',
          sourceSurface: 'directory',
          providerId: 42,
          notes: 'Need a plumbing inspection.',
        }),
      );
      expect(mockSetLocation).toHaveBeenCalledWith('/services/results/99');
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
    moveToDescription();
    submitRequest();

    await waitFor(() => expect(mockSetLocation).toHaveBeenCalledWith('/services/results/99'));
    getItem.mockRestore();
    setItem.mockRestore();
    removeItem.mockRestore();
  });

  it('does not treat typed geography text as a selected request Place', () => {
    render(<ServicesRequestPage />);
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/select an approved place/i);
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('forwards the complete allowlisted journey context without a text location', async () => {
    window.history.pushState(
      {},
      '',
      '/services/request/moving?providerId=42&serviceCode=removals&propertyId=7&listingId=8&developmentId=9&intentStage=buyer_move_ready&sourceSurface=journey_injection&sourceDetail=saved_property&reasonKey=move_ready&propertyLinked=true&city=Cape%20Town',
    );
    render(<ServicesRequestPage />);
    moveToDescription();
    submitRequest('Please quote for a move.');

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          canonicalPlaceId: PLACE_ID,
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
      const mutation = mockMutate.mock.calls[0]?.[0];
      expect(mutation).not.toHaveProperty('city');
      expect(mutation).not.toHaveProperty('province');
      expect(mutation).not.toHaveProperty('suburb');
    });
  });

  it('rejects unsupported journey attribution instead of rewriting it', () => {
    window.history.pushState(
      {},
      '',
      '/services/request/home_improvement?providerId=42&serviceCode=plumbing&propertyId=-12&intentStage=invalid&sourceSurface=invalid&reasonKey=',
    );
    render(<ServicesRequestPage />);

    expect(screen.getByRole('heading', { name: /journey context unavailable/i })).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('requires a provider before opening the request flow', () => {
    window.history.pushState({}, '', '/services/request/home_improvement');
    render(<ServicesRequestPage />);

    expect(screen.getByRole('heading', { name: /choose a provider and service/i })).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
